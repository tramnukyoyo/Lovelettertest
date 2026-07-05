/* gb-juice-kit v1 */
/**
 * synthSfx — procedural Web-Audio sound effects for the juice kit. Asset-free:
 * every cue is synthesised from oscillators + a filtered-noise buffer, so no
 * audio files ship. Gating mirrors BingoBuddies' proceduralSfx: every play
 * early-returns on `!soundEffects.isEnabled()` and the master gain is scaled by
 * `soundEffects.getVolume()`, so the header Mute button and the SettingsModal
 * "SFX" toggle/volume already control these too (single source of truth —
 * SoundEffectsManager). The AudioContext is created lazily and resumed on each
 * play; a one-time pointerdown unlock covers the autoplay-policy gesture. A
 * global 80ms min-interval throttle stops event bursts machine-gunning it.
 */
import { soundEffects } from './index';

export type SynthSfxName =
  | 'uiClick'
  | 'phaseChange'
  | 'tickUrgent'
  | 'scoreReveal'
  | 'playerJoin'
  | 'success'
  | 'fail'
  | 'whoosh';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Master loudness: respects the user's SFX volume, kept gentle. */
function master(): number {
  return Math.max(0, Math.min(1, soundEffects.getVolume())) * 0.16;
}

interface ToneOpts {
  freq: number;
  /** exponential glide target for the note */
  endFreq?: number;
  type?: OscillatorType;
  /** seconds */
  duration: number;
  /** 0..1 multiplier on master gain for this note */
  gain?: number;
  /** seconds from now */
  delay?: number;
}

/** One enveloped oscillator: quick attack + exponential release, optional slide. */
function tone({ freq, endFreq, type = 'triangle', duration, gain = 1, delay = 0 }: ToneOpts): void {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);

  const peak = Math.max(0.0002, master() * gain);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

interface NoiseOpts {
  /** seconds */
  duration: number;
  filterFreq: number;
  gain?: number;
  delay?: number;
}

/** A short bandpass-filtered white-noise burst (whoosh / soft tail). */
function noise({ duration, filterFreq, gain = 1, delay = 0 }: NoiseOpts): void {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buf = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = filterFreq;
  bp.Q.value = 0.8;
  const g = ac.createGain();
  const peak = Math.max(0.0002, master() * gain);
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

const recipes: Record<SynthSfxName, () => void> = {
  // Short 1800->1400Hz triangle blip (~40ms).
  uiClick() {
    tone({ freq: 1800, endFreq: 1400, type: 'triangle', duration: 0.04, gain: 0.9 });
  },
  // Two-note rising triangle + soft noise tail.
  phaseChange() {
    tone({ freq: 440, type: 'triangle', duration: 0.14, gain: 0.9 });
    tone({ freq: 660, type: 'triangle', duration: 0.2, gain: 0.9, delay: 0.12 });
    noise({ duration: 0.22, filterFreq: 2600, gain: 0.28, delay: 0.12 });
  },
  // 40ms 1000Hz sine blip.
  tickUrgent() {
    tone({ freq: 1000, type: 'sine', duration: 0.04, gain: 0.8 });
  },
  // 3-note ascending arpeggio (C5 E5 G5, ~350ms).
  scoreReveal() {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.16, gain: 0.9, delay: i * 0.1 })
    );
  },
  // Soft two-note pop (G4 -> C5).
  playerJoin() {
    tone({ freq: 392, type: 'sine', duration: 0.09, gain: 0.7 });
    tone({ freq: 523.25, type: 'sine', duration: 0.12, gain: 0.7, delay: 0.08 });
  },
  // Two rising sine notes (660 -> 880, ~200ms).
  success() {
    tone({ freq: 660, type: 'sine', duration: 0.12, gain: 0.9 });
    tone({ freq: 880, type: 'sine', duration: 0.16, gain: 0.9, delay: 0.09 });
  },
  // Sawtooth slide 220 -> 110 (~250ms).
  fail() {
    tone({ freq: 220, endFreq: 110, type: 'sawtooth', duration: 0.25, gain: 0.7 });
  },
  // Noise sweep (~250ms).
  whoosh() {
    noise({ duration: 0.25, filterFreq: 1200, gain: 0.5 });
  },
};

// Global min-interval throttle across ALL plays — a burst of events (rapid
// votes, timer ticks) must not machine-gun the speakers.
const MIN_INTERVAL_MS = 80;
let lastPlayAt = 0;

function play(name: SynthSfxName): void {
  if (!soundEffects.isEnabled()) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastPlayAt < MIN_INTERVAL_MS) return;
  lastPlayAt = now;
  recipes[name]?.();
}

// One-time unlock: the first user gesture resumes a suspended context so the
// first real cue isn't swallowed by the browser autoplay policy.
try {
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', () => { void getCtx(); }, { once: true, passive: true });
  }
} catch {
  // Non-DOM environment — nothing to unlock.
}

export const synthSfx = {
  play,
  uiClick: () => play('uiClick'),
  phaseChange: () => play('phaseChange'),
  tickUrgent: () => play('tickUrgent'),
  scoreReveal: () => play('scoreReveal'),
  playerJoin: () => play('playerJoin'),
  success: () => play('success'),
  fail: () => play('fail'),
  whoosh: () => play('whoosh'),
};

export default synthSfx;
