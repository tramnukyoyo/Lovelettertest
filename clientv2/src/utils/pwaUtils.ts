// PWA Detection and Install Prompt Utilities

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function isInStandaloneMode(): boolean {
  // Check CSS media query (works for most browsers)
  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  // Check iOS-specific standalone property
  const iosStandalone = (window.navigator as any).standalone === true;
  return standaloneMedia || iosStandalone;
}

export function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  // Must be iOS, have Safari in UA, and NOT be Chrome/Firefox/Edge on iOS
  return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function shouldShowIOSInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem('pwa-prompt-dismissed');
  return isIOSSafari() && !isInStandaloneMode() && !dismissed;
}

export function dismissInstallPrompt(): void {
  localStorage.setItem('pwa-prompt-dismissed', 'true');
}

export function resetInstallPrompt(): void {
  localStorage.removeItem('pwa-prompt-dismissed');
}
