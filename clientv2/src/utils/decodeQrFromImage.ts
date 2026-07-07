/**
 * Decode a QR code from a still photo (File from an
 * `<input type="file" accept="image/*" capture="environment">`).
 *
 * This is the reliable join path inside iOS Home-Screen (standalone) PWAs,
 * where live getUserMedia streaming is chronically broken in WebKit.
 *
 * Image loading tries three routes because iOS WebKit fails each of them in
 * different conditions (HEIC MIME handling breaks object URLs; huge 12MP
 * files can OOM createImageBitmap): createImageBitmap → object-URL <img> →
 * FileReader data-URL <img> (the max-compatibility path).
 *
 * Engine chain, strongest first:
 *  1. Native BarcodeDetector (Chrome/Android — hardware-fast).
 *  2. zxing-wasm reader (zxing-cpp compiled to WASM, tryHarder) — the only
 *     engine in the chain that reliably finds a QR in a real 12MP TV photo
 *     (glare/moiré/perspective). ~1MB wasm, lazy-loaded, SELF-HOSTED (the
 *     package's default jsDelivr fastly CDN is blocked by our CSP).
 *  3. nimiq `qr-scanner` scanImage — decent JS detection, tiny.
 *  4. jsQR multi-scale + center-crop + contrast stretch — last resort,
 *     shares the live scanner's fallback dep.
 *
 * The result distinguishes "couldn't read the image at all" from "read it,
 * found no QR" — on-device they need different user guidance.
 */

export type PhotoDecodeResult = { text: string } | { error: 'load' | 'nocode' };

const JSQR_SCALES = [2000, 1400, 800];

function imageFromSrc(src: string, cleanup?: () => void): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { cleanup?.(); resolve(img); };
    img.onerror = () => { cleanup?.(); reject(new Error('image load failed')); };
    img.src = src;
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // from-image applies the photo's EXIF orientation (portrait iPhone shots).
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch { /* fall through to <img> */ }
  }
  try {
    const url = URL.createObjectURL(file);
    return await imageFromSrc(url, () => URL.revokeObjectURL(url));
  } catch { /* object URLs fail for HEIC on some WebKit builds */ }
  // FileReader → data URL: slowest but survives the WebKit MIME quirks.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('file read failed'));
    fr.readAsDataURL(file);
  });
  return imageFromSrc(dataUrl);
}

interface CropSpec { x: number; y: number; w: number; h: number }

function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxPx: number,
  crop?: CropSpec
): ImageData | null {
  const srcW = (source as HTMLImageElement).naturalWidth || source.width;
  const srcH = (source as HTMLImageElement).naturalHeight || source.height;
  if (!srcW || !srcH) return null;
  const region = crop ?? { x: 0, y: 0, w: srcW, h: srcH };
  const scale = Math.min(1, maxPx / Math.max(region.w, region.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(region.w * scale));
  canvas.height = Math.max(1, Math.round(region.h * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Loaded once per session; prepareZXingModule must not be re-called with a
// different overrides object, so the whole init lives behind one promise.
let zxingModule: Promise<typeof import('zxing-wasm/reader')> | null = null;

function loadZxing() {
  if (!zxingModule) {
    zxingModule = Promise.all([
      import('zxing-wasm/reader'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]).then(([mod, wasm]) => {
      mod.prepareZXingModule({
        overrides: {
          locateFile: (path: string) => (path.endsWith('.wasm') ? wasm.default : path),
        },
      });
      return mod;
    });
  }
  return zxingModule;
}

async function tryZxing(
  file: File,
  source: ImageBitmap | HTMLImageElement | null
): Promise<string | null> {
  try {
    const { readBarcodes } = await loadZxing();
    const opts = { formats: ['QRCode' as const], tryHarder: true, maxNumberOfSymbols: 1 };
    const direct = await readBarcodes(file, opts);
    if (direct?.[0]?.text) return direct[0].text;
    // Retry on our downscaled bitmap: sidesteps any internal decode limits on
    // 12MP originals and applies EXIF orientation from our loader.
    if (source) {
      const img = drawScaled(source, 1600);
      if (img) {
        const scaled = await readBarcodes(img, opts);
        if (scaled?.[0]?.text) return scaled[0].text;
      }
    }
    return null;
  } catch {
    // wasm failed to load/run — the JS engines below still get their shot.
    return null;
  }
}

async function tryBarcodeDetector(source: ImageBitmap | HTMLImageElement): Promise<string | null> {
  const BD = (window as any).BarcodeDetector;
  if (!BD) return null;
  try {
    const formats: string[] = (await BD.getSupportedFormats?.()) ?? [];
    if (formats.length && !formats.includes('qr_code')) return null;
    const detector = new BD({ formats: ['qr_code'] });
    const codes = await detector.detect(source);
    return codes?.[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

async function tryQrScannerLib(file: File): Promise<string | null> {
  try {
    const QrScanner = (await import('qr-scanner')).default;
    const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
    return result?.data ?? null;
  } catch {
    // qr-scanner rejects when no code is found — treat as miss, not error.
    return null;
  }
}

/**
 * Linear luminance stretch for washed-out photos (TV glare flattens the
 * black/white range). Returns the input unchanged when contrast is already
 * healthy, so callers can cheaply detect whether a second decode is worth it.
 */
function stretchContrast(img: ImageData): ImageData {
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 16) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (y < min) min = y;
    if (y > max) max = y;
  }
  const range = max - min;
  if (range >= 200 || range <= 0) return img;
  const scale = 255 / range;
  const out = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) {
    out[i] = (d[i] - min) * scale;
    out[i + 1] = (d[i + 1] - min) * scale;
    out[i + 2] = (d[i + 2] - min) * scale;
    out[i + 3] = 255;
  }
  return new ImageData(out, img.width, img.height);
}

async function tryJsQr(source: ImageBitmap | HTMLImageElement): Promise<string | null> {
  let jsQr: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;
  try {
    jsQr = (await import('jsqr')).default as any;
  } catch {
    return null;
  }
  const tryDecode = (img: ImageData | null): string | null => {
    if (!img) return null;
    let result = jsQr!(img.data, img.width, img.height);
    if (result?.data) return result.data;
    const stretched = stretchContrast(img);
    if (stretched !== img) {
      result = jsQr!(stretched.data, stretched.width, stretched.height);
      if (result?.data) return result.data;
    }
    return null;
  };
  for (const maxPx of JSQR_SCALES) {
    const hit = tryDecode(drawScaled(source, maxPx));
    if (hit) return hit;
  }
  // Center-crop retry: users center the QR when photographing a TV; cropping
  // sheds the glare/UI clutter at the edges that confuses the locator.
  const srcW = (source as HTMLImageElement).naturalWidth || source.width;
  const srcH = (source as HTMLImageElement).naturalHeight || source.height;
  if (srcW && srcH) {
    const crop: CropSpec = {
      x: Math.round(srcW * 0.2),
      y: Math.round(srcH * 0.2),
      w: Math.round(srcW * 0.6),
      h: Math.round(srcH * 0.6),
    };
    const hit = tryDecode(drawScaled(source, 1200, crop));
    if (hit) return hit;
  }
  return null;
}

/** Decodes the QR in a photo, distinguishing unreadable images from misses. */
export async function decodeQrFromFile(file: File): Promise<PhotoDecodeResult> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    source = await loadBitmap(file);
  } catch { /* qr-scanner below can still try the raw file */ }

  try {
    if (source) {
      const native = await tryBarcodeDetector(source);
      if (native) return { text: native };
    }

    const viaZxing = await tryZxing(file, source);
    if (viaZxing) return { text: viaZxing };

    const viaLib = await tryQrScannerLib(file);
    if (viaLib) return { text: viaLib };

    if (source) {
      const viaJsQr = await tryJsQr(source);
      if (viaJsQr) return { text: viaJsQr };
    }
    // qr-scanner rejects identically for "unloadable image" and "no code", so
    // our own loader is the load/nocode discriminator.
    return { error: source ? 'nocode' : 'load' };
  } finally {
    if (source && 'close' in source && typeof (source as ImageBitmap).close === 'function') {
      (source as ImageBitmap).close();
    }
  }
}
