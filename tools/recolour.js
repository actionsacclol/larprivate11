#!/usr/bin/env node
/* ============================================================
   recolour.js — moves each dashboard's signature colour off the
   real product's and onto its own.

       node tools/recolour.js [--dry]

   A name and a logo are the loud part of a brand, but the colour is
   the part you recognise from across the room, and a few of these
   were carrying the exact hex a real company is known for. Every
   swap below lands on the palette its icon already uses
   (tools/icon-specs.js), so the tile and the screen behind it agree.

   Deliberately *not* here: the greys, the iOS system blue, and the
   green/red of a gain and a loss. Those are conventions, shared by
   every app in the category, and changing them would make the mocks
   read as broken rather than as original.

   Safe to re-run — the replacements are literal hex values and none
   of the new ones appear as keys.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

/* slug -> { oldHex: newHex }. Case-insensitive on the hex digits. */
const SWAPS = {
  'airwave-rewind': {   // was a music-green
    '#1ed760': '#F0A82E', '#1DB954': '#E09A22', '#0a7d38': '#A8620F',
    '#00c2a8': '#E8762A',
  },
  bastion: { '#0052FF': '#2E5AAE' },
  bodega: {
    '#008060': '#5F8C2E', '#004c3f': '#33501A', '#006e52': '#4E7726',
    '#cdfee1': '#e8f6c8', '#014b40': '#33501A',
  },
  'bodega-desktop': {
    '#008060': '#5F8C2E', '#004c3f': '#33501A', '#006e52': '#4E7726',
    '#95BF47': '#BCD84F', '#5E8E3E': '#66922C',
  },
  meridian: {
    '#117ACA': '#3E67C4', '#005EB8': '#28489E', '#004E8C': '#1D3576',
    '#eaf3fb': '#eceffb', '#dcebf8': '#dfe4f7', '#f2f7fc': '#f2f4fc',
  },
  momentum: { '#fa114f': '#E8556E', '#a2f73b': '#9BE04A', '#1aebff': '#42C8E8' },
  nimbus: { '#0070E0': '#2E7FB8', '#003087': '#13446E', '#009cde': '#5EC7DE' },
  nocturne: { '#ab9ff2': '#8E86E8', '#7a63e6': '#6257D2' },
  quill: { '#00D632': '#1FBB78', '#022b10': '#04291d' },
  quiver: { '#00C805': '#35E08A' },
  quorum: { '#1d9bf0': '#3D8FD8' },
  tandem: { '#008CFF': '#1892C8', '#0074E0': '#0D7BAE' },
  loopfeed: { '#FE2C55': '#FF6B9D', '#25F4EE': '#4DE0D0' },
  trailmark: { '#fc4c02': '#E8762A', '#FC4C02': '#E8762A' },
  trellis: { '#635BFF': '#4D6BE0', '#544ee0': '#3B4FD0' },
  'trellis-desktop': {
    '#635BFF': '#4D6BE0', '#7a73ff': '#7FA6FF', '#9088ff': '#8EA8F5',
  },
  verity: { '#00D68A': '#1BB5A2', '#0b3a2b': '#07322e' },
  'verity-desktop': { '#00D68A': '#1BB5A2', '#0b3a2b': '#07322e' },
  'vista-studio': { '#FF0000': '#E04A32' },
  'vista-studio-desktop': { '#FF0000': '#E04A32' },
  wellspring: { '#ff2d55': '#E24C6E', '#FF2D55': '#E24C6E' },
  'halo-insights': {   // the warm-to-purple story stays, the exact stops move
    '#FCB045': '#FFC46B', '#fcb045': '#FFC46B',
    '#FD1D1D': '#F2506E', '#fd1d1d': '#F2506E',
    '#833AB4': '#7A4BD6', '#833ab4': '#7A4BD6',
    '#C13584': '#A9469E', '#c13584': '#A9469E',
  },
  'crypto-pnl': { '#f0b90b': '#E8A21E', '#F0B90B': '#E8A21E' },
  codenest: { '#0d1117': '#101318' },
  'codenest-desktop': { '#0d1117': '#101318' },
  vend: { '#FF6243': '#E86A4E', '#ff6243': '#E86A4E' },
  dwell: { '#5e5ce6': '#6B63DA' },
};

/* The gallery's thumbnails hard-code the same colours inline. */
const GALLERY = Object.assign({}, ...Object.values(SWAPS));

let files = 0, hits = 0;

function recolour(file, table) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before, n = 0;
  for (const [from, to] of Object.entries(table)) {
    const re = new RegExp(from.replace('#', '#'), 'gi');
    after = after.replace(re, () => { n++; return to; });
  }
  if (!n || after === before) return;
  if (!DRY) fs.writeFileSync(file, after, 'utf8');
  console.log(`  ${DRY ? 'would fix' : 'recoloured'} ${path.relative(ROOT, file).padEnd(46)} ${n}`);
  files++; hits += n;
}

for (const [slug, table] of Object.entries(SWAPS)) {
  const file = path.join(ROOT, 'dashboards', slug, 'index.html');
  if (!fs.existsSync(file)) { console.log(`  MISSING dashboards/${slug}`); continue; }
  recolour(file, table);
}
recolour(path.join(ROOT, 'index.html'), GALLERY);

console.log(`\n  ${hits} colour(s) swapped across ${files} file(s).\n`);
