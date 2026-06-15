/**
 * Virtual Background Service
 *
 * Implements virtual background replacement using MediaPipe segmentation.
 * Supports blur and image backgrounds.
 *
 * REQUIREMENTS:
 * - Copy /public/wasm/ folder from MediaPipe
 * - Copy /public/models/selfie_multiclass_256x256.tflite
 *
 * Uses the multiclass selfie segmenter (6 classes: background, hair, body-skin,
 * face-skin, clothes, others) so the hair edge can be feathered separately —
 * flyaway hair pixels fade gently instead of clipping into halo.
 *
 * The mask comes out as float confidence per class (not a binary 0/255). We
 * EMA-smooth the float, then run a hair-aware smoothstep to produce the alpha.
 * That gives a naturally-soft silhouette without a uniform Canvas 2D blur
 * pass smearing real edges.
 *
 * Segmentation runs at a fixed 640x360 (well above the 256x256 model input)
 * while the final composite stays at camera resolution — the mask is bilinearly
 * upsampled by the browser when drawn into the full-res output canvas.
 */

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

// Type declarations for MediaStreamTrackProcessor API
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
  /** Smoothstep midpoint — pixel with personConf at this value is 50% alpha. */
  segmentationThreshold: number;
  backgroundImageUrl?: string;
  blurAmount?: number;
  useBlur?: boolean;
  /** Base EMA factor for non-hair pixels in low-motion regions. 0..1, higher = more smoothing. */
  temporalSmoothing?: number;
  /** EMA floor for hair pixels — hair always smooths at least this much. */
  hairTemporalSmoothing?: number;
  /** Half-width of the smoothstep band for non-hair pixels. lo = threshold - band, hi = threshold + band. */
  smoothstepBand?: number;
  /** Wider half-width for hair, so flyaway pixels fade gently. */
  hairSmoothstepBand?: number;
  /** Optional residual gaussian blur on the mask canvas (px). 0 disables. */
  maskBlur?: number;
  // Legacy no-ops kept so older config callers don't break.
  edgeSmoothing?: number;
  erosionSize?: number;
  dilationSize?: number;
  adaptiveThreshold?: boolean;
  hairRefinement?: boolean;
  minContourArea?: number;
}

// Defaults moved to videoEffectsConfig.ts so UI components can import them
// without pulling MediaPipe into the initial bundle. Re-exported for
// backwards compatibility with existing importers.
import { DEFAULT_VIRTUAL_BACKGROUND_CONFIG } from './videoEffectsConfig';
export { DEFAULT_BACKGROUNDS, DEFAULT_VIRTUAL_BACKGROUND_CONFIG } from './videoEffectsConfig';

// Multiclass selfie segmenter class indices.
const CLS_BACKGROUND = 0;
const CLS_HAIR = 1;
// Working resolution for segmentation + mask. Camera res can be higher; mask
// is bilinearly upsampled at the final composite step.
const PROC_W = 640;
const PROC_H = 360;
// Cap the camera-resolution composite so 4K webcams don't blow CPU on the
// final draw. 720p is plenty for WebRTC on the receive side.
const MAX_FULL_W = 1280;
const MAX_FULL_H = 720;

function smoothstep(lo: number, hi: number, x: number): number {
  if (hi <= lo) return x < lo ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

interface MPMaskLike {
  getAsFloat32Array: () => Float32Array;
  close?: () => void;
}

interface SegmentResult {
  confidenceMasks?: MPMaskLike[];
  categoryMask?: { close?: () => void };
}

export class VirtualBackgroundService {
  private config: VirtualBackgroundConfig;
  private isActive = false;
  private trackProcessor: MediaStreamTrackProcessor<VideoFrame> | null = null;
  private trackGenerator: MediaStreamTrackGenerator<VideoFrame> | null = null;
  private processingController: AbortController | null = null;
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null;
  private imageSegmenter: ImageSegmenter | null = null;
  private isInitialized = false;
  // Camera-resolution snapshot of the current frame — used for body texture and blur background.
  private tempFullCanvas: OffscreenCanvas | null = null;
  private tempFullCtx: OffscreenCanvasRenderingContext2D | null = null;
  // Fixed 640x360 canvas — segmentation input.
  private procCanvas: OffscreenCanvas | null = null;
  private procCtx: OffscreenCanvasRenderingContext2D | null = null;
  // Fixed 640x360 mask canvas (Uint8 alpha pre-upsample).
  private maskCanvas: OffscreenCanvas | null = null;
  private maskCtx: OffscreenCanvasRenderingContext2D | null = null;
  // Camera-resolution final composite — what becomes the output VideoFrame.
  private outputCanvas: OffscreenCanvas | null = null;
  private outputCtx: OffscreenCanvasRenderingContext2D | null = null;
  private backgroundImage: ImageBitmap | null = null;
  private isProcessing = false;
  // Previous-frame person-confidence (Float32, length PROC_W*PROC_H). Used for
  // temporal EMA on the float — preserves the soft edge across frames instead
  // of binarising and re-feathering.
  private previousConf: Float32Array | null = null;
  // Reusable scratch buffers — avoid per-frame allocation of big typed arrays.
  private maskImageData: ImageData | null = null;

  constructor(config: VirtualBackgroundConfig = DEFAULT_VIRTUAL_BACKGROUND_CONFIG) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
    const wasmPath = import.meta.env.BASE_URL + 'wasm';
    const modelPath = import.meta.env.BASE_URL + 'models/selfie_multiclass_256x256.tflite';
    console.log('[Video/vb] Initializing — wasm:', wasmPath, 'model:', modelPath, 'config:', this.config);

    let stage = 'FilesetResolver';
    try {
      const vision = await FilesetResolver.forVisionTasks(wasmPath);
      console.log('[Video/vb] FilesetResolver loaded ok');

      stage = 'ImageSegmenter.createFromOptions';
      this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU'
        },
        // VIDEO mode keeps internal state across frames so the segmenter
        // produces temporally-coherent masks (no flicker). IMAGE mode
        // re-segments from scratch every frame and the boundaries jitter.
        runningMode: 'VIDEO',
        // Float confidence per class — gives us the soft edge to EMA-smooth.
        // categoryMask (binary) would throw that gradient away.
        outputCategoryMask: false,
        outputConfidenceMasks: true
      });
      console.log('[Video/vb] ImageSegmenter ready (multiclass, GPU delegate, VIDEO mode, confidence masks)');

      if (this.config.backgroundImageUrl) {
        stage = 'loadBackgroundImage';
        console.log('[Video/vb] Loading background image:', this.config.backgroundImageUrl);
        await this.loadBackgroundImage(this.config.backgroundImageUrl);
        console.log('[Video/vb] Background image cached');
      }

      this.isInitialized = true;
      console.log('[Video/vb] Initialization complete');
    } catch (error) {
      const e = error as Error;
      console.error(`[Video/vb] Initialization failed at stage="${stage}":`, e.name, e.message);
      if (stage === 'FilesetResolver') {
        console.error('[Video/vb] Likely cause: /wasm/ folder missing in public/ — check ' + wasmPath);
      } else if (stage === 'ImageSegmenter.createFromOptions') {
        console.error('[Video/vb] Likely cause: selfie_multiclass_256x256.tflite model 404 — check ' + modelPath);
      } else if (stage === 'loadBackgroundImage') {
        console.error('[Video/vb] Likely cause: CSP blocks the bg image host or the URL 404s. Init still threw — non-fatal.');
      }
      if (e.stack) console.error('[Video/vb] stack:', e.stack);
      throw error;
    }
  }

  public async setupAndStart(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.isInitialized || !this.imageSegmenter) {
      throw new Error('Service not initialized');
    }
    if (!('MediaStreamTrackProcessor' in window) || !('MediaStreamTrackGenerator' in window)) {
      throw new Error('Browser does not support required APIs');
    }

    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) throw new Error('No video track found');

    console.log('[Video/vb] setupAndStart - creating processor and generator');
    this.trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
    this.trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
    this.trackWriter = this.trackGenerator.writable.getWriter();
    this.isActive = true;
    console.log('[Video/vb] setupAndStart - starting stream processing');
    this.startStreamProcessing();

    const audioTracks = inputStream.getAudioTracks();
    console.log('[Video/vb] setupAndStart - returning stream with generator writable:', !!this.trackGenerator?.writable);
    return new MediaStream([this.trackGenerator, ...audioTracks]);
  }

  private frameCount = 0;

  private async startStreamProcessing(): Promise<void> {
    console.log('[Video/vb] startStreamProcessing called, isActive:', this.isActive);
    if (!this.trackProcessor) {
      console.log('[Video/vb] startStreamProcessing - no trackProcessor!');
      return;
    }
    this.processingController = new AbortController();
    const reader = this.trackProcessor.readable.getReader();
    console.log('[Video/vb] startStreamProcessing - reader obtained, starting loop');

    try {
      while (this.isActive && !this.processingController.signal.aborted) {
        const { done, value: videoFrame } = await reader.read();
        if (done) break;
        await this.processVideoFrame(videoFrame);
      }
    } catch (error) {
      if (!this.processingController.signal.aborted) {
        console.error('[Video/vb] Stream error:', error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async processVideoFrame(videoFrame: VideoFrame): Promise<void> {
    this.frameCount++;

    if (!this.imageSegmenter || this.isProcessing) {
      videoFrame.close();
      return;
    }

    try {
      this.isProcessing = true;
      const fullW = Math.min(videoFrame.codedWidth || videoFrame.displayWidth, MAX_FULL_W);
      const fullH = Math.min(videoFrame.codedHeight || videoFrame.displayHeight, MAX_FULL_H);

      // Camera-res canvases (full body texture + final output) get rebuilt only when
      // the camera resolution changes — proc/mask stay at the fixed 640x360.
      if (!this.tempFullCanvas || this.tempFullCanvas.width !== fullW || this.tempFullCanvas.height !== fullH) {
        this.tempFullCanvas = new OffscreenCanvas(fullW, fullH);
        this.tempFullCtx = this.tempFullCanvas.getContext('2d');
        this.outputCanvas = new OffscreenCanvas(fullW, fullH);
        this.outputCtx = this.outputCanvas.getContext('2d');
      }
      if (!this.procCanvas) {
        this.procCanvas = new OffscreenCanvas(PROC_W, PROC_H);
        this.procCtx = this.procCanvas.getContext('2d');
        this.maskCanvas = new OffscreenCanvas(PROC_W, PROC_H);
        this.maskCtx = this.maskCanvas.getContext('2d');
        this.maskImageData = this.maskCtx?.createImageData(PROC_W, PROC_H) ?? null;
        this.previousConf = null;
      }

      if (!this.tempFullCtx || !this.outputCtx || !this.procCtx || !this.maskCtx) {
        throw new Error('Failed to get 2D context');
      }

      // Camera-res snapshot — used as the body texture and as the source for
      // the blur background. Drawing the videoFrame once and reusing both is
      // cheaper than doing it twice.
      this.tempFullCtx.drawImage(videoFrame, 0, 0, fullW, fullH);
      // Downscaled segmenter input. The segmenter resizes to 256x256 internally
      // anyway, so going below 640x360 buys little; going higher just costs CPU.
      this.procCtx.drawImage(videoFrame, 0, 0, PROC_W, PROC_H);

      // VIDEO mode requires segmentForVideo() with a monotonic timestamp.
      // This is what gives us frame-to-frame coherence — the segmenter
      // tracks the person across frames internally and dampens the mask
      // jitter we got from per-frame independent IMAGE-mode inference.
      const result = this.imageSegmenter.segmentForVideo(this.procCanvas, performance.now()) as unknown as SegmentResult;
      try {
        this.processSegmentationResults(result, fullW, fullH);
      } finally {
        // MediaPipe MPMask owns GPU memory — without close() the segmenter
        // leaks one MPMask per frame and Chrome warns "You seem to be creating
        // MPMask instances without invoking .close()."
        try { result.categoryMask?.close?.(); } catch { /* noop */ }
        try { result.confidenceMasks?.forEach(m => m.close?.()); } catch { /* noop */ }
      }

      if (!this.outputCanvas) throw new Error('Output canvas not available');
      const processedFrame = new VideoFrame(this.outputCanvas, {
        timestamp: videoFrame.timestamp,
        alpha: 'discard'
      });
      await this.handleProcessedFrame(processedFrame);
    } catch (error) {
      console.error('[Video/vb] Error processing frame:', error);
    } finally {
      this.isProcessing = false;
      videoFrame.close();
    }
  }

  private processSegmentationResults(result: SegmentResult, fullW: number, fullH: number): void {
    if (!this.maskCtx || !this.maskImageData) return;

    const masks = result.confidenceMasks;
    if (!masks || masks.length < 2) return;

    // Multiclass model layout: [0]=bg, [1]=hair, [2]=body-skin, [3]=face-skin, [4]=clothes, [5]=others.
    // Person confidence is 1 - bg (equivalent to the sum of classes 1..5, but cheaper to read one mask).
    const bgConf = masks[CLS_BACKGROUND].getAsFloat32Array();
    const hairConf = masks[CLS_HAIR].getAsFloat32Array();
    const N = bgConf.length;

    const threshold = this.config.segmentationThreshold ?? 0.5;
    const baseTau = this.config.temporalSmoothing ?? 0.7;
    const hairTau = this.config.hairTemporalSmoothing ?? 0.85;
    const band = this.config.smoothstepBand ?? 0.1;
    const hairBand = this.config.hairSmoothstepBand ?? 0.35;

    const lo = threshold - band;
    const hi = threshold + band;
    const hairLo = threshold - hairBand;
    const hairHi = threshold + hairBand;

    // Reset the previous-frame buffer if the resolution changed (proc res is fixed
    // but the segmenter could in theory hand back a different size — defensive).
    if (!this.previousConf || this.previousConf.length !== N) {
      this.previousConf = new Float32Array(N);
      // Seed with the current frame so the first frame doesn't fade in from black.
      for (let i = 0; i < N; i++) this.previousConf[i] = 1 - bgConf[i];
    }

    const prev = this.previousConf;
    const data = this.maskImageData.data;

    // Hot loop. Keep the body branch-free where possible; the JIT inlines smoothstep.
    for (let i = 0; i < N; i++) {
      const personConf = 1 - bgConf[i];
      const isHair = hairConf[i] > 0.5;

      // Adaptive tau: lean on previous frame when motion is small (less flicker),
      // on the current frame when motion is large (less lag). Hair has a high
      // floor so flyaway pixels stay calm regardless of motion.
      const p = prev[i];
      const delta = personConf > p ? personConf - p : p - personConf;
      const motionTau = delta < 0.1 ? 0.85 : Math.min(0.85, baseTau);
      const t = isHair ? Math.max(motionTau, hairTau) : motionTau;
      const sm = t * p + (1 - t) * personConf;
      prev[i] = sm;

      // Soft falloff. Hair gets a wider band so flyaway pixels feather out
      // gently instead of clipping into a halo.
      const alpha = isHair
        ? smoothstep(hairLo, hairHi, sm) * 255
        : smoothstep(lo, hi, sm) * 255;

      const px = i * 4;
      data[px] = 255;
      data[px + 1] = 255;
      data[px + 2] = 255;
      data[px + 3] = alpha;
    }

    this.maskCtx.putImageData(this.maskImageData, 0, 0);

    // Optional residual smoothing — default 0 since smoothstep+EMA already
    // handles it. Bumping above 0 uniformly softens edges (loses detail).
    const maskBlur = this.config.maskBlur ?? 0;
    if (maskBlur > 0 && this.maskCanvas) {
      this.maskCtx.filter = `blur(${maskBlur}px)`;
      this.maskCtx.drawImage(this.maskCanvas, 0, 0);
      this.maskCtx.filter = 'none';
    }

    this.applyMaskComposite(fullW, fullH);
  }

  private applyMaskComposite(fullW: number, fullH: number): void {
    if (!this.outputCtx || !this.tempFullCanvas || !this.maskCanvas) return;

    this.outputCtx.clearRect(0, 0, fullW, fullH);
    // Bilinear upsample of the proc-res mask onto the camera-res output. The
    // canvas-2D scaler is fine here — we're upsampling a value that's already
    // smoothed in float space.
    this.outputCtx.drawImage(this.maskCanvas, 0, 0, fullW, fullH);

    // Body: cut the camera frame by the mask alpha.
    this.outputCtx.globalCompositeOperation = 'source-in';
    this.outputCtx.drawImage(this.tempFullCanvas, 0, 0, fullW, fullH);

    // Background: behind the body.
    this.outputCtx.globalCompositeOperation = 'destination-over';
    if (this.config.useBlur && this.tempFullCanvas) {
      this.outputCtx.filter = `blur(${this.config.blurAmount || 10}px)`;
      this.outputCtx.drawImage(this.tempFullCanvas, 0, 0, fullW, fullH);
      this.outputCtx.filter = 'none';
    } else if (this.backgroundImage) {
      this.outputCtx.drawImage(this.backgroundImage, 0, 0, fullW, fullH);
    } else {
      this.outputCtx.fillStyle = '#1a1a1a';
      this.outputCtx.fillRect(0, 0, fullW, fullH);
    }

    this.outputCtx.globalCompositeOperation = 'source-over';
  }

  private async loadBackgroundImage(url: string): Promise<void> {
    // Security: Validate URL before fetching to prevent SSRF attacks
    const ALLOWED_DOMAINS = [
      'images.unsplash.com',
      'gamebuddies.io',
      'localhost',
      '127.0.0.1',
      'render.com',
      'onrender.com',
    ];

    try {
      // Resolve relative URLs (e.g. "/bluffalo/backgrounds/1.webp") against
      // the page origin. Absolute URLs ignore the base argument.
      const urlObj = new URL(url, window.location.origin);
      const isAllowed = ALLOWED_DOMAINS.some(domain =>
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        console.warn('[Video/vb] Blocked untrusted URL domain:', urlObj.hostname);
        this.backgroundImage = null;
        return;
      }

      const response = await fetch(urlObj.href, { mode: 'cors' });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const blob = await response.blob();
      this.backgroundImage = await createImageBitmap(blob);
    } catch (error) {
      console.error('[Video/vb] Failed to load background:', error);
      this.backgroundImage = null;
    }
  }

  private async handleProcessedFrame(videoFrame: VideoFrame): Promise<void> {
    if (this.trackWriter && this.isActive) {
      try {
        await this.trackWriter.write(videoFrame);
      } catch (error) {
        // Writer was closed mid-frame (service disposed, downstream detached).
        // Halt the loop so we don't spam the console — the reader loop will
        // exit cleanly on its next iteration.
        videoFrame.close();
        if (this.isActive) {
          console.warn('[Video/vb] Writer closed; halting stream loop:', (error as Error).message);
          this.isActive = false;
          this.trackWriter = null;
        }
      }
    } else {
      videoFrame.close();
    }
  }

  public async updateConfig(newConfig: Partial<VirtualBackgroundConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.backgroundImageUrl !== undefined) {
      if (newConfig.backgroundImageUrl) {
        await this.loadBackgroundImage(newConfig.backgroundImageUrl);
      } else {
        this.backgroundImage = null;
      }
    }
  }

  public stopVirtualBackground(): void {
    this.isActive = false;
    if (this.processingController) {
      this.processingController.abort();
      this.processingController = null;
    }
    if (this.trackWriter) {
      try { this.trackWriter.releaseLock(); } catch (e) { /* ignore */ }
      this.trackWriter = null;
    }
  }

  public dispose(): void {
    this.stopVirtualBackground();
    this.trackProcessor = null;
    this.trackGenerator = null;
    if (this.imageSegmenter) {
      this.imageSegmenter.close();
      this.imageSegmenter = null;
    }
    if (this.backgroundImage) {
      this.backgroundImage.close();
      this.backgroundImage = null;
    }
    this.tempFullCanvas = null;
    this.tempFullCtx = null;
    this.procCanvas = null;
    this.procCtx = null;
    this.maskCanvas = null;
    this.maskCtx = null;
    this.outputCanvas = null;
    this.outputCtx = null;
    this.maskImageData = null;
    this.previousConf = null;
    this.isInitialized = false;
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
