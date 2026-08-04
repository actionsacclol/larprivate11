/* ============================================================
   A very small settings store — window bounds, the onboarding flag,
   and whether the phone server should come up with the app.

   Deliberately not a dependency: this is a few keys of JSON in
   userData, written atomically-ish and never allowed to throw.
   ============================================================ */

const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const FILE = () => path.join(app.getPath('userData'), 'settings.json');

const DEFAULTS = {
  onboarded: false,
  windowBounds: null,
  // No UI for this on purpose. Flip it in settings.json if you want the
  // phone server up the moment Windows starts the app.
  startServerOnLaunch: false,
  port: 4173,
  // Days a phone may keep dashboards without re-asking, which is
  // what makes them work with the server off. 0 = always revalidate.
  cacheDays: 7,
};

let state = { ...DEFAULTS };

function load() {
  try {
    const raw = fs.readFileSync(FILE(), 'utf8');
    state = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    state = { ...DEFAULTS };
  }
  return state;
}

function get() {
  return state;
}

function save(next) {
  state = { ...state, ...next };
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify(state, null, 2), 'utf8');
  } catch {
    /* a read-only profile shouldn't take the app down */
  }
  return state;
}

module.exports = { load, get, save, DEFAULTS };
