/* ============================================================
   custom-store.js — the dashboards you make yourself.

   Imported HTML lives outside the app, on purpose. The packaged app
   is an asar archive and is read-only, so anything a user adds has to
   go somewhere writable that survives an update:

       <userData>/custom/index.json          the list
       <userData>/custom/<id>/index.html     the file you imported
       <userData>/custom/<id>/icon-180.png   drawn from its name
       <userData>/custom/<id>/icon-512.png
       <userData>/custom/<id>/app.webmanifest

   Two callers share this module and must not drift apart:
     electron/custom.js   binds it to app.getPath('userData')
     tools/lan-server.js  serves the same folder to your phone, so a
                          dashboard imported on the PC shows up there

   Nothing here trusts the HTML it is handed. It is stored verbatim
   and never executed in this process; the viewer renders it inside a
   sandboxed iframe (see custom/view.html).
   ============================================================ */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { writePng, renderIcon, flatten } = require('./icon-render.js');
const { letter } = require('./icon-specs.js');

const INDEX = 'index.json';
const MAX_BYTES = 8 * 1024 * 1024;   // a dashboard is text; 8MB is already absurd

/* ---------------- where it lives ----------------

   Electron passes its own userData path in. The command-line server
   has no Electron to ask, so it reconstructs the same location —
   these have to agree or the phone would serve an empty list while
   the app showed a full one. `productName` in package.json is what
   Electron uses for the folder name. */
function defaultDir(productName = 'Krypt LARP') {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
      productName, 'custom');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', productName, 'custom');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'),
    productName, 'custom');
}

/* ---------------- ids ---------------- */

/** A filesystem- and URL-safe id: readable stem plus a short suffix so
    two dashboards called "Bank" can coexist. */
function makeId(name, taken = new Set()) {
  const stem = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28) || 'dashboard';
  let id = stem;
  let n = 2;
  while (taken.has(id)) id = `${stem}-${n++}`;
  return id;
}

/** Anything that could climb out of the store directory is not an id. */
function validId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);
}

/* ---------------- the icon ----------------

   Colour comes from the name, so the tile is stable: rename it and the
   colour follows, import the same thing twice and both look the same. */
const PALETTE = [
  ['#3FD996', '#0F8F62'], ['#54C2E4', '#0D7BAE'], ['#7FA6FF', '#3B4FD0'],
  ['#A8B4F8', '#6257D2'], ['#F2A0F0', '#8E3AC8'], ['#FF8AA4', '#CE3459'],
  ['#FFA95C', '#D25A16'], ['#BCD84F', '#66922C'], ['#3ADCC4', '#0C8E80'],
  ['#FFD264', '#DE821A'],
];

function hashOf(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function iconSpec(name) {
  const [from, to] = PALETTE[hashOf(name) % PALETTE.length];
  const ch = (String(name).trim().match(/[A-Za-z]/) || ['D'])[0].toUpperCase();
  return {
    bg: { type: 'linear', angle: 140, stops: [[0, from], [1, to]] },
    marks: [letter(ch, '#FFFFFF', { sw: 0.088 })],
    bgc: to,
    theme: to,
  };
}

function writeIcons(dir, name) {
  const spec = iconSpec(name);
  const square = { ...spec, radius: 0 };
  for (const size of [180, 512]) {
    writePng(path.join(dir, `icon-${size}.png`), size,
      flatten(renderIcon(size, square), size, spec.bgc));
  }
  return spec;
}

/* ---------------- the store ---------------- */

function createStore(root) {
  const ROOT = path.resolve(root);
  const indexFile = () => path.join(ROOT, INDEX);
  const dirOf = (id) => path.join(ROOT, id);

  function ensure() {
    fs.mkdirSync(ROOT, { recursive: true });
  }

  function readIndex() {
    try {
      const raw = JSON.parse(fs.readFileSync(indexFile(), 'utf8'));
      if (Array.isArray(raw && raw.items)) return raw.items.filter(i => validId(i && i.id));
    } catch { /* missing or corrupt — an empty collection is the right answer */ }
    return [];
  }

  function writeIndex(items) {
    ensure();
    fs.writeFileSync(indexFile(),
      JSON.stringify({ version: 1, items }, null, 2), 'utf8');
    return items;
  }

  /** The list, newest first, with the fields the UIs actually render. */
  function list() {
    return readIndex()
      .slice()
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }

  function get(id) {
    return validId(id) ? readIndex().find(i => i.id === id) || null : null;
  }

  function htmlPath(id) {
    if (!validId(id)) return null;
    return path.join(dirOf(id), 'index.html');
  }

  function html(id) {
    const p = htmlPath(id);
    if (!p) return null;
    try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
  }

  /**
   * Store a dashboard.
   *   add({ name, html, tag })  ->  the new record
   * Throws with a message meant to be shown to a person.
   */
  function add({ name, html: source, tag = 'Yours' } = {}) {
    const text = String(source == null ? '' : source);
    if (!text.trim()) throw new Error('That file is empty.');
    if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
      throw new Error('That file is larger than 8 MB — it probably is not a dashboard.');
    }
    if (!/<html|<body|<!doctype html|<div|<style/i.test(text)) {
      throw new Error('That does not look like an HTML page.');
    }

    ensure();
    const items = readIndex();
    const clean = String(name || '').trim().slice(0, 48) || 'Untitled dashboard';
    const id = makeId(clean, new Set(items.map(i => i.id)));
    const dir = dirOf(id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), text, 'utf8');

    const spec = writeIcons(dir, clean);
    writeManifest(id, clean, spec);

    const now = Date.now();
    const rec = {
      id, name: clean, tag: String(tag).slice(0, 24),
      added: now, updated: now,
      bytes: Buffer.byteLength(text, 'utf8'),
      theme: spec.theme,
    };
    items.push(rec);
    writeIndex(items);
    return rec;
  }

  /** The manifest that lets a custom dashboard install to a Home Screen
      like the built-in ones. Paths are relative to the manifest itself,
      which is served from /custom/<id>/. */
  function writeManifest(id, name, spec) {
    fs.writeFileSync(path.join(dirOf(id), 'app.webmanifest'), JSON.stringify({
      name: `${name} — Krypt LARP`,
      short_name: name.slice(0, 12),
      description: `${name} — a dashboard you imported. Part of your Krypt LARP collection.`,
      start_url: `./`,
      scope: `./`,
      display: 'standalone',
      display_override: ['fullscreen', 'standalone', 'minimal-ui'],
      orientation: 'portrait',
      background_color: spec.bgc,
      theme_color: spec.theme,
      icons: [
        { src: './icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }, null, 2) + '\n', 'utf8');
  }

  function rename(id, name) {
    const items = readIndex();
    const rec = items.find(i => i.id === id);
    if (!rec) throw new Error('That dashboard is no longer here.');
    rec.name = String(name || '').trim().slice(0, 48) || rec.name;
    rec.updated = Date.now();
    // The tile is drawn from the name, so it has to be redrawn with it.
    const spec = writeIcons(dirOf(id), rec.name);
    rec.theme = spec.theme;
    writeManifest(id, rec.name, spec);
    writeIndex(items);
    return rec;
  }

  /** Replace the HTML of an existing entry, keeping its id and icon —
      which is what you want when the AI gives you a better second try. */
  function replace(id, source) {
    const items = readIndex();
    const rec = items.find(i => i.id === id);
    if (!rec) throw new Error('That dashboard is no longer here.');
    const text = String(source == null ? '' : source);
    if (!text.trim()) throw new Error('That file is empty.');
    if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
      throw new Error('That file is larger than 8 MB.');
    }
    fs.writeFileSync(path.join(dirOf(id), 'index.html'), text, 'utf8');
    rec.bytes = Buffer.byteLength(text, 'utf8');
    rec.updated = Date.now();
    writeIndex(items);
    return rec;
  }

  function remove(id) {
    if (!validId(id)) return false;
    const items = readIndex();
    const at = items.findIndex(i => i.id === id);
    if (at === -1) return false;
    items.splice(at, 1);
    writeIndex(items);
    try { fs.rmSync(dirOf(id), { recursive: true, force: true }); } catch { /* gone already */ }
    return true;
  }

  /** Resolve a URL path under /custom/ to a file, refusing anything
      that tries to climb out. Used by the LAN server. */
  function resolveServed(urlPath) {
    const rel = String(urlPath).replace(/^\/+/, '');
    const full = path.resolve(ROOT, rel);
    if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
    // The index is metadata, not content — it is served by /api/custom.
    if (path.basename(full) === INDEX) return null;
    return full;
  }

  return {
    root: ROOT,
    list, get, add, rename, replace, remove,
    html, htmlPath, resolveServed,
  };
}

module.exports = { createStore, defaultDir, validId, makeId };
