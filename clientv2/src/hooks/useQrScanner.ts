/**
 * Camera-based QR scanning for the join flow.
 *
 * Detection engine: native BarcodeDetector where available (Chrome/Android —
 * zero bundle cost, hardware-fast) with a bundled jsQR canvas fallback
 * (mandatory for iOS Safari). Sampling is throttled to ~8 fps to save
 * battery; decoding stops as soon as one code is CONSUMED (onDecode returns
 * true). Foreign/rejected codes keep the camera and loop alive.
 *
 * Camera handling: opens its OWN rear-camera stream, deliberately separate
 * from WebRTCContext (the scanner runs pre-join, video chat runs post-join,
 * and they want opposite cameras). The lifecycle enforces AT MOST ONE
 * live/in-flight acquisition at any time: on iOS/WebKit a second
 * getUserMedia kills the first track (and teardown is async), which
 * surfaced on devices as "TrackEnded: camera stream stopped by the OS".
 * Concretely:
 *  - The iOS permission sheet fires visibilitychange churn; hidden while a
 *    request is in flight is NOT backgrounding — the request is left alone
 *    and a short grace-wait at resolution decides.
 *  - Real backgrounding (a live stream when hidden fires) stops all tracks
 *    immediately — iOS standalone PWAs fire no unload, and a camera held
 *    through suspension corrupts WebKit's hardware bridge (black screens on
 *    later launches until a device reboot). Resume re-acquires after a
 *    settle delay so the old track finishes tearing down first.
 *
 * A freeze watchdog covers WebKit bug 252465: the track reports "live" but
 * the video never renders a frame (canplay never fires, play() stays
 * pending) — fail over to 'error' so the overlay's photo fallback engages.
 */

import { useEffect, useRef, useState } from 'react';

export type QrScannerStatus = 'starting' | 'scanning' | 'denied' | 'error';

interface UseQrScannerOptions {
  /** Scanner runs only while true; all resources released when false. */
  active: boolean;
  /**
   * Called per detected code. Return true to consume it (scanning stops and
   * the camera is released); return false to keep scanning — the same
   * payload is then muted briefly so it isn't re-delivered every sample
   * while still in frame.
   */
  onDecode: (text: string) => boolean;
  /**
   * Camera stream requested SYNCHRONOUSLY inside the opening tap's call
   * stack. iOS standalone PWAs (Home Screen installs) only grant
   * getUserMedia within a user gesture — an effect-time request that works
   * in Safari is rejected there. Consumed once; later (re)starts fall back
   * to a fresh request.
   */
  providedStream?: Promise<MediaStream> | null;
}

const SAMPLE_INTERVAL_MS = 125;
// How long the stream may stay frame-less before we declare it frozen
// (WebKit bug 252465) and fail over to status 'error' → photo fallback.
const FREEZE_WATCHDOG_MS = 4000;
// WebKit releases camera tracks asynchronously with no completion signal;
// re-acquiring too fast after a stop kills the new track too. The delay is
// anchored on the visible event, which is always >= the stop time.
const REACQUIRE_SETTLE_MS = 400;
// getUserMedia can resolve while the iOS permission sheet is still
// dismissing (page briefly 'hidden') — wait this long for 'visible' before
// treating the hidden state as genuine backgrounding.
const HIDDEN_RESOLVE_GRACE_MS = 300;
// A rejected (foreign) QR is silently skipped for this long so it isn't
// re-delivered every ~125ms sample while the user re-aims.
const FOREIGN_COOLDOWN_MS = 1500;

// Minimal typing for the native detector (not yet in all TS lib versions).
type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

export function useQrScanner({ active, onDecode, providedStream }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<QrScannerStatus>('starting');
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;
  const providedStreamRef = useRef(providedStream);
  providedStreamRef.current = providedStream ?? providedStreamRef.current;
  const providedConsumedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let acquiring = false;
    // Bumped by every stopPipeline(). start() captures its own generation and
    // aborts after any await if a stop happened underneath it — `cancelled`
    // alone no longer covers internal (non-unmount) restarts.
    let generation = 0;
    let resumeOnVisible = false;
    let resumeTimer = 0;
    let delivered = false;
    let rafId = 0;
    let watchdogId = 0;
    let lastSample = 0;
    let rejectedText: string | null = null;
    let rejectedUntil = 0;
    let removeKicks: () => void = () => {};
    setStatus('starting');

    const stopPipeline = () => {
      generation++;
      cancelAnimationFrame(rafId);
      clearTimeout(watchdogId);
      removeKicks();
      removeKicks = () => {};
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    /** Resolves true if the page is (or becomes) visible within `ms`. */
    const waitForVisible = (ms: number) => new Promise<boolean>(resolve => {
      if (document.visibilityState === 'visible') return resolve(true);
      const done = (ok: boolean) => {
        document.removeEventListener('visibilitychange', onVis);
        clearTimeout(id);
        resolve(ok);
      };
      const onVis = () => { if (document.visibilityState === 'visible') done(true); };
      const id = window.setTimeout(() => done(false), ms);
      document.addEventListener('visibilitychange', onVis);
    });

    const start = async () => {
      if (cancelled || delivered || acquiring || stream) return; // single flight
      const myGen = generation;
      acquiring = true;

      let s: MediaStream | null = null;
      try {
        // Prefer the gesture-context stream (iOS standalone PWA requirement);
        // once consumed (or on resume) fall back to a fresh request.
        if (providedStreamRef.current && !providedConsumedRef.current) {
          providedConsumedRef.current = true;
          s = await providedStreamRef.current;
        }
        if (!s || s.getVideoTracks().every(t => t.readyState === 'ended')) {
          try {
            s = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } },
              audio: false,
            });
          } catch {
            // Some iOS standalone (Home Screen) builds reject constrained
            // requests but accept a bare one — front camera beats no camera,
            // and the photo fallback still exists below it.
            s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }
      } catch {
        acquiring = false;
        if (!cancelled) setStatus('denied');
        return;
      }

      // ---- resolution checkpoint ----
      const abandon = () => {
        s!.getTracks().forEach(t => t.stop());
        acquiring = false;
      };
      if (cancelled || myGen !== generation) return abandon();
      if (document.visibilityState === 'hidden') {
        // Either the permission sheet is still dismissing (visible arrives in
        // a beat — keep the stream, zero extra getUserMedia) or the user
        // genuinely backgrounded mid-prompt (release and resume on return).
        const cameBack = await waitForVisible(HIDDEN_RESOLVE_GRACE_MS);
        if (cancelled || myGen !== generation) return abandon();
        if (!cameBack) {
          abandon();
          resumeOnVisible = true;
          return;
        }
      }
      stream = s; // publish BEFORE clearing acquiring — no idle gap
      acquiring = false;

      // The ref can lag the async permission prompt by a frame — retry briefly
      // instead of silently tearing down (which left the UI stuck on
      // "starting" with a black screen).
      let video = videoRef.current;
      for (let i = 0; i < 10 && !video && !cancelled && myGen === generation; i++) {
        await new Promise(r => setTimeout(r, 50));
        video = videoRef.current;
      }
      if (cancelled || myGen !== generation) return;
      if (!video) { stopPipeline(); setStatus('error'); return; }

      // iOS Safari: inline camera video only renders when muted + playsinline
      // are REAL DOM attributes (React's JSX props don't reliably reach the
      // element as attributes), and play() may reject (Low Power Mode) or
      // never settle. Set attributes imperatively, never block on play(), and
      // re-kick playback on metadata + any user tap.
      video.muted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.srcObject = s;
      const tryPlay = () => { video!.play().catch(() => { /* retried below */ }); };
      tryPlay();
      video.addEventListener('loadedmetadata', tryPlay);
      document.addEventListener('touchend', tryPlay);
      document.addEventListener('click', tryPlay);
      removeKicks = () => {
        video?.removeEventListener('loadedmetadata', tryPlay);
        document.removeEventListener('touchend', tryPlay);
        document.removeEventListener('click', tryPlay);
      };

      // Freeze watchdog (WebKit bug 252465): the track can report "live"
      // while the video never renders a frame — canplay never fires, so
      // without a deadline the UI scans a black screen forever. readyState
      // >= 2 is the same gate the decode loop uses for a usable frame.
      watchdogId = window.setTimeout(() => {
        if (cancelled || delivered || myGen !== generation || !video || video.readyState >= 2) return;
        setStatus('error');
        stopPipeline();
      }, FREEZE_WATCHDOG_MS);

      // Surface OS-side teardown — but an 'ended' while hidden is just the OS
      // suspending us before our own visibility handler ran: recover on
      // return instead of dead-ending in the error state.
      s.getVideoTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if (cancelled || delivered || myGen !== generation) return;
          if (document.visibilityState === 'hidden') {
            stopPipeline();
            resumeOnVisible = true;
            setStatus('starting');
          } else {
            setStatus('error');
          }
        });
      });

      setStatus('scanning');

      // Engine selection
      let nativeDetector: NativeBarcodeDetector | null = null;
      const BD = (window as any).BarcodeDetector;
      if (BD) {
        try {
          const formats: string[] = await BD.getSupportedFormats?.() ?? [];
          if (!formats.length || formats.includes('qr_code')) {
            nativeDetector = new BD({ formats: ['qr_code'] });
          }
        } catch { nativeDetector = null; }
      }
      if (cancelled || myGen !== generation) return;
      let jsQr: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;
      if (!nativeDetector) {
        try {
          jsQr = (await import('jsqr')).default as any;
        } catch {
          if (!cancelled) setStatus('denied');
          stopPipeline();
          return;
        }
        if (cancelled || myGen !== generation) return;
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      /** True when the code was consumed and the pipeline is done. */
      const deliver = (text: string): boolean => {
        if (delivered || cancelled || !text) return false;
        if (text === rejectedText && performance.now() < rejectedUntil) return false;
        if (onDecodeRef.current(text)) {
          delivered = true;
          stopPipeline();
          return true;
        }
        // Rejected (foreign QR): keep the camera and loop — re-acquiring per
        // rejection is what used to kill the track on iOS.
        rejectedText = text;
        rejectedUntil = performance.now() + FOREIGN_COOLDOWN_MS;
        return false;
      };

      const tick = async (ts: number) => {
        if (cancelled || delivered || myGen !== generation) return;
        if (ts - lastSample >= SAMPLE_INTERVAL_MS && video!.readyState >= 2) {
          lastSample = ts;
          try {
            if (nativeDetector) {
              const codes = await nativeDetector.detect(video!);
              if (codes.length > 0 && deliver(codes[0].rawValue)) return;
            } else if (jsQr && ctx) {
              const w = video!.videoWidth;
              const h = video!.videoHeight;
              if (w && h) {
                // Downscale for decode speed — QR on a TV is large in frame.
                const scale = Math.min(1, 640 / w);
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                ctx.drawImage(video!, 0, 0, canvas.width, canvas.height);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const result = jsQr(img.data, img.width, img.height);
                if (result?.data && deliver(result.data)) return;
              }
            }
          } catch { /* transient decode error — keep scanning */ }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (cancelled || delivered) return;
      if (document.visibilityState === 'hidden') {
        // A pending resume never fires while hidden; resumeOnVisible stays
        // set so a later visible re-arms it.
        clearTimeout(resumeTimer);
        if (stream) {
          // Real backgrounding: release the camera IMMEDIATELY (see header).
          stopPipeline();
          resumeOnVisible = true;
          setStatus('starting');
        }
        // acquiring && !stream → iOS permission-sheet churn: leave the
        // in-flight request alone; the resolution checkpoint decides.
      } else if (resumeOnVisible && !stream && !acquiring) {
        clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(() => {
          if (!cancelled && !stream && !acquiring && document.visibilityState === 'visible') {
            resumeOnVisible = false;
            setStatus('starting');
            void start();
          }
        }, REACQUIRE_SETTLE_MS);
      }
    };
    const onPageHide = () => stopPipeline();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    void start();

    return () => {
      cancelled = true;
      clearTimeout(resumeTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      stopPipeline();
    };
  }, [active]);

  return { videoRef, status };
}
