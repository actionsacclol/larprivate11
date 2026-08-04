#!/usr/bin/env node
/* ============================================================
   Generates every home-screen icon and web-app manifest.

       node tools/make-icons.js

   Each dashboard's icon comes from one of two places:

     1. a screenshot in appicons/ if SOURCES below names one — it gets
        squared up, its rounded corners rebuilt, and resampled
     2. otherwise the vector design in tools/icon-specs.js

   Writes:
     assets/icons/<slug>-180.png        iOS "Add to Home Screen"
     assets/icons/<slug>-512.png        Android / manifest
     assets/manifests/<slug>.webmanifest
     assets/icon-*.png                  the gallery's own icons
     assets/icons/_contact-sheet.png    every icon on one page, to eyeball
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { writePng, renderIcon, flatten } = require('./icon-render.js');
const { importIcon, roundCorners } = require('./png-import.js');
const { SPECS, GALLERY } = require('./icon-specs.js');

const ROOT      = path.resolve(__dirname, '..');
const ICONS     = path.join(ROOT, 'assets', 'icons');
const MANIFESTS = path.join(ROOT, 'assets', 'manifests');
const APPICONS  = path.join(ROOT, 'appicons');

/* Extra filenames to accept for a slug, relative to appicons/.

   Before consulting this table, a slug is matched against the obvious
   filenames automatically — `apple-card` finds apple-card.png,
   applecard.png or apple card.png on its own — all case-insensitively.
   So this only lists the aliases that aren't derivable from the slug.

   Names whose file doesn't exist are simply ignored, which makes the
   list double as a wishlist: drop that file in and the icon switches
   from drawn to photo on the next run, no edit needed.

   One screenshot can serve both a mobile and a desktop dashboard — the
   desktop one gets the browser-window strip painted over it. */
const SOURCES = {
  'phantom-wallet':         ['phantom.png'],
  'venmo':                  ['venmno.png'],          // as named in appicons/
  'x-earnings':             ['x.png', 'twitter.png'],
  'kalshi-desktop':         ['kalshi.png'],
  'shopify-desktop':        ['shopify.png'],
  'stripe-desktop':         ['stripe.png'],
  'github-desktop':         ['github.png'],
  'tiktok-earnings':        ['tiktok.png'],
  'youtube-studio':         ['ytstudio.png', 'youtube.png'],
  'youtube-studio-desktop': ['ytstudio.png', 'youtube.png'],
  'instagram-insights':     ['instagram.png'],
  'apple-card':             ['wallet.png', 'applewallet.png'],
  'crypto-pnl':             ['futures.png'],
  'spotify-wrapped':        ['spotify.png'],
};

/* appicons/ indexed by lowercased filename, so lookups are case-insensitive. */
const AVAILABLE = fs.existsSync(APPICONS)
  ? new Map(fs.readdirSync(APPICONS)
      .filter(f => /\.png$/i.test(f))
      .map(f => [f.toLowerCase(), f]))
  : new Map();

fs.mkdirSync(ICONS, { recursive: true });
fs.mkdirSync(MANIFESTS, { recursive: true });

/* iOS applies its own corner rounding, so the tile is drawn square and
   opaque. Android's maskable crop wants a square that bleeds to the edge
   too — our marks all sit inside the safe circle, so one shape serves both. */
const square  = spec => ({ ...spec, radius: 0 });
const rounded = spec => ({ ...spec, radius: 0.22 });

/* Filenames to try for a slug, best first: the slug itself, then the
   same thing with the hyphens closed up or turned into spaces, then any
   aliases from SOURCES. `-desktop` variants fall back to their mobile
   twin's name so one screenshot serves both. */
function candidates(slug) {
  const base = slug.replace(/-desktop$/, '');
  const forms = new Set();
  for (const s of [slug, base]) {
    forms.add(`${s}.png`);
    forms.add(`${s.replace(/-/g, '')}.png`);
    forms.add(`${s.replace(/-/g, ' ')}.png`);
  }
  return [...forms, ...(SOURCES[slug] || [])];
}

function sourceFor(slug) {
  for (const name of candidates(slug)) {
    const actual = AVAILABLE.get(name.toLowerCase());
    if (actual) return path.join(APPICONS, actual);
  }
  return null;
}

/** Square, opaque RGBA for a slug at `size`. */
function iconFor(slug, spec, size) {
  const src = sourceFor(slug);
  if (src) return importIcon(src, size, { desktop: slug.endsWith('-desktop') });
  return flatten(renderIcon(size, square(spec)), size, spec.bgc);
}

let bytes = 0;
const sheet = [];
const drawn = [], photo = [];

for (const [slug, spec] of Object.entries(SPECS)) {
  if (!fs.existsSync(path.join(ROOT, 'dashboards', slug))) {
    console.log(`  !  ${slug} — no dashboards/${slug}/, icon written anyway`);
  }

  bytes += writePng(path.join(ICONS, `${slug}-180.png`), 180, iconFor(slug, spec, 180));
  bytes += writePng(path.join(ICONS, `${slug}-512.png`), 512, iconFor(slug, spec, 512));

  fs.writeFileSync(
    path.join(MANIFESTS, `${slug}.webmanifest`),
    JSON.stringify({
      name: `${spec.title} — Krypt LARP`,
      short_name: spec.label,
      description: `${spec.title}, recreated. Part of the Krypt LARP collection.`,
      // Relative to this manifest file, i.e. assets/manifests/
      start_url: `../../dashboards/${slug}/index.html`,
      scope: '../../',
      display: 'standalone',
      display_override: ['fullscreen', 'standalone', 'minimal-ui'],
      orientation: slug.endsWith('-desktop') ? 'any' : 'portrait',
      background_color: spec.bgc,
      theme_color: spec.theme,
      icons: [
        { src: `../icons/${slug}-180.png`, sizes: '180x180', type: 'image/png', purpose: 'any' },
        { src: `../icons/${slug}-512.png`, sizes: '512x512', type: 'image/png',
          purpose: 'any maskable' },
      ],
    }, null, 2) + '\n',
    'utf8'
  );

  const isPhoto = !!sourceFor(slug);
  (isPhoto ? photo : drawn).push(slug);
  sheet.push({ slug, spec, isPhoto });
  console.log(`  ${isPhoto ? 'photo ' : 'drawn '} ${slug.padEnd(24)} ${spec.label}`);
}

/* ---- the gallery's own icons ---- */
bytes += writePng(path.join(ROOT, 'assets', 'apple-touch-icon.png'), 180,
  flatten(renderIcon(180, square(GALLERY)), 180, GALLERY.bgc));
bytes += writePng(path.join(ROOT, 'assets', 'icon-192.png'), 192, renderIcon(192, rounded(GALLERY)));
bytes += writePng(path.join(ROOT, 'assets', 'icon-512.png'), 512,
  flatten(renderIcon(512, square(GALLERY)), 512, GALLERY.bgc));
bytes += writePng(path.join(ROOT, 'assets', 'icon-maskable-512.png'), 512,
  flatten(renderIcon(512, square(GALLERY)), 512, GALLERY.bgc));
bytes += writePng(path.join(ROOT, 'assets', 'favicon-32.png'), 32, renderIcon(32, rounded(GALLERY)));

/* ---- contact sheet, so they can all be checked at a glance ---- */
{
  const CELL = 108, PAD = 12, COLS = 6;
  const all = [{ slug: 'GALLERY', spec: GALLERY, isPhoto: false }, ...sheet];
  const rows = Math.ceil(all.length / COLS);
  const W = COLS * (CELL + PAD) + PAD;
  const H = rows * (CELL + PAD) + PAD;
  const canvas = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    canvas[i * 4] = 0x14; canvas[i * 4 + 1] = 0x14; canvas[i * 4 + 2] = 0x18;
    canvas[i * 4 + 3] = 255;
  }
  all.forEach((entry, i) => {
    const icon = entry.isPhoto
      ? roundCorners(iconFor(entry.slug, entry.spec, CELL), CELL)
      : renderIcon(CELL, rounded(entry.spec));
    const ox = PAD + (i % COLS) * (CELL + PAD);
    const oy = PAD + Math.floor(i / COLS) * (CELL + PAD);
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const s = (y * CELL + x) * 4, d = ((oy + y) * W + (ox + x)) * 4;
        const a = icon[s + 3] / 255;
        canvas[d]     = Math.round(icon[s]     * a + canvas[d]     * (1 - a));
        canvas[d + 1] = Math.round(icon[s + 1] * a + canvas[d + 1] * (1 - a));
        canvas[d + 2] = Math.round(icon[s + 2] * a + canvas[d + 2] * (1 - a));
      }
    }
  });
  writeRect(path.join(ICONS, '_contact-sheet.png'), W, H, canvas);
}

function writeRect(file, w, h, rgba) {
  // Same as writePng but for a non-square image.
  const zlib = require('zlib');
  const crcT = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcT[n] = c;
  }
  const crc32 = buf => {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = crcT[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

console.log(`\n  ${photo.length} from screenshots, ${drawn.length} still drawn`);
console.log(`  ${(bytes / 1024).toFixed(0)} KB written to assets/icons and assets/manifests`);

if (drawn.length) {
  console.log('\n  Still drawn — drop a screenshot into appicons/ to replace one:');
  for (const slug of drawn) {
    console.log(`     ${slug.padEnd(24)} appicons/${candidates(slug)[0]}`);
  }
}
console.log(`\n  Review them all at once: assets/icons/_contact-sheet.png\n`);
