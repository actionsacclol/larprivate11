#!/usr/bin/env node
/* ============================================================
   rebrand.js — applies tools/brand-map.js to the whole tree.

       node tools/rebrand.js            rewrite in place
       node tools/rebrand.js --dry      show what would change
       node tools/rebrand.js --check    fail if a real mark is left
       node tools/rebrand.js --dirs     rename dashboards/ folders too

   Two passes, in this order and for a reason:

     1. TEXT.  RULES / DASH_RULES rewrite prose, labels and identifiers.
        Anything that looks like a path into dashboards/ or assets/ is
        masked out first, so this pass can never rename a file.
     2. SLUGS. The only pass allowed to touch a path. It maps every
        name a dashboard folder has ever had onto its final slug.

   Getting that order wrong is how you end up with hrefs pointing at
   folders that don't exist — the text rules are aggressive by design
   and have no idea what is a word and what is a filename.

   Both passes are idempotent: no replacement produces text another
   rule matches, so a second run is a no-op. That is what makes
   --check safe to wire into CI.

   Word-boundary matching is the other important detail. A plain string
   in RULES compiles to \bfoo\b, so 'stripe' rewrites the brand but
   leaves "striped" alone. A rule that starts or ends with punctuation
   drops the boundary on that side, because \b next to "+" can never
   match.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { RULES, DASH_RULES, SLUGS, SKIP, WATCH } = require('./brand-map.js');

const ROOT = path.resolve(__dirname, '..');
const DASH = path.join(ROOT, 'dashboards');
const TEXT = /\.(html|js|css|json|md|webmanifest|cmd|sh|yml|yaml|txt)$/i;

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const CHECK = argv.includes('--check');
const DIRS = argv.includes('--dirs');

/* ---------------- rule compilation ---------------- */

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** \b only works next to a word character — anchor each side only when
    the pattern actually has one there. */
function wordRe(literal, flags = 'g') {
  const left = /\w/.test(literal[0]) ? '\\b' : '';
  const right = /\w/.test(literal[literal.length - 1]) ? '\\b' : '';
  return new RegExp(left + esc(literal) + right, flags);
}

/* A rule written in ALL CAPS is a ticker symbol, and those have to
   match exactly: lowercase 'LINK' is the HTML tag, lowercase 'META' is
   the meta element, lowercase 'AMD' is nothing at all. Everything else
   matches case-insensitively and comes back out in the case it went in,
   so one rule covers `Shopify`, `shopify` and a comment header
   shouting `SHOPIFY MOBILE`. */
function isTicker(literal) {
  return /[A-Z]/.test(literal) && literal === literal.toUpperCase();
}

function shape(matched, replacement) {
  const letters = matched.replace(/[^A-Za-z]/g, '');
  if (letters.length > 1 && letters === letters.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (letters === letters.toLowerCase()) return replacement.toLowerCase();
  return replacement;
}

function compile(rules) {
  return rules.map(([from, to]) => {
    if (from instanceof RegExp) return [from, () => to];
    if (isTicker(from)) return [wordRe(from), () => to];
    return [wordRe(from, 'gi'), m => shape(m, to)];
  });
}

const GLOBAL = compile(RULES);
const DASHONLY = compile(DASH_RULES);
const SLUG_RE = compile(SLUGS);
/* Case-insensitive on purpose. The rules are case-sensitive because
   they have to preserve the case they replace, but the check should
   not care: a comment header shouting SHOPIFY is the same problem as a
   label saying Shopify, and only one of them looks like the rule.

   An entry may also be a [label, RegExp] pair, for the marks a word
   boundary cannot describe — a brand fused into an identifier, a logo
   whose only remaining tell is its hex, a one-letter product name. The
   pattern has to be global, because the reporting below counts matches
   rather than just testing for one. */
const WATCH_RE = WATCH.map(w => {
  if (!Array.isArray(w)) return [w, wordRe(w, 'gi')];
  const [label, re] = w;
  if (!re.global) throw new Error(`WATCH pattern "${label}" needs the g flag`);
  return [label, re];
});

/* Things the text pass must not touch.

   PATHISH   any reference into the project's own file tree, so only the
             slug pass can ever rewrite a path.
   PLATFORM  web-platform identifiers that happen to carry a vendor's
             name. `-apple-system` is the CSS keyword for the system
             font; `apple-touch-icon` and `apple-mobile-web-app-capable`
             are how you ask a phone for a home-screen icon. They are
             API names, not branding, and renaming them breaks the page
             silently — wrong font everywhere, Add to Home Screen quietly
             doing nothing, no error in any console. */
const PATHISH = /(?:\.{0,2}\/)*(?:dashboards|assets|tools|electron)\/[\w./-]+/g;
const PLATFORM =
  /-apple-system|apple-(?:touch-icon|touch-startup-image|mobile-web-app-[\w-]+)/g;
const MASKED = new RegExp(`${PATHISH.source}|${PLATFORM.source}`, 'g');
const FENCE = String.fromCharCode(0);
const UNMASK = new RegExp(FENCE + '(\\d+)' + FENCE, 'g');

/* ---------------- passes ---------------- */

function applyRules(text, rules) {
  let out = text, hits = 0;
  for (const [re, to] of rules) out = out.replace(re, m => { hits++; return to(m); });
  return { out, hits };
}

function rewrite(text, isMockFile) {
  const held = [];
  // NUL fences each placeholder off from anything a rule could match.
  // A digits-only fence would not: these files are full of bare numbers,
  // and unmasking would splice paths into the middle of them.
  const masked = text.replace(MASKED, m => FENCE + (held.push(m) - 1) + FENCE);

  const rules = isMockFile ? GLOBAL.concat(DASHONLY) : GLOBAL;
  const textPass = applyRules(masked, rules);

  /* Slugs rename folders, and a folder name is only ever a folder name
     inside a path — so this runs on the held path tokens and nothing
     else. Letting it loose on the whole document is not a small bug:
     `github` is a slug, so it would quietly turn the README's
     `git remote add origin https://github.com/…` into a domain that
     does not resolve. */
  let slugHits = 0;
  const paths = held.map(p => {
    const r = applyRules(p, SLUG_RE);
    slugHits += r.hits;
    return r.out;
  });

  const restored = textPass.out.replace(UNMASK, (_, i) => paths[+i]);
  return { out: restored, hits: textPass.hits + slugHits };
}

/* ---------------- walking ---------------- */

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.some(re => re.test(full))) continue;
    if (e.isDirectory()) yield* walk(full);
    else if (TEXT.test(e.name)) yield full;
  }
}

/** Dashboards and the gallery are the mock UIs — they get the extra
    platform-name rules. Everything else (README, install sheet, build
    scripts) may legitimately name a real OS or browser. */
function isMock(file) {
  const rel = path.relative(ROOT, file);
  return rel.startsWith('dashboards' + path.sep)
    || rel.startsWith('custom' + path.sep)   // the guide and the prompt in it
    || rel === 'index.html';
}

/* ---------------- folder renames ---------------- */

function renameDirs() {
  if (!fs.existsSync(DASH)) return;
  for (const e of fs.readdirSync(DASH, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    let to = e.name;
    for (const [re, sub] of SLUG_RE) to = to.replace(re, sub);
    if (to === e.name) continue;
    const from = path.join(DASH, e.name), dest = path.join(DASH, to);
    if (fs.existsSync(dest)) {
      console.log(`  SKIP  ${e.name} -> ${to}  (destination exists)`);
      continue;
    }
    if (!DRY) fs.renameSync(from, dest);
    console.log(`  ${DRY ? 'would move' : 'moved'} dashboards/${e.name} -> ${to}`);
  }
}

/* ---------------- run ---------------- */

if (DIRS && !CHECK) renameDirs();

let changed = 0, total = 0;
const leftovers = [];

for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  const { out, hits } = rewrite(before, isMock(file));

  if (!CHECK && out !== before) {
    if (!DRY) fs.writeFileSync(file, out, 'utf8');
    const rel = path.relative(ROOT, file);
    console.log(`  ${DRY ? 'would fix' : 'rewrote '} ${rel.padEnd(46)} ` +
      `${hits} replacement${hits === 1 ? '' : 's'}`);
    changed++;
    total += hits;
  }

  /* The watch list only guards the mocks. A README that explains the
     project is allowed — and needs — to say "iPhone". Scan the masked
     form so `-apple-system` and `apple-touch-icon` don't read as
     branding: they are the only Apple in the file the check should
     ignore, and they are exactly the ones it would otherwise catch. */
  if (!isMock(file)) continue;
  const after = (CHECK ? before : out).replace(MASKED, ' ');
  for (const [word, re] of WATCH_RE) {
    re.lastIndex = 0;
    const found = after.match(re);
    if (found) leftovers.push({ file: path.relative(ROOT, file), word, n: found.length });
  }
}

if (!CHECK) console.log(`\n  ${total} replacement(s) across ${changed} file(s).`);

if (leftovers.length) {
  console.log(`\n  ${CHECK ? 'FAIL' : 'STILL THERE'} — real marks inside the mocks:\n`);
  for (const l of leftovers) console.log(`     ${l.file.padEnd(46)} ${l.word} x${l.n}`);
  console.log('\n  Rename it, or add a rule to tools/brand-map.js.\n');
  process.exit(1);
}

if (CHECK) console.log('\n  Clean — no real trademarks in the mocks, the gallery or the guide.\n');
