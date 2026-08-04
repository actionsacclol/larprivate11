#!/usr/bin/env node
/* ============================================================
   Wires the phone/app bits into every dashboard and the gallery:

     - assets/phone.css          full-bleed layout on real phones
     - its own icon + manifest   so each dashboard installs to the
                                 home screen as its own app
     - assets/krypt-app.js       the Gallery / Fullscreen / Install control

   Safe to re-run — every block is fenced by a marker comment and gets
   replaced rather than duplicated. Run it after building a new
   dashboard (and add an entry to tools/icon-specs.js first, so it gets
   an icon):

       node tools/make-icons.js && node tools/patch-dashboards.js
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { SPECS } = require('./icon-specs.js');

const ROOT = path.resolve(__dirname, '..');
const DASH = path.join(ROOT, 'dashboards');

const HEAD = ['<!-- krypt:phone:start -->', '<!-- krypt:phone:end -->'];
const BODY = ['<!-- krypt:app:start -->', '<!-- krypt:app:end -->'];
const LEGACY = [['<!-- krypt:back:start -->', '<!-- krypt:back:end -->']];

/* Replace an existing marker block, else insert just before `before`. */
function upsert(html, [start, end], block, before) {
  const s = html.indexOf(start);
  if (s !== -1) {
    const e = html.indexOf(end, s);
    if (e !== -1) return html.slice(0, s) + block + html.slice(e + end.length);
  }
  const at = html.toLowerCase().lastIndexOf(before);
  if (at === -1) return null;
  return html.slice(0, at) + block + '\n' + html.slice(at);
}

function stripBlock(html, [start, end]) {
  const s = html.indexOf(start);
  if (s === -1) return html;
  const e = html.indexOf(end, s);
  if (e === -1) return html;
  return html.slice(0, s) + html.slice(e + end.length).replace(/^\n/, '');
}

/* Set an attribute on the <html> element, replacing any previous value. */
function setHtmlAttr(html, name, value) {
  const re = new RegExp(`\\s${name}="[^"]*"`, 'i');
  return html.replace(/<html\b([^>]*)>/i, (m, attrs) => {
    const cleaned = attrs.replace(re, '');
    return `<html${cleaned} ${name}="${value}">`;
  });
}

let patched = 0, skipped = 0, missing = [];

for (const dir of fs.readdirSync(DASH, { withFileTypes: true }).sort((a, b) =>
  a.name.localeCompare(b.name))) {
  if (!dir.isDirectory()) continue;
  const slug = dir.name;
  const file = path.join(DASH, slug, 'index.html');
  if (!fs.existsSync(file)) continue;

  const original = fs.readFileSync(file, 'utf8');

  // Desktop dashboards use a browser-window frame and are meant for a big
  // screen — they still get an icon and the control, but no phone layout.
  const isPhone = /\.phone\s*\{/.test(original);

  const spec = SPECS[slug];
  if (!spec) {
    missing.push(slug);
    console.log(`  SKIP    ${slug}  — no entry in tools/icon-specs.js`);
    skipped++;
    continue;
  }

  const statusStyle = spec.dark ? 'black-translucent' : 'default';
  const head = [
    HEAD[0],
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    `<meta name="apple-mobile-web-app-status-bar-style" content="${statusStyle}">`,
    `<meta name="apple-mobile-web-app-title" content="${spec.label}">`,
    `<meta name="theme-color" content="${spec.theme}">`,
    `<link rel="manifest" href="../../assets/manifests/${slug}.webmanifest">`,
    `<link rel="apple-touch-icon" href="../../assets/icons/${slug}-180.png">`,
    `<link rel="icon" type="image/png" sizes="512x512" href="../../assets/icons/${slug}-512.png">`,
    // phone.css drops the phone bezel on a real phone; desktop.css drops the
    // fake browser window on a real desktop. Each dashboard gets whichever
    // matches the frame it was drawn in.
    isPhone
      ? '<link rel="stylesheet" href="../../assets/phone.css">'
      : '<link rel="stylesheet" href="../../assets/desktop.css">',
    HEAD[1],
  ].join('\n');

  const body = [
    BODY[0],
    `<script src="../../assets/krypt-app.js" data-root="../../" ` +
      `data-label="${spec.label}" defer></script>`,
    // Inert unless running inside the Electron shell.
    '<script src="../../assets/krypt-desktop.js" defer></script>',
    // Simulated push notifications. Injected everywhere on purpose —
    // push.js carries its own list of which dashboards have content and
    // exits for the rest, so there's no second list to keep in sync.
    '<script src="../../assets/push.js" defer></script>',
    BODY[1],
  ].join('\n');

  let html = original;
  for (const m of LEGACY) html = stripBlock(html, m);

  html = setHtmlAttr(html, 'data-krypt-status', spec.dark ? 'translucent' : 'opaque');

  html = upsert(html, HEAD, head, '</head>');
  if (html === null) { console.log(`  FAILED  ${slug}  (no </head>)`); continue; }

  html = upsert(html, BODY, body, '</body>');
  if (html === null) { console.log(`  FAILED  ${slug}  (no </body>)`); continue; }

  if (html === original) { console.log(`  ok      ${slug}`); continue; }

  fs.writeFileSync(file, html, 'utf8');
  console.log(`  patched ${slug.padEnd(24)} ${isPhone ? 'phone ' : 'desktop'}  ${spec.label}`);
  patched++;
}

/* ---- the gallery itself ---- */
{
  const file = path.join(ROOT, 'index.html');
  const original = fs.readFileSync(file, 'utf8');
  const body = [
    BODY[0],
    '<script src="assets/krypt-app.js" data-root="./" data-label="Krypt LARP" ' +
      'data-gallery defer></script>',
    '<script src="assets/krypt-desktop.js" defer></script>',
    BODY[1],
  ].join('\n');
  const html = upsert(original, BODY, body, '</body>');
  if (html && html !== original) {
    fs.writeFileSync(file, html, 'utf8');
    console.log('  patched index.html            gallery');
    patched++;
  } else {
    console.log('  ok      index.html');
  }
}

console.log(`\n  ${patched} file(s) updated.`);
if (missing.length) {
  console.log(`  ${missing.length} dashboard(s) have no icon design yet: ${missing.join(', ')}`);
  console.log('  Add them to tools/icon-specs.js, then re-run make-icons.js and this script.');
}
console.log('');
