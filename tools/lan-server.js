/* ============================================================
   lan-server.js — the static server that puts the gallery on your
   Wi-Fi, as a module.

   Used by two callers: tools/serve.js (the double-click .cmd) and
   the Electron app's Phone panel. Neither one owns it, so the
   behaviour can't drift between them.
   ============================================================ */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const qrcode = require('./vendor/qrcode-generator.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'text/javascript; charset=utf-8',
  '.mjs' : 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md'  : 'text/markdown; charset=utf-8',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif' : 'image/gif',
  '.svg' : 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico' : 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf' : 'font/ttf',
  '.txt' : 'text/plain; charset=utf-8',
};

/* ---------- find the address other devices on the Wi-Fi can reach ----------

   Two kinds of adapter have to be kept out of the running or the QR code
   ends up encoding an address the phone cannot reach:

   virtual — VM, container and subsystem adapters (Hyper-V, WSL, Docker…)
   vpn     — while a VPN is up it usually owns a private address that looks
             exactly like a LAN one. Handing that to a phone gives a page
             that never loads, which is a miserable thing to debug.

   The names are matched loosely because vendors label adapters however they
   like; the short tokens are anchored so they can't match inside a longer
   unrelated word. */
const VIRTUAL_RE =
  /virtual|vmware|vbox|virtualbox|docker|wsl|hyper-?v|vethernet|loopback|bluetooth|npcap/i;

const VPN_RE = new RegExp([
  'vpn', 'wireguard', '\\bwg\\d', 'nordlynx', '\\bnord', 'protonvpn', 'mullvad',
  'surfshark', 'expressvpn', 'tap-?windows', 'openvpn', 'tailscale', 'zerotier',
  '\\bwarp\\b', 'cloudflare', 'windscribe', 'tunnelbear', 'hamachi',
  '\\bpia\\b', 'private internet', 'tunnel', '\\butun\\d', 'ipsec',
  'anyconnect', 'forticlient', 'globalprotect', 'zscaler', 'sonicwall',
  'checkpoint', 'pulse secure',
].join('|'), 'i');

function classifyInterface(name) {
  if (VPN_RE.test(name)) return 'vpn';
  if (VIRTUAL_RE.test(name)) return 'virtual';
  return 'lan';
}

/** Every non-internal IPv4 address, tagged with what kind of adapter it's on. */
function allAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      out.push({ name, address: a.address, kind: classifyInterface(name) });
    }
  }
  return out;
}

function score(e) {
  let s = 0;
  if (/^192\.168\./.test(e.address)) s += 4;
  else if (/^10\./.test(e.address)) s += 3;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(e.address)) s += 2;
  if (/wi-?fi|wlan|wireless/i.test(e.name)) s += 2;
  if (/^169\.254\./.test(e.address)) s -= 10; // link-local, not routable
  return s;
}

/** Addresses a phone on the same Wi-Fi can actually reach, best first. */
function lanAddresses() {
  return allAddresses()
    .filter(e => e.kind === 'lan')
    .sort((a, b) => score(b) - score(a));
}

/** VPN adapters currently holding an address — the usual reason a phone
    can connect to nothing at all. */
function vpnAddresses() {
  return allAddresses().filter(e => e.kind === 'vpn');
}

/* ---------- QR ---------- */
function qrMatrix(text) {
  const qr = qrcode(0, 'M'); // 0 = smallest version that fits, M = medium ECC
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    m.push(row);
  }
  return m;
}

/* Two QR rows per text row, using half-block characters. The terminal is
   dark, so the *light* modules are the ones drawn as filled blocks. */
function qrToTerminal(matrix, quiet = 2) {
  const n = matrix.length;
  const size = n + quiet * 2;
  const at = (r, c) => {
    const rr = r - quiet, cc = c - quiet;
    return rr >= 0 && cc >= 0 && rr < n && cc < n ? matrix[rr][cc] : false;
  };
  const lines = [];
  for (let r = 0; r < size; r += 2) {
    let line = '';
    for (let c = 0; c < size; c++) {
      const top = at(r, c), bottom = at(r + 1, c);
      if (!top && !bottom) line += '█';
      else if (!top && bottom) line += '▀';
      else if (top && !bottom) line += '▄';
      else line += ' ';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

function qrToSvg(matrix, moduleSize = 8, quiet = 3) {
  const n = matrix.length;
  const size = (n + quiet * 2) * moduleSize;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix[r][c]) continue;
      const x = (c + quiet) * moduleSize, y = (r + quiet) * moduleSize;
      d += `M${x} ${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- the server ---------- */

/**
 * createLanServer({ root, port, launchPage, cacheDays, custom })
 *   root         folder to serve
 *   port         TCP port (default 4173)
 *   launchPage   optional () => string, served at /_launch
 *   custom       optional store from tools/custom-store.js. Mounted at
 *                /custom/ with its list at /api/custom.
 *
 * The custom mount is a second root on purpose. Dashboards a user
 * imports cannot live under `root` — in a packaged build that is an
 * asar archive and read-only — so they sit in userData and get served
 * from there. Without this the phone would show the built-in
 * collection and none of the ones you made.
 *
 * Returns { listen, close, port, urls, primaryUrl, isRunning }.
 */
function createLanServer({ root, port = 4173, launchPage = null, cacheDays = 7,
  custom = null } = {}) {
  const ROOT = path.resolve(root);
  // How long a phone may keep a file without asking again. This is what
  // lets the collection keep working after the server goes away: the
  // browser serves straight from its own cache and never touches the
  // network. Set to 0 to go back to always-revalidate.
  //
  // The trade is staleness — edit a dashboard on the PC and a phone that
  // already visited can show the old one until this expires. Appending
  // any query string (?fresh) bypasses it, which is the escape hatch.
  const MAX_AGE = Math.max(0, Math.round(cacheDays * 86400));
  let running = false;
  let actualPort = port;

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, {
      // Default stays no-cache — only successfully served files opt into
      // a long life, below. A cached 404 or a cached launch page would
      // both be worse than useless.
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    });
    res.end(body);
  };

  const notFound = (what) =>
    `<!DOCTYPE html><meta charset="utf-8">
<style>body{background:#0a0a0c;color:#e9e9ef;font:400 15px/1.6 system-ui;display:grid;
place-items:center;height:100vh;text-align:center}a{color:#8ab4ff}</style>
<div><h1 style="font-size:48px;margin:0 0 8px">404</h1>
<p style="color:#8a8a98">${esc(what)}</p>
<p style="margin-top:16px"><a href="/">← Back to the gallery</a></p></div>`;

  /* Which files could this URL mean? Deliberately no fs.stat() directory
     probe: when the Electron build serves out of app.asar, stat() on the
     archive root fails and every "/" request 404s, even though readFile on
     the very same path works. Resolving candidates by name instead behaves
     identically on disk and inside an asar. */
  const candidatesFor = (urlPath) => {
    const out = [];
    if (urlPath.endsWith('/')) {
      out.push(path.join(ROOT, urlPath, 'index.html'));
    } else {
      out.push(path.join(ROOT, urlPath));
      // extension-less path — treat it as a folder and look for its index
      if (!path.extname(urlPath)) out.push(path.join(ROOT, urlPath, 'index.html'));
    }
    // Never escape ROOT, whatever the URL contained.
    return out.filter(p => p === ROOT || p.startsWith(ROOT + path.sep));
  };

  const tryServe = (list, i, urlPath, res, fresh) => {
    if (i >= list.length) {
      return send(res, 404, notFound(urlPath), { 'Content-Type': MIME['.html'] });
    }
    fs.readFile(list[i], (err, data) => {
      if (err) return tryServe(list, i + 1, urlPath, res, fresh);
      const type = MIME[path.extname(list[i]).toLowerCase()] || 'application/octet-stream';
      const headers = { 'Content-Type': type, 'Content-Length': data.length };
      if (MAX_AGE > 0 && !fresh) {
        headers['Cache-Control'] = 'public, max-age=' + MAX_AGE;
        try { headers['Last-Modified'] = fs.statSync(list[i]).mtime.toUTCString(); } catch { /* ignore */ }
      }
      send(res, 200, data, headers);
    });
  };

  const server = http.createServer((req, res) => {
    let urlPath, fresh = false;
    try {
      const u = new URL(req.url, 'http://x');
      urlPath = decodeURIComponent(u.pathname);
      // Any query string means "don't hand me the cached copy" — so
      // ?fresh forces a reload on a phone holding a stale version.
      fresh = u.search.length > 0;
    } catch {
      return send(res, 400, 'Bad request', { 'Content-Type': 'text/plain' });
    }

    if (urlPath === '/_launch' && launchPage) {
      return send(res, 200, launchPage(), { 'Content-Type': MIME['.html'] });
    }

    /* ---- dashboards the user imported ---- */
    if (urlPath === '/api/custom') {
      const body = JSON.stringify(custom ? custom.list() : []);
      // Never cached: the whole point is that the phone sees an import
      // the moment it happens.
      return send(res, 200, body, { 'Content-Type': MIME['.json'] });
    }

    if (urlPath === '/custom' || urlPath === '/custom/') {
      // The management page is part of the app, not the store.
      return send(res, 302, '', { Location: '/custom/index.html' });
    }

    if (urlPath.startsWith('/custom/')) {
      // The project's own pages under custom/ (the manager, the viewer,
      // the guide) are tried first, so no imported dashboard can be
      // named in a way that shadows the UI. Both roots go into one
      // candidate list rather than an existsSync() probe, because
      // stat() misbehaves inside an asar archive and readFile doesn't.
      const rest = urlPath.slice('/custom/'.length);
      const stored = custom
        ? custom.resolveServed(!rest || rest.endsWith('/') ? rest + 'index.html' : rest)
        : null;
      if (custom && !stored) {
        return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
      }
      const list = [
        ...candidatesFor(urlPath),
        ...(stored ? (path.extname(stored) ? [stored] : [stored, path.join(stored, 'index.html')]) : []),
      ];
      return tryServe(list, 0, urlPath, res, fresh);
    }

    const list = candidatesFor(urlPath);
    if (!list.length) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
    tryServe(list, 0, urlPath, res, fresh);
  });

  const urls = () => {
    const lan = lanAddresses();
    return [
      ...lan.map(e => ({ name: e.name, url: `http://${e.address}:${actualPort}/`, lan: true })),
      { name: 'this PC only', url: `http://localhost:${actualPort}/`, lan: false },
    ];
  };

  return {
    get port() { return actualPort; },
    isRunning: () => running,
    urls,
    primaryUrl: () => urls()[0].url,
    raw: server,

    /** Resolves once listening; rejects with the listen error (e.g. EADDRINUSE). */
    listen(p = port) {
      return new Promise((resolve, reject) => {
        if (running) return resolve(actualPort);
        const onError = (err) => { server.off('listening', onOk); reject(err); };
        const onOk = () => {
          server.off('error', onError);
          running = true;
          actualPort = server.address().port;
          resolve(actualPort);
        };
        server.once('error', onError);
        server.once('listening', onOk);
        server.listen(p, '0.0.0.0');
      });
    },

    close() {
      return new Promise((resolve) => {
        if (!running) return resolve();
        running = false;
        server.close(() => resolve());
        // Don't let keep-alive sockets hold the close open.
        server.closeAllConnections?.();
      });
    },
  };
}

module.exports = {
  createLanServer, lanAddresses, vpnAddresses, allAddresses, classifyInterface,
  qrMatrix, qrToTerminal, qrToSvg, esc, MIME,
};
