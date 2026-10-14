/* Scan the TV's QR code without leaving GAID.

   The phone's own QR reader (BarcodeDetector) where it has one; elsewhere
   jsQR, fetched only when somebody taps Scan. The camera is asked for at that
   moment and released the moment a code is read, the scan is closed, or it
   fails. Nothing is recorded or sent anywhere: frames are read on the phone. */
import { CODE } from './relay.js';

/** The pairing in a scanned link to this GAID ({ room, at }), or null. */
export function pairingIn(text, origin) {
  try {
    const u = new URL(String(text));
    if (u.origin !== origin) return null;
    const room = (u.searchParams.get('room') || '').toUpperCase();
    return CODE.test(room) ? { room, at: u.searchParams.get('at') || null } : null;
  } catch { return null; }
}

async function reader() {
  if ('BarcodeDetector' in globalThis) {
    try {
      if ((await globalThis.BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
        const d = new globalThis.BarcodeDetector({ formats: ['qr_code'] });
        return async (video) => (await d.detect(video))[0]?.rawValue ?? null;
      }
    } catch { /* fall through to jsQR */ }
  }
  if (!globalThis.jsQR) {
    await new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = '/vendor/jsQR.js'; s.onload = ok; s.onerror = no; document.head.append(s);
    });
  }
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const w = video.videoWidth; const h = video.videoHeight;
    if (!w || !h) return null;
    const k = Math.min(1, 720 / Math.max(w, h));
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    g.drawImage(video, 0, 0, c.width, c.height);
    return globalThis.jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data ?? null;
  };
}

/**
 * Open the camera into `video` and read codes until `accept(text)` returns
 * something. Returns { result, stop }: result resolves to what accept
 * returned, or null if there is no camera, it was refused, or stop() was
 * called.
 */
export function scan(video, accept) {
  let stopped = false; let stream = null;
  const stop = () => {
    stopped = true;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  };
  const result = (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (stopped) { stop(); return null; }
      video.srcObject = stream;
      await video.play();
      const read = await reader();
      while (!stopped) {
        const text = await read(video).catch(() => null);
        const hit = text ? accept(text) : null;
        if (hit) { stop(); return hit; }
        await new Promise((r) => setTimeout(r, 150));
      }
      return null;
    } catch {
      stop();
      return null;
    }
  })();
  return { result, stop };
}
