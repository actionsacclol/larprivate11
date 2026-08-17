/* ============================================================
   Discord Rich Presence — best-effort, never blocks startup.

   Same treatment as the rest of the Krypt suite: the shared Krypt
   application, the shared 'krypt' art asset, and the two standard
   buttons. What's per-tool is the large-image text and the
   details/state lines.

   Krypt LARP's presence follows whichever dashboard is open, so it
   reads "Viewing Tandem" rather than something generic.

   It keeps trying. Krypt LARP starts with Windows, so at boot it is
   almost always up before Discord has finished loading — a one-shot
   login would just silently never connect. Instead we retry on a
   timer, and reconnect if Discord is closed and reopened later.
   ============================================================ */

// Shared across every Krypt tool — one Discord application for the suite.
// Override with KRYPT_LARP_DISCORD_ID only if you're testing against another.
const CLIENT_ID = process.env.KRYPT_LARP_DISCORD_ID || '1495323918234423406';

const DEFAULT_BUTTONS = [
  { label: 'Free Tools', url: 'https://krypt.cc/tools' },
  { label: 'Discord', url: 'https://discord.gg/muzFKR657F' },
];

const RETRY_MS = 15000;
// login() can resolve without 'ready' ever arriving. Presence is only
// live once 'ready' has fired, so if it hasn't by now, treat the
// connection as failed and go back to retrying.
const READY_MS = 10000;

let client = null;
let connected = false;
let connecting = false;
let stopped = false;
let retryTimer = null;
let readyTimer = null;
let currentPage = '';
let startTimestamp = 0;

function activity() {
  return {
    details: currentPage ? `Viewing ${currentPage}` : 'Browsing the collection',
    state: 'krypt.cc/tools/larp',
    startTimestamp,
    largeImageKey: 'krypt',
    largeImageText: 'Krypt LARP',
    instance: false,
    buttons: DEFAULT_BUTTONS,
  };
}

function push() {
  if (!connected || !client) return;
  try {
    client.setActivity(activity());
  } catch {
    /* swallow — presence is cosmetic */
  }
}

function teardown() {
  connected = false;
  const c = client;
  client = null;
  if (!c) return;
  try { c.destroy(); } catch { /* socket already gone */ }
}

function scheduleRetry() {
  if (stopped || retryTimer || connected) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void connect();
  }, RETRY_MS);
  // Don't let the retry timer be the reason the process stays awake.
  retryTimer.unref?.();
}

/* Give a logged-in client a window to become ready, then give up on it. */
function armReadyGuard(c) {
  clearReadyGuard();
  readyTimer = setTimeout(() => {
    readyTimer = null;
    if (stopped || connected || client !== c) return;
    teardown();
    scheduleRetry();
  }, READY_MS);
  readyTimer.unref?.();
}
function clearReadyGuard() {
  if (readyTimer) { clearTimeout(readyTimer); readyTimer = null; }
}

async function connect() {
  if (stopped || connected || connecting) return;
  connecting = true;

  let c = null;
  try {
    const { Client } = require('discord-rpc');
    c = new Client({ transport: 'ipc' });

    c.on('ready', () => {
      client = c;
      connected = true;
      clearReadyGuard();
      push();
    });

    // Discord quit, or the socket dropped. Go back to trying.
    c.on('disconnected', () => {
      if (client !== c) return;
      teardown();
      scheduleRetry();
    });
    c.on('error', () => { /* handled by the disconnect/retry path */ });

    await c.login({ clientId: CLIENT_ID });
    client = c;
    // 'ready' usually beats login() resolving, in which case there is
    // nothing to guard. Otherwise: the only paths that re-arm the retry
    // loop are this function's catch and the 'disconnected' handler, and
    // a login that resolves but never becomes ready hits neither — so
    // presence would stay dead for the life of the process.
    if (!connected) armReadyGuard(c);
  } catch {
    // Discord isn't running yet, or the IPC pipe isn't there. Normal.
    try { c?.destroy(); } catch { /* nothing to clean up */ }
    if (client === c) client = null;
    connected = false;
    scheduleRetry();
  } finally {
    connecting = false;
  }
}

function start() {
  if (startTimestamp) return; // already started
  stopped = false;
  startTimestamp = Date.now();
  void connect();
}

/** Called as the user moves between dashboards. */
function setPage(label) {
  const next = String(label || '').slice(0, 64);
  if (next === currentPage) return;
  currentPage = next;
  push();
}

function stop() {
  stopped = true;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  clearReadyGuard();
  if (client) {
    try { client.clearActivity(); } catch { /* ignore */ }
  }
  teardown();
  startTimestamp = 0;
}

function isConnected() {
  return connected;
}

function status() {
  return {
    connected,
    // true while we're waiting to try again — i.e. Discord isn't up yet
    retrying: !!retryTimer || !!readyTimer || connecting,
    clientId: CLIENT_ID,
    activity: activity(),
  };
}

module.exports = { start, stop, setPage, isConnected, activity, status };
