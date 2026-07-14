/**
 * Full-screen QR scanner overlay for joining a room by pointing the phone at
 * the TV's big-screen QR (or any GameBuddies invite QR).
 *
 * Two capture modes:
 *  - LIVE: getUserMedia video stream + frame decoding (Safari, Android).
 *  - PHOTO: native camera capture via <input type="file" capture> + still
 *    decoding — the reliable path inside iOS Home-Screen (standalone) PWAs,
 *    where WebKit's live camera streaming is chronically broken. We
 *    auto-switch to it there when the stream fails, and offer it as a
 *    fallback button everywhere else.
 *
 * The overlay only PRODUCES a room code or invite token — the actual join
 * runs through the existing HomePage flow, never reimplemented here.
 * Foreign QR contents are rejected in place (shake + message), never opened.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { useQrScanner } from '../../hooks/useQrScanner';
import { parseJoinQr } from '../../utils/parseJoinQr';
import { pinRegion } from '../../services/regionService';
import { decodeQrFromFile } from '../../utils/decodeQrFromImage';
import { trackEvent } from '../../services/analyticsService';
import { t } from '../../utils/translations';

interface QrScannerOverlayProps {
  onRoomCode: (roomCode: string) => void;
  onInviteToken: (token: string) => void;
  onClose: () => void;
  /** Camera stream requested inside the opening tap (iOS PWA requirement). */
  pendingStream?: Promise<MediaStream> | null;
}

/** Installed (Home Screen) web app — live streaming is unreliable there. */
const isStandalonePwa = () =>
  (navigator as unknown as { standalone?: boolean }).standalone === true ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);

const QrScannerOverlay: React.FC<QrScannerOverlayProps> = ({ onRoomCode, onInviteToken, onClose, pendingStream }) => {
  const [rejected, setRejected] = useState(false);
  const [mode, setMode] = useState<'live' | 'photo'>('live');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoFailed, setPhotoFailed] = useState<false | 'load' | 'nocode'>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(rejectTimerRef.current), []);

  /** Returns true when the code was ours (hook stops); false keeps scanning. */
  const handleDecode = useCallback((text: string): boolean => {
    const parsed = parseJoinQr(text);
    if (parsed.type === 'room') {
      trackEvent('qr_scan_succeeded', { payload: 'room' });
      // Room→region pin from the scanned URL: pin BEFORE the join flow opens
      // the socket, so we connect to the room's regional server.
      if (parsed.region) pinRegion(parsed.region);
      onRoomCode(parsed.roomCode);
      return true;
    }
    if (parsed.type === 'invite') {
      trackEvent('qr_scan_succeeded', { payload: 'invite' });
      if (parsed.region) pinRegion(parsed.region);
      onInviteToken(parsed.token);
      return true;
    }
    // Not ours — pure UI feedback; the hook keeps the camera + loop alive
    // (re-acquiring the camera per rejection is what killed tracks on iOS).
    trackEvent('qr_scan_failed', { reason: 'foreign' });
    setRejected(true);
    clearTimeout(rejectTimerRef.current);
    rejectTimerRef.current = setTimeout(() => setRejected(false), 1500);
    return false;
  }, [onRoomCode, onInviteToken]);

  const { videoRef, status } = useQrScanner({
    active: mode === 'live',
    onDecode: handleDecode,
    providedStream: pendingStream,
  });

  // iOS standalone PWA: live streaming failed → the native photo capture is
  // the path that actually works there. Switch automatically.
  useEffect(() => {
    if (mode === 'live' && (status === 'denied' || status === 'error') && isStandalonePwa()) {
      trackEvent('qr_scan_photo_fallback', { from: status });
      setMode('photo');
    }
  }, [mode, status]);

  const handlePhotoPicked = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-picking the same file (input change won't fire otherwise).
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoFailed(false);
    const result = await decodeQrFromFile(file);
    setPhotoBusy(false);
    if ('text' in result) {
      handleDecode(result.text);
    } else {
      // 'load' = iOS couldn't even decode the image file (HEIC/memory);
      // 'nocode' = image read fine, no QR found — different user guidance.
      trackEvent('qr_scan_failed', { reason: result.error === 'load' ? 'photo_unreadable' : 'photo_no_code' });
      setPhotoFailed(result.error);
    }
  }, [handleDecode]);

  const liveFailed = status === 'denied' || status === 'error';

  return (
    <div className="qr-scanner-overlay" role="dialog" aria-label={t('scanQr.button')}>
      {mode === 'live' && (
        <video
          ref={videoRef}
          className="qr-scanner-video"
          muted
          playsInline
          autoPlay
        />
      )}
      <div className={`qr-scanner-frame ${rejected ? 'qr-scanner-frame-reject' : ''}`} aria-hidden="true" />

      <button
        type="button"
        className="qr-scanner-close"
        onClick={onClose}
        aria-label={t('scanQr.close')}
      >
        <X />
      </button>

      {/* Native capture inputs, opened by their labels (real user gesture).
          Visually hidden but IN-FLOW (.qr-scanner-file-input): display:none
          makes WebKit refuse to open the picker inside standalone PWAs.
          The first jumps straight to the rear camera; the second (no
          capture attr) opens the library/camera action sheet — the escape
          hatch where the direct-camera flow is broken. */}
      <input
        ref={fileInputRef}
        id="qr-photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="qr-scanner-file-input"
        onChange={handlePhotoPicked}
      />
      <input
        id="qr-library-input"
        type="file"
        accept="image/*"
        className="qr-scanner-file-input"
        onChange={handlePhotoPicked}
      />

      <div className="qr-scanner-caption">
        {mode === 'photo' ? (
          <>
            {(photoFailed || rejected) && (
              <p className="qr-scanner-hint qr-scanner-error">
                {t(rejected ? 'scanQr.notACode' : photoFailed === 'load' ? 'scanQr.photoUnreadable' : 'scanQr.photoFailed')}
              </p>
            )}
            <label htmlFor="qr-photo-input" className="qr-scanner-fallback-btn qr-scanner-photo-btn">
              <Camera />
              {photoBusy ? t('scanQr.photoProcessing') : t('scanQr.photoButton')}
            </label>
            <label htmlFor="qr-library-input" className="qr-scanner-library-btn">
              {t('scanQr.libraryButton')}
            </label>
          </>
        ) : liveFailed ? (
          <>
            <p className="qr-scanner-hint qr-scanner-error">
              {t(status === 'denied' ? 'scanQr.permissionDenied' : 'scanQr.cameraError')}
            </p>
            <label htmlFor="qr-photo-input" className="qr-scanner-fallback-btn qr-scanner-photo-btn">
              <Camera />
              {photoBusy ? t('scanQr.photoProcessing') : t('scanQr.photoButton')}
            </label>
          </>
        ) : rejected ? (
          <p className="qr-scanner-hint qr-scanner-error">{t('scanQr.notACode')}</p>
        ) : (
          <p className="qr-scanner-hint">
            {status === 'starting' ? t('scanQr.starting') : t('scanQr.hint')}
          </p>
        )}
      </div>
    </div>
  );
};

export default QrScannerOverlay;
