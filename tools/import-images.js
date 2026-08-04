/* ============================================================
   Turns source logo images into the clean square PNGs the
   dashboards use.

       npm run images        (npx electron tools/import-images.js)

   Runs under Electron rather than plain node on purpose: Chromium
   decodes .webp and .avif, which the hand-rolled decoder in
   tools/png-import.js can't. Source images keep their aspect ratio
   and are centred on a square — transparent if the artwork is a
   transparent glyph, or padded in the artwork's own backdrop colour
   if it's a solid tile (so it fills a circular or rounded slot
   without showing gaps).

   Add an image by dropping it somewhere and adding a line below.
   Anything Chromium can open works.
   ============================================================ */

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DESKTOP = 'C:/Users/Krypt/Desktop';
const SHOTS = `${DESKTOP}/Krypt Larp/appstore screenshots`;

/* outputDir -> { name: sourcePath }, with the size each set is rendered at. */
const SETS = [
  {
    out: 'assets/coins',
    size: 128,
    files: {
      sol:  `${DESKTOP}/solana.PNG`,
      usdt: `${DESKTOP}/usdt.png`,
      usdc: `${DESKTOP}/usdc.webp`,
    },
  },
  {
    // App Store product-page icons — bigger, they're shown at ~115pt.
    out: 'assets/appstore',
    size: 256,
    files: {
      hinge:  `${SHOTS}/hingeicon.png`,
      tinder: `${SHOTS}/tindericon.png`,
      bumble: `${SHOTS}/bumbleicon.png`,
      grindr: `${SHOTS}/grindricon.png`,
    },
  },
];

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false },
  });
  await win.loadURL('data:text/html,<body></body>');

  for (const set of SETS) {
    const outDir = path.join(ROOT, set.out);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`\n  ${set.out}  (${set.size}px)`);

    for (const [name, src] of Object.entries(set.files)) {
      if (!fs.existsSync(src)) {
        console.log(`    SKIP  ${name} — no file at ${src}`);
        continue;
      }
      const ext = path.extname(src).slice(1).toLowerCase();
      const mime = ext === 'webp' ? 'image/webp'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'avif' ? 'image/avif'
        : 'image/png';
      const dataUrl = `data:${mime};base64,${fs.readFileSync(src).toString('base64')}`;

      const result = await win.webContents.executeJavaScript(`
        (async () => {
          const img = new Image();
          img.src = ${JSON.stringify(dataUrl)};
          await img.decode();

          const S = ${set.size};

          // Transparent glyph, or a solid tile? Sample the four corners:
          // a tile has to be padded out in its own colour so it fills the
          // slot, a glyph must keep its transparency.
          const probe = document.createElement('canvas');
          probe.width = img.naturalWidth; probe.height = img.naturalHeight;
          const pg = probe.getContext('2d');
          pg.drawImage(img, 0, 0);
          const corners = [
            [0, 0], [img.naturalWidth - 1, 0],
            [0, img.naturalHeight - 1], [img.naturalWidth - 1, img.naturalHeight - 1],
          ].map(([x, y]) => Array.from(pg.getImageData(x, y, 1, 1).data));

          const opaque = corners.every(c => c[3] > 250);
          const same = corners.every(c =>
            Math.abs(c[0] - corners[0][0]) < 12 &&
            Math.abs(c[1] - corners[0][1]) < 12 &&
            Math.abs(c[2] - corners[0][2]) < 12);
          const backdrop = (opaque && same)
            ? 'rgb(' + corners[0][0] + ',' + corners[0][1] + ',' + corners[0][2] + ')'
            : null;

          const c = document.createElement('canvas');
          c.width = S; c.height = S;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = 'high';
          if (backdrop) { g.fillStyle = backdrop; g.fillRect(0, 0, S, S); }

          const scale = Math.min(S / img.naturalWidth, S / img.naturalHeight);
          const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
          g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);

          const d = g.getImageData(0, 0, S, S).data;
          let clear = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] < 8) clear++;

          return {
            png: c.toDataURL('image/png').split(',')[1],
            src: img.naturalWidth + 'x' + img.naturalHeight,
            transparentPct: Math.round(clear / (S * S) * 100),
            backdrop: backdrop || 'transparent',
          };
        })()
      `);

      const buf = Buffer.from(result.png, 'base64');
      fs.writeFileSync(path.join(outDir, `${name}.png`), buf);
      console.log(`    ${name.padEnd(8)} ${result.src.padEnd(11)} ` +
        `${(buf.length / 1024).toFixed(1).padStart(6)} KB  ` +
        `${String(result.transparentPct).padStart(2)}% clear  backdrop:${result.backdrop}`);
    }
  }

  console.log('');
  app.quit();
});
