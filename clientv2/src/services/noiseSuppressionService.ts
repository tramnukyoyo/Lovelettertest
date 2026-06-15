/**
 * Noise Suppression Service
 *
 * Real ML noise suppression (RNNoise) via @sapphi-red/web-noise-suppressor,
 * replacing the dead Web-Audio-gate `audioProcessor.ts` (which was never even
 * instantiated — the only suppression was the native getUserMedia flag).
 *
 * Usage: feed in the local MediaStream; get back a NEW stream that carries the
 * original video tracks untouched + an RNNoise-cleaned audio track. Heavily
 * guarded — any failure throws so the caller falls back to the raw stream.
 */

import { RnnoiseWorkletNode, loadRnnoise } from '@sapphi-red/web-noise-suppressor';
import rnnoiseWorkletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url';
import rnnoiseWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url';
import rnnoiseSimdWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url';

export class NoiseSuppressionService {
  private ctx: AudioContext | null = null;
  private node: RnnoiseWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  // The raw mic track we pulled out of the input stream. It is NOT part of the
  // returned stream, so nobody else will stop it — we must stop it on dispose
  // or the mic stays hot (browser keeps showing the in-use indicator).
  private rawTrack: MediaStreamTrack | null = null;

  static isSupported(): boolean {
    return typeof window !== 'undefined'
      && typeof window.AudioContext !== 'undefined'
      && typeof AudioWorkletNode !== 'undefined';
  }

  async process(input: MediaStream): Promise<MediaStream> {
    const audioTrack = input.getAudioTracks()[0];
    if (!audioTrack) return input;

    const ctx = new AudioContext();
    this.ctx = ctx;
    // Some browsers start the context suspended until a gesture; resume best-effort.
    try { if (ctx.state === 'suspended') await ctx.resume(); } catch { /* noop */ }

    await ctx.audioWorklet.addModule(rnnoiseWorkletUrl);
    const wasmBinary = await loadRnnoise({ url: rnnoiseWasmUrl, simdUrl: rnnoiseSimdWasmUrl });
    const node = new RnnoiseWorkletNode(ctx, { wasmBinary, maxChannels: 1 });
    this.node = node;

    const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
    const dest = ctx.createMediaStreamDestination();
    this.source = source;
    this.dest = dest;
    this.rawTrack = audioTrack;

    source.connect(node).connect(dest);

    const cleaned = dest.stream.getAudioTracks()[0];
    const out = new MediaStream();
    input.getVideoTracks().forEach(t => out.addTrack(t));
    if (cleaned) out.addTrack(cleaned);
    return out;
  }

  dispose(): void {
    try { this.source?.disconnect(); } catch { /* noop */ }
    try { this.node?.disconnect(); } catch { /* noop */ }
    try { this.node?.destroy(); } catch { /* noop */ }
    try { this.dest?.disconnect(); } catch { /* noop */ }
    try { this.rawTrack?.stop(); } catch { /* noop */ }
    try { if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close(); } catch { /* noop */ }
    this.ctx = null;
    this.node = null;
    this.source = null;
    this.dest = null;
    this.rawTrack = null;
  }
}
