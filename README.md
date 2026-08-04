# Krypt LARP

A collection of faithful, editable, animated recreations of app UIs — 31 screens
rebuilt from scratch. Browse them on the desktop, or serve them to your phone
over your own Wi-Fi.

The gallery carries a **TEST · LEARNING DEMOS · NOT REAL APPS** banner in its
header. These are UI studies — no real accounts, data, or transactions.

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
| **Discord Rich Presence** | Follows whichever dashboard is open — "Viewing Venmo". Uses the shared Krypt application, same as the rest of the suite. |
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
details         "Viewing Venmo"  ·  "Browsing the collection" in the gallery
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
