/* ============================================================
   icon-specs.js — one home-screen icon design per dashboard.

   These are original marks drawn in each app's signature colour —
   a letterform or a simple geometric glyph — not copies of the real
   logos. Same idea as the dashboards themselves: recognisably in the
   spirit of the app, clearly our own artwork.

   Fields per entry:
     label   what shows under the icon on the home screen
     title   full name used in the manifest
     theme   status-bar / theme colour
     bgc     splash background while the app opens
     dark    is the top of the screen dark? (picks the iOS status-bar style)
     bg      icon tile background
     marks   icon artwork
   ============================================================ */

const { arc } = require('./icon-render.js');

/* ---------------- a small geometric alphabet ----------------
   Each letter is one or more polylines in a local 0..1 box. */
const A = {
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.19, 0.62], [0.81, 0.62]]],
  B: [[[0, 0], [0, 1]], arc(0, 0.25, 0.25, -90, 90), arc(0, 0.75, 0.25, -90, 90)],
  C: [arc(0.5, 0.5, 0.5, 55, 305)],
  D: [[[0, 0], [0, 1]], arc(0, 0.5, 0.5, -90, 90)],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.72, 0.5]]],
  F: [[[1, 0], [0, 0], [0, 1]], [[0, 0.5], [0.7, 0.5]]],
  G: [arc(0.5, 0.5, 0.5, 0, 305), [[1, 0.5], [0.52, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]]],
  K: [[[0, 0], [0, 1]], [[0.92, 0], [0.04, 0.53]], [[0.04, 0.47], [0.92, 1]]],
  L: [[[0, 0], [0, 1], [0.88, 1]]],
  M: [[[0, 1], [0, 0], [0.5, 0.62], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  P: [[[0, 0], [0, 1]], arc(0, 0.27, 0.27, -90, 90)],
  R: [[[0, 0], [0, 1]], arc(0, 0.27, 0.27, -90, 90), [[0.02, 0.54], [0.88, 1]]],
  S: [arc(0.5, 0.27, 0.27, -45, -270), arc(0.5, 0.73, 0.27, -90, 135)],
  T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
  U: [[[0.1, 0], [0.1, 0.6]], arc(0.5, 0.6, 0.4, 180, 0), [[0.9, 0.6], [0.9, 0]]],
  V: [[[0, 0], [0.5, 1], [1, 0]]],
  W: [[[0, 0], [0.22, 1], [0.5, 0.32], [0.78, 1], [1, 0]]],
  X: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]],
  Y: [[[0, 0], [0.5, 0.52], [1, 0]], [[0.5, 0.52], [0.5, 1]]],
  Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
};

/* Lay a letter into the icon box. `wide` letters get more room. */
function L(ch, color, opts = {}) {
  const wide = 'WM'.includes(ch);
  const w = opts.w ?? (wide ? 0.46 : 0.36);
  const h = opts.h ?? 0.42;
  const cx = opts.cx ?? 0.5;
  const cy = opts.cy ?? 0.5;
  const x = cx - w / 2, y = cy - h / 2;
  return {
    type: 'strokes',
    w: opts.sw ?? 0.088,
    color,
    pts: A[ch].map(p => p.map(([px, py]) => [x + px * w, y + py * h])),
  };
}

/* A dollar sign: the S plus a stroke straight through it. */
function dollar(color, opts = {}) {
  const s = L('S', color, opts);
  const cy = opts.cy ?? 0.5, h = opts.h ?? 0.42, cx = opts.cx ?? 0.5;
  s.pts = s.pts.concat([[[cx, cy - h * 0.66], [cx, cy + h * 0.66]]]);
  return s;
}

function polyStroke(pts, color, w, closed = false) {
  return { type: 'stroke', pts, color, w, closed };
}

function ngon(cx, cy, r, n, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/* Vertical bars, evenly spaced, heights given as fractions. */
function bars(heights, color, { cx = 0.5, base = 0.68, span = 0.4, w = 0.062 } = {}) {
  const step = span / (heights.length - 1);
  const x0 = cx - span / 2;
  return {
    type: 'strokes', w, color,
    pts: heights.map((hh, i) => [[x0 + step * i, base], [x0 + step * i, base - hh]]),
  };
}

/* The strip across the top that marks a desktop-mode dashboard. */
function desktopChrome(barColor, dotColor) {
  return [
    { type: 'fill', color: barColor, opacity: 0.55,
      pts: [[0, 0], [1, 0], [1, 0.19], [0, 0.19]] },
    { type: 'circle', color: dotColor, opacity: 0.9, c: [0.20, 0.095], r: 0.028 },
    { type: 'circle', color: dotColor, opacity: 0.9, c: [0.29, 0.095], r: 0.028 },
    { type: 'circle', color: dotColor, opacity: 0.9, c: [0.38, 0.095], r: 0.028 },
  ];
}

const solid = color => ({ type: 'solid', color });
const grad = (angle, ...stops) => ({
  type: 'linear', angle,
  stops: stops.map((c, i) => [i / (stops.length - 1), c]),
});

/* ---------------- the designs ---------------- */

const SPECS = {
  'phantom-wallet': {
    label: 'Phantom', title: 'Phantom', theme: '#AB9FF2', bgc: '#1C1C28', dark: true,
    bg: grad(135, '#B9AEF7', '#8E7BE8'),
    marks: [
      { type: 'fill', color: '#2A2438', pts: [
        ...arc(0.5, 0.455, 0.185, 180, 360),
        [0.685, 0.60], [0.625, 0.685], [0.5625, 0.605], [0.5, 0.685],
        [0.4375, 0.605], [0.375, 0.685], [0.315, 0.60],
      ] },
      { type: 'circle', color: '#F6F3FF', c: [0.442, 0.452], r: 0.036 },
      { type: 'circle', color: '#F6F3FF', c: [0.565, 0.452], r: 0.036 },
    ],
  },

  venmo: {
    label: 'Venmo', title: 'Venmo', theme: '#008CFF', bgc: '#F5F5F7', dark: true,
    bg: grad(140, '#3AA9FF', '#0074E0'),
    marks: [L('V', '#FFFFFF', { sw: 0.1 })],
  },

  'cash-app': {
    label: 'Cash App', title: 'Cash App', theme: '#00D632', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#00E23A', '#00A828'),
    marks: [dollar('#FFFFFF', { sw: 0.092, w: 0.3, h: 0.36 })],
  },

  shopify: {
    label: 'Shopify', title: 'Shopify', theme: '#95BF47', bgc: '#F6F6F7', dark: true,
    bg: grad(140, '#A6D157', '#5E8E3E'),
    marks: [L('S', '#FFFFFF')],
  },

  paypal: {
    label: 'PayPal', title: 'PayPal', theme: '#003087', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#009CDE', '#012169'),
    marks: [L('P', '#FFFFFF')],
  },

  chase: {
    label: 'Chase', title: 'Chase', theme: '#117ACA', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#2E96E6', '#0B5FA5'),
    marks: [polyStroke(ngon(0.5, 0.5, 0.21, 8, 22.5), '#FFFFFF', 0.085, true)],
  },

  robinhood: {
    label: 'Robinhood', title: 'Robinhood', theme: '#00C805', bgc: '#000000', dark: true,
    bg: grad(140, '#1B1B1F', '#08080A'),
    marks: [
      polyStroke([[0.27, 0.66], [0.42, 0.49], [0.53, 0.58], [0.73, 0.33]], '#00C805', 0.075),
      polyStroke([[0.60, 0.33], [0.73, 0.33], [0.73, 0.46]], '#00C805', 0.075),
    ],
  },

  stripe: {
    label: 'Stripe', title: 'Stripe', theme: '#635BFF', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#8B85FF', '#4F46E5'),
    marks: [L('S', '#FFFFFF')],
  },

  'tiktok-earnings': {
    label: 'TikTok', title: 'TikTok Earnings', theme: '#000000', bgc: '#000000', dark: true,
    bg: solid('#0A0A0C'),
    marks: [
      { type: 'circle', color: '#25F4EE', c: [0.395, 0.615], r: 0.105 },
      { type: 'strokes', w: 0.062, color: '#25F4EE', pts: [
        [[0.478, 0.615], [0.478, 0.305]], [[0.478, 0.305], [0.63, 0.375]] ] },
      { type: 'circle', color: '#FE2C55', c: [0.425, 0.645], r: 0.105 },
      { type: 'strokes', w: 0.062, color: '#FE2C55', pts: [
        [[0.508, 0.645], [0.508, 0.335]], [[0.508, 0.335], [0.66, 0.405]] ] },
    ],
  },

  'x-earnings': {
    label: 'X', title: 'X Earnings', theme: '#000000', bgc: '#000000', dark: true,
    bg: solid('#0A0A0A'),
    marks: [L('X', '#FFFFFF', { sw: 0.1, w: 0.38, h: 0.38 })],
  },

  'youtube-studio': {
    label: 'YT Studio', title: 'YouTube Studio', theme: '#FF0000', bgc: '#0F0F0F', dark: true,
    bg: grad(140, '#FF4B4B', '#CC0000'),
    marks: [{ type: 'fill', color: '#FFFFFF', pts: [[0.40, 0.32], [0.72, 0.5], [0.40, 0.68]] }],
  },

  'instagram-insights': {
    label: 'IG Insights', title: 'Instagram Insights', theme: '#C13584', bgc: '#000000', dark: true,
    bg: grad(135, '#FCB045', '#FD1D1D', '#833AB4'),
    marks: [bars([0.16, 0.28, 0.20, 0.36], '#FFFFFF')],
  },

  kalshi: {
    label: 'Kalshi', title: 'Kalshi', theme: '#00D082', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#00E58F', '#00A268'),
    marks: [L('K', '#06251A', { sw: 0.092 })],
  },

  coinbase: {
    label: 'Coinbase', title: 'Coinbase', theme: '#0052FF', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#3D7BFF', '#0038B8'),
    marks: [L('C', '#FFFFFF', { sw: 0.095 })],
  },

  'apple-card': {
    label: 'Apple Card', title: 'Apple Card', theme: '#F5F5F7', bgc: '#FFFFFF', dark: false,
    bg: grad(135, '#FFFFFF', '#D6D6DE'),
    marks: [
      polyStroke([[0.28, 0.36], [0.72, 0.36], [0.72, 0.64], [0.28, 0.64]], '#1D1D1F', 0.055, true),
      polyStroke([[0.34, 0.55], [0.52, 0.55]], '#1D1D1F', 0.045),
    ],
  },

  strava: {
    label: 'Strava', title: 'Strava', theme: '#FC4C02', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#FF7A33', '#E03E00'),
    marks: [
      polyStroke([[0.30, 0.67], [0.37, 0.51], [0.50, 0.49], [0.63, 0.47], [0.70, 0.33]],
        '#FFFFFF', 0.062),
      { type: 'circle', color: '#FFFFFF', c: [0.30, 0.67], r: 0.058 },
      { type: 'circle', color: '#FFFFFF', c: [0.70, 0.33], r: 0.058 },
    ],
  },

  'apple-fitness': {
    label: 'Fitness', title: 'Apple Fitness', theme: '#0A0A0C', bgc: '#000000', dark: true,
    bg: solid('#0B0B0E'),
    marks: [
      polyStroke(arc(0.5, 0.5, 0.30, -90, 200), '#FA114F', 0.072),
      polyStroke(arc(0.5, 0.5, 0.205, -90, 150), '#92E82A', 0.072),
      polyStroke(arc(0.5, 0.5, 0.11, -90, 120), '#1EEAEF', 0.072),
    ],
  },

  'apple-health': {
    label: 'Health', title: 'Apple Health', theme: '#FF2D55', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#FF5C7A', '#E31B44'),
    marks: [{ type: 'fill', color: '#FFFFFF', pts: [
      ...arc(0.395, 0.44, 0.115, 180, 360),
      ...arc(0.605, 0.44, 0.115, 180, 360),
      [0.5, 0.715],
    ] }],
  },

  github: {
    label: 'GitHub', title: 'GitHub', theme: '#24292F', bgc: '#0D1117', dark: true,
    bg: grad(140, '#3A424C', '#16191D'),
    marks: [L('G', '#FFFFFF', { sw: 0.09 })],
  },

  'screen-time': {
    label: 'Screen Time', title: 'Screen Time', theme: '#5E5CE6', bgc: '#000000', dark: true,
    bg: grad(140, '#7D7BFF', '#4A48CC'),
    marks: [polyStroke(
      [[0.33, 0.30], [0.67, 0.30], [0.5, 0.5], [0.67, 0.70], [0.33, 0.70], [0.5, 0.5]],
      '#FFFFFF', 0.062, true)],
  },

  'spotify-wrapped': {
    label: 'Wrapped', title: 'Spotify Wrapped', theme: '#1DB954', bgc: '#000000', dark: true,
    bg: grad(140, '#25E05F', '#0F7A38'),
    marks: [bars([0.14, 0.30, 0.22, 0.38, 0.18], '#0B140F', { w: 0.055, span: 0.42 })],
  },

  'bet-slip': {
    label: 'Bet Slip', title: 'Bet Slip', theme: '#0E2A1E', bgc: '#0B1F16', dark: true,
    bg: grad(140, '#164A33', '#0A1C14'),
    marks: [
      polyStroke([[0.29, 0.32], [0.71, 0.32], [0.71, 0.68], [0.29, 0.68]], '#00E676', 0.05, true),
      polyStroke([[0.38, 0.50], [0.46, 0.58], [0.62, 0.42]], '#00E676', 0.062),
    ],
  },

  'crypto-pnl': {
    label: 'PnL', title: 'Futures PnL', theme: '#0B0B0F', bgc: '#0B0B0F', dark: true,
    bg: grad(140, '#17171E', '#08080B'),
    marks: [
      // candlesticks — wick then body, so the body reads on top
      polyStroke([[0.325, 0.68], [0.325, 0.40]], '#00E676', 0.022),
      polyStroke([[0.325, 0.63], [0.325, 0.45]], '#00E676', 0.085),
      polyStroke([[0.50, 0.60], [0.50, 0.30]], '#FF5252', 0.022),
      polyStroke([[0.50, 0.55], [0.50, 0.37]], '#FF5252', 0.085),
      polyStroke([[0.675, 0.64], [0.675, 0.26]], '#00E676', 0.022),
      polyStroke([[0.675, 0.57], [0.675, 0.33]], '#00E676', 0.085),
    ],
  },

  'app-store': {
    // The page follows the system theme; dark is what it shows on a dark
    // phone, which is what the iOS status-bar style has to match.
    label: 'App Store', title: 'App Store', theme: '#000000', bgc: '#000000', dark: true,
    bg: grad(140, '#1E9BFA', '#0062E0'),
    marks: [L('A', '#FFFFFF', { sw: 0.088, w: 0.40, h: 0.42 })],
  },

  whop: {
    label: 'Whop', title: 'Whop', theme: '#FF6243', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#FF8266', '#E8452A'),
    marks: [L('W', '#FFFFFF', { sw: 0.082 })],
  },

  /* ---- desktop-mode dashboards: same mark, browser-window strip ---- */

  'stripe-desktop': {
    label: 'Stripe Web', title: 'Stripe Dashboard (desktop)', theme: '#635BFF', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#8B85FF', '#4F46E5'),
    marks: [...desktopChrome('#2A2478', '#FFFFFF'), L('S', '#FFFFFF', { cy: 0.575, h: 0.38 })],
  },

  'youtube-studio-desktop': {
    label: 'YT Web', title: 'YouTube Studio (desktop)', theme: '#FF0000', bgc: '#0F0F0F', dark: true,
    bg: grad(140, '#FF4B4B', '#CC0000'),
    marks: [...desktopChrome('#5C0000', '#FFFFFF'),
      { type: 'fill', color: '#FFFFFF', pts: [[0.41, 0.41], [0.71, 0.575], [0.41, 0.74]] }],
  },

  'shopify-desktop': {
    label: 'Shopify Web', title: 'Shopify Admin (desktop)', theme: '#5E8E3E', bgc: '#F6F6F7', dark: true,
    bg: grad(140, '#A6D157', '#5E8E3E'),
    marks: [...desktopChrome('#2C4A1C', '#FFFFFF'), L('S', '#FFFFFF', { cy: 0.575, h: 0.38 })],
  },

  'github-desktop': {
    label: 'GitHub Web', title: 'GitHub (desktop)', theme: '#24292F', bgc: '#0D1117', dark: true,
    bg: grad(140, '#3A424C', '#16191D'),
    marks: [...desktopChrome('#000000', '#FFFFFF'),
      L('G', '#FFFFFF', { cy: 0.575, h: 0.38, sw: 0.082 })],
  },

  'kalshi-desktop': {
    label: 'Kalshi Web', title: 'Kalshi Terminal (desktop)', theme: '#00D082', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#00E58F', '#00A268'),
    marks: [...desktopChrome('#00301F', '#FFFFFF'),
      L('K', '#06251A', { cy: 0.575, h: 0.38, sw: 0.082 })],
  },

  // A speech balloon: circle body plus a wedge for the tail, on the
  // green the real Messages tile is known for.
  'imessage': {
    label: 'Messages', title: 'iMessage', theme: '#000000', bgc: '#000000', dark: true,
    bg: grad(140, '#5BF675', '#0BB92B'),
    marks: [
      { type: 'circle', c: [0.5, 0.455], r: 0.235, color: '#FFFFFF' },
      { type: 'fill', color: '#FFFFFF',
        pts: [[0.345, 0.605], [0.255, 0.775], [0.475, 0.655]] },
    ],
  },
};

/* The gallery's own icon. */
const GALLERY = {
  label: 'Krypt LARP', title: 'Krypt LARP — Dashboard Collection',
  theme: '#0a0a0b', bgc: '#0a0a0b', dark: true,
  bg: grad(135, '#7C3AED', '#22D3EE'),
  marks: [L('K', '#0A0A0F', { sw: 0.1, w: 0.38, h: 0.46 })],
};

module.exports = { SPECS, GALLERY };
