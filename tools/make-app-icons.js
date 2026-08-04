#!/usr/bin/env node
/* ============================================================
   Builds the desktop app's own icons from the gallery design in
   tools/icon-specs.js — same mark as the web-app icon, so the
   installer, the taskbar and the phone home screen all agree.

       node tools/make-app-icons.js

   Writes:
     resources/krypt.ico   window + NSIS installer (multi-size)
     resources/krypt.png   tray
     build/icon.png        electron-builder (mac/linux, 512)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { renderIcon, flatten, encodePng, encodeIco, writePng } = require('./icon-render.js');
const { GALLERY } = require('./icon-specs.js');

const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'resources');
const BUILD = path.join(ROOT, 'build');

fs.mkdirSync(RES, { recursive: true });
fs.mkdirSync(BUILD, { recursive: true });

/* Small sizes need a tighter corner radius or the mark gets clipped;
   at 16px a rounded square just reads as a blob, so go square. */
function tile(size) {
  const radius = size <= 24 ? 0.12 : 0.22;
  return flatten(renderIcon(size, { ...GALLERY, radius }), size, GALLERY.bgc);
}

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const ico = encodeIco(ICO_SIZES.map(size => ({ size, png: encodePng(size, tile(size)) })));
fs.writeFileSync(path.join(RES, 'krypt.ico'), ico);
console.log(`  resources/krypt.ico   ${ICO_SIZES.join(', ')}  ${(ico.length / 1024).toFixed(1)} KB`);

const tray = writePng(path.join(RES, 'krypt.png'), 256, tile(256));
console.log(`  resources/krypt.png   256x256  ${(tray / 1024).toFixed(1)} KB`);

const big = writePng(path.join(BUILD, 'icon.png'), 512, tile(512));
console.log(`  build/icon.png        512x512  ${(big / 1024).toFixed(1)} KB`);

console.log('');
