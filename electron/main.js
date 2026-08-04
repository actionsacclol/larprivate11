/* ============================================================
   Krypt LARP — desktop shell.

   The collection is 31 standalone zero-build HTML files, so this is
   deliberately a thin wrapper rather than another Vite/React app:
   the window loads index.html straight off disk and the dashboards
   navigate between themselves exactly as they do in a browser.

   What the shell adds on top:
     - the Wi-Fi server + QR panel, in-app instead of a .cmd window
     - Discord Rich Presence that follows the open dashboard
     - first-run onboarding
     - a tray icon, so the phone server can keep serving in the
       background with the window closed
   ============================================================ */

const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, shell } = require('electron');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { spawn } = require('node:child_process');

const store = require('./store.js');
const discord = require('./discord.js');
const autostart = require('./autostart.js');
const {
  createLanServer, lanAddresses, vpnAddresses, qrMatrix, qrToSvg,
} = require('../tools/lan-server.js');

const ROOT = join(__dirname, '..');

// Windows needs a stable identity that matches the appId electron-builder
// stamps onto the shortcuts, or the taskbar button gets its own icon and
// its own grouping instead of reusing the installed app's.
if (process.platform === 'win32') app.setAppUserModelId('cc.krypt.larp');

let mainWindow = null;
let tray = null;
let quitting = false;
let phoneServer = null;

/* ---------------- assets ---------------- */

function iconPath(file) {
  const candidates = [
    app.isPackaged
      ? join(process.resourcesPath, 'app.asar.unpacked', 'resources', file)
      : join(ROOT, 'resources', file),
    app.isPackaged ? join(process.resourcesPath, file) : join(ROOT, 'resources', file),
    join(__dirname, '..', 'resources', file),
  ];
  return candidates.find(existsSync) || candidates[0];
}

/* ---------------- window ---------------- */

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  const bounds = store.get().windowBounds;

  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1280,
    height: bounds?.height ?? 900,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 480,
    minHeight: 600,
    backgroundColor: '#0a0a0b',
    show: false,
    // Native frame on purpose. Every dashboard is a pixel-placed mock with
    // its own fixed layout; a custom title bar would have to overlay 31
    // separately-authored pages and fight each one's padding.
    autoHideMenuBar: false,
    icon: iconPath(process.platform === 'win32' ? 'krypt.ico' : 'krypt.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false, // the preload needs require() for ipcRenderer plumbing
      nodeIntegration: false,
      devTools: !app.isPackaged,
      backgroundThrottling: false,
    },
  });

  // Never let a page open a child window or navigate off the app.
  // External links go to the real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file://')) return; // gallery <-> dashboards
    e.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });

  void mainWindow.loadFile(join(ROOT, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // First-run onboarding is *pulled* by the renderer (it asks
    // onboarding.seen() on load). Pushing it from here raced the page's
    // deferred scripts and lost on a cold packaged start.
  });

  // move/resize fire constantly during a drag — persist once it settles.
  let boundsTimer = null;
  const persistBounds = () => {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMaximized() || mainWindow.isMinimized()) return;
      store.save({ windowBounds: mainWindow.getBounds() });
    }, 500);
  };
  mainWindow.on('move', persistBounds);
  mainWindow.on('resize', persistBounds);

  mainWindow.on('close', (e) => {
    // X always means "get out of my way", never "quit". The app is tray
    // resident so the phone server keeps serving and Discord presence stays
    // up. Quitting is done from the tray, File → Quit, or Ctrl+Q.
    //
    // Deliberately silent — no balloon. The tray icon and its tooltip are
    // the affordance; a toast on every first close is just in the way.
    if (quitting) return;
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  return mainWindow;
}

/* ---------------- the phone server ---------------- */

function phoneState(chosen) {
  const running = !!phoneServer?.isRunning();
  const urls = running ? phoneServer.urls() : [];
  // The renderer can pin a specific address; otherwise use the best guess.
  const primary = (chosen && urls.some(u => u.url === chosen) ? chosen : urls[0]?.url) || null;
  const vpn = vpnAddresses();
  return {
    running,
    port: running ? phoneServer.port : store.get().port,
    urls,
    primary,
    qrSvg: primary ? qrToSvg(qrMatrix(primary), 7) : null,
    hasLan: lanAddresses().length > 0,
    // A live VPN adapter usually means the phone can reach nothing at all —
    // worth saying out loud, it looks identical to the app being broken.
    vpn: vpn.map(v => v.name),
    platform: process.platform,
  };
}

function broadcastPhone() {
  const s = phoneState();
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('krypt:phoneState', s);
  }
  rebuildTray();
  return s;
}

async function startPhone() {
  if (phoneServer?.isRunning()) return phoneState();
  const port = store.get().port || 4173;
  phoneServer = createLanServer({ root: ROOT, port, cacheDays: store.get().cacheDays });
  try {
    await phoneServer.listen(port);
  } catch (err) {
    phoneServer = null;
    const message = err.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Close whatever is using it and try again.`
      : `Could not start the server: ${err.message}`;
    return { ...phoneState(), error: message };
  }
  return broadcastPhone();
}

async function stopPhone() {
  if (phoneServer) {
    await phoneServer.close();
    phoneServer = null;
  }
  return broadcastPhone();
}

/* ---------------- tray ---------------- */

function rebuildTray() {
  if (!tray) return;
  const running = !!phoneServer?.isRunning();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Krypt LARP', click: () => createMainWindow() },
    { type: 'separator' },
    {
      label: running ? `Serving on ${phoneServer.port} — stop` : 'Start phone server',
      click: () => void (running ? stopPhone() : startPhone()),
    },
    {
      label: 'Show QR code…',
      click: () => {
        createMainWindow().webContents.send('krypt:showPhone');
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.setToolTip(running ? `Krypt LARP — serving on port ${phoneServer.port}` : 'Krypt LARP');
}

function installTray() {
  try {
    tray = new Tray(iconPath(process.platform === 'win32' ? 'krypt.ico' : 'krypt.png'));
    tray.on('click', () => createMainWindow());
    rebuildTray();
  } catch {
    tray = null; // no tray on this desktop — not fatal
  }
}

/* ---------------- menu ---------------- */

function installMenu() {
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Back to gallery',
          accelerator: 'CmdOrCtrl+G',
          click: () => void mainWindow?.loadFile(join(ROOT, 'index.html')),
        },
        { type: 'separator' },
        // Explicit rather than role:'quit' — Electron ignores `click` on a
        // role, and this is the one place that has to set `quitting` so the
        // close-to-tray handler stands aside.
        {
          label: 'Quit Krypt LARP',
          accelerator: 'CmdOrCtrl+Q',
          click: () => { quitting = true; app.quit(); },
        },
      ],
    },
    {
      label: 'Phone',
      submenu: [
        {
          label: 'Show QR code…',
          accelerator: 'CmdOrCtrl+P',
          click: () => createMainWindow().webContents.send('krypt:showPhone'),
        },
        {
          label: 'Start server',
          click: () => void startPhone().then(() =>
            mainWindow?.webContents.send('krypt:showPhone')),
        },
        { label: 'Stop server', click: () => void stopPhone() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Show the welcome guide',
          click: () => {
            store.save({ onboarded: false });
            createMainWindow().webContents.send('krypt:showOnboarding');
          },
        },
        { type: 'separator' },
        { label: 'Krypt free tools', click: () => shell.openExternal('https://krypt.cc/tools') },
        { label: 'Discord', click: () => shell.openExternal('https://discord.gg/muzFKR657F') },
        { type: 'separator' },
        {
          label: `About Krypt LARP ${app.getVersion()}`,
          click: () => dialog.showMessageBox({
            type: 'info',
            title: 'Krypt LARP',
            message: `Krypt LARP ${app.getVersion()}`,
            detail: 'A collection of faithful, editable app-UI recreations.\n\n' +
              'Every screen is a learning demo and is watermarked as such.\n\n' +
              'krypt.cc',
            buttons: ['OK'],
          }),
        },
      ],
    },
  ]));
}

/* ---------------- ipc ---------------- */

function registerIpc() {
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:openExternal', (_e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
  ipcMain.handle('app:quit', () => { quitting = true; app.quit(); });

  ipcMain.handle('phone:status', (_e, chosen) => phoneState(chosen));
  ipcMain.handle('phone:start', () => startPhone());
  ipcMain.handle('phone:stop', () => stopPhone());

  // Opens a port for inbound connections. Needs admin, so it goes through
  // the same elevating helper the command-line users get.
  ipcMain.handle('phone:allowFirewall', () => {
    if (process.platform !== 'win32') return { ok: false, reason: 'windows-only' };
    // cmd.exe can't read inside app.asar, so point at the unpacked copy.
    // asarUnpack in package.json is what puts it there.
    const script = join(ROOT, 'tools', 'allow-firewall.cmd')
      .replace(`app.asar${require('node:path').sep}`, `app.asar.unpacked${require('node:path').sep}`);
    if (!existsSync(script)) return { ok: false, reason: 'missing' };
    // Pass the port we're actually on, so the rule matches the server even
    // if the port was changed in settings.json.
    const port = String(phoneServer?.isRunning() ? phoneServer.port : (store.get().port || 4173));
    try {
      spawn('cmd', ['/c', 'start', '""', script, port], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true, port };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  });

  ipcMain.handle('onboarding:seen', () => store.get().onboarded);
  ipcMain.handle('onboarding:markSeen', () => store.save({ onboarded: true }).onboarded);
  ipcMain.handle('onboarding:reset', () => store.save({ onboarded: false }).onboarded);

  ipcMain.on('rpc:setPage', (_e, label) => discord.setPage(label));
  ipcMain.handle('rpc:status', () => discord.status());
}

/* ---------------- boot ---------------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => createMainWindow());
  app.whenReady().then(async () => {
    store.load();
    registerIpc();
    installMenu();
    installTray();

    // Re-assert the login item on every packaged launch, so it also repairs
    // itself if the install moved or something cleared the Run key.
    autostart.enforce();

    void discord.start();

    if (store.get().startServerOnLaunch) await startPhone();

    // Booted by Windows rather than by the user: come up in the tray only.
    // A window appearing on every login would be obnoxious.
    if (!autostart.launchedAtLogin()) createMainWindow();
  });
}

app.on('window-all-closed', () => {
  // Never quit here. The app is tray resident by design — the only ways out
  // are the tray menu, File → Quit, and Ctrl+Q, all of which set `quitting`.
});

app.on('activate', () => createMainWindow());

app.on('before-quit', async () => {
  quitting = true;
  discord.stop();
  try { tray?.destroy(); } catch { /* ignore */ }
  await stopPhone();
});
