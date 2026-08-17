/* ============================================================
   brand-map.js — the single source of truth for what everything
   in this project is called.

   Every dashboard in here is an *original fictional product*. None of
   them are named after, or drawn as, a real company. This file is what
   makes that true and keeps it true: the names, the home-screen labels,
   the category tags, and the find/replace rules that scrub any real
   mark that creeps back in.

   Two consumers:
     tools/rebrand.js      applies the rules across the tree and, with
                           --check, fails if a real mark is still there
     tools/icon-specs.js   reads BRANDS for labels and titles

   Adding a dashboard? Add its entry to BRANDS. If you catch yourself
   typing a real company's name into a mock, add it to WATCH so
   `npm run brand:check` shouts about it next time.
   ============================================================ */

/* ---------------- the products ----------------

   name    full product name, as it appears in the UI
   label   home-screen label — iOS truncates past ~12 characters
   title   manifest title
   tag     category chip in the gallery
   initial letter the drawn icon uses (see icon-specs.js)
*/
const BRANDS = {
  nocturne: {
    name: 'Nocturne', label: 'Nocturne', title: 'Nocturne Wallet',
    tag: 'Crypto Wallet', initial: 'N',
  },
  tandem: {
    name: 'Tandem', label: 'Tandem', title: 'Tandem',
    tag: 'Social Payments', initial: 'T',
  },
  quill: {
    name: 'Quill', label: 'Quill', title: 'Quill Cash',
    tag: 'Money · Banking', initial: 'Q',
  },
  bodega: {
    name: 'Bodega', label: 'Bodega', title: 'Bodega',
    tag: 'Merchant Admin', initial: 'B',
  },
  nimbus: {
    name: 'Nimbus', label: 'Nimbus', title: 'Nimbus Pay',
    tag: 'Digital Wallet', initial: 'N',
  },
  meridian: {
    name: 'Meridian', label: 'Meridian', title: 'Meridian Bank',
    tag: 'Retail Banking', initial: 'M',
  },
  quiver: {
    name: 'Quiver', label: 'Quiver', title: 'Quiver',
    tag: 'Investing', initial: 'Q',
  },
  trellis: {
    name: 'Trellis', label: 'Trellis', title: 'Trellis',
    tag: 'Payments', initial: 'T',
  },
  loopfeed: {
    name: 'Loopfeed', label: 'Loopfeed', title: 'Loopfeed Rewards',
    tag: 'Creator Payouts', initial: 'L',
  },
  quorum: {
    name: 'Quorum', label: 'Quorum', title: 'Quorum Revenue',
    tag: 'Creator Payouts', initial: 'Q',
  },
  'vista-studio': {
    name: 'Vista Studio', label: 'Vista', title: 'Vista Studio',
    tag: 'Creator Analytics', initial: 'V',
  },
  'halo-insights': {
    name: 'Halo', label: 'Halo', title: 'Halo Insights',
    tag: 'Creator Analytics', initial: 'H',
  },
  verity: {
    name: 'Verity', label: 'Verity', title: 'Verity Markets',
    tag: 'Prediction Markets', initial: 'V',
  },
  bastion: {
    name: 'Bastion', label: 'Bastion', title: 'Bastion',
    tag: 'Crypto Exchange', initial: 'B',
  },
  'onyx-card': {
    name: 'Onyx Card', label: 'Onyx', title: 'Onyx Card',
    tag: 'Credit Card', initial: 'O',
  },
  trailmark: {
    name: 'Trailmark', label: 'Trailmark', title: 'Trailmark',
    tag: 'Fitness Social', initial: 'T',
  },
  momentum: {
    name: 'Momentum', label: 'Momentum', title: 'Momentum',
    tag: 'Activity Rings', initial: 'M',
  },
  wellspring: {
    name: 'Wellspring', label: 'Wellspring', title: 'Wellspring',
    tag: 'Health Tracking', initial: 'W',
  },
  codenest: {
    name: 'Codenest', label: 'Codenest', title: 'Codenest',
    tag: 'Developer', initial: 'C',
  },
  dwell: {
    name: 'Dwell', label: 'Dwell', title: 'Dwell',
    tag: 'Digital Wellbeing', initial: 'D',
  },
  'airwave-rewind': {
    name: 'Airwave', label: 'Rewind', title: 'Airwave Rewind',
    tag: 'Year in Music', initial: 'A',
  },
  'bet-slip': {
    name: 'Bet Slip', label: 'Bet Slip', title: 'Bet Slip',
    tag: 'Sportsbook', initial: 'B',
  },
  'crypto-pnl': {
    name: 'Futures PnL', label: 'PnL', title: 'Futures PnL',
    tag: 'Trading', initial: 'P',
  },
  appfront: {
    name: 'Appfront', label: 'Appfront', title: 'Appfront',
    tag: 'App Marketplace', initial: 'A',
  },
  vend: {
    name: 'Vend', label: 'Vend', title: 'Vend',
    tag: 'Creator Storefront', initial: 'V',
  },
  pings: {
    name: 'Pings', label: 'Pings', title: 'Pings',
    tag: 'Messaging', initial: 'P',
  },

  /* ---- desktop-mode dashboards ---- */
  'trellis-desktop': {
    name: 'Trellis', label: 'Trellis Web', title: 'Trellis Dashboard (desktop)',
    tag: 'Payments', initial: 'T',
  },
  'vista-studio-desktop': {
    name: 'Vista Studio', label: 'Vista Web', title: 'Vista Studio (desktop)',
    tag: 'Creator Analytics', initial: 'V',
  },
  'bodega-desktop': {
    name: 'Bodega', label: 'Bodega Web', title: 'Bodega Admin (desktop)',
    tag: 'Merchant Admin', initial: 'B',
  },
  'codenest-desktop': {
    name: 'Codenest', label: 'Codenest Web', title: 'Codenest (desktop)',
    tag: 'Developer', initial: 'C',
  },
  'verity-desktop': {
    name: 'Verity', label: 'Verity Web', title: 'Verity Terminal (desktop)',
    tag: 'Prediction Markets', initial: 'V',
  },
};

/* ---------------- directory slugs ----------------

   The folder under dashboards/ is part of what ships: it shows in the
   address bar when the gallery is served to a phone, and in the
   packaged app's file listing. So the folders carry the fictional
   names too, and this table is how the old ones get there.

   Left side is every name a path has ever had — the original brand
   slug, plus any intermediate the rewriter produced on an earlier
   pass. Right side is where it lands. Longest first: rebrand.js walks
   this in order, so "trellis-desktop" has to be seen before "trellis"
   or the desktop suffix gets orphaned. */
const SLUGS = [
  ['youtube-studio-desktop', 'vista-studio-desktop'],
  ['instagram-insights', 'halo-insights'],
  ['spotify-wrapped', 'airwave-rewind'],
  ['airwave-wrapped', 'airwave-rewind'],
  ['loopfeed-earnings', 'loopfeed'],
  ['tiktok-earnings', 'loopfeed'],
  ['phantom-wallet', 'nocturne'],
  ['nocturne-wallet', 'nocturne'],
  ['youtube-studio', 'vista-studio'],
  ['shopify-desktop', 'bodega-desktop'],
  ['github-desktop', 'codenest-desktop'],
  ['stripe-desktop', 'trellis-desktop'],
  ['kalshi-desktop', 'verity-desktop'],
  ['apple-fitness', 'momentum'],
  ['apple-health', 'wellspring'],
  ['aurelia-fitness', 'momentum'],
  ['aurelia-health', 'wellspring'],
  ['aurelia-card', 'onyx-card'],
  ['apple-card', 'onyx-card'],
  ['x-earnings', 'quorum'],
  ['screen-time', 'dwell'],
  ['app-store', 'appfront'],
  ['cash-app', 'quill'],
  ['phantom', 'nocturne'],
  ['robinhood', 'quiver'],
  ['coinbase', 'bastion'],
  ['instagram', 'halo-insights'],
  ['imessage', 'pings'],
  ['shopify', 'bodega'],
  ['github', 'codenest'],
  ['strava', 'trailmark'],
  ['stripe', 'trellis'],
  ['kalshi', 'verity'],
  ['paypal', 'nimbus'],
  ['chase', 'meridian'],
  ['venmo', 'tandem'],
  ['whop', 'vend'],
];

/* ---------------- rewrite rules ----------------

   Each entry is [pattern, replacement]. A plain string is matched as a
   whole word, case-sensitively — rebrand.js wraps it in \b…\b — so
   'stripe' will not eat the middle of "striped". Use a RegExp when you
   need anything else.

   Order matters, and it is longest-first on purpose: "Chase Sapphire
   Preferred" has to be consumed before the bare "Chase" rule reaches
   it, and "github.com" before bare "github".

   RULES apply to the whole tree. DASH_RULES apply only to the mock
   UIs — dashboards/ and the gallery — because outside them, naming a
   real platform is often *necessary and honest*: the install sheet has
   to say "Safari", the README has to say "iOS". Scrubbing those would
   trade a real trademark problem we don't have for a usability problem
   we would. */
const RULES = [
  /* ---- product lines, before their parent brand ---- */
  ['Chase Sapphire Preferred', 'Meridian Azure Rewards'],
  ['Chase Freedom Unlimited', 'Meridian Flex Unlimited'],
  ['Chase Total Checking', 'Meridian Everyday Checking'],
  ['Chase Sapphire', 'Meridian Azure'],
  ['Chase Freedom', 'Meridian Flex'],
  ['Chase Savings', 'Meridian Savings'],
  ['Chase Offers', 'Meridian Offers'],
  ['Chase Bank', 'Meridian Bank'],
  ['CHASE_KEY', 'MERIDIAN_KEY'],

  ['Apple Wallet', 'Onyx Wallet'],
  ['Apple Cash', 'Onyx Cash'],
  ['Apple Card', 'Onyx Card'],
  ['Apple Pay', 'Onyx Pay'],
  ['Apple Fitness', 'Momentum'],
  ['Apple Health', 'Wellspring'],
  ['Apple Watch', 'Halo Watch'],
  ['Apple Music', 'Airwave'],
  ['Apple ID', 'account'],
  ['Apple Inc', 'Aurelia Devices'],

  ['YouTube Studio', 'Vista Studio'],
  ['YouTube Shorts', 'Vista Shorts'],
  ['YouTube Premium', 'Vista Premium'],
  ['Instagram Insights', 'Halo Insights'],
  ['Spotify Wrapped', 'Airwave Rewind'],
  ['Cash App', 'Quill'],
  ['CashApp', 'Quill'],
  ['App Store', 'Appfront'],
  ['Screen Time', 'Dwell'],
  ['Screen time', 'Dwell'],
  ['Google Play', 'Appfront'],
  ['Match Group, LLC', 'Vermillion Studios'],
  ['Match Group', 'Vermillion Studios'],
  ['Bumble Holding Limited', 'Beeline Interactive'],
  ['Grindr LLC', 'Prowlr Labs'],

  /* ---- concatenated identifier forms ----

     The single-word rules below are the *display* names, and \b is what
     makes them safe. But a CSS class or a storage key runs the words
     together — `.applecard`, `applefitness-dash-v1` — and there is no
     word boundary inside "applecard" for `\bApple\b` to find. So the
     brand survived the rebrand in exactly the places nobody looks at,
     and WATCH missed them for the same reason.

     These are invisible to a user and harmless on their own. They are
     also a provenance trail: a file that says every product is invented
     and keys its store on `applecard-dash-v1` is arguing with itself.

     Renaming a key orphans whatever a browser already saved under the
     old one — fine before release, worth a thought after. */
  ['applecard', 'onyxcard'],
  ['applefitness', 'momentum'],
  ['applehealth', 'wellspring'],
  ['applewallet', 'onyxwallet'],
  ['applepay', 'onyxpay'],
  ['spotifywrapped', 'airwaverewind'],
  ['instagraminsights', 'haloinsights'],
  ['tiktokearnings', 'loopfeedearnings'],
  ['youtubestudio', 'vistastudio'],
  ['screentime', 'dwell'],
  ['cashapp', 'quill'],

  /* ---- single-word brands, each case form spelled out so
          CSS variables and storage keys travel with the name ---- */
  ['PayPal', 'Nimbus'], ['Paypal', 'Nimbus'], ['paypal', 'nimbus'],
  ['Venmo', 'Tandem'], ['venmo', 'tandem'], ['VENMO', 'TANDEM'],
  ['Chase', 'Meridian'], ['CHASE', 'MERIDIAN'], ['chase', 'meridian'],
  ['Robinhood', 'Quiver'], ['robinhood', 'quiver'],
  ['Coinbase', 'Bastion'], ['coinbase', 'bastion'],
  ['Shopify', 'Bodega'], ['shopify', 'bodega'],
  ['Stripe', 'Trellis'], ['stripe', 'trellis'], ['STRIPE', 'TRELLIS'],
  ['TikTok', 'Loopfeed'], ['Tiktok', 'Loopfeed'], ['tiktok', 'loopfeed'],
  ['YouTube', 'Vista'], ['youtube', 'vista'],
  ['Instagram', 'Halo'], ['instagram', 'halo'],
  ['Spotify', 'Airwave'], ['spotify', 'airwave'],
  ['Kalshi', 'Verity'], ['kalshi', 'verity'], ['KALSHI', 'VERITY'],
  ['Strava', 'Trailmark'], ['strava', 'trailmark'],
  ['Phantom', 'Nocturne'], ['phantom', 'nocturne'],
  ['iMessage', 'Pings'], ['imessage', 'pings'],
  ['Whop', 'Vend'], ['whop', 'vend'],
  ['Grindr', 'Prowlr'], ['grindr', 'prowlr'],
  ['Hinge', 'Kindling'], ['hinge', 'kindling'],
  ['Tinder', 'Sparkr'], ['tinder', 'sparkr'],
  ['Bumble', 'Beeline'], ['bumble', 'beeline'],
  ['Binance', 'Bitwave'], ['binance', 'bitwave'],
  ['Hyperliquid', 'Hyperflux'], ['hyperliquid', 'hyperflux'],

  /* ---- merchants in the fake transaction feeds ----
     A statement full of real shop names is the one part of a mock that
     reads as a claim about somebody else's business. Cheaper to invent
     the shops. */
  ['Zelle®', 'QuickSend'], ['Zelle', 'QuickSend'],
  ['Whole Foods Market', 'Greenline Market'], ['Whole Foods', 'Greenline'],
  ["Trader Joe's", 'Corner Grocer'],
  ['Starbucks', 'Bluebird Coffee'],
  ['Netflix', 'Streamly'],
  ['Uber Eats', 'Ryde Eats'], ['Uber', 'Ryde'],
  ['Lyft', 'Zipline'],
  ['Amazon', 'Zenith'],
  // Case-sensitive, or the case-insensitive form eats `e.target`,
  // `currentTarget` and every scroll-target in the tree.
  [/\bTarget\b/g, 'Cartwell'],
  ['Nike', 'Apex'],
  ['DoorDash', 'Doorstep'],

  /* ---- card networks ----

     Genuinely the mildest thing on this list: naming the network your
     fake card runs on is nominative the way a ticker is, and every
     payments mock on Dribbble does it. It goes anyway, for one reason —
     "Nimbus Debit Mastercard" is not naming a network, it is claiming a
     partnership, and the difference is not one you want to argue.

     The marks matter more than the words. Two interlocking circles in
     #eb001b / #f79e1b *is* Mastercard's trade dress with the name filed
     off, and #1a1f71 is Visa's navy — so both palettes move too, and
     the hex literals are on the WATCH list below so they cannot come
     back in quietly. */
  ['Mastercard', 'Orbit'], ['MasterCard', 'Orbit'], ['mastercard', 'orbit'],
  ['Visa', 'Axis'], ['VISA', 'AXIS'], ['visa', 'axis'],
  ['American Express', 'Sterling'], ['Amex', 'Sterling'],

  /* ---- tokens are NOT renamed, and their logos ship as they are.
          This is a real line, not an oversight:

          A ticker is what an asset *is*, not who makes it. A wallet
          that lists "NVA" instead of SOL isn't protected, it's broken —
          you cannot show a portfolio without naming what is in it, and
          every wallet, exchange and tracker in existence names and
          draws these marks for exactly that reason. That is nominative
          use, and it is the same reason a car magazine may print the
          word Ford.

          What stays invented is the *company*: the exchange, the
          wallet app, the bank. Bitwave is not Binance, Bastion is not
          an exchange that exists — but the BTC they list is BTC.

          So: no rules here. assets/coins/ holds the real token
          artwork, and tools/make-art.js draws only the product tiles
          for the fictional apps. Please don't "fix" this by adding
          renames back. ---- */

  /* ---- securities. Real tickers on invented P&L is the same
          problem in a different costume. ---- */
  ['Adv. Micro Devices', 'Cascade Micro'],
  ['Meta Platforms', 'Metronome Labs'],
  // Case-sensitive: "alphabet" is an ordinary word these files use.
  [/\bAlphabet\b/g, 'Cipher Group'],
  ['Palantir', 'Palisade Data'],
  ['NVIDIA', 'Nuvex'], ['Nvidia', 'Nuvex'],
  ['Tesla', 'Voltara'],
  ['AAPL', 'AURL'], ['TSLA', 'VLTA'], ['NVDA', 'NUVX'], ['AMZN', 'ZNTH'],
  ['PLTR', 'PLSD'], ['META', 'MTRN'], ['GOOG', 'CIPH'], ['COIN', 'BSTN'],
  ['AMD', 'CASC'],
];

/* Applied to dashboards/, custom/ and index.html only. */
const DASH_RULES = [
  /* ---- domains, before the bare brand they contain ----

     Mock-only, and that matters: these are URLs painted into a fake
     browser chrome, so inside a dashboard they have to be invented. But
     README.md tells you to `git remote add origin https://github.com/…`,
     and rewriting *that* replaces a working instruction with a domain
     that does not resolve. Same rule as Safari and iOS below — outside
     the mocks, naming the real service is the honest thing and usually
     the necessary one. */
  /* GitHub is the one brand that is both something a dashboard
     imitates and something this project genuinely runs on: the repo
     lives there, CI runs there, and electron-builder publishes there.
     Global rules would rewrite the `git remote add origin` line in the
     README into a domain that does not resolve. */
  ['GitHub', 'Codenest'], ['Github', 'Codenest'], ['github', 'codenest'],
  ['github.com', 'codenest.dev'],
  /* Store subdomains, before the bare domain. `\b` cannot see the seam
     in "myshopify.com", so the `shopify.com` rule below walks straight
     past `krypt-store.myshopify.com` — which was on screen in two
     dashboards, and is a domain Shopify actually owns. */
  ['myshopify.com', 'bodega.shop'],
  ['admin.shopify.com', 'admin.bodega.app'],
  ['shopify.com', 'bodega.app'],
  ['stripe.com', 'trellis.app'],
  ['kalshi.com', 'verity.markets'],
  ['youtube.com', 'vista.tv'],
  ['tiktok.com', 'loopfeed.app'],
  ['instagram.com', 'halo.social'],
  ['venmo.com', 'tandem.cash'],
  ['paypal.com', 'nimbus.pay'],

  ['YT Studio', 'Vista'],
  ['IG Insights', 'Halo'],
  [/\bYT\b/g, 'Vista'],
  [/\bIG\b/g, 'Halo'],
  ['iOS', 'Lumen OS'],
  ['iPhone', 'phone'],
  ['iPad', 'tablet'],
  ['Siri', 'Assistant'],
  ['Face ID', 'Face Unlock'],
  ['Apple', 'Aurelia'],
  ['apple', 'aurelia'],
];

/* Paths the rewriter must not touch — either they legitimately name
   the real thing (this file, the checker) or they are not text. */
const SKIP = [
  /node_modules/, /[\\/]\.git[\\/]/, /[\\/]release[\\/]/, /[\\/]dist[\\/]/,
  /[\\/]appicons[\\/]/, /screenshots[\\/]/,
  /tools[\\/]brand-map\.js$/, /tools[\\/]rebrand\.js$/,
  /package-lock\.json$/,
  // Hand-maintained, and both contain words the rules would wreck:
  // icon-specs.js is keyed by slug, and package.json names GitHub as
  // electron-builder's release provider, which is a fact about the
  // publishing pipeline rather than a brand reference in a mock.
  /tools[\\/]icon-specs\.js$/, /package\.json$/,
  /[\\/]\.github[\\/]/,
];

/* Real marks that must never appear inside a mock again.
   `npm run brand:check` exits non-zero if it finds one under
   dashboards/ or in the gallery.

   An entry is either a plain string — matched as a whole word,
   case-insensitively — or a `[label, RegExp]` pair for the cases a word
   boundary cannot express. The RegExp must carry /g; the checker counts
   matches with .match().

   Three kinds of thing slip past a plain string, and all three had:

     seams     `\bApple\b` does not fire inside "applecard", and
               `\bshopify\b` does not fire inside "myshopify.com". Every
               mark that survived the rebrand survived in this form.
     colours   a logo redrawn in CSS is still a logo. The hex is the
               mark.
     one-letter names
               'X' cannot be a string entry — `\bX\b` matches a size
               chart, a close button and half the maths in the tree. So
               it is scoped to the places a brand actually appears.  */
const WATCH = [
  ['concatenated brand', /\b(?:applecard|applefitness|applehealth|applewallet|applepay|cashapp|myshopify|spotifywrapped|instagraminsights|tiktokearnings|youtubestudio|screentime|githubdesktop)\b/gi],
  ['brand hex', /#(?:1a1f71|1434cb|eb001b|f79e1b|ff5f00|00b9ff|1ed760|ff0050|635bff|5f259f|008cff|00d632)\b/gi],
  ['X (the platform)', /<title>[^<]*\bX\b[^<]*<\/title>|\bX (?:Corp|Premium|Ads|Blue|Money|Payments)\b/g],
  'Twitter', 'Tweet', 'Retweet',
  'Visa', 'Mastercard', 'Amex', 'American Express',
  'Venmo', 'PayPal', 'Cash App', 'CashApp', 'Chase', 'Robinhood', 'Coinbase',
  'Shopify', 'Stripe', 'TikTok', 'Kalshi', 'Strava', 'GitHub', 'Phantom',
  'iMessage', 'Whop', 'Instagram', 'Spotify', 'YouTube', 'App Store',
  'Screen Time', 'Grindr', 'Hinge', 'Tinder', 'Bumble', 'Match Group',
  'Apple', 'iOS', 'iPhone', 'iPad', 'Siri', 'Zelle', 'Klarna', 'Afterpay',
  'Plaid', 'Revolut', 'Monzo', 'Binance', 'Kraken', 'Netflix', 'Uber',
  'Lyft', 'DoorDash', 'Starbucks', 'Amazon', 'Tesla', 'NVIDIA', 'Palantir',
  'Alphabet', 'Hyperliquid', 'Whole Foods', 'Nike',
  // Leagues and clubs. A fake bet slip on a real fixture is somebody
  // else's mark on somebody else's event, twice over.
  // Only the club names that aren't also ordinary English — "Bills" and
  // "Eagles" would flag a utilities row and half the bird photos, and a
  // check that cries wolf gets switched off.
  'NBA', 'NFL', 'MLB', 'NHL', 'FIFA', 'UEFA', 'Premier League',
  'Lakers', 'Celtics', 'Dodgers', 'Padres', 'Yankees', 'Red Sox',
  'Bruins', 'Arsenal', 'Chelsea', 'Knicks', 'Cowboys', 'Packers',
];

module.exports = { BRANDS, SLUGS, RULES, DASH_RULES, SKIP, WATCH };
