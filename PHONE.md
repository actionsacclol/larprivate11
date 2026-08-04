# Using Krypt LARP on your phone

No website, no hosting, no account. Your PC serves the folder over your own
Wi-Fi; your phone is just a browser on the same network.

---

## 1. Start it

Double-click **`Krypt LARP.cmd`**.

A window opens with a QR code and an address like `http://10.0.0.28:4173/`,
and a bigger QR code pops up in your browser.

## 2. Scan it

Point your phone camera at the QR code. The gallery opens in Safari / Chrome.

Leave the `.cmd` window open — that *is* the server. Closing it stops it.

## 3. Install the ones you want

Open a dashboard, tap the **dim dot in the bottom-left corner**, then
**Install**. It shows you the exact steps for your phone:

- **iPhone (Safari only)** — Share → Add to Home Screen → Add
- **Android (Chrome)** — ⋮ → Add to Home screen → Add

**Each dashboard installs as its own app**, with its own icon, its own name
under the icon, and its own colour. Install Venmo, Cash App, Kalshi and
Robinhood and you get four separate icons on your home screen. Install the
gallery itself and you get one icon that opens the whole collection.

Installed, they open with no browser bars at all — the mock fills the screen
and the fake status bar tucks itself into the notch so you don't get two clocks.

> On iPhone, only **Safari** can add to the Home Screen. Chrome/Firefox for iOS
> can't — the Install sheet will tell you so if you're in the wrong browser.

---

## On a phone: tap 3× for everything

At phone size the screen **is** the mock — nothing floats on top of it. The
Collection link, the Edit/Reset toolbar and the caption underneath are all
hidden.

**Tap three times anywhere** and a panel opens in the middle of the screen:

- **Edit values** / **Done editing**
- **Reset to defaults**
- **Back to gallery**
- **Fullscreen** (where the browser supports it)
- **Add to Home Screen**

The three taps have to be roughly the same spot within about half a second, so
tapping three different buttons quickly won't trigger it. While you're editing,
taps on an editable value are ignored — triple-tap is how you select text — and
a small amber **EDITING** pill sits at the bottom so you know the mode is on,
since the page's own Edit button is hidden. The first time you open the
collection on a phone you get a one-off "Tap 3× anywhere for settings" nudge.

On **desktop** nothing changed: the Edit/Reset buttons stay where they were, and
the dim dot in the bottom-left corner still expands into Gallery / Fullscreen /
Install.

## Fullscreen

From the panel on a phone, the corner dot on desktop, or just press **F**.

Works on desktop and Android. iPhone Safari has no fullscreen API at all, so
there the answer is Add to Home Screen — that's what gets you a bar-less
full screen.

Other keys: **H** hides the corner dot, **Esc** closes things.

---

## If your phone can't load the page

**This is almost always the Windows firewall**, and on this PC it's likely:
your Wi-Fi (`InsalemAsylum`) is currently classified as a **Public** network,
and Windows blocks all incoming connections on Public networks.

Pick one:

**A. Mark the network Private** (right fix if it's your own Wi-Fi)
Settings → Network & Internet → Wi-Fi → click the network → **Network profile
type: Private**. Then run `Krypt LARP.cmd` again and click **Allow** if Windows
prompts about Node.js.

**B. Open just the one port**
Run `tools\allow-firewall.cmd` and approve the admin prompt. Undo later with
`tools\allow-firewall.cmd remove`.

Either way, be aware that anyone else on that Wi-Fi can then open the gallery —
fine at home, worth thinking about on shared or café Wi-Fi.

**Other things to check**
- Phone is on Wi-Fi, not cellular, and on the *same* network as the PC.
- Some routers have "AP isolation" / "client isolation" on, which blocks
  device-to-device traffic. Turn it off in the router settings.
- Port already in use? Start with a different one:
  `set PORT=4174 && node tools\serve.js`
- The PC has to be running the server the *first* time a page is opened. After
  that the phone caches it — see "Working without the server" below.

---

## Adding a new dashboard

1. Build `dashboards/<slug>/index.html` as usual.
2. Add a `<slug>` entry to **`tools/icon-specs.js`** — a background colour and
   a mark. The alphabet at the top of that file gives you letters; there are
   also helpers for bars, polygons and arcs. Copy a neighbouring entry.
3. Run:

   ```
   node tools/make-icons.js
   node tools/patch-dashboards.js
   ```

`make-icons.js` writes `assets/icons/_contact-sheet.png` — every icon on one
page, so you can check the new one sits well next to the rest.

Both scripts are idempotent. `patch-dashboards.js` will tell you if a dashboard
has no icon design yet rather than silently skipping it.

---

## What changed in the dashboards

Everything is inside fenced `<!-- krypt:… -->` comment blocks plus one
attribute on `<html>`, so it's all removable and all re-appliable.

- **`assets/phone.css`** — on a real phone the mock drops its fake 390×844
  bezel and fills the screen; on desktop nothing changes.
- **Per-dashboard manifest + icons** — `assets/manifests/<slug>.webmanifest`
  and `assets/icons/<slug>-{180,512}.png`, so each one installs separately.
- **`assets/krypt-app.js`** — the corner control (Gallery / Fullscreen /
  Install) and the keyboard shortcuts.
- **`data-krypt-status` on `<html>`** — marks whether a dashboard is dark or
  light at the top, which picks the right iOS status-bar handling. Dark ones
  keep their own coloured strip under the real clock; light ones let iOS paint
  it, and the fake status bar is dropped so there aren't two.

The dashboards used to carry a full-screen diagonal TEST watermark and a TEST
badge of their own. Both are gone — they made the mocks unreadable on a phone
and defeated the point of building them. The collection is labelled at its
entry point instead, by the **TEST · LEARNING DEMOS · NOT REAL APPS** banner in
the gallery header.

## About the icons

Each dashboard's icon comes from one of two places.

**A screenshot in `appicons/`**, if there is one. Drop in a cropped screenshot
of the real app icon and `make-icons.js` squares it up, rebuilds the rounded
corners so it bleeds edge to edge (iOS re-rounds it anyway), and resamples it to
180 and 512. `tools/png-import.js` does that — PNG decode via zlib, resampling
by hand, no dependencies.

Naming: **a file named after the slug just works** (`appicons/paypal.png` →
`paypal`), case-insensitively. The `SOURCES` table at the top of
`tools/make-icons.js` only exists for slugs whose natural filename differs
(`x-earnings` ← `x.png`, `apple-card` ← `wallet.png`). Entries pointing at files
that don't exist are ignored, so the table doubles as a wishlist — run
`make-icons.js` any time and it prints exactly which screenshots are still
missing and what to call them.

Desktop-mode dashboards reuse their mobile counterpart's screenshot with a
browser-window strip painted over the top, so the pair stays a family.

**Otherwise a vector design** from `tools/icon-specs.js`, drawn by
`tools/icon-render.js` — a small renderer doing stroked polylines, filled
polygons and circles, antialiased into a PNG. These are original marks in each
app's colour rather than copies of a logo. Two of them (`bet-slip`,
`crypto-pnl`) have no real-world app at all, so they stay drawn by design.

## Files added

```
Krypt LARP.cmd              double-click to start the server
PHONE.md                    this file
appicons/                   screenshots of real app icons (optional, per slug)
assets/phone.css            phone layout overrides
assets/krypt-app.js         corner control: gallery / fullscreen / install
assets/manifest.webmanifest the gallery's own manifest
assets/icon-*.png           the gallery's own icons
assets/icons/               per-dashboard icons + _contact-sheet.png
assets/manifests/           per-dashboard web-app manifests
tools/serve.js              the server (zero dependencies)
tools/png-import.js         screenshot -> clean square icon
tools/icon-render.js        vector -> PNG renderer
tools/icon-specs.js         one icon design per dashboard
tools/make-icons.js         regenerates every icon and manifest
tools/patch-dashboards.js   re-applies the phone/app bits to every dashboard
tools/allow-firewall.cmd    opens port 4173 if the firewall blocks it
tools/vendor/               qrcode-generator (MIT), vendored so nothing installs
```

Nothing here changes how the dashboards work — same files, same localStorage
edits, still open fine by double-clicking them directly.

## Simulated notifications

Dashboards that have them can show fake push banners — Shopify orders, Venmo
payments, GitHub pull requests, and so on. They are **off until you ask for
them**: tap 3× and switch **Notifications** on. Turning it on fires one
straight away, then roughly one every 25 seconds.

The setting is remembered and shared across dashboards, so switching it on
once covers the lot. They pause in edit mode and while the tab is in the
background. `?nopush` in the URL forces them off for that load.

## Working without the server

There's no service worker, and there can't be one: service workers only run in
a "secure context", and `http://192.168.x.x` isn't one. That rules out proper
offline support over plain LAN HTTP.

What you get instead is the browser's own cache. The server sends

```
Cache-Control: public, max-age=604800
```

on every dashboard, script and icon it serves — seven days. Once a phone has
opened a dashboard, it has its own copy and stops asking for it, so the
collection keeps working with the PC asleep, the app quit, or the phone off
Wi-Fi entirely.

**It is a cache, not a guarantee.** iOS evicts whenever it wants to, and a
dashboard you never opened was never stored. Treat it as "the ones you've been
using keep working for a while", not as an offline mode.

### The catch: staleness

A phone holding a cached copy won't see edits you make on the PC until the
seven days are up. Two ways out:

| | |
|---|---|
| One page | add any query string — `http://192.168.1.20:4173/dashboards/venmo/?fresh` |
| Everything | set `cacheDays` to `0` in `%APPDATA%/Krypt LARP/settings.json`, or run the CLI server with `CACHE_DAYS=0` |

`cacheDays` also takes any other number if a week is the wrong window. The
launch/QR page and 404s are never cached, so the address you scan is always
current.

### If you want real offline

Bundle everything into a single self-contained `.html` and keep it on the
phone — no server, no HTTPS, no certificate. The whole viewable collection is
about 2.3 MB with the icons inlined. Not built yet.
