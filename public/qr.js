/* A square code, drawn as one SVG path in the text colour. The encoder is
   Kazuhiko Arase's qrcode-generator 2.0.4 (MIT), vendored untouched in
  ./vendor/qrcode.js. Four clear modules all round: a phone camera often
   will not see a code without them. */
import qrcode from './vendor/qrcode.js';

export function qrSvg(text, label = '') {
  const q = qrcode(0, 'M');
  q.addData(String(text));
  q.make();
  const n = q.getModuleCount();
  const pad = 4;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + pad} ${r + pad}h1v1h-1z`;
  const size = n + pad * 2;
  const name = label ? ` role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"${name}><rect width="${size}" height="${size}" class="qr-ground"/><path d="${d}" class="qr-ink"/></svg>`;
}
