#!/usr/bin/env node
/* ============================================================
   make-art.js — the in-page artwork that isn't a home-screen icon:
   the product tiles for the Appfront listing.

       node tools/make-art.js

   These used to be imported from real logo files sitting on a
   desktop (see the deleted tools/import-images.js). The dating-app
   tiles in assets/appstore were copies of four real apps' icons, so
   they are drawn here now, from the same primitives the home-screen
   icons use, for four apps that do not exist.

   assets/coins is a different case and is left alone — see below.

   Writes:
     assets/appstore/<app>.png      256px, square, opaque
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { writePng, renderIcon, flatten, arc } = require('./icon-render.js');

const ROOT = path.resolve(__dirname, '..');

const solid = color => ({ type: 'solid', color });
const grad = (angle, ...stops) => ({
  type: 'linear', angle,
  stops: stops.map((c, i) => [i / (stops.length - 1), c]),
});
const stroke = (pts, color, w, closed = false) => ({ type: 'stroke', pts, color, w, closed });
const strokes = (pts, color, w) => ({ type: 'strokes', pts, color, w });
const fill = (pts, color) => ({ type: 'fill', pts, color });

/* A four-point star, drawn as a diamond with concave sides. */
function spark(cx, cy, r, color, waist = 0.34) {
  const k = r * waist;
  return fill([
    [cx, cy - r], [cx + k, cy - k], [cx + r, cy],
    [cx + k, cy + k], [cx, cy + r], [cx - k, cy + k],
    [cx - r, cy], [cx - k, cy - k],
  ], color);
}

function ngon(cx, cy, r, n, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/* ---------------- not here: the coins ----------------

   assets/coins/ holds the real token artwork — SOL, USDT, USDC — and
   this script deliberately does not touch it.

   A ticker names an asset, not a company. A wallet that lists an
   invented token instead of the one you hold is broken rather than
   protected, and naming and drawing an asset in order to list it is
   what every wallet, exchange and portfolio tracker does. What stays
   invented here is the *product*: Bastion is not an exchange that
   exists, Nocturne is not a wallet you can download. The BTC they list
   is BTC.

   If you add a token, drop its artwork in assets/coins/ and reference
   it from the dashboard's COIN_ART map. Don't generate a stand-in.

   ---------------- Appfront product tiles ----------------

   Square and opaque; the listing rounds them in CSS. */
const APPS = {
  prowlr: {
    bg: solid('#17171B'),
    marks: [
      stroke(arc(0.5, 0.52, 0.24, 200, 340), '#F5B830', 0.085),
      { type: 'circle', c: [0.5, 0.34], r: 0.085, color: '#F5B830' },
    ],
  },
  kindling: {
    bg: grad(135, '#FBF4E6', '#E4D6BC'),
    marks: [
      fill([
        [0.5, 0.24],
        ...arc(0.5, 0.575, 0.205, -60, 240),
      ], '#232019'),
      { type: 'circle', c: [0.5, 0.60], r: 0.075, color: '#FBF4E6' },
    ],
  },
  sparkr: {
    bg: grad(135, '#FF8A6B', '#E62F72'),
    marks: [spark(0.5, 0.5, 0.30, '#FFFFFF', 0.28)],
  },
  beeline: {
    bg: grad(135, '#FFD84D', '#F0A21E'),
    marks: [
      stroke(ngon(0.5, 0.5, 0.255, 6, 90), '#2A2103', 0.075, true),
      strokes([[[0.5, 0.335], [0.5, 0.665]]], '#2A2103', 0.075),
    ],
  },
};

/* ---------------- run ---------------- */

let bytes = 0;

function render(dir, set, size) {
  const out = path.join(ROOT, dir);
  fs.mkdirSync(out, { recursive: true });
  for (const [name, spec] of Object.entries(set)) {
    const rgba = flatten(renderIcon(size, { ...spec, radius: 0 }), size, '#000000');
    bytes += writePng(path.join(out, `${name}.png`), size, rgba);
    console.log(`  drawn  ${dir}/${name}.png`);
  }
}

render('assets/appstore', APPS, 256);

console.log(`\n  ${(bytes / 1024).toFixed(0)} KB written.\n`);
