/* ============================================================
   icon-specs.js — one home-screen icon design per dashboard.

   Every mark in this file is drawn here, from primitives, for a product
   that does not exist. None of them trace, redraw or recolour a real
   company's logo, and the palettes are deliberately off the colours any
   real app is known for — a payments tile that is teal rather than that
   particular blue, a music tile that is amber rather than that
   particular green.

   That is the whole point of the file, so if you are tempted to make
   one "a bit more accurate", don't. The dashboards are original
   fictional products (see tools/brand-map.js); the icons have to be
   too. Users who want the real thing on their own phone can set their
   own icon from the in-app panel — that is their call to make, on their
   own device, and it is not shipped by us.

   Fields per entry:
     label   what shows under the icon on the home screen
     title   full name used in the manifest
     theme   status-bar / theme colour
     bgc     splash background while the app opens
     dark    is the top of the screen dark? (picks the status-bar style)
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
  O: [arc(0.5, 0.5, 0.5, 0, 360)],
  P: [[[0, 0], [0, 1]], arc(0, 0.27, 0.27, -90, 90)],
  Q: [arc(0.5, 0.5, 0.5, 0, 360), [[0.66, 0.68], [1.04, 1.06]]],
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

/* Lay a letter into the icon box. `wide` letters get more room, and the
   round ones get a square box so they don't come out as ellipses. */
function L(ch, color, opts = {}) {
  const wide = 'WM'.includes(ch);
  const round = 'OQ'.includes(ch);
  const h = opts.h ?? (round ? 0.40 : 0.42);
  const w = opts.w ?? (round ? h : wide ? 0.46 : 0.36);
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

function polyStroke(pts, color, w, closed = false) {
  return { type: 'stroke', pts, color, w, closed };
}

function fill(pts, color) {
  return { type: 'fill', pts, color };
}

function dot(cx, cy, r, color) {
  return { type: 'circle', c: [cx, cy], r, color };
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

/* A crescent: the part of circle A that circle B doesn't cover. The
   two angles are where the circles cross — worked out once, hard-coded,
   because the radii never change. */
function crescent(color) {
  return fill([
    ...arc(0.5, 0.5, 0.24, 63.6, 296.4),
    ...arc(0.60, 0.5, 0.215, 271.8, 88.2),
  ], color);
}

/* A shopfront: pitched awning, walls, doorway. `cy` shifts the whole
   thing down for the desktop variants, which lose the top strip. */
function shopfront(color, w = 0.062, dy = 0) {
  return {
    type: 'strokes', w, color,
    pts: [
      [[0.23, 0.44 + dy], [0.5, 0.27 + dy], [0.77, 0.44 + dy]],
      [[0.30, 0.44 + dy], [0.30, 0.73 + dy], [0.70, 0.73 + dy], [0.70, 0.44 + dy]],
      [[0.43, 0.73 + dy], [0.43, 0.565 + dy], [0.57, 0.565 + dy], [0.57, 0.73 + dy]],
    ],
  };
}

/* A shield. Straight shoulders, a rounded point. */
function shield(color, w = 0.062) {
  return polyStroke([
    [0.5, 0.255], [0.735, 0.335], [0.735, 0.505],
    ...arc(0.5, 0.505, 0.235, 0, 180),
    [0.265, 0.335],
  ], color, w, true);
}

/* A cloud, built as overlapping solids rather than one outline —
   they're the same colour, so the silhouette unions cleanly. */
function cloud(color) {
  return [
    dot(0.375, 0.535, 0.105, color),
    dot(0.515, 0.470, 0.150, color),
    dot(0.645, 0.545, 0.098, color),
    fill([[0.375, 0.470], [0.645, 0.470], [0.645, 0.643], [0.375, 0.643]], color),
  ];
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
  /* Nocturne — a night wallet. Crescent moon. */
  nocturne: {
    label: 'Nocturne', title: 'Nocturne Wallet', theme: '#8E86E8', bgc: '#15151F', dark: true,
    bg: grad(135, '#A8B4F8', '#6257D2'),
    marks: [crescent('#191A2E')],
  },

  /* Tandem — two people, one payment. Two linked rings. */
  tandem: {
    label: 'Tandem', title: 'Tandem', theme: '#1892C8', bgc: '#F4F6F8', dark: true,
    bg: grad(140, '#54C2E4', '#0D7BAE'),
    marks: [
      polyStroke(arc(0.415, 0.5, 0.155, 0, 360), '#FFFFFF', 0.072),
      polyStroke(arc(0.585, 0.5, 0.155, 0, 360), '#FFFFFF', 0.072),
    ],
  },

  /* Quill — money that moves with a stroke of the pen. */
  quill: {
    label: 'Quill', title: 'Quill Cash', theme: '#1FBB78', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#3FD996', '#0F8F62'),
    marks: [L('Q', '#FFFFFF', { sw: 0.086, h: 0.40 })],
  },

  /* Bodega — the corner shop, scaled up. */
  bodega: {
    label: 'Bodega', title: 'Bodega', theme: '#86AE3A', bgc: '#F6F7F4', dark: true,
    bg: grad(140, '#BCD84F', '#66922C'),
    marks: [shopfront('#1B2C0C', 0.062)],
  },

  /* Nimbus — a wallet in the cloud. */
  nimbus: {
    label: 'Nimbus', title: 'Nimbus Pay', theme: '#1D5A8C', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#5EC7DE', '#13446E'),
    marks: cloud('#FFFFFF'),
  },

  /* Meridian — a bank. Letterform, nothing more. */
  meridian: {
    label: 'Meridian', title: 'Meridian Bank', theme: '#2A4F9E', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#5379D6', '#1D3576'),
    marks: [L('M', '#FFFFFF', { sw: 0.082 })],
  },

  /* Quiver — arrows. A trend line ending in an arrowhead. */
  quiver: {
    label: 'Quiver', title: 'Quiver', theme: '#26C97A', bgc: '#0B0B0E', dark: true,
    bg: grad(140, '#1C1C22', '#08080B'),
    marks: [
      polyStroke([[0.27, 0.68], [0.42, 0.50], [0.53, 0.59], [0.73, 0.32]], '#35E08A', 0.075),
      polyStroke([[0.58, 0.32], [0.73, 0.32], [0.73, 0.47]], '#35E08A', 0.075),
    ],
  },

  /* Trellis — payments infrastructure. A lattice. */
  trellis: {
    label: 'Trellis', title: 'Trellis', theme: '#4D6BE0', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#7FA6FF', '#3B4FD0'),
    marks: [{
      type: 'strokes', w: 0.062, color: '#FFFFFF',
      pts: [
        [[0.30, 0.30], [0.70, 0.30]],
        [[0.30, 0.50], [0.70, 0.50]],
        [[0.30, 0.70], [0.70, 0.70]],
        [[0.38, 0.26], [0.38, 0.74]],
        [[0.62, 0.26], [0.62, 0.74]],
      ],
    }],
  },

  /* Loopfeed — short video, on a loop. */
  loopfeed: {
    label: 'Loopfeed', title: 'Loopfeed Rewards', theme: '#101014', bgc: '#101014', dark: true,
    bg: solid('#101014'),
    marks: [
      polyStroke(arc(0.5, 0.5, 0.215, 120, 400), '#4DE0D0', 0.070),
      fill([[0.60, 0.24], [0.76, 0.315], [0.585, 0.395]], '#FF6B9D'),
    ],
  },

  /* Quorum — a public square of posts. */
  quorum: {
    label: 'Quorum', title: 'Quorum Revenue', theme: '#0E0E12', bgc: '#0E0E12', dark: true,
    bg: grad(140, '#22222C', '#0B0B0F'),
    marks: [L('Q', '#F2F2F6', { sw: 0.086, h: 0.40 })],
  },

  /* Vista Studio — a viewer's play control, in coral rather than red. */
  'vista-studio': {
    label: 'Vista', title: 'Vista Studio', theme: '#E04A32', bgc: '#131316', dark: true,
    bg: grad(140, '#FF8A66', '#D03A24'),
    marks: [
      polyStroke(arc(0.5, 0.5, 0.235, 0, 360), '#FFFFFF', 0.058),
      fill([[0.435, 0.375], [0.655, 0.5], [0.435, 0.625]], '#FFFFFF'),
    ],
  },

  /* Halo — reach, measured. */
  'halo-insights': {
    label: 'Halo', title: 'Halo Insights', theme: '#A9469E', bgc: '#0D0D10', dark: true,
    bg: grad(135, '#FFC46B', '#F2506E', '#7A4BD6'),
    marks: [bars([0.16, 0.28, 0.20, 0.36], '#FFFFFF')],
  },

  /* Verity — a market that settles on what turned out true. */
  verity: {
    label: 'Verity', title: 'Verity Markets', theme: '#1BB5A2', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#3ADCC4', '#0C8E80'),
    marks: [polyStroke([[0.31, 0.51], [0.44, 0.645], [0.70, 0.355]], '#04302B', 0.086)],
  },

  /* Bastion — where the coins are kept. */
  bastion: {
    label: 'Bastion', title: 'Bastion', theme: '#2E5AAE', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#6690DC', '#1E3E88'),
    marks: [shield('#FFFFFF', 0.066)],
  },

  /* Onyx Card — a card, drawn as a card. */
  'onyx-card': {
    label: 'Onyx', title: 'Onyx Card', theme: '#E8E8ED', bgc: '#FFFFFF', dark: false,
    bg: grad(135, '#FAFAFC', '#C9C9D4'),
    marks: [
      polyStroke([[0.26, 0.35], [0.74, 0.35], [0.74, 0.65], [0.26, 0.65]], '#1B1B20', 0.052, true),
      polyStroke([[0.26, 0.455], [0.74, 0.455]], '#1B1B20', 0.042),
      polyStroke([[0.33, 0.565], [0.48, 0.565]], '#1B1B20', 0.038),
    ],
  },

  /* Trailmark — a route with a start and an end. */
  trailmark: {
    label: 'Trailmark', title: 'Trailmark', theme: '#E8762A', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#FFA95C', '#D25A16'),
    marks: [
      polyStroke([[0.30, 0.68], [0.38, 0.50], [0.52, 0.52], [0.63, 0.44], [0.70, 0.30]],
        '#FFFFFF', 0.058),
      dot(0.30, 0.68, 0.062, '#FFFFFF'),
      dot(0.70, 0.30, 0.062, '#FFFFFF'),
    ],
  },

  /* Momentum — three chevrons, gathering speed. */
  momentum: {
    label: 'Momentum', title: 'Momentum', theme: '#0C0C10', bgc: '#000000', dark: true,
    bg: solid('#0C0C10'),
    marks: [
      polyStroke([[0.31, 0.42], [0.5, 0.26], [0.69, 0.42]], '#42C8E8', 0.070),
      polyStroke([[0.31, 0.585], [0.5, 0.425], [0.69, 0.585]], '#9BE04A', 0.070),
      polyStroke([[0.31, 0.75], [0.5, 0.59], [0.69, 0.75]], '#E8556E', 0.070),
    ],
  },

  /* Wellspring — a droplet, not a heart. */
  wellspring: {
    label: 'Wellspring', title: 'Wellspring', theme: '#E24C6E', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#FF8AA4', '#CE3459'),
    marks: [fill([
      [0.5, 0.245],
      ...arc(0.5, 0.575, 0.185, -55, 235),
    ], '#FFFFFF')],
  },

  /* Codenest — angle brackets. */
  codenest: {
    label: 'Codenest', title: 'Codenest', theme: '#2A2F38', bgc: '#111318', dark: true,
    bg: grad(140, '#4C5563', '#1A1E25'),
    marks: [
      polyStroke([[0.40, 0.33], [0.25, 0.50], [0.40, 0.67]], '#FFFFFF', 0.068),
      polyStroke([[0.60, 0.33], [0.75, 0.50], [0.60, 0.67]], '#FFFFFF', 0.068),
    ],
  },

  /* Dwell — time spent. An hourglass. */
  dwell: {
    label: 'Dwell', title: 'Dwell', theme: '#6B63DA', bgc: '#0B0B10', dark: true,
    bg: grad(140, '#8F86F2', '#4A42BE'),
    marks: [polyStroke(
      [[0.33, 0.30], [0.67, 0.30], [0.5, 0.5], [0.67, 0.70], [0.33, 0.70], [0.5, 0.5]],
      '#FFFFFF', 0.062, true)],
  },

  /* Airwave Rewind — a year of listening, in amber. */
  'airwave-rewind': {
    label: 'Rewind', title: 'Airwave Rewind', theme: '#F0A82E', bgc: '#0B0B0D', dark: true,
    bg: grad(140, '#FFD264', '#DE821A'),
    marks: [bars([0.14, 0.30, 0.22, 0.38, 0.18], '#2A1B03', { w: 0.055, span: 0.42 })],
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

  /* Appfront — a marketplace grid. */
  appfront: {
    label: 'Appfront', title: 'Appfront', theme: '#2779D8', bgc: '#0D0D0F', dark: true,
    bg: grad(140, '#4FB3EE', '#1F55C4'),
    marks: [{
      type: 'strokes', w: 0.078, color: '#FFFFFF', closed: true,
      pts: [
        [[0.315, 0.315], [0.445, 0.315], [0.445, 0.445], [0.315, 0.445]],
        [[0.555, 0.315], [0.685, 0.315], [0.685, 0.445], [0.555, 0.445]],
        [[0.315, 0.555], [0.445, 0.555], [0.445, 0.685], [0.315, 0.685]],
        [[0.555, 0.555], [0.685, 0.555], [0.685, 0.685], [0.555, 0.685]],
      ],
    }],
  },

  /* Vend — a creator's storefront. */
  vend: {
    label: 'Vend', title: 'Vend', theme: '#E86A4E', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#FF9E80', '#D9503A'),
    marks: [L('V', '#FFFFFF', { sw: 0.086 })],
  },

  /* Pings — a message bubble, in teal rather than the green one
     everybody's phone already has. */
  pings: {
    label: 'Pings', title: 'Pings', theme: '#2CBCA4', bgc: '#0C0C0E', dark: true,
    bg: grad(140, '#6FE8D8', '#12A08A'),
    marks: [
      dot(0.5, 0.455, 0.235, '#FFFFFF'),
      fill([[0.345, 0.605], [0.255, 0.775], [0.475, 0.655]], '#FFFFFF'),
    ],
  },

  /* ---- desktop-mode dashboards: same mark, browser-window strip ---- */

  'trellis-desktop': {
    label: 'Trellis Web', title: 'Trellis Dashboard (desktop)',
    theme: '#4D6BE0', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#7FA6FF', '#3B4FD0'),
    marks: [...desktopChrome('#1E2A78', '#FFFFFF'), {
      type: 'strokes', w: 0.056, color: '#FFFFFF',
      pts: [
        [[0.31, 0.40], [0.69, 0.40]],
        [[0.31, 0.575], [0.69, 0.575]],
        [[0.31, 0.75], [0.69, 0.75]],
        [[0.385, 0.36], [0.385, 0.79]],
        [[0.615, 0.36], [0.615, 0.79]],
      ],
    }],
  },

  'vista-studio-desktop': {
    label: 'Vista Web', title: 'Vista Studio (desktop)',
    theme: '#E04A32', bgc: '#131316', dark: true,
    bg: grad(140, '#FF8A66', '#D03A24'),
    marks: [...desktopChrome('#5C1A0E', '#FFFFFF'),
      polyStroke(arc(0.5, 0.575, 0.205, 0, 360), '#FFFFFF', 0.052),
      fill([[0.445, 0.465], [0.635, 0.575], [0.445, 0.685]], '#FFFFFF')],
  },

  'bodega-desktop': {
    label: 'Bodega Web', title: 'Bodega Admin (desktop)',
    theme: '#86AE3A', bgc: '#F6F7F4', dark: true,
    bg: grad(140, '#BCD84F', '#66922C'),
    marks: [...desktopChrome('#2C4213', '#FFFFFF'),
      shopfront('#1B2C0C', 0.056, 0.085)],
  },

  'codenest-desktop': {
    label: 'Codenest Web', title: 'Codenest (desktop)',
    theme: '#2A2F38', bgc: '#111318', dark: true,
    bg: grad(140, '#4C5563', '#1A1E25'),
    marks: [...desktopChrome('#000000', '#FFFFFF'),
      polyStroke([[0.41, 0.435], [0.275, 0.585], [0.41, 0.735]], '#FFFFFF', 0.062),
      polyStroke([[0.59, 0.435], [0.725, 0.585], [0.59, 0.735]], '#FFFFFF', 0.062)],
  },

  'verity-desktop': {
    label: 'Verity Web', title: 'Verity Terminal (desktop)',
    theme: '#1BB5A2', bgc: '#FFFFFF', dark: true,
    bg: grad(140, '#3ADCC4', '#0C8E80'),
    marks: [...desktopChrome('#03302B', '#FFFFFF'),
      polyStroke([[0.32, 0.585], [0.44, 0.705], [0.69, 0.435]], '#04302B', 0.078)],
  },
};

/* The gallery's own icon. */
const GALLERY = {
  label: 'Krypt LARP', title: 'Krypt LARP — Dashboard Collection',
  theme: '#0a0a0b', bgc: '#0a0a0b', dark: true,
  bg: grad(135, '#7C3AED', '#22D3EE'),
  marks: [L('K', '#0A0A0F', { sw: 0.1, w: 0.38, h: 0.46 })],
};

/* `letter` is exported for tools/custom-store.js, which draws a tile for
   each dashboard a user imports. Same alphabet, same weights — so a
   dashboard you made yourself gets an icon that sits next to ours
   without looking like a different product. */
module.exports = { SPECS, GALLERY, letter: L };
