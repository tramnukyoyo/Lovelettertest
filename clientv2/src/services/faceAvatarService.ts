/**
 * Face Avatar Service — MediaPipe Face Landmarker + Three.js
 *
 * Detects a face in the live video stream via MediaPipe's FaceLandmarker
 * (52 blendshapes + facial transformation matrix), drives a 3D head model
 * (raccoon_head.glb) via Three.js so the model follows the user's head
 * pose and facial expressions, composites the rendered head over the
 * original camera feed, and emits the result as a new MediaStream so
 * peers receive the avatar instead of the user's real face.
 *
 * Files this service depends on (per game's public/ folder):
 *   public/wasm/                    — MediaPipe wasm runtime
 *   public/models/face_landmarker.task   — face landmark model (3.76 MB)
 *   public/models/raccoon_head.glb       — 3D head model (9 MB)
 *
 * If the .glb fetch fails, falls back to a geometric primitive (sphere)
 * so the user still gets *something* on their face — never a black frame.
 */

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ============================================================================
// MediaStreamTrackProcessor / Generator type declarations (Chromium-only API
// not yet in lib.dom.d.ts — TS doesn't know these exist without help).
// ============================================================================

interface MediaStreamTrackProcessor<T = VideoFrame> { readable: ReadableStream<T>; }
interface MediaStreamTrackProcessorInit { track: MediaStreamTrack; }
interface MediaStreamTrackGenerator<T = VideoFrame> extends MediaStreamTrack { writable: WritableStream<T>; }
interface MediaStreamTrackGeneratorInit { kind: string; }
declare const MediaStreamTrackProcessor: { prototype: MediaStreamTrackProcessor; new (init: MediaStreamTrackProcessorInit): MediaStreamTrackProcessor; };
declare const MediaStreamTrackGenerator: { prototype: MediaStreamTrackGenerator; new (init: MediaStreamTrackGeneratorInit): MediaStreamTrackGenerator; };

// ============================================================================
// Public config
// ============================================================================

export interface FaceAvatarConfig {
  avatarType: 'raccoon' | 'metahuman' | 'robot' | 'alien' | 'cat' | 'panda' | 'pug' | 'bunny' | 'custom' | 'sphere' | 'cube' | 'ring' | 'triangle';
  avatarColor: string;
  avatarSize: number;
  trackingSmoothing: number;
  enableBlendshapes: boolean;
  expressionIntensity: number;
  customModelUrl?: string;
}

// Default config moved to videoEffectsConfig.ts so UI components can import
// it without pulling three/MediaPipe into the initial bundle. Re-exported for
// backwards compatibility with existing importers.
import { DEFAULT_AVATAR_CONFIG } from './videoEffectsConfig';
export { DEFAULT_AVATAR_CONFIG } from './videoEffectsConfig';

// ============================================================================
// Service
// ============================================================================

/**
 * Debug switch for white-raccoon investigation. Read once at module load.
 * Append `?facetest=red|basic|wireframe` to any URL to override material rendering.
 *   red       — solid red MeshBasicMaterial. Confirms geometry renders + scale.
 *   basic     — unlit MeshBasicMaterial keeping the loaded texture map. If still
 *               white, texture isn't bound. If textured, the bug is in our PBR/IBL/light setup.
 *   wireframe — green wireframe. Confirms mesh topology is sane.
 *   (none)    — production behavior.
 */
const FACE_TEST_MODE: '' | 'red' | 'basic' | 'wireframe' = (() => {
  try {
    const v = new URLSearchParams(location.search).get('facetest') || '';
    return v === 'red' || v === 'basic' || v === 'wireframe' ? v : '';
  } catch { return ''; }
})();
if (FACE_TEST_MODE) console.log('[Video/fa] FACE_TEST_MODE =', FACE_TEST_MODE);

export class FaceAvatarService {
  private config: FaceAvatarConfig;
  private isActive = false;
  private isInitialized = false;
  private isProcessing = false;

  // Stream pipeline
  private trackProcessor: MediaStreamTrackProcessor<VideoFrame> | null = null;
  private trackGenerator: MediaStreamTrackGenerator<VideoFrame> | null = null;
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null;
  private processingController: AbortController | null = null;

  // MediaPipe
  private faceLandmarker: FaceLandmarker | null = null;

  // Three.js
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private gltfLoader: GLTFLoader | null = null;
  private avatarModel: GLTF | null = null;
  private morphTargetMeshes: THREE.Mesh[] = [];
  private geometricAvatar: THREE.Mesh | null = null;

  // Canvases
  private tempCanvas: OffscreenCanvas | null = null;
  private tempCtx: OffscreenCanvasRenderingContext2D | null = null;
  private outputCanvas: OffscreenCanvas | null = null;
  private outputCtx: OffscreenCanvasRenderingContext2D | null = null;
  private threeCanvas: OffscreenCanvas | null = null;

  constructor(config: FaceAvatarConfig = DEFAULT_AVATAR_CONFIG) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  public async initialize(): Promise<void> {
    const wasmUrl = import.meta.env.BASE_URL + 'wasm';
    const modelUrl = import.meta.env.BASE_URL + 'models/face_landmarker.task';
    console.log('[Video/fa] Initializing — wasm:', wasmUrl, 'model:', modelUrl);

    let stage = 'FilesetResolver';
    try {
      const vision = await FilesetResolver.forVisionTasks(wasmUrl);
      console.log('[Video/fa] FilesetResolver loaded ok');

      stage = 'FaceLandmarker.createFromOptions';
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: this.config.enableBlendshapes,
        outputFacialTransformationMatrixes: true,
      });
      console.log('[Video/fa] FaceLandmarker ready (VIDEO mode, GPU delegate)');

      stage = 'Three.js init';
      this.initializeThreeJS();

      stage = 'load avatar model';
      await this.loadAvatar();

      this.isInitialized = true;
      console.log('[Video/fa] Initialization complete');
    } catch (error) {
      const e = error as Error;
      console.error(`[Video/fa] Initialization failed at stage="${stage}":`, e.name, e.message);
      if (stage === 'FilesetResolver') {
        console.error('[Video/fa] Likely cause: /wasm/ folder missing in public/ — check ' + wasmUrl);
      } else if (stage === 'FaceLandmarker.createFromOptions') {
        console.error('[Video/fa] Likely cause: face_landmarker.task model 404 — check ' + modelUrl);
      }
      if (e.stack) console.error('[Video/fa] stack:', e.stack);
      throw error;
    }
  }

  private initializeThreeJS(): void {
    this.scene = new THREE.Scene();

    // PerspectiveCamera — aspect/projection updated on first frame from real
    // dimensions. fov=60 matches typical webcam framing well.
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 5000);
    this.camera.position.set(0, 0, 0);

    // Match the old DDF/Schooled setup that was confirmed working: a simple
    // ambient + single overhead directional, no IBL, no fancy lights. The
    // intermediate "PBR with RoomEnvironment IBL" approach kept washing the
    // raccoon to white no matter how aggressively we dimmed lights or
    // envMapIntensity — IBL contribution from a 360° procedural sky just
    // overwhelms a mid-tone diffuse texture.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(0, 1, 0);
    this.scene.add(dir);

    this.gltfLoader = new GLTFLoader();
  }

  private async loadAvatar(): Promise<void> {
    const glbAvatarTypes: FaceAvatarConfig['avatarType'][] = ['raccoon', 'metahuman', 'robot', 'alien', 'cat', 'panda', 'pug', 'bunny', 'custom'];
    if (glbAvatarTypes.includes(this.config.avatarType)) {
      try {
        await this.loadGLTFAvatar();
      } catch (err) {
        console.error('[Video/fa] GLB load failed, falling back to geometric:', err);
        this.createGeometricAvatar();
      }
    } else {
      this.createGeometricAvatar();
    }
  }

  private async loadGLTFAvatar(): Promise<void> {
    if (!this.gltfLoader || !this.scene) return;

    const baseUrl = import.meta.env.BASE_URL;
    let modelUrl: string;
    switch (this.config.avatarType) {
      case 'raccoon':   modelUrl = baseUrl + 'models/raccoon_head.glb'; break;
      case 'metahuman': modelUrl = baseUrl + 'models/metahuman_head.glb'; break;
      case 'robot':     modelUrl = baseUrl + 'models/robot_head.glb'; break;
      case 'alien':     modelUrl = baseUrl + 'models/alien_head.glb'; break;
      case 'cat':       modelUrl = baseUrl + 'models/cat.glb'; break;
      case 'panda':     modelUrl = baseUrl + 'models/panda.glb'; break;
      case 'pug':       modelUrl = baseUrl + 'models/pug.glb'; break;
      case 'bunny':     modelUrl = baseUrl + 'models/bunny.glb'; break;
      case 'custom':    modelUrl = this.config.customModelUrl || baseUrl + 'models/raccoon_head.glb'; break;
      default:          modelUrl = baseUrl + 'models/raccoon_head.glb';
    }

    console.log('[Video/fa] Loading GLB:', modelUrl);

    const gltf = await new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader!.load(
        modelUrl,
        resolve,
        (progress) => {
          if (progress.lengthComputable) {
            const pct = Math.round(100 * (progress.loaded / progress.total));
            // Only log every ~25% so we don't spam
            if (pct === 25 || pct === 50 || pct === 75 || pct === 100) {
              console.log(`[Video/fa] GLB ${pct}% loaded`);
            }
          }
        },
        reject
      );
    });

    this.avatarModel = gltf;

    // Diagnostic-first: log per-mesh + per-material state on load so we can
    // tell from the user's console whether textures are actually bound. The
    // ?facetest=red|basic|wireframe URL switch lets the user verify which
    // layer is broken (geometry / texture binding / PBR lighting).
    gltf.scene.traverse((object: THREE.Object3D) => {
      const maybeMesh = object as THREE.Mesh;
      if (!(maybeMesh as { isMesh?: boolean }).isMesh) return;
      maybeMesh.frustumCulled = false;

      if (maybeMesh.morphTargetDictionary && maybeMesh.morphTargetInfluences) {
        this.morphTargetMeshes.push(maybeMesh);
        console.log('[Video/fa] Found morph targets:', Object.keys(maybeMesh.morphTargetDictionary));
      }

      const matAny = maybeMesh.material;

      // Apply ?facetest= overrides for visual debugging.
      if (FACE_TEST_MODE === 'red') {
        maybeMesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      } else if (FACE_TEST_MODE === 'wireframe') {
        maybeMesh.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
      } else if (FACE_TEST_MODE === 'basic') {
        const orig = (Array.isArray(matAny) ? matAny[0] : matAny) as THREE.MeshStandardMaterial | undefined;
        const map = orig?.map ?? null;
        maybeMesh.material = new THREE.MeshBasicMaterial({ map: map ?? undefined });
      }
    });

    // We drive the model matrix manually from MediaPipe's transformation
    // matrix — Three.js's auto-update would fight that.
    gltf.scene.matrixAutoUpdate = false;
    gltf.scene.visible = false; // hidden until we detect a face
    this.scene.add(gltf.scene);
    console.log('[Video/fa] GLB ready, model added to scene');
  }

  private createGeometricAvatar(): void {
    if (!this.scene) return;
    let geometry: THREE.BufferGeometry;
    switch (this.config.avatarType) {
      case 'sphere':   geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
      case 'cube':     geometry = new THREE.BoxGeometry(1, 1, 1); break;
      case 'ring':     geometry = new THREE.RingGeometry(0.3, 0.5, 32); break;
      case 'triangle': geometry = new THREE.ConeGeometry(0.5, 1, 3); break;
      default:         geometry = new THREE.SphereGeometry(0.5, 32, 32);
    }
    const material = new THREE.MeshBasicMaterial({
      color: this.config.avatarColor,
      transparent: true,
      opacity: 0.85,
    });
    this.geometricAvatar = new THREE.Mesh(geometry, material);
    this.geometricAvatar.matrixAutoUpdate = false;
    this.geometricAvatar.visible = false;
    this.scene.add(this.geometricAvatar);
    console.log('[Video/fa] Geometric fallback created:', this.config.avatarType);
  }

  // --------------------------------------------------------------------------
  // Stream pipeline
  // --------------------------------------------------------------------------

  public async setupAndStart(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.isInitialized || !this.faceLandmarker) {
      throw new Error('Service not initialized');
    }
    if (!('MediaStreamTrackProcessor' in window) || !('MediaStreamTrackGenerator' in window)) {
      throw new Error('Browser does not support MediaStreamTrackProcessor/Generator');
    }
    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) throw new Error('No video track in input stream');

    this.trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
    this.trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
    this.isActive = true;
    void this.startStreamProcessing();

    // Pass through any audio tracks unchanged.
    const audioTracks = inputStream.getAudioTracks();
    return new MediaStream([this.trackGenerator, ...audioTracks]);
  }

  private async startStreamProcessing(): Promise<void> {
    if (!this.trackProcessor || !this.trackGenerator) return;
    this.processingController = new AbortController();
    this.trackWriter = this.trackGenerator.writable.getWriter();
    const reader = this.trackProcessor.readable.getReader();

    try {
      while (this.isActive && !this.processingController.signal.aborted) {
        const { done, value: videoFrame } = await reader.read();
        if (done) break;
        await this.processVideoFrame(videoFrame);
      }
    } catch (error) {
      if (this.processingController && !this.processingController.signal.aborted) {
        console.error('[Video/fa] Stream loop error:', error);
      }
    } finally {
      try { reader.releaseLock(); } catch { /* noop */ }
    }
  }

  private async processVideoFrame(videoFrame: VideoFrame): Promise<void> {
    if (this.isProcessing) {
      videoFrame.close();
      return;
    }
    this.isProcessing = true;

    try {
      const width = videoFrame.displayWidth || videoFrame.codedWidth;
      const height = videoFrame.displayHeight || videoFrame.codedHeight;

      // Lazy-init / resize canvases and Three.js renderer as the stream
      // dimensions become known (and on resolution change).
      if (!this.tempCanvas || this.tempCanvas.width !== width || this.tempCanvas.height !== height) {
        this.tempCanvas = new OffscreenCanvas(width, height);
        this.tempCtx = this.tempCanvas.getContext('2d');
        this.outputCanvas = new OffscreenCanvas(width, height);
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.threeCanvas = new OffscreenCanvas(width, height);

        if (!this.renderer) {
          // Default renderer config — matches the old DDF/Schooled setup that
          // shipped a textured raccoon. Adding outputColorSpace + tone mapping
          // + RoomEnvironment IBL on top of this baseline kept washing the
          // model to a uniform white blob; no amount of light/IBL dimming
          // brought the texture color back. Keep it minimal.
          this.renderer = new THREE.WebGLRenderer({
            canvas: this.threeCanvas,
            alpha: true,
            antialias: true,
          });
          this.renderer.setClearColor(0x000000, 0);
        }
        this.renderer.setSize(width, height, false);

        if (this.camera) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
        }
      }

      if (!this.tempCtx || !this.outputCtx) return;

      // Draw the raw camera frame into the temp canvas — needed both as
      // detector input (MediaPipe needs an image source) and as the bottom
      // layer of the composite.
      this.tempCtx.drawImage(videoFrame, 0, 0, width, height);

      // Run face detection + drive the model
      this.detectAndApplyFaceTransform();

      // Composite: video frame + 3D-rendered avatar
      this.renderComposite(width, height);

      const processedFrame = new VideoFrame(this.outputCanvas!, {
        timestamp: videoFrame.timestamp,
        alpha: 'discard',
      });
      if (this.trackWriter && this.isActive) {
        try {
          await this.trackWriter.write(processedFrame);
        } catch (err) {
          // Writer was closed (service disposed mid-frame, tab paused, or
          // downstream consumer detached). Stop the loop so we don't spam the
          // console — startStreamProcessing's reader.read() will resolve done
          // shortly and exit cleanly.
          processedFrame.close();
          if (this.isActive) {
            console.warn('[Video/fa] Writer closed; halting stream loop:', (err as Error).message);
            this.isActive = false;
            this.trackWriter = null;
          }
        }
      } else {
        processedFrame.close();
      }
    } catch (error) {
      console.error('[Video/fa] processVideoFrame error:', error);
    } finally {
      this.isProcessing = false;
      videoFrame.close();
    }
  }

  private detectAndApplyFaceTransform(): void {
    if (!this.tempCanvas || !this.faceLandmarker) return;
    try {
      const result = this.faceLandmarker.detectForVideo(this.tempCanvas, performance.now());

      if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
        // Show the avatar
        if (this.avatarModel) this.avatarModel.scene.visible = true;
        else if (this.geometricAvatar) this.geometricAvatar.visible = true;

        // One-shot diagnostic on first successful detection — confirms the
        // Apply pose: MediaPipe gives us a 4x4 in column-major; bake size
        // multiplier onto it.
        const matrix = new THREE.Matrix4().fromArray(result.facialTransformationMatrixes[0].data);
        const s = this.config.avatarSize * (this.config.avatarType === 'metahuman' ? 1.2 : 1);
        matrix.scale(new THREE.Vector3(s, s, s));

        if (this.avatarModel) this.avatarModel.scene.matrix.copy(matrix);
        else if (this.geometricAvatar) this.geometricAvatar.matrix.copy(matrix);

        // Drive expressions if model has morph targets and we have blendshapes
        if (
          this.config.enableBlendshapes &&
          result.faceBlendshapes &&
          result.faceBlendshapes.length > 0
        ) {
          this.applyBlendshapes(result.faceBlendshapes[0]);
        }
      } else {
        // No face — hide the model so we don't render a dangling head
        if (this.avatarModel) this.avatarModel.scene.visible = false;
        else if (this.geometricAvatar) this.geometricAvatar.visible = false;
      }
    } catch (error) {
      console.error('[Video/fa] Face detection error:', error);
    }
  }

  private applyBlendshapes(blendshapes: { categories?: { categoryName: string; score: number }[] }): void {
    if (!blendshapes.categories || this.morphTargetMeshes.length === 0) return;

    const map = new Map<string, number>();
    for (const cat of blendshapes.categories) {
      let score = cat.score;
      // Slightly amplify the eye/brow expressions — they're subtle in the
      // raw output and we want characterful avatars.
      if (
        cat.categoryName === 'browOuterUpLeft' ||
        cat.categoryName === 'browOuterUpRight' ||
        cat.categoryName === 'eyeBlinkLeft' ||
        cat.categoryName === 'eyeBlinkRight'
      ) {
        score *= this.config.expressionIntensity;
      }
      map.set(cat.categoryName, score);
    }

    for (const mesh of this.morphTargetMeshes) {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
      for (const [name, value] of map) {
        const idx = mesh.morphTargetDictionary[name];
        if (typeof idx === 'number') {
          mesh.morphTargetInfluences[idx] = value;
        }
      }
    }
  }

  private renderComposite(width: number, height: number): void {
    if (!this.outputCtx || !this.tempCanvas || !this.renderer || !this.scene || !this.camera) return;

    // Bottom: original video frame
    this.outputCtx.clearRect(0, 0, width, height);
    this.outputCtx.drawImage(this.tempCanvas, 0, 0, width, height);

    // Top: 3D scene with the avatar (transparent background)
    this.renderer.render(this.scene, this.camera);
    if (this.threeCanvas) {
      this.outputCtx.drawImage(this.threeCanvas, 0, 0, width, height);
    }
  }

  // --------------------------------------------------------------------------
  // Mid-stream config changes (used by DeviceSettingsModal preview when user
  // flips between avatar types live without reopening the modal).
  // --------------------------------------------------------------------------

  public async updateConfig(newConfig: Partial<FaceAvatarConfig>): Promise<void> {
    const typeChanged = !!newConfig.avatarType && newConfig.avatarType !== this.config.avatarType;
    this.config = { ...this.config, ...newConfig };

    if (typeChanged && this.scene) {
      console.log('[Video/fa] Avatar type changed → reloading model:', this.config.avatarType);
      // Clear current avatars
      if (this.avatarModel) {
        this.scene.remove(this.avatarModel.scene);
        this.avatarModel = null;
        this.morphTargetMeshes = [];
      }
      if (this.geometricAvatar) {
        this.scene.remove(this.geometricAvatar);
        this.geometricAvatar = null;
      }
      await this.loadAvatar();
    }
  }

  // --------------------------------------------------------------------------
  // Teardown
  // --------------------------------------------------------------------------

  public stopFaceAvatar(): void {
    this.isActive = false;
    try { this.processingController?.abort(); } catch { /* noop */ }
    this.processingController = null;
    if (this.trackWriter) {
      try { this.trackWriter.close(); } catch { /* already closed */ }
      this.trackWriter = null;
    }
  }

  public dispose(): void {
    this.stopFaceAvatar();
    this.trackProcessor = null;
    this.trackGenerator = null;
    if (this.faceLandmarker) {
      try { this.faceLandmarker.close(); } catch { /* noop */ }
      this.faceLandmarker = null;
    }
    if (this.renderer) {
      try { this.renderer.dispose(); } catch { /* noop */ }
      this.renderer = null;
    }
    if (this.scene) {
      try { this.scene.clear(); } catch { /* noop */ }
      this.scene = null;
    }
    this.avatarModel = null;
    this.morphTargetMeshes = [];
    this.geometricAvatar = null;
    this.tempCanvas = null;
    this.tempCtx = null;
    this.outputCanvas = null;
    this.outputCtx = null;
    this.threeCanvas = null;
    this.isInitialized = false;
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
