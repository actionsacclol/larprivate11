# Krypt LARP

A collection of editable, animated interface mock-ups — 31 screens for 31 apps
that don't exist, drawn from scratch. Browse them on the desktop, or serve them
to your phone over your own Wi-Fi.

The gallery carries a **FICTIONAL APPS · LEARNING DEMOS** banner in its header.
These are UI studies — no real accounts, data, or transactions.

## Every company in here is invented

Every product name, every logo, every home-screen icon and every colour palette
belongs to a company that does not exist. Meridian is not a bank, Quill is not a
payments app, Bodega does not sell anything. They are studies in what a good
banking, payments or commerce interface looks like, in the same way a set-design
student builds a fake storefront.

**Assets are the exception, and deliberately so.** The tokens and tickers the
mocks list — BTC, ETH, SOL, USDC — are real, with their real artwork in
`assets/coins/`. A ticker names *what an asset is*, not who makes it; a wallet
that lists an invented token instead of the one you hold is broken rather than
protected, and naming and drawing an asset in order to list it is what every
wallet, exchange and portfolio tracker does. Bastion is not an exchange that
exists, but the BTC it lists is BTC.

The line is **company vs. asset**, and it is worth keeping straight:

| Invented | Real |
|---|---|
| the exchange, the wallet, the bank, the broker | the token, the ticker |
| Bastion, Nocturne, Bitwave, Quiver, Meridian | BTC, ETH, SOL, USDC, USDT |
| stock tickers on invented P&L (AURL, VLTA, MTRN) | — |

Stock tickers *are* renamed: a fabricated position with a fabricated gain,
attached to a named public company, is a claim about that company in a way a
token balance in a wallet is not.

That is enforced, not just intended:

| | |
|---|---|
| `tools/brand-map.js` | every fictional name, plus the find/replace rules that scrub a real one |
| `tools/rebrand.js` | applies them; `npm run brand:check` fails the build if a real mark is left in a mock |
| `tools/icon-specs.js` | all 31 home-screen icons, drawn from primitives — there is no path by which a screenshot of a real app becomes a shipped icon |
| `tools/make-art.js` | the in-page token and product artwork, same deal |
| `tools/recolour.js` | keeps each dashboard's signature colour off the real product's |

If you add a dashboard, add its entry to `tools/brand-map.js` and run
`npm run build`. If you catch yourself typing a real company's name into a mock,
put it in that file's `WATCH` list so the check shouts about it next time.

**Want the real icon on your own phone?** That's yours to do: open any dashboard
on a phone, tap three times, and use **Home-screen icon** to set any photo or
name you like before adding it to your Home Screen. It's stored in your
browser, on your device, and none of it is uploaded or redistributed.

## Every screen is marked

Each dashboard carries a small **LARP · not a real app** chip, bottom-right,
inside the mock's own frame — so it survives a cropped screenshot rather than
sitting out on the page background where a crop would lose it. It measures
whatever bottom bar the dashboard has and sits above it.

It is **on by default** and it is not a `data-edit` field, so edit mode cannot
blank it by accident. Turning it off is a separate, labelled decision — the
*Demo watermark* row in the panel, which says in plain words that your
screenshots will no longer show this is a demo. The choice is per device and
remembered across dashboards.

For imported dashboards the chip is drawn by the **viewer, outside the sandboxed
iframe**, so a file you downloaded from somewhere cannot delete the label on its
own screenshot even if it tries.

## Finding your way around

Every control in this app lives behind one gesture, which is a deliberate choice —
a mock with a settings gear bolted to the corner stops looking like the app it is
imitating — and a choice that only works if something says so out loud. Three
things do:

| Where | What |
|---|---|
| Gallery, first visit | A **welcome card**: what this is, where the controls are, that it runs on your phone. Shown once, then never — re-open it with *Show the welcome again* in the header |
| Any dashboard, first open | A small **coach** in the corner naming the gesture this device actually has, and pointing at it. It waits to be dismissed rather than expiring, and clears itself the moment you open the panel by any route |
| [about.html](about.html) | The long version — the panel's contents, the editing model, the phone flow, the icon picker, and the watermark |

The gesture differs by device, and the copy says so rather than papering over it:
the corner pill is `display:none` under 560px, and the triple-tap handler returns
early when `!isPhone()`. **Desktop: click the dot in the bottom-left. Phone: tap
three times anywhere.**

The chrome pages — gallery, about, `custom/` — share one stylesheet,
[assets/ui.css](assets/ui.css): one accent, one primary action per screen, one
type scale. Dashboards deliberately do **not** load it. They are each their own
visual world, and a shared stylesheet reaching into them is exactly the bug that
would make thirty-one apps look like one.

## What this is for, and what it isn't

Worth saying out loud, because a collection of editable balances is easy to
misread and the name doesn't help.

These are **interface studies**. They exist so you can see how a good banking,
payments, trading or analytics screen is put together, pull one apart, and change
it. The values are editable and the phone view exists so it's a study you can
handle rather than a picture you look at.

They are **not evidence of anything**. Don't use them to tell someone you hold
money, an asset, a position, a payout or an account that you don't. Presenting a
mock as a real balance or a real payout to get money, credit, investment or
goodwill out of somebody is fraud in most places, and "it came from a demo app"
is not a defence.

That's why the watermark is on by default, why it's drawn inside the mock's frame
where a crop can't lose it, why imported dashboards get it drawn by the viewer
outside their own sandbox, and why turning it off is a separate screen that says
in plain words what your screenshots will stop showing. Turning it off is allowed.
What you do with an unmarked screenshot is yours, and so is what follows.

The same thinking is why every company in here is invented: a fake balance is a
study, and a fake balance with a real bank's name on it is a claim about that
bank. See [LICENSE](LICENSE) for the full statement.

## Dashboards you make yourself

`custom/` is a second collection that only exists on your machine. Screenshot an
interface, hand it to an AI with the prompt in **custom/guide.html**, save what
comes back as one `.html` file, and import it — it edits, animates and installs
to a Home Screen like the built-in ones.

```
custom/guide.html    the how-to and the prompt (Copy button at the top)
custom/index.html    your collection: import, rename, export, delete
custom/view.html     runs one of them
```

**Getting there** — four ways, because it's no use if nobody finds it:

| Where | What |
|---|---|
| Gallery header | **Make your own**, the amber button next to the tutorial |
| Gallery grid | the *Your dashboards* card at the end, with a live count |
| Any dashboard, desktop | **Yours** in the corner pill |
| Any dashboard, phone | **Your dashboards** in the tap-3× panel |
| Desktop app | File → *Your dashboards…* (Ctrl+D) or *Import a dashboard…* (Ctrl+I) |

- **Where they live.** `<userData>/custom/<id>/` — outside the app, so they
  survive updates. The packaged app is a read-only asar; nothing can be written
  into it. `tools/custom-store.js` owns that folder.
- **On your phone too.** The Wi-Fi server mounts the same folder at `/custom/`
  with its list at `/api/custom`, so a dashboard imported on the PC shows up on
  the phone, icon and all. Importing happens on the PC — that's where the file is.
- **They run sandboxed.** An imported dashboard is rendered in an iframe with
  `sandbox="allow-scripts …"` and deliberately *no* `allow-same-origin`. It can't
  reach `window.krypt`, this page, or any other dashboard's saved data. Because
  that also breaks `localStorage`, the viewer injects a shim that forwards writes
  to the parent and keeps them namespaced per dashboard — so Edit and Reset work
  normally and an `.html` file from a stranger is no more dangerous than a web page.
- **They get the real controls.** `krypt-app.js` is injected *into* the frame, so
  tapping three times on an imported dashboard opens the same panel as a built-in
  one, and its Edit and Reset rows drive the dashboard's own `#editBtn` and
  `#resetBtn`. Three things a sandbox can't do — navigate the window, go
  fullscreen, touch the home-screen tags — are posted to the viewer, which does
  them. That's what `data-framed` and `data-headless` are for.

The prompt tells the model to invent the product name and shift the colour, for
the same reason the shipped collection does. What you make locally is your call;
the default is just the safe one.

---

## Run it

```
npm install
npm start
```

That's the desktop app. There's no build step for the pages themselves — the
window loads `index.html` straight off disk and the dashboards navigate between
each other exactly as they do in a browser.

**Without Electron:** double-click `Krypt LARP.cmd` (or `./krypt-larp.sh` on
macOS/Linux), or open `index.html` in any browser. Both still work; the desktop
app is a wrapper, not a rewrite.

## First-time repo setup

The repo lives at <https://github.com/scripflipped/krypt-larp>. From this
folder:

```
git init
git branch -M main
git add .
git commit -m "Krypt LARP"
git remote add origin https://github.com/scripflipped/krypt-larp.git
git push -u origin main
```

`.gitignore` keeps `node_modules/`, `release/` and the reference-screenshot
folders out. It deliberately **does** commit the generated icons and manifests
— see the note at the bottom of that file for why.

## Build installers

**Windows, locally:**

```
npm run dist
```

Produces `release/Krypt LARP-Setup-<version>.exe` (NSIS, `cc.krypt.larp`,
desktop + Start Menu shortcuts). It regenerates icons and re-patches the
dashboards first, so it's the one command that guarantees a consistent build.
To check packaging without making an installer: `npx electron-builder --win --dir`.

**macOS and Linux: use CI.** These can't be cross-built from Windows — a `.dmg`
needs macOS's `hdiutil`, and the Linux targets want a Linux toolchain. So
`.github/workflows/build.yml` builds all three on their own runners:

| | |
|---|---|
| Run it | Actions tab → **build** → *Run workflow* |
| Get a release | push a tag: `git tag v1.1.0 && git push origin v1.1.0` |
| Output | `.exe` · `.dmg` + `.zip` (Intel + Apple Silicon) · `.AppImage` + `.deb` |

Tag pushes also open a **draft** GitHub Release with everything attached, so
you can look before it's public.

CI runs `npx electron-builder --publish always` directly, which packages
*without* regenerating icons — the icon sources live outside the repo, so the
generated icons are committed instead. Regenerate them locally with
`npm run build` and commit the result.

Pushing code alone builds nothing. The workflow fires on a `v*` tag or a manual
run from the Actions tab, and always produces a **draft** release you publish
yourself.

### Nothing is code signed

All three platforms ship unsigned, so first-run warnings are expected:

- **Windows** — SmartScreen "Windows protected your PC" → *More info* → *Run anyway*
- **macOS** — Gatekeeper refuses it → right-click the app → *Open*, or
  `xattr -dr com.apple.quarantine "/Applications/Krypt LARP.app"`
- **Linux** — `chmod +x` the AppImage

Signing needs a paid certificate on Windows and an Apple Developer account on
macOS; both slot into the workflow via repository secrets when you want them.

---

## What the desktop shell adds

Deliberately thin — the collection is 31 standalone zero-build HTML files and
that's worth keeping.

| | |
|---|---|
| **Phone panel** | `Ctrl`+`P`, or the Phone menu. Starts the Wi-Fi server, shows a QR code, and has a one-click firewall fix. See [PHONE.md](PHONE.md). |
| **Discord Rich Presence** | Follows whichever dashboard is open — "Viewing Tandem". Uses the shared Krypt application, same as the rest of the suite. |
| **Onboarding** | Three screens on first run. Re-open any time from Help → Show the welcome guide. |
| **Tray resident** | Closing the window always hides it — the app keeps running so the phone server and Discord presence stay up. Quit from the tray, File → Quit, or `Ctrl`+`Q`. |
| **Starts with Windows** | Installed builds register a login item and boot straight to the tray, no window. |
| **Menu** | `Ctrl`+`G` back to gallery, fullscreen, zoom, links to krypt.cc and Discord. |

### Discord Rich Presence

Uses the suite-wide Krypt application (`1495323918234423406`) and the shared
`krypt` art asset and buttons, like every other tool. What's specific to this
one lives in `electron/discord.js`:

```
largeImageText  Krypt LARP
details         "Viewing Tandem"  ·  "Browsing the collection" in the gallery
state           krypt.cc/tools/larp
```

`details` updates as you move between dashboards — `krypt-desktop.js` calls
`window.krypt.rpc.setPage(label)` on every page load. `window.krypt.rpc.status()`
returns `{connected, activity}` if you want to see exactly what's being pushed.

Set `KRYPT_LARP_DISCORD_ID` to point at a different application while testing.

### Autostart and close-to-tray are not preferences

Both are deliberately unconditional — there is no toggle for either.

`electron/autostart.js` re-asserts the login item on **every packaged launch**,
so it also repairs itself if the install moves or something clears the Run key.
Dev runs (`npm start`) skip it, otherwise you'd end up with a login item pointing
at `node_modules/electron`.

Launched by Windows (`--autostart`), the app comes up in the tray with no window.
Launched by you, it opens normally.

Uninstalling removes the login item — `build/installer.nsh` deletes the Run value
by name. **If you change `LOGIN_ITEM_NAME` in `electron/autostart.js`, change the
`DeleteRegValue` name in `installer.nsh` to match**, or uninstalls will leave
Windows trying to launch a deleted exe at every boot.

One hidden key, no UI: set `startServerOnLaunch: true` in
`%APPDATA%/Krypt LARP/settings.json` and the Wi-Fi server comes up with the app,
so your phone works from boot without touching the PC.

---

## Layout

```
index.html              the gallery
dashboards/<slug>/      one self-contained HTML file each
assets/                 shared CSS/JS + generated icons and manifests
appicons/               screenshots of real app icons (source, not shipped)
electron/               main, preload, tray, Discord RPC, settings store
tools/                  generators and the Wi-Fi server
resources/, build/      app icons for the installer
Krypt LARP.cmd          run the Wi-Fi server without Electron
```

## Regenerating things

```
npm run icons     # dashboard icons, manifests, and the app's own .ico/.png
npm run patch     # re-applies the phone/app bits to every dashboard
npm run build     # both
```

All of them are idempotent. After adding a dashboard, add a matching entry to
`tools/icon-specs.js` and run `npm run build` — `patch` will tell you if a
dashboard has no icon design yet rather than skipping it silently.

Icons come from `appicons/<name>.png` when a screenshot exists, otherwise from
the vector design in `tools/icon-specs.js`. `npm run icons` prints which are
still drawn and what to name the screenshot. Review them all at once in
`assets/icons/_contact-sheet.png`.

## Adding a dashboard

1. Build `dashboards/<slug>/index.html`. Copy a neighbour for the conventions:
   `.phone` frame, `.screen` scroll area, `#editBtn`/`#resetBtn`, `body.editing`,
   and `[data-edit]` values.
2. Add a `<slug>` entry to `tools/icon-specs.js`.
3. Add a card to `index.html`.
4. `npm run build`
