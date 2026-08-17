/* ============================================================
   push.js — simulated push notifications.

   Loaded on every dashboard, but only does something for the slugs
   listed in FEED below. A dashboard with no entry costs one lookup
   and exits, which is why patch-dashboards.js can inject this
   everywhere without a second list to keep in sync.

   Two presentations, picked from what the page is drawn in:

     .phone    an iOS banner that drops in over the top of the frame
     otherwise a macOS-style toast in the top right

   The banner is positioned inside the frame element, not the viewport,
   so on the desktop gallery it sits on the mock phone rather than
   floating over the browser window. On a real phone, phone.css has
   already dropped the bezel and .phone fills the screen, so the same
   rule puts it where a real notification would be.

   Off until asked for. Banners arriving unannounced while someone is
   reading a dashboard is noise, so nothing fires until Notifications is
   switched on in the tap-3× panel — krypt-app.js drives that through
   window.kryptPush. The choice is remembered across dashboards.

   Once on, they pause while the dashboard is in edit mode and while the
   tab is hidden: a queue piling up behind a background tab and then
   flushing at once is worse than none at all.

   ?nopush in the URL forces them off for that load whatever the
   stored setting says.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- content ----------------
     app:   what the notification says it is from
     icon:  [background, glyph] — fallback only. The real icon is the
            dashboard's own generated app icon, loaded by slug.
     vars:  {name: selector} — read from the live page, so text like
            {store} says whatever the dashboard currently says
     items: {t, t2, b} — t and t2 are the bold title lines (iOS shows
            two for apps that send them: "Order #1847" then "from
            Bodega"), b is the body. Cycled in order.             */
  var FEED = {
    'bodega': {
      app: 'Bodega', icon: ['#5E8E3E', '🛍'],
      vars: { store: '[data-edit="storeName"]' },
      items: [
        { t: 'Order #1847', t2: 'from Bodega', b: '$128.00, 3 items from Online Store · {store}' },
        { t: 'Order #1848', t2: 'from Bodega', b: '$64.50, 1 item from Online Store · {store}' },
        { t: 'Order #1849', t2: 'from Bodega', b: '$212.40, 5 items from Online Store · {store}' },
        { t: 'Low stock', t2: 'from Bodega', b: 'Ceramic Vase is down to 3 units · {store}' },
        { t: 'Payout sent', t2: 'from Bodega', b: '$2,480.55 is on its way to your bank · {store}' },
      ],
    },
    'bodega-desktop': {
      app: 'Bodega', icon: ['#5E8E3E', '🛍'],
      vars: { store: '[data-edit="biz"],[data-edit="storeName"]' },
      items: [
        { t: 'Order #1847', t2: 'from Bodega', b: '$128.00, 3 items from Online Store · {store}' },
        { t: 'Order #1848', t2: 'from Bodega', b: '$64.50, 1 item from Online Store · {store}' },
        { t: 'Low stock', t2: 'from Bodega', b: 'Ceramic Vase is down to 3 units · {store}' },
      ],
    },
    'tandem': {
      app: 'Tandem', icon: ['#008CFF', 'V'],
      items: [
        { t: 'Riley Foster paid you', b: '$24.00 · dinner 🍜' },
        { t: 'Jordan requested $15.00', b: 'concert tickets 🎟' },
        { t: 'Sam Ortiz paid you', b: '$8.50 · coffee ☕️' },
      ],
    },
    'quill': {
      app: 'Quill', icon: ['#00D632', '$'],
      items: [
        { t: 'Payment received', b: 'Riley Foster sent you $30.00' },
        { t: 'Bitcoin', b: 'BTC is up 4.2% in the last hour' },
        { t: 'Cash Card', b: '$12.40 spent at Blue Bottle — 5% boost applied' },
      ],
    },
    'nimbus': {
      app: 'Nimbus', icon: ['#0070E0', 'P'],
      items: [
        { t: 'You got money', b: 'Alex Kim sent you $85.00' },
        { t: 'Payment sent', b: '$42.10 to Northwind Studio' },
      ],
    },
    'trellis': {
      app: 'Trellis', icon: ['#635BFF', 'S'],
      items: [
        { t: 'Payment succeeded', b: '$128.00 from cameron@example.com' },
        { t: 'New customer', b: 'priya@example.com subscribed to Studio Pro' },
        { t: 'Payout paid', b: '$4,210.00 arrived at •••• 6021' },
      ],
    },
    'trellis-desktop': {
      app: 'Trellis', icon: ['#635BFF', 'S'],
      items: [
        { t: 'Payment succeeded', b: '$128.00 from cameron@example.com' },
        { t: 'Dispute opened', b: '$82.00 charge disputed — respond by Aug 12' },
      ],
    },
    'bastion': {
      app: 'Bastion', icon: ['#0052FF', '◎'],
      items: [
        { t: 'Price alert', b: 'BTC crossed $63,000' },
        { t: 'Buy filled', b: '0.0100 BTC for $631.80' },
        { t: 'ETH is moving', b: 'Ethereum is up 2.4% today' },
      ],
    },
    'quiver': {
      app: 'Quiver', icon: ['#00C805', '↗'],
      items: [
        { t: 'Order filled', b: 'Bought 2 shares of AURL at $221.40' },
        { t: 'Price alert', b: 'NUVX is up 5.1% today' },
        { t: 'Market open', b: 'Your portfolio is up $342.18 (+2.47%)' },
      ],
    },
    'verity': {
      app: 'Verity', icon: ['#00D082', 'K'],
      items: [
        { t: 'Market moved', b: 'Fed cuts in September — Yes is now 63¢ (+7)' },
        { t: 'Position settled', b: 'You won $42.00 on CPI above 3.0%' },
      ],
    },
    'verity-desktop': {
      app: 'Verity', icon: ['#00D082', 'K'],
      items: [
        { t: 'Market moved', b: 'Fed cuts in September — Yes is now 63¢ (+7)' },
        { t: 'Order filled', b: 'Bought 120 Yes at 63¢' },
      ],
    },
    'pings': {
      app: 'Messages', icon: ['#3ad17c', '💬'],
      items: [
        { t: 'Jordan Reyes', b: 'sending the address now' },
        { t: 'Jordan Reyes', b: 'are you bringing the good camera?' },
      ],
    },
    'halo-insights': {
      app: 'Halo', icon: ['#C13584', '📷'],
      items: [
        { t: 'New followers', b: 'maya.b and 42 others followed you' },
        { t: 'Your reel is doing well', b: '12,400 views in the last hour' },
      ],
    },
    'loopfeed': {
      app: 'Loopfeed', icon: ['#FE2C55', '♪'],
      items: [
        { t: 'Creator Rewards', b: 'You earned $18.40 yesterday' },
        { t: 'A video is taking off', b: '84,000 views in the last 3 hours' },
      ],
    },
    'vista-studio': {
      app: 'Vista Studio', icon: ['#FF0000', '▶'],
      items: [
        { t: 'New comment', b: '@mara.reyes: "The desk build finally got me to start mine"' },
        { t: 'Milestone', b: 'Your channel passed 24,800 subscribers' },
        { t: 'Video published', b: '"My 2026 editing workflow" is live' },
      ],
    },
    'vista-studio-desktop': {
      app: 'Vista Studio', icon: ['#FF0000', '▶'],
      items: [
        { t: 'New comment', b: '@tomkeller asked about your lens' },
        { t: 'Milestone', b: 'Your channel passed 24,800 subscribers' },
      ],
    },
    'vend': {
      app: 'Vend', icon: ['#FF6243', 'W'],
      items: [
        { t: 'New sale', b: 'Studio Pro — $29.00 from arlowave' },
        { t: 'Payout ready', b: '$1,240.55 available to withdraw' },
      ],
    },
    'codenest': {
      app: 'Codenest', icon: ['#24292F', '⌥'],
      items: [
        { t: 'flux-router', b: 'priya opened pull request #212' },
        { t: 'CI passed', b: 'All checks green on main' },
        { t: 'New star', b: 'Your repo passed 128 stars' },
      ],
    },
    'codenest-desktop': {
      app: 'Codenest', icon: ['#24292F', '⌥'],
      items: [
        { t: 'flux-router', b: 'priya opened pull request #212' },
        { t: 'Review requested', b: 'sam asked you to review #209' },
      ],
    },
    'trailmark': {
      app: 'Trailmark', icon: ['#FC4C02', '🏃'],
      items: [
        { t: 'Kudos', b: 'Riley gave you kudos on Morning Run' },
        { t: 'Weekly goal', b: "You're 4.2 mi from your weekly target" },
      ],
    },
    'momentum': {
      app: 'Fitness', icon: ['#FA114F', '◉'],
      items: [
        { t: 'Move goal', b: "You've closed your Move ring — 512/500 CAL" },
        { t: 'Stand up', b: "Time to stand — you've been sitting a while" },
      ],
    },
    'meridian': {
      app: 'Meridian', icon: ['#117ACA', 'C'],
      items: [
        { t: 'Card purchase', b: '$42.18 at Blue Bottle Coffee' },
        { t: 'Deposit posted', b: '$1,840.00 direct deposit is available' },
      ],
    },
    'onyx-card': {
      app: 'Wallet', icon: ['#1C1C1E', '􀎽'],
      items: [
        { t: 'Onyx Card', b: '$64.50 at Greenline — 2% Daily Cash' },
        { t: 'Daily Cash', b: 'You earned $4.28 in Daily Cash today' },
      ],
    },
    'appfront': {
      app: 'Appfront', icon: ['#0A84FF', 'A'],
      items: [
        { t: 'Updates available', b: '4 apps are ready to update' },
      ],
    },
    'dwell': {
      app: 'Dwell', icon: ['#5E5CE6', '⏳'],
      items: [
        { t: 'Weekly Report', b: 'Your dwell was down 8% last week' },
        { t: 'Limit reached', b: "You've hit your 2h limit for Social" },
      ],
    },
    'quorum': {
      app: 'X', icon: ['#000000', '𝕏'],
      items: [
        { t: 'Payout scheduled', b: '$512.90 arrives in 3 days' },
        { t: 'Your post is performing', b: '128K impressions in 6 hours' },
      ],
    },
    'bet-slip': {
      app: 'Bet Slip', icon: ['#00E676', '✓'],
      items: [
        { t: 'Leg settled', b: 'Your first leg hit — 3 to go' },
        { t: 'Cash out available', b: '$84.20 to take now' },
      ],
    },
  };

  /* Slug is the folder the dashboard lives in. */
  var m = location.pathname.replace(/\\/g, '/').match(/\/dashboards\/([^/]+)\//);
  var slug = m && m[1];
  var feed = slug && FEED[slug];
  if (!feed || !feed.items || !feed.items.length) return;

  var enabled = false;
  try { enabled = localStorage.getItem('krypt-push') === 'on'; } catch (e) { /* private mode */ }
  if (/[?&]nopush\b/.test(location.search)) enabled = false;

  var FIRST = 7000;     // let the entrance animations finish first
  var GAP = 26000;      // between notifications
  var LINGER = 4600;    // how long one stays up

  /* ---------------- styles ---------------- */

  var css = document.createElement('style');
  css.textContent = [
    '.kpush{position:absolute;top:10px;left:10px;right:10px;z-index:2147482000;',
    '  display:flex;align-items:flex-start;gap:11px;padding:12px 14px;border-radius:22px;',
    '  background:rgba(38,38,42,.72);-webkit-backdrop-filter:blur(26px) saturate(180%);',
    '  backdrop-filter:blur(26px) saturate(180%);border:.5px solid rgba(255,255,255,.11);',
    '  box-shadow:0 12px 34px rgba(0,0,0,.5);color:#fff;cursor:pointer;',
    '  font:400 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  transform:translateY(-140%);opacity:0;',
    '  transition:transform .42s cubic-bezier(.2,.9,.3,1.06),opacity .28s ease;}',
    '.kpush.in{transform:translateY(0);opacity:1;}',
    '.kpush .ki{width:34px;height:34px;border-radius:9px;flex:none;display:flex;',
    '  align-items:center;justify-content:center;font-size:17px;line-height:1;color:#fff;',
    '  overflow:hidden;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.16);}',
    '.kpush .ki img{width:100%;height:100%;display:block;object-fit:cover;}',
    '.kpush .kt2{font-size:14px;font-weight:650;line-height:1.3;}',
    '.kpush .kb{flex:1;min-width:0;}',
    '.kpush .kh{display:flex;align-items:baseline;gap:6px;}',
    '.kpush .ka{font-size:11.5px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;',
    '  color:rgba(255,255,255,.72);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.kpush .kw{margin-left:auto;font-size:11.5px;color:rgba(255,255,255,.55);flex:none;}',
    '.kpush .kt{font-size:14px;font-weight:650;margin-top:2px;}',
    '.kpush .kd{font-size:13.5px;color:rgba(255,255,255,.9);margin-top:1px;',
    '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',

    /* desktop dashboards get a corner toast instead of a top banner */
    '.kpush.corner{left:auto;right:16px;top:16px;width:352px;border-radius:14px;',
    '  transform:translateX(120%);}',
    '.kpush.corner.in{transform:translateX(0);}',
  ].join('');
  document.head.appendChild(css);

  /* ---------------- plumbing ---------------- */

  var frame = document.querySelector('.phone') || document.querySelector('.browser') || document.body;
  var corner = !document.querySelector('.phone');
  // body isn't positioned by default, and the banner is absolute
  if (frame === document.body && getComputedStyle(frame).position === 'static') {
    frame.style.position = 'relative';
  }

  var idx = 0, live = null, timer = null;

  function editing() { return document.body.classList.contains('editing'); }

  function clock() {
    // Match whatever the mock's status bar claims the time is, so the
    // banner doesn't argue with the clock two centimetres above it.
    var sb = document.querySelector('.statusbar span, .statusbar');
    var t = sb && sb.textContent ? sb.textContent.trim().split(/\s+/)[0] : '';
    return /^\d{1,2}:\d{2}$/.test(t) ? 'now' : 'now';
  }

  function dismiss() {
    if (!live) return;
    var el = live; live = null;
    el.classList.remove('in');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 460);
  }

  function show(item) {
    dismiss();
    var el = document.createElement('div');
    el.className = 'kpush' + (corner ? ' corner' : '');
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="ki" style="background:' + feed.icon[0] + '">' + iconHTML() + '</span>' +
      '<span class="kb"><span class="kh"><span class="ka">' + esc(feed.app) + '</span>' +
      '<span class="kw">' + clock() + '</span></span>' +
      '<div class="kt">' + esc(fill(item.t)) + '</div>' +
      (item.t2 ? '<div class="kt2">' + esc(fill(item.t2)) + '</div>' : '') +
      '<div class="kd">' + esc(fill(item.b)) + '</div></span>';
    el.addEventListener('click', dismiss);
    // Sit under the mock status bar when there is one. phone.css hides it
    // on a real phone (the device draws its own), in which case the
    // default inset is already right.
    if (!corner) {
      var sb = frame.querySelector('.statusbar');
      var h = sb && sb.getClientRects().length ? sb.getBoundingClientRect().height : 0;
      if (h) el.style.top = Math.round(h + 4) + 'px';
    }
    frame.appendChild(el);
    live = el;
    // One frame to let the start transform apply, then reveal. The timer
    // is a fallback: rAF is throttled to nothing while the window isn't
    // painting, and without it the banner would stay parked off-screen
    // and never come back.
    var revealed = false;
    function reveal() { if (!revealed) { revealed = true; el.classList.add('in'); } }
    requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    setTimeout(reveal, 60);
    setTimeout(function () { if (live === el) dismiss(); }, LINGER);
  }

  /* The dashboard's own icon — the one its home-screen tile uses. Falls
     back to the coloured glyph if the file isn't there. */
  function iconHTML() {
    var src = (location.pathname.indexOf('/dashboards/') !== -1 ? '../../' : './') +
              'assets/icons/' + slug + '-180.png';
    return '<img src="' + src + '" alt="" ' +
           'onerror="this.parentNode.textContent=' + JSON.stringify(feed.icon[1]) + '">';
  }

  /* {store} and friends resolve against the live page, so a notification
     follows whatever the dashboard has been edited to say. */
  function fill(t) {
    return String(t).replace(/\{(\w+)\}/g, function (m, k) {
      var sel = feed.vars && feed.vars[k];
      var el = sel && document.querySelector(sel);
      return el ? el.textContent.trim() : m;
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function tick() {
    // Not while editing, and not into a tab nobody is looking at.
    if (!editing() && document.visibilityState === 'visible') {
      show(feed.items[idx % feed.items.length]);
      idx++;
    }
    timer = setTimeout(tick, GAP);
  }

  function start() { clearTimeout(timer); timer = setTimeout(tick, FIRST); }
  function stop() { clearTimeout(timer); timer = null; dismiss(); }

  /* The panel in krypt-app.js talks to this. Its presence is also how
     the panel knows whether to offer the row at all — dashboards with
     no feed never define it. */
  window.kryptPush = {
    app: feed.app,
    enabled: function () { return enabled; },
    setEnabled: function (on) {
      enabled = !!on;
      try { localStorage.setItem('krypt-push', enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
      if (enabled) {
        // Show one straight away, so switching it on visibly does something.
        show(feed.items[idx++ % feed.items.length]);
        start();
      } else {
        stop();
      }
      return enabled;
    },
    next: function () { show(feed.items[idx++ % feed.items.length]); },
    dismiss: dismiss,
    stop: stop,
  };

  if (enabled) start();
})();
