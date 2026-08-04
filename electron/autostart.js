/* ============================================================
   Start with Windows.

   Not a preference — Krypt LARP is a tray-resident tool, so the
   login item is enforced on every packaged launch. That also
   repairs it if the user's install moved or something else cleared
   the Run key.

   Dev runs are skipped: registering electron.exe from node_modules
   would leave a login item pointing at a throwaway path.

   The matching uninstall cleanup lives in build/installer.nsh, which
   deletes this exact Run value by name.
   ============================================================ */

const { app } = require('electron');

// Must match the value name deleted in build/installer.nsh.
const LOGIN_ITEM_NAME = 'Krypt LARP';

function enforce() {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return;
  if (!app.isPackaged) return;
  try {
    const current = app.getLoginItemSettings({
      path: process.execPath,
      args: ['--autostart'],
    });
    if (current.openAtLogin) return;
    app.setLoginItemSettings({
      openAtLogin: true,
      name: LOGIN_ITEM_NAME,
      path: process.execPath,
      args: ['--autostart'],
    });
  } catch {
    /* a locked-down profile shouldn't stop the app from running */
  }
}

/** True when Windows (or macOS) started us, rather than the user. */
function launchedAtLogin() {
  if (process.argv.includes('--autostart') || process.argv.includes('--hidden')) return true;
  try {
    return app.getLoginItemSettings().wasOpenedAtLogin === true;
  } catch {
    return false;
  }
}

module.exports = { enforce, launchedAtLogin, LOGIN_ITEM_NAME };
