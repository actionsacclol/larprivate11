/* ============================================================
   icon-render.js — a tiny vector renderer that writes PNGs.

   No dependencies. Everything is drawn in a 0..1 coordinate box
   (x right, y down) out of three primitives — stroked polylines,
   filled polygons, and circles — antialiased with a signed
   distance field plus 3x3 supersampling.

   Used by make-icons.js. See icon-specs.js for the designs.
   ============================================================ */

const fs = require('fs');
const zlib = require('zlib');

/* ---------------- PNG output ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writePng(file, size, rgba) {
  const png = encodePng(size, rgba);
  fs.writeFileSync(file, png);
  return png.length;
}

/* Windows .ico — a header, one directory entry per size, then the PNG
   bytes themselves. PNG-compressed entries are fine on Vista and up,
   which is everything electron-builder targets. */
function encodeIco(images) {
  const dir = Buffer.alloc(6 + images.length * 16);
  dir.writeUInt16LE(0, 0);              // reserved
  dir.writeUInt16LE(1, 2);              // type: 1 = icon
  dir.writeUInt16LE(images.length, 4);

  let offset = dir.length;
  const blobs = [];
  images.forEach((img, i) => {
    const p = 6 + i * 16;
    dir[p]     = img.size >= 256 ? 0 : img.size;  // 0 means 256
    dir[p + 1] = img.size >= 256 ? 0 : img.size;
    dir[p + 2] = 0;                     // palette size
    dir[p + 3] = 0;                     // reserved
    dir.writeUInt16LE(1, p + 4);        // colour planes
    dir.writeUInt16LE(32, p + 6);       // bits per pixel
    dir.writeUInt32LE(img.png.length, p + 8);
    dir.writeUInt32LE(offset, p + 12);
    offset += img.png.length;
    blobs.push(img.png);
  });

  return Buffer.concat([dir, ...blobs]);
}

/* ---------------- geometry ---------------- */

function hex(c) {
  const h = c.replace('#', '');
  const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

// Distance from p to segment ab.
function sdSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, (wx * vx + wy * vy) / len2));
  const dx = wx - vx * t, dy = wy - vy * t;
  return Math.sqrt(dx * dx + dy * dy);
}

// Smallest distance from p to a polyline (or polygon outline when closed).
function distToPath(px, py, pts, closed) {
  let d = Infinity;
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const s = sdSeg(px, py, a[0], a[1], b[0], b[1]);
    if (s < d) d = s;
  }
  return d;
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* Turn an arc into a polyline. Angles in degrees, y-down
   (0 = right, 90 = down, 180 = left, 270 = up). */
function arc(cx, cy, r, a0, a1, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + (a1 - a0) * (i / steps)) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/* Map a glyph defined in a local 0..1 box into the icon box. */
function place(paths, x, y, w, h) {
  return paths.map(p => p.map(([px, py]) => [x + px * w, y + py * h]));
}

/* ---------------- rendering ---------------- */

const SS = 3; // supersample factor per axis

function bgColorAt(bg, x, y) {
  if (bg.type === 'solid') return bg._rgb || (bg._rgb = hex(bg.color));
  if (!bg._stops) bg._stops = bg.stops.map(([t, c]) => [t, hex(c)]);
  const a = ((bg.angle ?? 135) * Math.PI) / 180;
  // Project onto the gradient axis and normalise to 0..1 across the tile.
  const ux = Math.cos(a), uy = Math.sin(a);
  const span = Math.abs(ux) + Math.abs(uy);
  let t = ((x - 0.5) * ux + (y - 0.5) * uy) / span + 0.5;
  t = Math.min(1, Math.max(0, t));
  const s = bg._stops;
  for (let i = 0; i < s.length - 1; i++) {
    const [t0, c0] = s[i], [t1, c1] = s[i + 1];
    if (t <= t1 || i === s.length - 2) {
      const k = t1 === t0 ? 0 : Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return s[0][1];
}

/* Signed distance for one mark: negative inside the shape. */
function markDistance(m, x, y) {
  switch (m.type) {
    case 'stroke':
      return distToPath(x, y, m.pts, !!m.closed) - m.w / 2;
    case 'strokes': {
      let d = Infinity;
      for (const p of m.pts) d = Math.min(d, distToPath(x, y, p, !!m.closed) - m.w / 2);
      return d;
    }
    case 'fill': {
      const d = distToPath(x, y, m.pts, true);
      return pointInPoly(x, y, m.pts) ? -d : d;
    }
    case 'circle':
      return Math.hypot(x - m.c[0], y - m.c[1]) - m.r;
    case 'ringFill': {
      const d = Math.abs(Math.hypot(x - m.c[0], y - m.c[1]) - m.r);
      return d - m.w / 2;
    }
    default:
      return Infinity;
  }
}

/**
 * spec: {
 *   bg:      {type:'solid', color} | {type:'linear', angle, stops:[[t,color],...]}
 *   marks:   [ {type, ..., color} ]  drawn in order
 *   radius:  corner radius as a fraction of the tile (0 = square)
 *   scale:   optional overall scale for the marks (maskable safe zone)
 * }
 */
function renderIcon(size, spec) {
  const rgba = Buffer.alloc(size * size * 4);
  const S = size * SS;
  const aa = S;                 // 1 supersample step, in unit space, is 1/S
  const radius = spec.radius ?? 0;
  const scale = spec.scale ?? 1;
  const n = SS * SS;

  // Pre-scale marks about the centre once, rather than per sample.
  const marks = spec.marks.map(m => {
    if (scale === 1) return m;
    const sc = ([px, py]) => [0.5 + (px - 0.5) * scale, 0.5 + (py - 0.5) * scale];
    const o = { ...m };
    if (m.pts && m.type === 'strokes') o.pts = m.pts.map(p => p.map(sc));
    else if (m.pts) o.pts = m.pts.map(sc);
    if (m.c) o.c = sc(m.c);
    if (m.r != null) o.r = m.r * scale;
    if (m.w != null) o.w = m.w * scale;
    return o;
  });
  for (const m of marks) m._rgb = hex(m.color);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let ar = 0, ag = 0, ab = 0, aa_ = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = (x * SS + sx + 0.5) / S;
          const uy = (y * SS + sy + 0.5) / S;

          // Rounded-square tile coverage.
          let tile = 1;
          if (radius > 0) {
            const cx = Math.min(Math.max(ux, radius), 1 - radius);
            const cy = Math.min(Math.max(uy, radius), 1 - radius);
            const d = Math.hypot(ux - cx, uy - cy) - radius;
            tile = Math.min(1, Math.max(0, 0.5 - d * aa));
          }
          if (tile <= 0) continue;

          let [r, g, b] = bgColorAt(spec.bg, ux, uy);

          for (const m of marks) {
            const d = markDistance(m, ux, uy);
            const cov = Math.min(1, Math.max(0, 0.5 - d * aa)) * (m.opacity ?? 1);
            if (cov <= 0) continue;
            r += (m._rgb[0] - r) * cov;
            g += (m._rgb[1] - g) * cov;
            b += (m._rgb[2] - b) * cov;
          }

          ar += r * tile; ag += g * tile; ab += b * tile; aa_ += tile;
        }
      }

      const i = (y * size + x) * 4;
      if (aa_ > 0) {
        rgba[i]     = Math.round(ar / aa_);
        rgba[i + 1] = Math.round(ag / aa_);
        rgba[i + 2] = Math.round(ab / aa_);
        rgba[i + 3] = Math.round((aa_ / n) * 255);
      }
    }
  }
  return rgba;
}

/* Composite an RGBA buffer onto an opaque background — iOS home-screen
   icons must not be transparent. */
function flatten(rgba, size, bg = '#000000') {
  const [br, bg_, bb] = hex(bg);
  const out = Buffer.from(rgba);
  for (let i = 0; i < size * size * 4; i += 4) {
    const a = out[i + 3] / 255;
    out[i]     = Math.round(out[i]     * a + br  * (1 - a));
    out[i + 1] = Math.round(out[i + 1] * a + bg_ * (1 - a));
    out[i + 2] = Math.round(out[i + 2] * a + bb  * (1 - a));
    out[i + 3] = 255;
  }
  return out;
}

module.exports = {
  writePng, encodePng, encodeIco, renderIcon, flatten, arc, place, hex,
};
