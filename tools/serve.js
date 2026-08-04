#!/usr/bin/env node
/* ============================================================
   Krypt LARP — local phone server (command line).

   Serves the dashboard gallery over your Wi-Fi so you can open it
   on your phone. No website, no hosting, no internet required:
   the PC becomes the server, the phone is just a client on the
   same network.

   Run it with:  "Krypt LARP.cmd"   (or: node tools/serve.js)

   The Electron app's Phone panel does the same thing through the
   same module — see tools/lan-server.js.
   ============================================================ */

const path = require('path');
const { execFile } = require('child_process');
const {
  createLanServer, lanAddresses, qrMatrix, qrToTerminal, qrToSvg, esc,
} = require('./lan-server.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4173;

/* ---------- the big scannable page shown on the PC ---------- */
function launchPage(urls) {
  const primary = urls[0];
  const svg = qrToSvg(qrMatrix(primary.url), 8);
  const alts = urls.slice(1).map(u =>
    `<li><span class="if">${esc(u.name)}</span><a href="${esc(u.url)}">${esc(u.url)}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scan to open Krypt LARP on your phone</title>
<style>
  :root{ color-scheme: dark; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:radial-gradient(1200px 600px at 50% -10%,#1b1b22,#0a0a0c 60%);
    color:#e9e9ef; padding:40px 24px;
    font:400 15px/1.5 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  }
  .card{
    width:100%; max-width:520px; text-align:center;
    background:#131318; border:1px solid #26262e; border-radius:24px;
    padding:40px 36px 32px; box-shadow:0 40px 90px rgba(0,0,0,.6);
  }
  .kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7b7b88;margin-bottom:10px}
  h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
  .sub{color:#9a9aa8;font-size:14px;margin-bottom:26px}
  .qr{background:#fff;border-radius:18px;padding:14px;display:inline-block;line-height:0}
  .qr svg{width:min(260px,60vw);height:auto}
  .url{
    margin-top:22px; font:600 17px/1 ui-monospace,'SF Mono',Menlo,Consolas,monospace;
    background:#0c0c10; border:1px solid #2a2a34; border-radius:12px;
    padding:14px 16px; word-break:break-all; user-select:all;
  }
  .hint{margin-top:18px;color:#8a8a98;font-size:13px}
  .hint b{color:#c9c9d6;font-weight:600}
  ul{list-style:none;margin-top:20px;border-top:1px solid #24242c;padding-top:16px;text-align:left}
  li{display:flex;gap:12px;justify-content:space-between;font-size:12.5px;padding:4px 0;color:#8a8a98}
  .if{color:#6e6e7c}
  a{color:#8ab4ff;text-decoration:none}
  a:hover{text-decoration:underline}
</style></head>
<body>
  <div class="card">
    <div class="kicker">Krypt LARP</div>
    <h1>Scan this with your phone</h1>
    <div class="sub">Phone and PC must be on the same Wi-Fi.</div>
    <div class="qr">${svg}</div>
    <div class="url">${esc(primary.url)}</div>
    <div class="hint">Once it loads, use <b>Share → Add to Home Screen</b> to install it
      as an app. After that it opens full-screen with its own icon.</div>
    ${alts ? `<ul><li style="color:#6e6e7c">If that address doesn't work, try:</li>${alts}</ul>` : ''}
  </div>
</body></html>`;
}

/* Open a URL in the user's default browser. Every platform spells this
   differently, and the Windows form has a quirk: `start` treats its first
   quoted argument as the window title, so an empty "" has to go first or a
   URL containing spaces would be swallowed. */
function openInBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32'  ? ['cmd', ['/c', 'start', '""', url]] :
    process.platform === 'darwin' ? ['open', [url]] :
                                    ['xdg-open', [url]];
  execFile(cmd, args, () => { /* no browser is not an error worth reporting */ });
}

let current = [];
const server = createLanServer({
  root: ROOT,
  port: PORT,
  launchPage: () => launchPage(current),
  // Days a phone may keep files without re-asking — this is what keeps
  // the collection working once this window is closed. CACHE_DAYS=0
  // turns it off.
  cacheDays: process.env.CACHE_DAYS === undefined ? 7 : Number(process.env.CACHE_DAYS),
});

server.listen(PORT).then(() => {
  const lan = lanAddresses();
  current = server.urls();
  const primary = current[0];
  const bar = '─'.repeat(52);

  console.log('');
  console.log('  KRYPT LARP  —  running on your Wi-Fi');
  console.log('  ' + bar);
  console.log('');
  console.log(qrToTerminal(qrMatrix(primary.url)).split('\n').map(l => '  ' + l).join('\n'));
  console.log('');
  console.log(`  On your phone:   ${primary.url}`);
  if (lan.length === 0) {
    console.log('');
    console.log('  ⚠  No Wi-Fi / LAN address found. Are you connected to a network?');
    console.log('     Only this PC can reach the server right now.');
  }
  if (current.length > 2) {
    console.log('');
    console.log('  Other addresses, if that one does not work:');
    for (const u of current.slice(1, -1)) console.log(`     ${u.url}   (${u.name})`);
  }
  console.log('');
  console.log(`  Bigger QR to scan:  http://localhost:${server.port}/_launch`);
  console.log('  ' + bar);
  console.log('  Leave this window open. Press Ctrl+C to stop.');
  console.log('');

  if (process.env.KRYPT_NO_OPEN !== '1') {
    openInBrowser(`http://localhost:${server.port}/_launch`);
  }
}).catch((err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error('  Close whatever is using it, or start this on another port:');
    console.error('      set PORT=4174 && node tools/serve.js\n');
  } else {
    console.error('\n  Server error:', err.message, '\n');
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n  Stopped.\n');
  process.exit(0);
});
