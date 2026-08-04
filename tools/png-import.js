/* ============================================================
   png-import.js — turns a screenshot of an app icon into a clean
   square home-screen icon.

   Screenshots come cropped out of a home screen, so they carry two
   problems: the corners are rounded with wallpaper showing through
   the wedges, and the crop is rarely exactly square. iOS re-rounds
   whatever you give it, so what we want back is a full-bleed square.

   The fix is geometric rather than colour-based — wallpaper is not a
   flat colour, so flood-filling by colour is unreliable. We assume
   what is actually true of every iOS icon: a squircle inscribed in
   the frame. Anything outside it gets the colour of the nearest
   pixel inside, and iOS's own mask then hides that reconstruction
   almost entirely.

   No dependencies — PNG decoding via zlib, resampling by hand.
   ============================================================ */

const fs = require('fs');
const zlib = require('zlib');

/* ---------------- PNG decode ---------------- */

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');

  let w = 0, h = 0, depth = 8, ctype = 6, interlace = 0;
  let palette = null, trns = null;
  const idat = [];

  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }

  if (interlace) throw new Error('interlaced PNGs are not supported');
  if (depth !== 8 && depth !== 16) throw new Error(`unsupported bit depth ${depth}`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!channels) throw new Error(`unsupported colour type ${ctype}`);

  const sampleBytes = depth / 8;
  const bpp = Math.max(1, channels * sampleBytes);
  const stride = w * channels * sampleBytes;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const un = Buffer.alloc(h * stride);

  // Undo the per-scanline filters.
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? un[y * stride + x - bpp] : 0;
      const b = y > 0 ? un[(y - 1) * stride + x] : 0;
      const c = (x >= bpp && y > 0) ? un[(y - 1) * stride + x - bpp] : 0;
      let v = raw[src + x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      un[y * stride + x] = v & 0xff;
    }
  }

  // Normalise everything to 8-bit RGBA.
  const rgba = Buffer.alloc(w * h * 4);
  const at = (y, i) => un[y * stride + i * sampleBytes]; // high byte covers depth 16
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      let r, g, b, a = 255;
      if (ctype === 0) { r = g = b = at(y, x); }
      else if (ctype === 4) { r = g = b = at(y, x * 2); a = at(y, x * 2 + 1); }
      else if (ctype === 2) { r = at(y, x * 3); g = at(y, x * 3 + 1); b = at(y, x * 3 + 2); }
      else if (ctype === 6) {
        r = at(y, x * 4); g = at(y, x * 4 + 1); b = at(y, x * 4 + 2); a = at(y, x * 4 + 3);
      } else { // palette
        const i = at(y, x);
        r = palette[i * 3]; g = palette[i * 3 + 1]; b = palette[i * 3 + 2];
        if (trns && i < trns.length) a = trns[i];
      }
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a;
    }
  }

  return { w, h, rgba };
}

/* ---------------- square up + rebuild the corners ---------------- */

/**
 * Centre-crop to a square, shave a hairline off the edge (screenshots
 * often keep a sliver of wallpaper), then push edge colour outward into
 * the rounded-corner wedges so the result is a full-bleed square.
 *
 * radius: corner radius as a fraction of the side. iOS's squircle is
 *         close to 0.225, and being slightly generous is safe because
 *         we are only ever *adding* colour outside the visible shape.
 */
function squareUp(img, { inset = 0.015, radius = 0.235 } = {}) {
  const side0 = Math.min(img.w, img.h);
  const trim = Math.round(side0 * inset);
  const side = side0 - trim * 2;
  const ox = Math.round((img.w - side0) / 2) + trim;
  const oy = Math.round((img.h - side0) / 2) + trim;

  const out = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const s = ((y + oy) * img.w + (x + ox)) * 4;
      const d = (y * side + x) * 4;
      out[d] = img.rgba[s]; out[d + 1] = img.rgba[s + 1];
      out[d + 2] = img.rgba[s + 2]; out[d + 3] = 255;
    }
  }

  // Which pixels fall outside the rounded square?
  const r = radius * side;
  const inside = (x, y) => {
    const cx = Math.min(Math.max(x + 0.5, r), side - r);
    const cy = Math.min(Math.max(y + 0.5, r), side - r);
    return Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
  };

  // Extend the nearest inside pixel horizontally into the wedges.
  for (let y = 0; y < side; y++) {
    let first = -1, last = -1;
    for (let x = 0; x < side; x++) if (inside(x, y)) { if (first < 0) first = x; last = x; }
    if (first < 0) continue; // handled by the vertical pass below
    for (let x = 0; x < first; x++) out.copyWithin((y * side + x) * 4,
      (y * side + first) * 4, (y * side + first) * 4 + 4);
    for (let x = last + 1; x < side; x++) out.copyWithin((y * side + x) * 4,
      (y * side + last) * 4, (y * side + last) * 4 + 4);
  }
  // Any row entirely outside (only possible at extreme radii) takes the
  // nearest row that wasn't.
  for (let y = 0; y < side; y++) {
    let any = false;
    for (let x = 0; x < side; x++) if (inside(x, y)) { any = true; break; }
    if (any) continue;
    const src = y < side / 2 ? Math.ceil(radius * side) : Math.floor(side - radius * side) - 1;
    out.copyWithin(y * side * 4, src * side * 4, (src + 1) * side * 4);
  }

  return { w: side, h: side, rgba: out };
}

/* ---------------- resampling ---------------- */

/* Separable triangle filter — the radius widens when downscaling so the
   result is properly averaged rather than point-sampled. */
function resize(img, size) {
  const pass = (src, sw, sh, dw) => {
    const dst = Buffer.alloc(dw * sh * 4);
    const scale = sw / dw;
    const support = Math.max(1, scale);
    for (let x = 0; x < dw; x++) {
      const centre = (x + 0.5) * scale;
      const lo = Math.max(0, Math.floor(centre - support));
      const hi = Math.min(sw - 1, Math.ceil(centre + support));
      const weights = [];
      let total = 0;
      for (let i = lo; i <= hi; i++) {
        const wgt = Math.max(0, 1 - Math.abs(i + 0.5 - centre) / support);
        weights.push(wgt); total += wgt;
      }
      for (let y = 0; y < sh; y++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = lo; i <= hi; i++) {
          const wgt = weights[i - lo] / total;
          const s = (y * sw + i) * 4;
          r += src[s] * wgt; g += src[s + 1] * wgt; b += src[s + 2] * wgt; a += src[s + 3] * wgt;
        }
        const d = (y * dw + x) * 4;
        dst[d] = Math.round(r); dst[d + 1] = Math.round(g);
        dst[d + 2] = Math.round(b); dst[d + 3] = Math.round(a);
      }
    }
    return dst;
  };

  // Horizontal, then transpose-and-repeat for the vertical axis.
  const transpose = (src, w, h) => {
    const dst = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = (x * h + y) * 4;
      dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2]; dst[d + 3] = src[s + 3];
    }
    return dst;
  };

  let buf = pass(img.rgba, img.w, img.h, size);      // w -> size
  buf = transpose(buf, size, img.h);                  // now img.h wide, size tall
  buf = pass(buf, img.h, size, size);                 // h -> size
  buf = transpose(buf, size, size);
  return buf;
}

/* Round the corners of a square RGBA buffer (for previews only — the
   icons we ship stay square so iOS and Android can mask them). */
function roundCorners(rgba, size, radius = 0.22) {
  const out = Buffer.from(rgba);
  const r = radius * size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.min(Math.max(x + 0.5, r), size - r);
      const cy = Math.min(Math.max(y + 0.5, r), size - r);
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r;
      const cov = Math.min(1, Math.max(0, 0.5 - d));
      out[(y * size + x) * 4 + 3] = Math.round(out[(y * size + x) * 4 + 3] * cov);
    }
  }
  return out;
}

/* The browser-window strip that marks a desktop-mode dashboard,
   painted over an imported icon so both variants stay a family. */
function desktopStrip(rgba, size) {
  const out = Buffer.from(rgba);
  const barH = Math.round(size * 0.19);
  for (let y = 0; y < barH; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      out[i] = Math.round(out[i] * 0.42);
      out[i + 1] = Math.round(out[i + 1] * 0.42);
      out[i + 2] = Math.round(out[i + 2] * 0.42);
    }
  }
  const dotR = size * 0.028, dotY = size * 0.095;
  for (const dx of [0.20, 0.29, 0.38]) {
    const dotX = size * dx;
    for (let y = Math.floor(dotY - dotR - 1); y <= Math.ceil(dotY + dotR + 1); y++) {
      for (let x = Math.floor(dotX - dotR - 1); x <= Math.ceil(dotX + dotR + 1); x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const cov = Math.min(1, Math.max(0,
          0.5 - (Math.hypot(x + 0.5 - dotX, y + 0.5 - dotY) - dotR)));
        if (cov <= 0) continue;
        const i = (y * size + x) * 4;
        out[i] = Math.round(out[i] + (255 - out[i]) * cov * 0.92);
        out[i + 1] = Math.round(out[i + 1] + (255 - out[i + 1]) * cov * 0.92);
        out[i + 2] = Math.round(out[i + 2] + (255 - out[i + 2]) * cov * 0.92);
      }
    }
  }
  return out;
}

/* One call: screenshot file -> square RGBA at `size`. */
function importIcon(file, size, { desktop = false } = {}) {
  const img = squareUp(decodePng(fs.readFileSync(file)));
  let rgba = resize(img, size);
  if (desktop) rgba = desktopStrip(rgba, size);
  return rgba;
}

module.exports = { decodePng, squareUp, resize, roundCorners, desktopStrip, importIcon };
