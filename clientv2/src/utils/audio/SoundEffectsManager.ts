/**
 * Sound Effects Manager
 *
 * Web Audio buffer pool: each sound is fetched + decoded into an AudioBuffer
 * exactly ONCE, then replayed from memory via a fresh AudioBufferSourceNode —
 * zero network per play, and overlapping plays (rapid typewriter clicks) are
 * free.
 *
 * This replaces the previous HTMLAudio approach where play() did
 * `audio.cloneNode()` per play: a cloned <audio> keeps only the `src`, not the
 * decoded data, so every play re-hit the network. A per-keystroke typewriter
 * sound therefore turned into thousands of range (206) requests for the same
 * handful of files — the dominant source of proxied-asset bandwidth. Buffers
 * are memory-resident, so a played sound is downloaded at most once per session
 * (and the browser HTTP cache covers repeat sessions).
 */

export interface SoundEffectConfig {
  volume: number;
  enabled: boolean;
}

export const DEFAULT_SFX_CONFIG: SoundEffectConfig = {
  volume: 0.5,
  enabled: true
};

// Get base URL for asset paths
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (import.meta as any).env?.BASE_URL) {
    return (import.meta as any).env.BASE_URL;
  }
  return '/';
};

// Sound effects configuration - paths relative to public folder.
// MP3 for universal iOS + Android decode; typewriter clicks were WAV (~85%
// larger) until 2026-07-08.
export const SOUND_EFFECTS = {
  // Game event sounds
  win: 'music/win.mp3',
  lose: 'music/lose.mp3',
  countdown: 'music/countdown.mp3',

  // Typewriter sounds (randomly selected)
  type1: 'music/type1.mp3',
  type2: 'music/type2.mp3',
  type3: 'music/type3.mp3',
  type4: 'music/type4.mp3',
  type5: 'music/type5.mp3',
  type6: 'music/type6.mp3',
} as const;

export type SoundEffectName = keyof typeof SOUND_EFFECTS;

export class SoundEffectsManager {
  private config: SoundEffectConfig;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loading: Map<string, Promise<AudioBuffer | null>> = new Map();
  private failed: Set<string> = new Set();
  private preloaded = false;
  private unlockBound = false;

  constructor(config: SoundEffectConfig = DEFAULT_SFX_CONFIG) {
    this.config = { ...config };
  }

  /**
   * Lazily create (and resume) the shared AudioContext + master gain. Returns
   * null when Web Audio is unavailable (SSR / very old browser).
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.config.volume;
        this.master.connect(this.ctx.destination);
        this.bindUnlock();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Browsers start the context suspended until a user gesture. A persistent
  // pointerdown/keydown resume covers the autoplay policy (typewriter sounds
  // fire on keydown, which is itself a gesture, but this also unlocks
  // gesture-less cues like win/lose after the first interaction).
  private bindUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const resume = () => {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume, { passive: true });
  }

  // decodeAudioData: promise form on modern browsers, callback form fallback
  // for older Safari. The promise form may detach its input, so it gets a copy
  // and the original is reserved for the fallback.
  private decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
    const copy = data.slice(0);
    return Promise.resolve()
      .then(() => ctx.decodeAudioData(copy))
      .catch(() => new Promise<AudioBuffer>((resolve, reject) => {
        ctx.decodeAudioData(data, resolve, reject);
      }));
  }

  // Fetch + decode a sound once; concurrent callers share one in-flight load.
  // A load that fails (missing file / decode error) is remembered so it is
  // attempted at most once — never re-fetched on every play (which is what a
  // 404'd sound would otherwise do, re-creating the per-play request storm).
  private loadBuffer(key: string, url: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(key);
    if (cached) return Promise.resolve(cached);
    if (this.failed.has(key)) return Promise.resolve(null);
    const inflight = this.loading.get(key);
    if (inflight) return inflight;

    const ctx = this.getContext();
    if (!ctx) return Promise.resolve(null);

    const p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.arrayBuffer();
        const buf = await this.decode(ctx, arr);
        this.buffers.set(key, buf);
        return buf;
      } catch (err) {
        this.failed.add(key);
        console.warn(`[SoundEffects] Failed to load: ${url}`, err);
        return null;
      } finally {
        this.loading.delete(key);
      }
    })();
    this.loading.set(key, p);
    return p;
  }

  private playBuffer(buf: AudioBuffer): void {
    const ctx = this.getContext();
    if (!ctx || !this.master) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    try {
      src.start(0);
    } catch {
      // start() can throw if the context was closed mid-play — ignore.
    }
  }

  /**
   * Preload all sound effects for instant, network-free playback.
   */
  public async preload(): Promise<void> {
    if (this.preloaded) return;
    const baseUrl = getBaseUrl();
    await Promise.all(
      Object.values(SOUND_EFFECTS).map((path) => this.loadBuffer(path, `${baseUrl}${path}`))
    );
    this.preloaded = true;
  }

  /**
   * Play a sound effect by name. Uses the decoded buffer (no network); if the
   * sound wasn't preloaded, it's fetched once and then played.
   */
  public play(name: SoundEffectName): void {
    if (!this.config.enabled) return;

    const path = SOUND_EFFECTS[name];
    if (!path) {
      console.warn(`[SoundEffects] Unknown sound: ${name}`);
      return;
    }

    const cached = this.buffers.get(path);
    if (cached) {
      this.playBuffer(cached);
      return;
    }
    const baseUrl = getBaseUrl();
    void this.loadBuffer(path, `${baseUrl}${path}`).then((buf) => {
      if (buf && this.config.enabled) this.playBuffer(buf);
    });
  }

  /**
   * Play a random typewriter sound (type1-type6).
   */
  public playTypewriter(): void {
    if (!this.config.enabled) return;

    const typeNum = Math.floor(Math.random() * 6) + 1;
    const name = `type${typeNum}` as SoundEffectName;
    this.play(name);
  }

  /**
   * Play a sound effect from an arbitrary URL (loaded once, then buffered).
   */
  public playUrl(url: string): void {
    if (!this.config.enabled) return;

    const cached = this.buffers.get(url);
    if (cached) {
      this.playBuffer(cached);
      return;
    }
    void this.loadBuffer(url, url).then((buf) => {
      if (buf && this.config.enabled) this.playBuffer(buf);
    });
  }

  /**
   * Set the volume for sound effects (0-1).
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.master) this.master.gain.value = this.config.volume;
  }

  /**
   * Enable/disable sound effects.
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if sound effects are enabled.
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current volume.
   */
  public getVolume(): number {
    return this.config.volume;
  }

  /**
   * Dispose of the manager (drop buffers, close the context).
   */
  public dispose(): void {
    this.buffers.clear();
    this.loading.clear();
    this.failed.clear();
    this.preloaded = false;
    try {
      void this.ctx?.close();
    } catch {
      // already closed — ignore
    }
    this.ctx = null;
    this.master = null;
  }
}
