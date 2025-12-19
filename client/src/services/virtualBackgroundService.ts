// Virtual Background Service - MediaPipe Implementation

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

// Type declarations for MediaStreamTrackProcessor API
declare global {
  interface Window {
    MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor;
    MediaStreamTrackGenerator: typeof MediaStreamTrackGenerator;
  }
}

interface MediaStreamTrackProcessor<T = VideoFrame> {
  readable: ReadableStream<T>;
}

interface MediaStreamTrackProcessorInit {
  track: MediaStreamTrack;
}

interface MediaStreamTrackGenerator<T = VideoFrame> extends MediaStreamTrack {
  writable: WritableStream<T>;
}

interface MediaStreamTrackGeneratorInit {
  kind: 'video' | 'audio';
}

declare const MediaStreamTrackProcessor: {
  prototype: MediaStreamTrackProcessor;
  new (init: MediaStreamTrackProcessorInit): MediaStreamTrackProcessor;
};

declare const MediaStreamTrackGenerator: {
  prototype: MediaStreamTrackGenerator;
  new (init: MediaStreamTrackGeneratorInit): MediaStreamTrackGenerator;
};

export interface VirtualBackgroundConfig {
  model: string;
  segmentationThreshold: number;
  backgroundImageUrl?: string;
  blurAmount?: number;
  useBlur?: boolean;
  edgeSmoothing?: number;
  temporalSmoothing?: number;
  maskBlur?: number;
  erosionSize?: number;
  dilationSize?: number;
  adaptiveThreshold?: boolean;
  hairRefinement?: boolean;
  minContourArea?: number;
  useGuidedFilter?: boolean;
  guidedFilterRadius?: number;
  guidedFilterEpsilon?: number;
  useLaplacianBlending?: boolean;
  laplacianLevels?: number;
  useTrimapRefinement?: boolean;
  useSpillRemoval?: boolean;
  useAdaptiveKernels?: boolean;
}

export const DEFAULT_BACKGROUNDS = [
  { name: 'Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&h=720&fit=crop&crop=center' },
  { name: 'Nature', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop&crop=center' },
  { name: 'Library', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1280&h=720&fit=crop&crop=center' },
  { name: 'Coffee Shop', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1280&h=720&fit=crop&crop=center' },
];

export class VirtualBackgroundService {
  private config: VirtualBackgroundConfig;
  private isActive = false;
  private trackProcessor: MediaStreamTrackProcessor<VideoFrame> | null = null;
  private trackGenerator: MediaStreamTrackGenerator<VideoFrame> | null = null;
  private processingController: AbortController | null = null;
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null;
  private imageSegmenter: ImageSegmenter | null = null;
  private isInitialized = false;
  private tempCanvas: OffscreenCanvas | null = null;
  private tempCtx: OffscreenCanvasRenderingContext2D | null = null;
  private outputCanvas: OffscreenCanvas | null = null;
  private outputCtx: OffscreenCanvasRenderingContext2D | null = null;
  private backgroundImage: ImageBitmap | null = null;
  private isProcessing = false;
  private previousMask: ImageData | null = null;
  private maskCanvas: OffscreenCanvas | null = null;
  private maskCtx: OffscreenCanvasRenderingContext2D | null = null;
  private smoothedBuffer: Uint8ClampedArray | null = null;
  private previousMaskBuffer: Uint8ClampedArray | null = null;

  constructor(config: VirtualBackgroundConfig) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('[Service] Initializing virtual background...');
    try {
      const vision = await FilesetResolver.forVisionTasks(import.meta.env.BASE_URL + 'wasm');
      this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: import.meta.env.BASE_URL + 'models/selfie_segmenter.tflite',
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: true
      });
      if (this.config.backgroundImageUrl) {
        await this.loadBackgroundImage(this.config.backgroundImageUrl);
      }
      this.isInitialized = true;
      console.log('[Service] Initialization complete');
    } catch (error) {
      console.error('[Service] Initialization failed:', error);
      throw error;
    }
  }

  public async setupAndStart(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.isInitialized || !this.imageSegmenter) throw new Error('Service not initialized');
    if (!('MediaStreamTrackProcessor' in window) || !('MediaStreamTrackGenerator' in window)) {
      throw new Error('Browser does not support required APIs');
    }
    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) throw new Error('No video track found');
    this.trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
    this.trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
    this.trackWriter = this.trackGenerator.writable.getWriter();
    this.isActive = true;
    this.startStreamProcessing();
    const audioTracks = inputStream.getAudioTracks();
    return new MediaStream([this.trackGenerator, ...audioTracks]);
  }

  private async startStreamProcessing(): Promise<void> {
    if (!this.trackProcessor) return;
    this.processingController = new AbortController();
    const reader = this.trackProcessor.readable.getReader();
    try {
      while (this.isActive && !this.processingController.signal.aborted) {
        const { done, value: videoFrame } = await reader.read();
        if (done) break;
        await this.processVideoFrame(videoFrame);
      }
    } catch (error) {
      if (!this.processingController.signal.aborted) console.error('[Service] Stream error:', error);
    } finally {
      reader.releaseLock();
    }
  }

  private preprocessFrame(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const contrast = 1.1;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private async processVideoFrame(videoFrame: VideoFrame): Promise<void> {
    if (!this.imageSegmenter || this.isProcessing) { videoFrame.close(); return; }
    try {
      this.isProcessing = true;
      const width = Math.min(videoFrame.codedWidth || videoFrame.displayWidth, 1280);
      const height = Math.min(videoFrame.codedHeight || videoFrame.displayHeight, 720);
      if (!this.tempCanvas || this.tempCanvas.width !== width || this.tempCanvas.height !== height) {
        this.tempCanvas = new OffscreenCanvas(width, height);
        this.tempCtx = this.tempCanvas.getContext('2d');
        this.outputCanvas = new OffscreenCanvas(width, height);
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.maskCanvas = new OffscreenCanvas(width, height);
        this.maskCtx = this.maskCanvas.getContext('2d');
      }
      if (!this.tempCtx || !this.outputCtx) throw new Error('Failed to get 2D context');
      this.tempCtx.drawImage(videoFrame, 0, 0, width, height);
      this.preprocessFrame(this.tempCtx, width, height);
      const result = this.imageSegmenter.segment(this.tempCanvas);
      this.processSegmentationResults(result, width, height);
      if (!this.outputCanvas) throw new Error('Output canvas not available');
      const processedFrame = new VideoFrame(this.outputCanvas, { timestamp: videoFrame.timestamp, alpha: 'discard' });
      await this.handleProcessedFrame(processedFrame);
    } catch (error) {
      console.error('[Service] Error processing frame:', error);
    } finally {
      this.isProcessing = false;
      videoFrame.close();
    }
  }

  private processSegmentationResults(result: any, width: number, height: number): void {
    if (!this.outputCtx || !this.tempCanvas || !this.maskCtx || !this.maskCanvas) return;
    this.outputCtx.clearRect(0, 0, width, height);
    this.maskCtx.clearRect(0, 0, width, height);
    const enhancedMask = this.createEnhancedMask(result, width, height);
    if (!enhancedMask) return;
    const smoothedMask = this.applyTemporalSmoothing(enhancedMask, width, height);
    this.applyMaskComposite(smoothedMask, width, height);
  }

  private createEnhancedMask(result: any, width: number, height: number): ImageData | null {
    if (!this.maskCtx || !this.maskCanvas) return null;
    const categoryMask = result.categoryMask;
    const confidenceMasks = result.confidenceMasks;
    if (!categoryMask) return null;
    const categoryData = categoryMask.getAsUint8Array();
    const maskImageData = this.maskCtx.createImageData(width, height);
    const useAdaptive = this.config.adaptiveThreshold ?? true;
    const baseThreshold = this.config.segmentationThreshold ?? 0.55;
    if (confidenceMasks && confidenceMasks.length > 0) {
      const confidenceData = confidenceMasks[0].getAsFloat32Array();
      let avgConfidence = 0, personPixelCount = 0;
      if (useAdaptive) {
        for (let i = 0; i < categoryData.length; i++) {
          if (categoryData[i] === 0) { avgConfidence += confidenceData[i]; personPixelCount++; }
        }
        avgConfidence = personPixelCount > 0 ? avgConfidence / personPixelCount : baseThreshold;
      }
      const adaptiveThreshold = useAdaptive ? avgConfidence * 0.7 : baseThreshold;
      for (let i = 0; i < categoryData.length; i++) {
        const isPerson = categoryData[i] === 0;
        const confidence = confidenceData[i] || 0;
        const pixelIndex = i * 4;
        let alpha = 0;
        if (isPerson) {
          if (confidence > adaptiveThreshold) alpha = 255;
          else if (confidence > adaptiveThreshold * 0.5) {
            const normalizedConf = (confidence - adaptiveThreshold * 0.5) / (adaptiveThreshold * 0.5);
            const sigmoid = 1 / (1 + Math.exp(-6 * (normalizedConf - 0.5)));
            alpha = Math.round(sigmoid * 255);
          }
        }
        maskImageData.data[pixelIndex] = 255;
        maskImageData.data[pixelIndex + 1] = 255;
        maskImageData.data[pixelIndex + 2] = 255;
        maskImageData.data[pixelIndex + 3] = alpha;
      }
    } else {
      for (let i = 0; i < categoryData.length; i++) {
        const isPerson = categoryData[i] === 0;
        const pixelIndex = i * 4;
        maskImageData.data[pixelIndex] = 255;
        maskImageData.data[pixelIndex + 1] = 255;
        maskImageData.data[pixelIndex + 2] = 255;
        maskImageData.data[pixelIndex + 3] = isPerson ? 255 : 0;
      }
    }
    this.maskCtx.putImageData(maskImageData, 0, 0);
    if (this.config.useAdaptiveKernels) {
      const edgeMap = this.computeEdgeStrengthMap(width, height);
      this.applyAdaptiveMorphology(width, height, edgeMap);
    } else {
      this.applyMorphologicalOperations(width, height);
    }
    if (this.config.hairRefinement ?? true) this.refineHairEdges(width, height);
    if (this.config.useTrimapRefinement) this.applyTrimapRefinement(width, height);
    if (this.config.useGuidedFilter) this.applyGuidedFilter(width, height);
    if (this.config.useLaplacianBlending) this.applyLaplacianBlending(width, height);
    if (this.config.useSpillRemoval) this.applySpillRemoval(width, height);
    const maskBlur = this.config.maskBlur ?? 1.5;
    if (maskBlur > 0) {
      this.maskCtx.filter = `blur(${maskBlur}px)`;
      this.maskCtx.drawImage(this.maskCanvas, 0, 0);
      this.maskCtx.filter = 'none';
    }
    return this.maskCtx.getImageData(0, 0, width, height);
  }

  private applyMorphologicalOperations(width: number, height: number): void {
    if (!this.maskCtx || !this.maskCanvas) return;
    const erosionSize = this.config.erosionSize || 1;
    const dilationSize = this.config.dilationSize || 1;
    const imageData = this.maskCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const tempBuffer = new Uint8ClampedArray(width * height);
    const alphaBuffer = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i++) alphaBuffer[i] = data[i * 4 + 3];
    if (erosionSize > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let minVal = 255;
          for (let kx = Math.max(0, x - erosionSize); kx <= Math.min(width - 1, x + erosionSize); kx++) minVal = Math.min(minVal, alphaBuffer[y * width + kx]);
          tempBuffer[y * width + x] = minVal;
        }
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let minVal = 255;
          for (let ky = Math.max(0, y - erosionSize); ky <= Math.min(height - 1, y + erosionSize); ky++) minVal = Math.min(minVal, tempBuffer[ky * width + x]);
          alphaBuffer[y * width + x] = minVal;
        }
      }
    }
    if (dilationSize > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let maxVal = 0;
          for (let kx = Math.max(0, x - dilationSize); kx <= Math.min(width - 1, x + dilationSize); kx++) maxVal = Math.max(maxVal, alphaBuffer[y * width + kx]);
          tempBuffer[y * width + x] = maxVal;
        }
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let maxVal = 0;
          for (let ky = Math.max(0, y - dilationSize); ky <= Math.min(height - 1, y + dilationSize); ky++) maxVal = Math.max(maxVal, tempBuffer[ky * width + x]);
          alphaBuffer[y * width + x] = maxVal;
        }
      }
    }
    for (let i = 0; i < width * height; i++) data[i * 4 + 3] = alphaBuffer[i];
    this.maskCtx.putImageData(imageData, 0, 0);
  }

  private refineHairEdges(width: number, height: number): void {
    if (!this.maskCtx || !this.maskCanvas || !this.tempCtx) return;
    const maskData = this.maskCtx.getImageData(0, 0, width, height);
    const originalData = this.tempCtx.getImageData(0, 0, width, height);
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4;
        const alphaIdx = idx + 3;
        if (maskData.data[alphaIdx] > 50 && maskData.data[alphaIdx] < 200) {
          const r = originalData.data[idx], g = originalData.data[idx + 1], b = originalData.data[idx + 2];
          const isDarkHair = r < 80 && g < 80 && b < 80;
          const isLightHair = r > 150 && g > 130 && b > 100 && Math.abs(r - g) < 30;
          let countR = 0, meanR = 0, m2R = 0, countG = 0, meanG = 0, m2G = 0, countB = 0, meanB = 0, m2B = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const nR = originalData.data[nIdx], nG = originalData.data[nIdx + 1], nB = originalData.data[nIdx + 2];
              countR++; const deltaR = nR - meanR; meanR += deltaR / countR; m2R += deltaR * (nR - meanR);
              countG++; const deltaG = nG - meanG; meanG += deltaG / countG; m2G += deltaG * (nG - meanG);
              countB++; const deltaB = nB - meanB; meanB += deltaB / countB; m2B += deltaB * (nB - meanB);
            }
          }
          const colorVariance = m2R / countR + m2G / countG + m2B / countB;
          const varianceThreshold = (isDarkHair || isLightHair) ? 400 : 600;
          if (colorVariance > varianceThreshold) {
            const enhancementFactor = isDarkHair ? 1.3 : 1.2;
            maskData.data[alphaIdx] = Math.min(255, Math.round(maskData.data[alphaIdx] * enhancementFactor));
          }
        }
      }
    }
    this.maskCtx.putImageData(maskData, 0, 0);
  }

  private applyGuidedFilter(width: number, height: number): void {
    if (!this.maskCtx || !this.maskCanvas || !this.tempCtx) return;
    const radius = this.config.guidedFilterRadius ?? 4;
    const epsilon = this.config.guidedFilterEpsilon ?? 0.01;
    const maskData = this.maskCtx.getImageData(0, 0, width, height);
    const guideData = this.tempCtx.getImageData(0, 0, width, height);
    const maskFloat = new Float32Array(width * height);
    const guideFloat = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      maskFloat[i] = maskData.data[i * 4 + 3] / 255;
      guideFloat[i] = (0.299 * guideData.data[i * 4] + 0.587 * guideData.data[i * 4 + 1] + 0.114 * guideData.data[i * 4 + 2]) / 255;
    }
    const boxFilter = (input: Float32Array, output: Float32Array, r: number) => {
      const integral = new Float64Array((width + 1) * (height + 1));
      for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) { rowSum += input[y * width + x]; integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum; }
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const x1 = Math.max(0, x - r), y1 = Math.max(0, y - r), x2 = Math.min(width - 1, x + r), y2 = Math.min(height - 1, y + r);
          const count = (x2 - x1 + 1) * (y2 - y1 + 1);
          const sum = integral[(y2 + 1) * (width + 1) + (x2 + 1)] - integral[y1 * (width + 1) + (x2 + 1)] - integral[(y2 + 1) * (width + 1) + x1] + integral[y1 * (width + 1) + x1];
          output[y * width + x] = sum / count;
        }
      }
    };
    const meanI = new Float32Array(width * height), meanP = new Float32Array(width * height);
    const meanIP = new Float32Array(width * height), meanII = new Float32Array(width * height);
    const IP = new Float32Array(width * height), II = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) { IP[i] = guideFloat[i] * maskFloat[i]; II[i] = guideFloat[i] * guideFloat[i]; }
    boxFilter(guideFloat, meanI, radius); boxFilter(maskFloat, meanP, radius); boxFilter(IP, meanIP, radius); boxFilter(II, meanII, radius);
    const a = new Float32Array(width * height), b = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) { const varI = meanII[i] - meanI[i] * meanI[i]; const covIP = meanIP[i] - meanI[i] * meanP[i]; a[i] = covIP / (varI + epsilon); b[i] = meanP[i] - a[i] * meanI[i]; }
    const meanA = new Float32Array(width * height), meanB = new Float32Array(width * height);
    boxFilter(a, meanA, radius); boxFilter(b, meanB, radius);
    for (let i = 0; i < width * height; i++) { const filtered = meanA[i] * guideFloat[i] + meanB[i]; maskData.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, filtered)) * 255); }
    this.maskCtx.putImageData(maskData, 0, 0);
  }

  private applyLaplacianBlending(width: number, height: number): void {
    if (!this.maskCtx || !this.maskCanvas) return;
    const levels = this.config.laplacianLevels ?? 3;
    const maskData = this.maskCtx.getImageData(0, 0, width, height);
    const alpha = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) alpha[i] = maskData.data[i * 4 + 3] / 255;
    const gaussianPyramid: Float32Array[] = [alpha];
    let currentWidth = width, currentHeight = height;
    for (let level = 1; level < levels; level++) {
      const prevLevel = gaussianPyramid[level - 1];
      const newWidth = Math.floor(currentWidth / 2), newHeight = Math.floor(currentHeight / 2);
      if (newWidth < 4 || newHeight < 4) break;
      const downsampled = new Float32Array(newWidth * newHeight);
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          let sum = 0, count = 0;
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const srcX = x * 2 + dx, srcY = y * 2 + dy; if (srcX < currentWidth && srcY < currentHeight) { sum += prevLevel[srcY * currentWidth + srcX]; count++; } }
          downsampled[y * newWidth + x] = sum / count;
        }
      }
      gaussianPyramid.push(downsampled);
      currentWidth = newWidth; currentHeight = newHeight;
    }
    const laplacianPyramid: Float32Array[] = [];
    currentWidth = width; currentHeight = height;
    for (let level = 0; level < gaussianPyramid.length - 1; level++) {
      const current = gaussianPyramid[level], nextLevel = gaussianPyramid[level + 1];
      const nextWidth = Math.floor(currentWidth / 2), nextHeight = Math.floor(currentHeight / 2);
      const upsampled = new Float32Array(currentWidth * currentHeight);
      for (let y = 0; y < currentHeight; y++) for (let x = 0; x < currentWidth; x++) { const srcX = Math.min(Math.floor(x / 2), nextWidth - 1), srcY = Math.min(Math.floor(y / 2), nextHeight - 1); upsampled[y * currentWidth + x] = nextLevel[srcY * nextWidth + srcX]; }
      const laplacian = new Float32Array(currentWidth * currentHeight);
      for (let i = 0; i < currentWidth * currentHeight; i++) laplacian[i] = current[i] - upsampled[i];
      laplacianPyramid.push(laplacian);
      currentWidth = nextWidth; currentHeight = nextHeight;
    }
    laplacianPyramid.push(gaussianPyramid[gaussianPyramid.length - 1]);
    for (let level = 0; level < laplacianPyramid.length - 1; level++) { const lap = laplacianPyramid[level]; const smoothFactor = 0.5 + level * 0.15; for (let i = 0; i < lap.length; i++) lap[i] *= smoothFactor; }
    let reconstructed = laplacianPyramid[laplacianPyramid.length - 1];
    currentWidth = Math.floor(width / Math.pow(2, laplacianPyramid.length - 1));
    currentHeight = Math.floor(height / Math.pow(2, laplacianPyramid.length - 1));
    for (let level = laplacianPyramid.length - 2; level >= 0; level--) {
      const targetWidth = Math.floor(width / Math.pow(2, level)), targetHeight = Math.floor(height / Math.pow(2, level));
      const upsampled = new Float32Array(targetWidth * targetHeight);
      for (let y = 0; y < targetHeight; y++) for (let x = 0; x < targetWidth; x++) { const srcX = Math.min(Math.floor(x / 2), currentWidth - 1), srcY = Math.min(Math.floor(y / 2), currentHeight - 1); upsampled[y * targetWidth + x] = reconstructed[srcY * currentWidth + srcX]; }
      const laplacian = laplacianPyramid[level];
      reconstructed = new Float32Array(targetWidth * targetHeight);
      for (let i = 0; i < targetWidth * targetHeight; i++) reconstructed[i] = Math.max(0, Math.min(1, upsampled[i] + laplacian[i]));
      currentWidth = targetWidth; currentHeight = targetHeight;
    }
    for (let i = 0; i < width * height; i++) maskData.data[i * 4 + 3] = Math.round(reconstructed[i] * 255);
    this.maskCtx.putImageData(maskData, 0, 0);
  }

  private applyTrimapRefinement(width: number, height: number): void {
    if (!this.maskCtx || !this.maskCanvas || !this.tempCtx) return;
    const maskData = this.maskCtx.getImageData(0, 0, width, height);
    const originalData = this.tempCtx.getImageData(0, 0, width, height);
    const FG_THRESHOLD = 230, BG_THRESHOLD = 25;
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4;
        const alpha = maskData.data[idx + 3];
        if (alpha > BG_THRESHOLD && alpha < FG_THRESHOLD) {
          let fgR = 0, fgG = 0, fgB = 0, fgCount = 0, bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
          const neighborRadius = 3;
          for (let dy = -neighborRadius; dy <= neighborRadius; dy++) {
            for (let dx = -neighborRadius; dx <= neighborRadius; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              const nIdx = (ny * width + nx) * 4, nAlpha = maskData.data[nIdx + 3];
              if (nAlpha >= FG_THRESHOLD) { fgR += originalData.data[nIdx]; fgG += originalData.data[nIdx + 1]; fgB += originalData.data[nIdx + 2]; fgCount++; }
              else if (nAlpha <= BG_THRESHOLD) { bgR += originalData.data[nIdx]; bgG += originalData.data[nIdx + 1]; bgB += originalData.data[nIdx + 2]; bgCount++; }
            }
          }
          if (fgCount > 0 && bgCount > 0) {
            fgR /= fgCount; fgG /= fgCount; fgB /= fgCount; bgR /= bgCount; bgG /= bgCount; bgB /= bgCount;
            const pixelR = originalData.data[idx], pixelG = originalData.data[idx + 1], pixelB = originalData.data[idx + 2];
            const distFG = Math.sqrt((pixelR - fgR) ** 2 + (pixelG - fgG) ** 2 + (pixelB - fgB) ** 2);
            const distBG = Math.sqrt((pixelR - bgR) ** 2 + (pixelG - bgG) ** 2 + (pixelB - bgB) ** 2);
            const totalDist = distFG + distBG;
            if (totalDist > 0) { const refinedAlpha = distBG / totalDist; const blendWeight = 0.6; const newAlpha = alpha / 255 * (1 - blendWeight) + refinedAlpha * blendWeight; maskData.data[idx + 3] = Math.round(Math.max(0, Math.min(1, newAlpha)) * 255); }
          }
        }
      }
    }
    this.maskCtx.putImageData(maskData, 0, 0);
  }

  private applySpillRemoval(width: number, height: number): void {
    if (!this.maskCtx || !this.maskCanvas || !this.tempCtx || !this.outputCtx) return;
    const maskData = this.maskCtx.getImageData(0, 0, width, height);
    const originalData = this.tempCtx.getImageData(0, 0, width, height);
    let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
    for (let i = 0; i < width * height; i++) { const alpha = maskData.data[i * 4 + 3]; if (alpha < 20) { bgR += originalData.data[i * 4]; bgG += originalData.data[i * 4 + 1]; bgB += originalData.data[i * 4 + 2]; bgCount++; } }
    if (bgCount < 100) return;
    bgR /= bgCount; bgG /= bgCount; bgB /= bgCount;
    const avgBrightness = (bgR + bgG + bgB) / 3;
    const colorCastR = bgR - avgBrightness, colorCastG = bgG - avgBrightness, colorCastB = bgB - avgBrightness;
    const castStrength = Math.sqrt(colorCastR ** 2 + colorCastG ** 2 + colorCastB ** 2);
    if (castStrength < 15) return;
    for (let i = 0; i < width * height; i++) {
      const alpha = maskData.data[i * 4 + 3];
      if (alpha > 20 && alpha < 240) {
        const idx = i * 4, spillStrength = (255 - alpha) / 255, removeAmount = spillStrength * 0.7;
        originalData.data[idx] = Math.max(0, Math.min(255, originalData.data[idx] - colorCastR * removeAmount));
        originalData.data[idx + 1] = Math.max(0, Math.min(255, originalData.data[idx + 1] - colorCastG * removeAmount));
        originalData.data[idx + 2] = Math.max(0, Math.min(255, originalData.data[idx + 2] - colorCastB * removeAmount));
      }
    }
    this.tempCtx.putImageData(originalData, 0, 0);
  }

  private computeEdgeStrengthMap(width: number, height: number): Float32Array {
    if (!this.tempCtx) return new Float32Array(width * height);
    const originalData = this.tempCtx.getImageData(0, 0, width, height);
    const edgeStrength = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const getLum = (px: number, py: number) => { const idx = (py * width + px) * 4; return 0.299 * originalData.data[idx] + 0.587 * originalData.data[idx + 1] + 0.114 * originalData.data[idx + 2]; };
        const gx = (-1 * getLum(x - 1, y - 1) + 1 * getLum(x + 1, y - 1) + -2 * getLum(x - 1, y) + 2 * getLum(x + 1, y) + -1 * getLum(x - 1, y + 1) + 1 * getLum(x + 1, y + 1)) / 4;
        const gy = (-1 * getLum(x - 1, y - 1) - 2 * getLum(x, y - 1) - 1 * getLum(x + 1, y - 1) + 1 * getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + 1 * getLum(x + 1, y + 1)) / 4;
        edgeStrength[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 128);
      }
    }
    return edgeStrength;
  }

  private applyAdaptiveMorphology(width: number, height: number, edgeMap: Float32Array): void {
    if (!this.maskCtx || !this.maskCanvas) return;
    const baseErosion = this.config.erosionSize ?? 1, baseDilation = this.config.dilationSize ?? 1;
    const imageData = this.maskCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const alpha = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3];
    const result = new Uint8ClampedArray(alpha);
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x, edge = edgeMap[idx], kernelScale = 1 - edge * 0.7, erosionRadius = Math.round(baseErosion * kernelScale);
        if (erosionRadius > 0) { let minVal = 255; for (let dy = -erosionRadius; dy <= erosionRadius; dy++) for (let dx = -erosionRadius; dx <= erosionRadius; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < width && ny >= 0 && ny < height) minVal = Math.min(minVal, alpha[ny * width + nx]); } result[idx] = minVal; }
      }
    }
    for (let i = 0; i < width * height; i++) alpha[i] = result[i];
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x, edge = edgeMap[idx], kernelScale = 1 - edge * 0.7, dilationRadius = Math.round(baseDilation * kernelScale);
        if (dilationRadius > 0) { let maxVal = 0; for (let dy = -dilationRadius; dy <= dilationRadius; dy++) for (let dx = -dilationRadius; dx <= dilationRadius; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < width && ny >= 0 && ny < height) maxVal = Math.max(maxVal, alpha[ny * width + nx]); } result[idx] = maxVal; }
      }
    }
    for (let i = 0; i < width * height; i++) data[i * 4 + 3] = result[i];
    this.maskCtx.putImageData(imageData, 0, 0);
  }

  private applyTemporalSmoothing(currentMask: ImageData, width: number, height: number): ImageData {
    const temporalSmoothing = this.config.temporalSmoothing ?? 0.5;
    const bufferSize = currentMask.data.length;
    if (!this.smoothedBuffer || this.smoothedBuffer.length !== bufferSize) {
      this.smoothedBuffer = new Uint8ClampedArray(bufferSize);
      this.previousMaskBuffer = new Uint8ClampedArray(bufferSize);
      this.previousMaskBuffer.set(currentMask.data);
      return currentMask;
    }
    if (temporalSmoothing === 0) return currentMask;
    const regionCols = 8, regionRows = 8;
    const regionWidth = Math.floor(width / regionCols), regionHeight = Math.floor(height / regionRows);
    const regionMotion = new Float32Array(regionCols * regionRows);
    for (let ry = 0; ry < regionRows; ry++) {
      for (let rx = 0; rx < regionCols; rx++) {
        let regionDiff = 0, regionPixels = 0;
        const startX = rx * regionWidth, startY = ry * regionHeight, endX = Math.min(startX + regionWidth, width), endY = Math.min(startY + regionHeight, height);
        for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) { const idx = (y * width + x) * 4 + 3; regionDiff += Math.abs(currentMask.data[idx] - this.previousMaskBuffer![idx]); regionPixels++; }
        regionMotion[ry * regionCols + rx] = regionPixels > 0 ? regionDiff / regionPixels : 0;
      }
    }
    for (let y = 0; y < height; y++) {
      const ry = Math.min(Math.floor(y / regionHeight), regionRows - 1);
      for (let x = 0; x < width; x++) {
        const rx = Math.min(Math.floor(x / regionWidth), regionCols - 1), regionIdx = ry * regionCols + rx, motion = regionMotion[regionIdx];
        const normalizedMotion = Math.min(motion / 30, 1), motionFactor = 1 / (1 + Math.exp(-8 * (normalizedMotion - 0.4))), adaptiveSmoothing = temporalSmoothing * (1 - motionFactor * 0.7);
        const i = (y * width + x) * 4;
        this.smoothedBuffer![i] = currentMask.data[i]; this.smoothedBuffer![i + 1] = currentMask.data[i + 1]; this.smoothedBuffer![i + 2] = currentMask.data[i + 2];
        this.smoothedBuffer![i + 3] = Math.round(this.previousMaskBuffer![i + 3] * adaptiveSmoothing + currentMask.data[i + 3] * (1 - adaptiveSmoothing));
      }
    }
    this.previousMaskBuffer!.set(this.smoothedBuffer!);
    return new ImageData(new Uint8ClampedArray(this.smoothedBuffer!), width, height);
  }

  private applyMaskComposite(mask: ImageData, width: number, height: number): void {
    if (!this.outputCtx || !this.tempCanvas) return;
    this.outputCtx.putImageData(mask, 0, 0);
    this.outputCtx.globalCompositeOperation = 'source-in';
    this.outputCtx.drawImage(this.tempCanvas, 0, 0, width, height);
    this.outputCtx.globalCompositeOperation = 'destination-over';
    if (this.config.useBlur && this.tempCanvas) { this.outputCtx.filter = `blur(${this.config.blurAmount || 10}px)`; this.outputCtx.drawImage(this.tempCanvas, 0, 0, width, height); this.outputCtx.filter = 'none'; }
    else if (this.backgroundImage) this.outputCtx.drawImage(this.backgroundImage, 0, 0, width, height);
    else { this.outputCtx.fillStyle = '#1a1a1a'; this.outputCtx.fillRect(0, 0, width, height); }
    this.outputCtx.globalCompositeOperation = 'source-over';
  }

  private async loadBackgroundImage(url: string): Promise<void> {
    try {
      let blob: Blob;
      if (url.startsWith('data:image/')) { const response = await fetch(url); blob = await response.blob(); }
      else { const response = await fetch(url, { mode: 'cors' }); if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`); blob = await response.blob(); }
      this.backgroundImage = await createImageBitmap(blob);
    } catch (error) { console.error('[Service] Failed to load background:', error); this.backgroundImage = null; }
  }

  private async handleProcessedFrame(videoFrame: VideoFrame): Promise<void> {
    if (this.trackWriter && this.isActive) { try { await this.trackWriter.write(videoFrame); } catch (error) { console.error('[Service] Error writing frame:', error); videoFrame.close(); } }
    else videoFrame.close();
  }

  public async updateConfig(newConfig: Partial<VirtualBackgroundConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.backgroundImageUrl !== undefined) {
      if (newConfig.backgroundImageUrl) await this.loadBackgroundImage(newConfig.backgroundImageUrl);
      else this.backgroundImage = null;
    }
  }

  public dispose(): void {
    this.isActive = false;
    if (this.processingController) { this.processingController.abort(); this.processingController = null; }
    if (this.trackWriter) { try { this.trackWriter.releaseLock(); } catch (e) {} this.trackWriter = null; }
    this.trackProcessor = null; this.trackGenerator = null;
    if (this.imageSegmenter) { this.imageSegmenter.close(); this.imageSegmenter = null; }
    if (this.backgroundImage) { this.backgroundImage.close(); this.backgroundImage = null; }
    this.previousMask = null; this.maskCanvas = null; this.maskCtx = null;
    this.smoothedBuffer = null; this.previousMaskBuffer = null;
    this.isInitialized = false;
  }

  public isServiceInitialized(): boolean { return this.isInitialized; }

  public stopVirtualBackground(): void {
    this.isActive = false;
    if (this.processingController) { this.processingController.abort(); this.processingController = null; }
    if (this.trackWriter) { try { this.trackWriter.releaseLock(); } catch (e) {} this.trackWriter = null; }
  }
}
