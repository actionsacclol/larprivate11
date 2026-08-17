/* ============================================================
   krypt-app.js — the controls layer on every screen.

   DESKTOP: a dim dot in the corner that expands into a pill
   (Gallery / Fullscreen / Install). The dashboard's own Edit and
   Reset buttons stay where they are, top of the page.

   PHONE: none of that. The Edit/Reset toolbar and the Collection
   link float on top of the mock and ruin it at phone size, so
   phone.css hides them and everything moves into one panel in the
   middle of the screen — opened by tapping three times anywhere.
   Nothing is visible until you ask for it.

   It also owns the home-screen identity: the icon and the name this
   screen gets when it's added to a phone's Home Screen. We ship a
   drawn, original mark for every dashboard, and from the panel you can
   replace it on your own device with any photo or a plain lettered
   tile. That choice lives in your browser's localStorage — it isn't
   uploaded, isn't shared, and isn't part of what we distribute.

   Keyboard: F toggles fullscreen, H hides the corner dot, Esc closes.

   Configured from its own <script> tag:
     data-root    path prefix back to the project root
     data-label   what this screen is called
     data-gallery present on the gallery page itself
     data-framed  running inside custom/view.html's sandboxed iframe,
                  so navigation and the home-screen rows go to the
                  parent — see "framed mode" below
   ============================================================ */

(function () {
  'use strict';

  var S = document.currentScript;
  var ROOT = (S && S.getAttribute('data-root')) || '../../';
  var LABEL = (S && S.getAttribute('data-label')) || 'this';
  /* custom/view.html only learns which dashboard it is opening after a
     round trip to the store, which is later than this script's load, so
     it sets window.kryptLabel and we read it every time. */
  function screenLabel() { return window.kryptLabel || LABEL; }
  var IS_GALLERY = !!(S && S.hasAttribute('data-gallery'));

  /* ---------------- framed mode ----------------

     A dashboard someone imported runs inside the viewer's sandboxed
     iframe (custom/view.html). This script goes in there with it, so
     the triple-tap panel, Edit, Reset and Currency all work on an
     imported dashboard exactly as they do on a built-in one — same
     gestures, same rows, no second control to learn.

     Three things it cannot do from in there, and hands to the parent:

       navigating   a sandbox without allow-top-navigation cannot move
                    the window, and navigating *itself* to the gallery
                    would leave the gallery inside a 390px frame
       fullscreen   the request has to come from the framing document
       home screen  the icon and manifest tags that matter live on the
                    parent page; the ones in here address nothing

     Everything else stays local, because it is genuinely local: the
     dashboard's own DOM is right here. */
  var FRAMED = !!(S && S.hasAttribute('data-framed'));

  /* The mirror image: loaded by custom/view.html on the *outside* of
     the frame, purely so the two rows the frame delegates have somewhere
     real to land. It mounts no control and listens for no gesture — the
     copy inside the frame owns all of that — it just exposes the install
     sheet and the icon picker, which act on this page's tags because
     this page is the one with the URL. */
  var HEADLESS = !!(S && S.hasAttribute('data-headless'));

  function toParent(msg) {
    try { parent.postMessage(msg, '*'); } catch (e) { /* not framed after all */ }
  }

  /** Go somewhere, from whichever side of the frame can actually do it. */
  function go(url) {
    if (FRAMED) toParent({ __kryptNav: url });
    else location.href = url;
  }

  /** Hand a panel face to the parent when it owns the thing it edits. */
  function delegate(what) {
    toParent({ __kryptPanel: what });
  }

  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  // On iOS every browser is WebKit, but only real Safari can add to the
  // Home Screen — Chrome/Firefox/Edge for iOS cannot.
  var isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
                   window.matchMedia('(display-mode: fullscreen)').matches ||
                   navigator.standalone === true;

  var canFullscreen = FRAMED ||
    !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  var phoneMQ = window.matchMedia('(max-width: 560px)');
  function isPhone() { return phoneMQ.matches; }

  /* The dashboards all drive editing off body.editing and expose the
     same two button ids, so the panel can just forward to them. */
  function pageEditing() { return document.body.classList.contains('editing'); }
  function pageBtn(id) { return document.getElementById(id); }

  /* ---------------- styles ---------------- */

  var css = document.createElement('style');
  css.textContent = [
    '.krypt-ui{position:fixed;left:max(12px,env(safe-area-inset-left));',
    '  bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;',
    '  font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  display:flex;align-items:center;gap:6px;',
    '  -webkit-tap-highlight-color:transparent;}',
    '.krypt-ui *{box-sizing:border-box;}',

    '.krypt-dot{width:30px;height:30px;border-radius:999px;border:1px solid rgba(255,255,255,.16);',
    '  background:rgba(18,18,22,.6);-webkit-backdrop-filter:blur(14px) saturate(180%);',
    '  backdrop-filter:blur(14px) saturate(180%);color:#fff;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;gap:2.5px;padding:0;',
    '  opacity:.34;transition:opacity .2s ease,transform .2s ease;}',
    '.krypt-dot i{width:3px;height:3px;border-radius:50%;background:currentColor;display:block;}',
    '.krypt-ui:hover .krypt-dot,.krypt-ui.open .krypt-dot{opacity:.95;}',
    '.krypt-ui.open .krypt-dot{transform:rotate(90deg);}',
    /* On the desktop dashboards this control is the only way to reach Edit,
       so it sits brighter than the version that is merely a shortcut. */
    '.krypt-ui.krypt-holds-edit .krypt-dot{opacity:.72;border-color:rgba(255,255,255,.28);',
    '  background:rgba(28,28,34,.82);}',

    '.krypt-pill{display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;',
    '  border:1px solid rgba(255,255,255,.14);background:rgba(18,18,22,.72);',
    '  -webkit-backdrop-filter:blur(16px) saturate(180%);',
    '  backdrop-filter:blur(16px) saturate(180%);',
    '  box-shadow:0 8px 26px rgba(0,0,0,.45);',
    '  opacity:0;transform:translateX(-8px) scale(.94);transform-origin:left center;',
    '  pointer-events:none;transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-ui.open .krypt-pill{opacity:1;transform:none;pointer-events:auto;}',

    '.krypt-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border:0;',
    '  border-radius:999px;background:transparent;color:#fff;cursor:pointer;',
    '  font:inherit;white-space:nowrap;text-decoration:none;}',
    '.krypt-btn:hover{background:rgba(255,255,255,.12);}',
    '.krypt-btn:active{background:rgba(255,255,255,.2);}',
    '.krypt-btn svg{flex:none;}',
    /* the adopted Edit/Reset icons are drawn at panel size — bring them
       down to match the rest of the pill */
    '.krypt-pill .krypt-btn svg{width:14px;height:14px;}',
    '.krypt-pill .krypt-btn.on{color:#FFD400;}',

    /* the corner control is desktop-only — on a phone the panel replaces it */
    '@media (max-width:560px){.krypt-ui{display:none !important;}}',

    /* ---- shared overlay ---- */
    '.krypt-sheet{position:fixed;inset:0;z-index:2147483001;display:none;',
    '  align-items:center;justify-content:center;padding:24px;',
    '  background:rgba(0,0,0,.62);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);',
    '  -webkit-tap-highlight-color:transparent;}',
    '.krypt-sheet.open{display:flex;animation:kryptFade .18s ease;}',
    '@keyframes kryptFade{from{opacity:0}to{opacity:1}}',
    '@keyframes kryptRise{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}',

    '.krypt-sheet-card{width:100%;max-width:360px;background:#17171C;color:#ECECF1;',
    '  border:1px solid #2C2C35;border-radius:20px;padding:24px 22px 18px;text-align:left;',
    '  font:400 14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  box-shadow:0 30px 70px rgba(0,0,0,.6);animation:kryptRise .22s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-sheet-card h3{margin:0 0 10px;font-size:17px;font-weight:700;letter-spacing:-.01em;}',
    '.krypt-sheet-card p{margin:0 0 10px;color:#A9A9B8;}',
    '.krypt-sheet-card ol{margin:0 0 4px;padding-left:20px;color:#C9C9D6;}',
    '.krypt-sheet-card li{margin-bottom:7px;}',
    '.krypt-sheet-card b{color:#fff;font-weight:650;}',
    '.krypt-sheet-close{display:block;width:100%;margin-top:14px;padding:11px;border:0;',
    '  border-radius:12px;background:#2A2A34;color:#fff;font:600 14px/1 inherit;cursor:pointer;}',
    '.krypt-sheet-close:hover{background:#343440;}',

    /* ---- the phone panel ---- */
    /* The icon face is the tallest of the three, and on a short phone
       in landscape it outgrows the screen — so the card scrolls. */
    '.krypt-panel{width:100%;max-width:300px;background:#17171C;color:#ECECF1;',
    '  border:1px solid #2C2C35;border-radius:22px;overflow:hidden auto;',
    '  max-height:calc(100vh - 48px);',
    '  font:400 15px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  box-shadow:0 30px 80px rgba(0,0,0,.65);animation:kryptRise .22s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-panel .ph{padding:18px 20px 14px;text-align:center;border-bottom:1px solid #26262F;}',
    '.krypt-panel .ph .t{font-size:16px;font-weight:700;letter-spacing:-.01em;}',
    '.krypt-panel .ph .s{font-size:12px;color:#8A8A98;margin-top:3px;}',
    '.krypt-panel .row{display:flex;align-items:center;gap:12px;width:100%;padding:15px 20px;',
    '  border:0;border-bottom:1px solid #23232B;background:transparent;color:#ECECF1;',
    '  font:inherit;text-align:left;cursor:pointer;text-decoration:none;',
    '  -webkit-tap-highlight-color:transparent;}',
    '.krypt-panel .row:active{background:#22222B;}',
    '.krypt-panel .row svg{flex:none;opacity:.85;}',
    '.krypt-panel .row .lbl{flex:1;min-width:0;}',
    '.krypt-panel .row .kval{margin-left:auto;color:#8A8A98;font-weight:600;flex:none;}',
    '.krypt-panel .row.sel .kval{color:#FFD400;}',
    '.krypt-panel .klist .row{background:transparent;color:#ECECF1;}',
    '.krypt-panel .klist{max-height:288px;overflow-y:auto;scrollbar-width:none;}',
    '.krypt-panel .klist::-webkit-scrollbar{display:none;}',
    '.krypt-panel .row.on{color:#FFD400;}',
    '.krypt-panel .row.danger{color:#FF6B6B;}',
    '.krypt-panel .row.done{border-bottom:0;color:#8A8A98;justify-content:center;font-weight:600;}',

    /* ---- icon picker ---- */
    '.krypt-icon-pad{padding:16px 20px 6px;border-bottom:1px solid #23232B;}',
    '.krypt-icon-prev{display:flex;align-items:center;gap:13px;margin-bottom:14px;}',
    '.krypt-icon-prev img{width:56px;height:56px;border-radius:13px;flex:none;',
    '  object-fit:cover;background:#26262F;}',
    '.krypt-icon-prev .kn{flex:1;min-width:0;}',
    '.krypt-icon-prev input{width:100%;padding:9px 11px;border-radius:9px;',
    '  border:1px solid #35353F;background:#101015;color:#ECECF1;',
    '  font:600 14px/1 inherit;-webkit-appearance:none;}',
    '.krypt-icon-prev input:focus{outline:0;border-color:#5A5A6A;}',
    '.krypt-sw{display:grid;grid-template-columns:repeat(8,1fr);gap:7px;}',
    '.krypt-sw button{aspect-ratio:1;border-radius:8px;border:2px solid transparent;',
    '  padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
    '.krypt-sw button.sel{border-color:#fff;}',

    /* ---- editing indicator (the page\'s own Edit button is hidden here) ---- */
    '.krypt-editing{position:fixed;left:50%;transform:translateX(-50%);',
    '  bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147482999;',
    '  display:none;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;',
    '  background:rgba(255,212,0,.94);color:#3A2E00;pointer-events:none;',
    '  font:700 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  letter-spacing:.6px;box-shadow:0 6px 20px rgba(0,0,0,.4);}',
    '@media (max-width:560px){body.editing .krypt-editing{display:flex;}}',

    /* ---- the demo mark ----

       Small, bottom-right, above everything, and on by default. Its
       whole job is to survive into a screenshot, so it is legible
       rather than tasteful: a faint watermark that vanishes at JPEG
       quality 60 would be decoration, not a label.

       pointer-events:none so it never eats a tap, and it is not a
       [data-edit] node — edit mode must not be able to blank it by
       accident. Turning it off is a separate, labelled decision in the
       panel. */
    '.krypt-mark{position:fixed;z-index:2147482990;pointer-events:none;',
    '  right:max(8px,env(safe-area-inset-right));',
    '  bottom:max(8px,env(safe-area-inset-bottom));',
    '  display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:7px;',
    '  background:rgba(10,10,14,.72);color:#fff;',
    '  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    '  border:1px solid rgba(255,255,255,.16);',
    '  font:700 9.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  letter-spacing:.7px;text-transform:uppercase;white-space:nowrap;',
    '  text-shadow:0 1px 2px rgba(0,0,0,.6);}',
    '.krypt-mark i{width:5px;height:5px;border-radius:50%;background:#FFD400;',
    '  display:block;flex:none;}',
    /* A light dashboard needs the inverse or the chip disappears. */
    /* Nested in the mock's own frame: absolute, and clear of whatever
       bottom bar the dashboard has. z-index stays under the panel. */
    '.krypt-mark.krypt-mark-in{position:absolute;right:8px;bottom:8px;z-index:60;}',
    '.krypt-mark.on-light{background:rgba(255,255,255,.82);color:#14141a;',
    '  border-color:rgba(0,0,0,.16);text-shadow:none;}',
    '.krypt-mark.on-light i{background:#B8860B;}',

    /* ---- one-time discovery hint ---- */
    '.krypt-hint{position:fixed;left:50%;transform:translateX(-50%);',
    '  bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147482998;',
    '  padding:9px 16px;border-radius:999px;background:rgba(18,18,22,.86);color:#fff;',
    '  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);',
    '  border:1px solid rgba(255,255,255,.14);pointer-events:none;',
    '  font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  opacity:0;transition:opacity .4s ease;}',
    '.krypt-hint.show{opacity:1;}',

    /* ---- first-run coach ----
       Sits above the corner pill on a desktop and points down at it;
       on a phone the pill does not exist, so the arrow goes and the
       card centres itself clear of whatever tab bar is down there. */
    '.krypt-coach{position:fixed;z-index:2147482995;max-width:288px;',
    '  left:max(12px,env(safe-area-inset-left));',
    '  bottom:calc(54px + max(12px,env(safe-area-inset-bottom)));',
    '  background:rgba(20,20,26,.95);color:#fff;border-radius:14px;',
    '  border:1px solid rgba(255,255,255,.16);padding:14px 15px 12px;',
    '  -webkit-backdrop-filter:blur(16px) saturate(180%);',
    '  backdrop-filter:blur(16px) saturate(180%);',
    '  box-shadow:0 18px 44px rgba(0,0,0,.55);',
    '  font:500 12.5px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  opacity:0;transform:translateY(8px);',
    '  transition:opacity .3s ease,transform .3s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-coach.show{opacity:1;transform:none;}',
    '.krypt-coach b{display:block;font-size:13.5px;font-weight:700;margin-bottom:5px;}',
    '.krypt-coach p{margin:0;color:rgba(255,255,255,.74);}',
    '.krypt-coach em{font-style:normal;color:#FFD400;font-weight:700;}',
    '.krypt-coach button{margin-top:11px;width:100%;border:0;border-radius:9px;',
    '  cursor:pointer;background:rgba(255,255,255,.14);color:#fff;padding:8px 12px;',
    '  font:700 12px/1 inherit;-webkit-tap-highlight-color:transparent;}',
    '.krypt-coach button:hover{background:rgba(255,255,255,.22);}',
    '.krypt-coach::after{content:"";position:absolute;left:17px;bottom:-7px;',
    '  width:12px;height:12px;background:rgba(20,20,26,.95);',
    '  border-right:1px solid rgba(255,255,255,.16);',
    '  border-bottom:1px solid rgba(255,255,255,.16);transform:rotate(45deg);}',
    '@media (max-width:560px){',
    '  .krypt-coach{left:12px;right:12px;max-width:none;',
    '    bottom:calc(86px + env(safe-area-inset-bottom));}',
    '  .krypt-coach::after{display:none;}}',
    '@media (prefers-reduced-motion:reduce){.krypt-coach{transition:none;}}',
  ].join('');
  document.head.appendChild(css);

  /* ---------------- icons ---------------- */

  function svg(d, size) {
    return '<svg width="' + (size || 14) + '" height="' + (size || 14) + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICON = {
    back:   svg('<path d="M15 18l-6-6 6-6"/>'),
    expand: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3' +
                'M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    shrink: svg('<path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3' +
                'M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3"/>'),
    add:    svg('<path d="M12 5v14M5 12h14"/>'),
    pencil: svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M14.5 5.5l4 4"/>', 17),
    check:  svg('<path d="M4 12.5l5 5L20 6.5"/>', 17),
    undo:   svg('<path d="M4 5v6h6"/><path d="M4.6 14a8 8 0 1 0 1.9-8.3L4 8"/>', 17),
    coin:   svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.4a2.7 2.7 0 0 0-5 1.1' +
                'c0 2.4 5 1.4 5 3.6a2.7 2.7 0 0 1-5 1.1M12 6.6v10.8"/>', 17),
    bell:   svg('<path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.6 1.5 5 1.8 5.5H4.7' +
                'c.3-.5 1.8-1.9 1.8-5.5zM10 18.5a2.2 2.2 0 0 0 4 0"/>', 17),
    grid:   svg('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/>' +
                '<rect x="13.5" y="3.5" width="7" height="7" rx="2"/>' +
                '<rect x="3.5" y="13.5" width="7" height="7" rx="2"/>' +
                '<rect x="13.5" y="13.5" width="7" height="7" rx="2"/>', 17),
    full:   svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3' +
                'M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>', 17),
    down:   svg('<path d="M12 4v11m0 0l-4-4m4 4l4-4"/><path d="M5 19h14"/>', 17),
    image:  svg('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/>' +
                '<circle cx="9" cy="10" r="1.6"/><path d="M4 17l4.5-4.5 3.5 3 3-2.5 5 4"/>', 17),
    // A card with a plus — "one of these, but yours". Deliberately not the
    // pencil: that one already means Edit two rows up.
    mine:   svg('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/>' +
                '<path d="M12 9.6v5.2M9.4 12.2h5.2"/>', 17),
    mark:   svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/>' +
                '<rect x="12.5" y="13" width="5.5" height="3" rx="1.2" ' +
                'fill="currentColor" stroke="none"/>', 17),
  };

  /* ---------------- desktop corner control ---------------- */

  var ui = document.createElement('div');
  ui.className = 'krypt-ui';

  var dot = document.createElement('button');
  dot.className = 'krypt-dot';
  dot.type = 'button';
  dot.setAttribute('aria-label', 'Krypt LARP controls');
  dot.innerHTML = '<i></i><i></i><i></i>';

  var pill = document.createElement('div');
  pill.className = 'krypt-pill';

  if (!IS_GALLERY) {
    var back = document.createElement('a');
    back.className = 'krypt-btn';
    back.href = ROOT + 'index.html';
    back.innerHTML = ICON.back + 'Gallery';
    back.addEventListener('click', function (e) { e.preventDefault(); go(back.href); });
    pill.appendChild(back);
  }

  /* The phone panel has this too, but the panel is phone-only — on a
     desktop the pill is the only control there is, and "I'd like one of
     these" tends to occur to people while they're looking at one. */
  var mineBtn = document.createElement('a');
  mineBtn.className = 'krypt-btn';
  mineBtn.href = ROOT + 'custom/index.html';
  mineBtn.title = 'Dashboards you made yourself';
  mineBtn.innerHTML = ICON.mine + 'Yours';
  mineBtn.addEventListener('click', function (e) { e.preventDefault(); go(mineBtn.href); });
  pill.appendChild(mineBtn);

  var fsBtn = null;
  if (canFullscreen) {
    fsBtn = document.createElement('button');
    fsBtn.className = 'krypt-btn';
    fsBtn.type = 'button';
    fsBtn.innerHTML = ICON.expand + '<span>Fullscreen</span>';
    fsBtn.addEventListener('click', toggleFullscreen);
    pill.appendChild(fsBtn);
  }

  if (!standalone) {
    var addBtn = document.createElement('button');
    addBtn.className = 'krypt-btn';
    addBtn.type = 'button';
    addBtn.innerHTML = ICON.add + 'Install';
    addBtn.addEventListener('click', function () { openSheet(); });
    pill.appendChild(addBtn);
  }

  /* On the desktop dashboards, desktop.css hides the page's own
     Edit/Reset toolbar — full-bleed leaves no margin for it to sit in.
     When that has happened, adopt the two buttons into the pill so the
     controls don't just vanish. Measured rather than assumed: an element
     hidden with display:none reports no client rects, while a visible
     position:fixed toolbar reports one. */
  function pageControlsHidden() {
    var b = pageBtn('editBtn');
    return !!b && b.getClientRects().length === 0;
  }

  var editBtn = null;

  function syncEditBtn() {
    if (!editBtn) return;
    var on = pageEditing();
    editBtn.innerHTML = (on ? ICON.check : ICON.pencil) +
      '<span>' + (on ? 'Done' : 'Edit') + '</span>';
    editBtn.classList.toggle('on', on);
  }

  function adoptPageControls() {
    if (editBtn || !pageControlsHidden()) return;

    editBtn = document.createElement('button');
    editBtn.className = 'krypt-btn';
    editBtn.type = 'button';
    editBtn.addEventListener('click', function () {
      pageBtn('editBtn').click();
      syncEditBtn();
    });
    pill.insertBefore(editBtn, pill.firstChild);
    syncEditBtn();

    if (pageBtn('resetBtn')) {
      var r = document.createElement('button');
      r.className = 'krypt-btn';
      r.type = 'button';
      r.innerHTML = ICON.undo + '<span>Reset</span>';
      r.addEventListener('click', function () {
        pageBtn('resetBtn').click();
        syncEditBtn();
      });
      pill.insertBefore(r, editBtn.nextSibling);
    }

    // Editing is now *only* reachable through this control, so make it
    // findable: brighter at rest, a tooltip, and it introduces itself once.
    ui.classList.add('krypt-holds-edit');
    dot.title = 'Edit values, reset, gallery, fullscreen';
    var seen;
    try { seen = localStorage.getItem('krypt-pill-hint'); } catch (e) { seen = '1'; }
    if (!seen) {
      try { localStorage.setItem('krypt-pill-hint', '1'); } catch (e) { /* private mode */ }
      setTimeout(function () { open(); }, 600);
    }
  }

  ui.appendChild(dot);
  ui.appendChild(pill);

  var closeTimer = null;
  function open() {
    ui.classList.add('open');
    // Found it. The coach has nothing left to say.
    dismissCoach();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 6000);
  }
  function close() { ui.classList.remove('open'); clearTimeout(closeTimer); }

  dot.addEventListener('click', function (e) {
    e.stopPropagation();
    if (ui.classList.contains('open')) close(); else open();
  });
  pill.addEventListener('click', open);
  document.addEventListener('click', function (e) {
    if (!ui.contains(e.target)) close();
  });

  /* ---------------- fullscreen ---------------- */

  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function toggleFullscreen() {
    if (FRAMED) return delegate('fullscreen');
    var el = document.documentElement;
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        var p = req.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(function () { /* gesture lost, ignore */ });
      }
    }
  }

  function syncFullscreenBtn() {
    if (!fsBtn) return;
    var on = !!fsElement();
    fsBtn.innerHTML = (on ? ICON.shrink : ICON.expand) +
      '<span>' + (on ? 'Exit fullscreen' : 'Fullscreen') + '</span>';
  }
  document.addEventListener('fullscreenchange', syncFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', syncFullscreenBtn);


  /* ---------------- currency ----------------
     Swaps the symbol on every money figure in the page. Symbol only —
     no conversion, because there are no rates offline and a made-up
     one would be worse than none. Amounts stay as authored, so
     switching back and forth is lossless.

     The dashboards re-render themselves constantly (edit, tab switch,
     chart redraw) and their data holds "$" literals, so a one-shot
     pass would be undone within seconds. An observer re-applies after
     each render instead.

     Nothing runs while the page is in edit mode: rewriting text nodes
     under a live contenteditable would fight the caret. */
  var MONEY = [
    { c: 'USD', s: '$' },   { c: 'EUR', s: '\u20AC' }, { c: 'GBP', s: '\u00A3' },
    { c: 'JPY', s: '\u00A5' }, { c: 'CNY', s: 'CN\u00A5' }, { c: 'INR', s: '\u20B9' },
    { c: 'CAD', s: 'C$' },  { c: 'AUD', s: 'A$' },  { c: 'HKD', s: 'HK$' },
    { c: 'BRL', s: 'R$' },
  ];
  /* Longest symbols first, or "C$" would match as a bare "$". Only
     counts as money when a digit follows, which leaves standalone $
     marks alone — the Quill logo, the Onyx Cash keypad button. */
  var MONEY_RE = /(CN\u00A5|HK\$|C\$|A\$|R\$|\$|\u20AC|\u00A3|\u00A5|\u20B9)(?=\s?\d)/g;
  var SYM_RE  = /(CN\u00A5|HK\$|C\$|A\$|R\$|\$|\u20AC|\u00A3|\u00A5|\u20B9)/;
  /* a text node holding nothing but a currency mark */
  var LONE_RE = /^\s*(CN\u00A5|HK\$|C\$|A\$|R\$|\$|\u20AC|\u00A3|\u00A5|\u20B9)\s*$/;

  var curCode = 'USD';
  try { curCode = localStorage.getItem('krypt-currency') || 'USD'; } catch (e) { /* ignore */ }

  function curSymbol(code) {
    for (var i = 0; i < MONEY.length; i++) if (MONEY[i].c === code) return MONEY[i].s;
    return '$';
  }

  var applying = false, curTimer = null, curObserver = null;

  function applyCurrency() {
    if (applying || pageEditing()) return;
    var sym = curSymbol(curCode);
    applying = true;
    try {
      var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || p.nodeType !== 1) return NodeFilter.FILTER_REJECT;
          var tag = p.nodeName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
          if (p.closest && p.closest('.krypt-sheet,.krypt-ui')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      var n, hits = [];
      while ((n = walk.nextNode())) hits.push(n);
      for (var i = 0; i < hits.length; i++) {
        var v = hits[i].nodeValue;
        // Usual case: the symbol and its digits share a text node.
        var out = v.replace(MONEY_RE, sym);
        if (out !== v) { hits[i].nodeValue = out; continue; }
        // The other shape these dashboards use a lot:
        //   <div class="big">$<span data-count=...>12,480.55</span></div>
        // The mark sits alone in its node and the digits are in the
        // next one. Only convert when that next text really does start
        // with a number, which leaves standalone marks alone — the Cash
        // App logo, the Onyx Cash keypad button.
        if (LONE_RE.test(v) && i + 1 < hits.length &&
            /^\s*[\d.]/.test(hits[i + 1].nodeValue)) {
          hits[i].nodeValue = v.replace(SYM_RE, sym);
        }
      }
    } catch (e) { /* never let this break a dashboard */ }
    applying = false;
  }

  function scheduleCurrency() {
    if (curCode === 'USD' && !window.__kryptCurTouched) return;
    clearTimeout(curTimer);
    curTimer = setTimeout(applyCurrency, 60);
  }

  function watchCurrency() {
    if (curObserver || !document.body) return;
    curObserver = new MutationObserver(function () { if (!applying) scheduleCurrency(); });
    curObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function setCurrency(code) {
    curCode = code;
    window.__kryptCurTouched = true;
    try { localStorage.setItem('krypt-currency', code); } catch (e) { /* ignore */ }
    applyCurrency();
    watchCurrency();
  }

  if (curCode !== 'USD') {
    window.__kryptCurTouched = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { applyCurrency(); watchCurrency(); });
    } else { applyCurrency(); watchCurrency(); }
  }

  /* ---------------- the demo mark ----------------

     Every screen ships marked. A screenshot of a dashboard leaves this
     app and lands somewhere with no context at all — a chat, a listing,
     a group thread — and at that point the only thing saying it isn't a
     real balance is whatever is inside the image.

     It can be turned off, because a design study you are showing a
     client does not need it and we are not going to pretend otherwise.
     But it is off by *decision*: the row lives in the panel, says what
     it does in plain words, and asks once. It is deliberately not a
     [data-edit] field — if removing it were the same gesture as editing
     a balance, it would be part of the workflow rather than a choice.

     The setting is per device, not per dashboard: nobody wants to turn
     it off thirty-one times.  */

  var MARK_KEY = 'krypt-mark';
  var markEl = null;

  function markOn() {
    try { return localStorage.getItem(MARK_KEY) !== 'off'; } catch (e) { return true; }
  }

  function setMark(on) {
    try { localStorage.setItem(MARK_KEY, on ? 'on' : 'off'); } catch (e) { /* private mode */ }
    renderMark();
  }

  /* Pick the chip's colour off whatever it is sitting on, so it stays
     readable on the light dashboards as well as the dark ones. */
  function pageIsLight() {
    try {
      var host = markHost();
      var bg = getComputedStyle(host || document.body).backgroundColor || '';
      var m = bg.match(/\d+/g);
      if (!m || m.length < 3) return false;
      // Rec. 601 luma is plenty for a yes/no on a background colour.
      return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 150;
    } catch (e) { return false; }
  }

  /* Where the mark has to live to be worth having.

     On a phone the mock fills the screen, so a corner of the viewport
     is a corner of the mock and fixed positioning is enough. On a
     desktop the mock is a 390px phone floating on a dark page — and the
     screenshot anyone actually takes is of the phone, cropped. A mark
     out on the page background would be cropped away with it.

     So it goes *inside* the mock's own frame when there is one and that
     frame is positioned (most are). Where it isn't, nesting an absolute
     child would anchor it to some unrelated ancestor, which is worse
     than the viewport — so those fall back to fixed. */
  function markHost() {
    var el = document.querySelector('.phone, .browser');
    if (!el) return null;
    try {
      return getComputedStyle(el).position !== 'static' ? el : null;
    } catch (e) { return null; }
  }

  /* Nearly every one of these mocks ends in a full-width tab bar, and a
     chip dropped at bottom:8px lands on top of it. Rather than guess a
     clearance that works for some and not others, measure: anything
     sitting flush with the bottom of the frame, most of the way across
     it, and bar-shaped, is a bar. Sit above whatever that turns out to
     be. Geometry, so it works whether the bar is the last flex child or
     absolutely positioned. */
  function bottomClearance(host) {
    var hb = host.getBoundingClientRect();
    var lift = 0;
    var kids = host.querySelectorAll('*');
    for (var i = 0; i < kids.length; i++) {
      var r = kids[i].getBoundingClientRect();
      if (r.height < 34 || r.height > 130) continue;       // not bar-shaped
      if (r.width < hb.width * 0.6) continue;              // not wide enough
      // At the bottom, or near it: several of these bars float a dozen
      // pixels clear of the edge to leave room for a home indicator.
      if (hb.bottom - r.bottom > 26 || r.bottom - hb.bottom > 3) continue;
      // How far up the chip has to go to clear it — the bar's own height
      // is not enough when the bar is inset.
      lift = Math.max(lift, hb.bottom - r.top);
    }
    return lift;
  }

  function renderMark() {
    if (!markOn()) {
      if (markEl) { markEl.remove(); markEl = null; }
      return;
    }
    if (!markEl) {
      markEl = document.createElement('div');
      markEl.setAttribute('aria-hidden', 'true');
      markEl.innerHTML = '<i></i>LARP · not a real app';
    }
    var host = markHost();
    markEl.className = 'krypt-mark' + (host ? ' krypt-mark-in' : '');
    (host || document.body).appendChild(markEl);
    markEl.style.bottom = host ? (bottomClearance(host) + 8) + 'px' : '';
    markEl.classList.toggle('on-light', pageIsLight());
  }

  /* ---------------- home-screen icon + name ----------------

     Every dashboard ships with a drawn mark of its own. This lets you
     put something else on your own Home Screen — a photo out of your
     camera roll, or a plain lettered tile — without any of it leaving
     the device. It is stored per screen, so each dashboard can look
     like whatever you want it to.

     Both halves of the identity have to be set *before* you tap Add to
     Home Screen, because that's the moment the phone reads them:
       iOS      <link rel="apple-touch-icon"> and the
                apple-mobile-web-app-title meta
       Android  the web manifest, which we rebuild as a blob

     So this runs at load, not when the panel is opened. */

  var ICON_KEY = 'krypt-icon:' + location.pathname + location.search;
  var custom = null;
  try { custom = JSON.parse(localStorage.getItem(ICON_KEY) || 'null'); } catch (e) { custom = null; }

  /* Flat colours for the lettered tiles. Chosen to be legible with
     white on top and distinct from each other at icon size. */
  var SWATCHES = ['#1FBB78', '#1892C8', '#4D6BE0', '#7A45D8', '#A9469E',
                  '#E24C6E', '#E8762A', '#2A2F38'];

  function squareCanvas(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  /* A solid tile with one big letter. PNG — it's flat colour, so it
     compresses to almost nothing. */
  function tileFromColour(bg, ch, size) {
    var c = squareCanvas(size), x = c.getContext('2d');
    x.fillStyle = bg;
    x.fillRect(0, 0, size, size);
    x.fillStyle = '#FFFFFF';
    x.font = '700 ' + Math.round(size * 0.5) + 'px -apple-system,BlinkMacSystemFont,' +
      '"Segoe UI",Roboto,sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText((ch || '?').charAt(0).toUpperCase(), size / 2, size / 2 + size * 0.04);
    return c.toDataURL('image/png');
  }

  /* A photo, centre-cropped to a square. JPEG, because a photo as PNG
     runs to hundreds of KB and localStorage gives us about 5MB for the
     whole collection. */
  function tileFromImage(img, size) {
    var c = squareCanvas(size), x = c.getContext('2d');
    var s = Math.min(img.naturalWidth, img.naturalHeight);
    x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s,
      0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.82);
  }

  function saveCustom(next) {
    custom = next;
    try {
      if (next) localStorage.setItem(ICON_KEY, JSON.stringify(next));
      else localStorage.removeItem(ICON_KEY);
    } catch (e) {
      // Quota, or private mode. The icon still applies for this visit.
      return false;
    }
    return true;
  }

  function homeName() {
    return (custom && custom.name) || screenLabel();
  }

  /* The manifest's start_url and scope are relative to the manifest's
     own address. A blob: URL has no directory to be relative to, so
     they have to be made absolute against the original first —
     otherwise the installed app opens at the wrong place, or Chrome
     rejects the manifest outright. */
  function swapManifest() {
    var link = document.querySelector('link[rel="manifest"]');
    if (!link || !custom || typeof fetch !== 'function') return;
    var src = link.getAttribute('data-krypt-src') || link.getAttribute('href');
    if (!src) return;
    link.setAttribute('data-krypt-src', src);
    var base = new URL(src, location.href);

    fetch(base.href).then(function (r) { return r.json(); }).then(function (m) {
      if (custom.name) { m.name = custom.name; m.short_name = custom.name; }
      if (custom.icon) {
        m.icons = [
          { src: custom.icon, sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: custom.icon512 || custom.icon, sizes: '512x512', type: 'image/png',
            purpose: 'any maskable' },
        ];
      }
      if (m.start_url) m.start_url = new URL(m.start_url, base).href;
      if (m.scope) m.scope = new URL(m.scope, base).href;
      link.href = URL.createObjectURL(
        new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
    }).catch(function () {
      /* Offline, or opened straight off the filesystem. The shipped
         manifest is still linked and still works — only the custom
         name and icon are missed, and only on Android. */
    });
  }

  /* Remember the shipped icon before anything overwrites it, so the
     preview and the reset have something to go back to. */
  function stampShipped() {
    var l = document.querySelector('link[rel="apple-touch-icon"]');
    if (l && !l.getAttribute('data-krypt-shipped')) {
      l.setAttribute('data-krypt-shipped', l.getAttribute('href') || '');
    }
  }

  function applyCustom() {
    stampShipped();
    if (!custom) return;
    if (custom.icon) {
      var links = document.querySelectorAll(
        'link[rel="apple-touch-icon"],link[rel="icon"][type="image/png"]');
      for (var i = 0; i < links.length; i++) links[i].href = custom.icon;
    }
    if (custom.name) {
      var t = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (t) t.setAttribute('content', custom.name);
      var a = document.querySelector('meta[name="application-name"]');
      if (a) a.setAttribute('content', custom.name);
    }
    swapManifest();
  }

  applyCustom();

  /* ---------------- the phone panel ---------------- */

  var panelWrap = null;

  function buildPanel() {
    panelWrap = document.createElement('div');
    panelWrap.className = 'krypt-sheet';

    var card = document.createElement('div');
    card.className = 'krypt-panel';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    panelWrap.appendChild(card);

    panelWrap.addEventListener('click', function (e) {
      if (e.target === panelWrap) closePanel();
    });
    document.body.appendChild(panelWrap);
  }

  function row(icon, label, cls, extra) {
    return '<button class="row ' + (cls || '') + '" type="button">' + icon +
      '<span class="lbl">' + label + '</span>' + (extra || '') + '</button>';
  }

  function openPanel() {
    if (!panelWrap) buildPanel();
    dismissCoach();
    var card = panelWrap.firstChild;
    var editing = pageEditing();
    var hasEdit = !!pageBtn('editBtn');
    var hasReset = !!pageBtn('resetBtn');

    var html = '<div class="ph"><div class="t">' +
      esc(IS_GALLERY ? 'Krypt LARP' : homeName()) +
      '</div><div class="s">' + (editing ? 'Editing — tap a value to change it'
                                         : 'Tap 3× anywhere to reopen this') + '</div></div>';

    if (hasEdit) {
      html += row(editing ? ICON.check : ICON.pencil,
        editing ? 'Done editing' : 'Edit values', editing ? 'on' : '');
    }
    if (hasReset) html += row(ICON.undo, 'Reset to defaults', 'danger');
    if (!IS_GALLERY) html += row(ICON.grid, 'Back to gallery');
    // Reachable from inside any dashboard, which is where people are
    // when it occurs to them that they'd like one of their own.
    html += row(ICON.mine, 'Your dashboards');
    if (canFullscreen) html += row(ICON.full, fsElement() ? 'Exit fullscreen' : 'Fullscreen');
    if (!standalone) html += row(ICON.down, 'Add to Home Screen');
    if (!standalone) {
      html += row(ICON.image, 'Home-screen icon', '',
        '<span class="kval">' + (custom ? 'Custom' : 'Default') + '</span>');
    }
    if (window.kryptPush) {
      html += row(ICON.bell, 'Notifications', '',
        '<span class="kval">' + (window.kryptPush.enabled() ? 'On' : 'Off') + '</span>');
    }
    html += row(ICON.coin, 'Currency', '', '<span class="kval">' + esc(curCode) + '</span>');
    html += row(ICON.mark, 'Demo watermark', '',
      '<span class="kval">' + (markOn() ? 'On' : 'Off') + '</span>');
    html += '<button class="row done" type="button">Close</button>';

    card.innerHTML = html;

    var rows = card.querySelectorAll('.row');
    var i = 0;
    if (hasEdit)  wire(rows[i++], function () { closePanel(); pageBtn('editBtn').click(); });
    if (hasReset) wire(rows[i++], function () { closePanel(); pageBtn('resetBtn').click(); });
    if (!IS_GALLERY) wire(rows[i++], function () { go(ROOT + 'index.html'); });
    wire(rows[i++], function () { go(ROOT + 'custom/index.html'); });
    if (canFullscreen) wire(rows[i++], function () { closePanel(); toggleFullscreen(); });
    if (!standalone) wire(rows[i++], function () { closePanel(); openSheet(); });
    if (!standalone) wire(rows[i++], openIconPicker);
    if (window.kryptPush) {
      wire(rows[i++], function () {
        var on = window.kryptPush.setEnabled(!window.kryptPush.enabled());
        // Turning it on fires one immediately, so get out of its way.
        if (on) closePanel(); else openPanel();
      });
    }
    wire(rows[i++], openCurrencyPicker);
    wire(rows[i++], openMarkFace);
    wire(rows[i], closePanel);

    panelWrap.classList.add('open');
  }


  /* Third face of the card: what this screen looks like on the Home
     Screen. Name on top next to a live preview, then the swatches,
     then a photo picker. Nothing is committed until Save. */
  function openIconPicker() {
    if (FRAMED) { closePanel(); return delegate('icon'); }
    if (!panelWrap) buildPanel();
    var card = panelWrap.firstChild;

    var draft = {
      name: homeName(),
      icon: (custom && custom.icon) || null,
      icon512: (custom && custom.icon512) || null,
      colour: (custom && custom.colour) || null,
    };
    var shipped = defaultIconHref();

    card.innerHTML =
      '<div class="ph"><div class="t">Home-screen icon</div>' +
      '<div class="s">Only on this device — nothing is uploaded</div></div>' +
      '<div class="krypt-icon-pad">' +
        '<div class="krypt-icon-prev">' +
          '<img alt="" id="kIconPrev">' +
          '<span class="kn"><input id="kIconName" type="text" maxlength="24" ' +
            'autocomplete="off" autocapitalize="words" spellcheck="false"></span>' +
        '</div>' +
        '<div class="krypt-sw" id="kIconSw"></div>' +
      '</div>' +
      row(ICON.image, 'Choose a photo…') +
      row(ICON.undo, 'Use the built-in icon', 'danger') +
      '<button class="row done" type="button">Save</button>';

    var prev = card.querySelector('#kIconPrev');
    var nameEl = card.querySelector('#kIconName');
    var swWrap = card.querySelector('#kIconSw');
    nameEl.value = draft.name;
    prev.src = draft.icon || shipped;

    SWATCHES.forEach(function (hex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.style.background = hex;
      b.setAttribute('aria-label', 'Plain tile, ' + hex);
      if (draft.colour === hex) b.className = 'sel';
      b.addEventListener('click', function () {
        draft.colour = hex;
        draft.icon = tileFromColour(hex, nameEl.value || screenLabel(), 180);
        draft.icon512 = tileFromColour(hex, nameEl.value || screenLabel(), 512);
        prev.src = draft.icon;
        var all = swWrap.children;
        for (var i = 0; i < all.length; i++) all[i].className = '';
        b.className = 'sel';
      });
      swWrap.appendChild(b);
    });

    // Retyping the name redraws a lettered tile, but leaves a photo alone.
    nameEl.addEventListener('input', function () {
      if (!draft.colour) return;
      draft.icon = tileFromColour(draft.colour, nameEl.value || screenLabel(), 180);
      draft.icon512 = tileFromColour(draft.colour, nameEl.value || screenLabel(), 512);
      prev.src = draft.icon;
    });

    var rows = card.querySelectorAll('.row');
    wire(rows[0], function () {
      pickPhoto(function (img) {
        draft.colour = null;
        draft.icon = tileFromImage(img, 180);
        draft.icon512 = tileFromImage(img, 512);
        prev.src = draft.icon;
        var all = swWrap.children;
        for (var i = 0; i < all.length; i++) all[i].className = '';
      });
    });
    wire(rows[1], function () {
      saveCustom(null);
      location.reload();   // simplest way to put every shipped tag back
    });
    wire(rows[2], function () {
      var name = nameEl.value.trim();
      var ok = saveCustom((draft.icon || name !== screenLabel())
        ? { name: name || screenLabel(), icon: draft.icon, icon512: draft.icon512,
            colour: draft.colour }
        : null);
      applyCustom();
      openPanel();
      if (!ok) toast('Couldn’t save it — storage is full or blocked');
    });

    panelWrap.classList.add('open');
  }

  /* The icon this page shipped with, for the preview and the reset. */
  function defaultIconHref() {
    var l = document.querySelector('link[rel="apple-touch-icon"]');
    if (!l) return '';
    return l.getAttribute('data-krypt-shipped') || l.getAttribute('href') || '';
  }

  /* One throwaway file input per use. Kept out of the DOM tree the
     dashboards render into so nothing here can collide with a mock. */
  function pickPhoto(done) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      var img = new Image();
      var url = URL.createObjectURL(f);
      img.onload = function () { URL.revokeObjectURL(url); done(img); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        toast('That file couldn’t be read as an image');
      };
      img.src = url;
    });
    document.body.appendChild(input);
    input.click();
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'krypt-hint show';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.remove('show'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  /* Turning the mark off is a decision, so it gets a face of its own and
     says what it means in the words that actually matter — what the
     screenshot will look like — rather than "are you sure?". */
  function openMarkFace() {
    if (!panelWrap) buildPanel();
    var card = panelWrap.firstChild;
    var on = markOn();

    card.innerHTML =
      '<div class="ph"><div class="t">Demo watermark</div>' +
      '<div class="s">' + (on ? 'Currently on' : 'Currently off') + '</div></div>' +
      '<div class="krypt-icon-pad" style="padding-bottom:14px">' +
        '<p style="margin:0;color:#A9A9B8;font-size:13.5px;line-height:1.55">' +
        (on
          ? 'Every screen shows a small <b style="color:#fff">LARP · not a real app</b> ' +
            'chip in the corner, so a screenshot still says what it is once it has ' +
            'left here.<br><br>Turn it off and your screenshots will no longer show ' +
            'that this is a demo. That is on you.'
          : 'Screenshots are <b style="color:#fff">not marked</b>. Nothing in the image ' +
            'says it is a demo.') +
        '</p></div>' +
      row(on ? ICON.check : ICON.mark, on ? 'Turn the watermark off' : 'Turn the watermark on',
        on ? 'danger' : '') +
      '<button class="row done" type="button">Back</button>';

    var rows = card.querySelectorAll('.row');
    wire(rows[0], function () { setMark(!on); openPanel(); });
    wire(rows[1], openPanel);
    panelWrap.classList.add('open');
  }

  /* Second face of the same card: pick a currency, come back. */
  function openCurrencyPicker() {
    if (!panelWrap) buildPanel();
    var card = panelWrap.firstChild;
    var html = '<div class="ph"><div class="t">Currency</div>' +
      '<div class="s">Swaps the symbol on every amount</div></div><div class="klist">';
    for (var i = 0; i < MONEY.length; i++) {
      html += '<button class="row' + (MONEY[i].c === curCode ? ' sel' : '') + '" type="button">' +
        '<span class="lbl">' + esc(MONEY[i].c) + '</span>' +
        '<span class="kval">' + esc(MONEY[i].s) + '</span></button>';
    }
    html += '</div><button class="row done" type="button">Back</button>';
    card.innerHTML = html;

    var rows = card.querySelectorAll('.klist .row');
    for (var j = 0; j < rows.length; j++) {
      (function (code) {
        rows[j].addEventListener('click', function () { setCurrency(code); openPanel(); });
      })(MONEY[j].c);
    }
    wire(card.querySelector('.row.done'), openPanel);
    panelWrap.classList.add('open');
  }

  function wire(el, fn) { if (el) el.addEventListener('click', fn); }
  function closePanel() { if (panelWrap) panelWrap.classList.remove('open'); }
  function panelOpen() { return !!panelWrap && panelWrap.classList.contains('open'); }

  /* ---------------- triple tap ---------------- */

  var taps = [];
  var TAP_WINDOW = 600;   // ms between taps
  var TAP_RADIUS = 44;    // px — the taps have to be the same spot, not three
                          // different buttons being hit quickly

  document.addEventListener('pointerup', function (e) {
    // Headless is the copy outside the frame; the one inside owns the
    // gesture. Two listeners would open two panels on one triple-tap.
    if (HEADLESS) return;
    if (!isPhone() || panelOpen() || sheetOpen()) return;

    // In edit mode a triple-tap is how you select a value's text, so leave
    // taps on editable things alone.
    if (pageEditing() && e.target.closest &&
        e.target.closest('[data-edit],[contenteditable="true"],input,textarea')) {
      taps = [];
      return;
    }

    var now = e.timeStamp;
    taps = taps.filter(function (t) { return now - t.t < TAP_WINDOW; });
    if (taps.length && Math.hypot(e.clientX - taps[0].x, e.clientY - taps[0].y) > TAP_RADIUS) {
      taps = [];
    }
    taps.push({ t: now, x: e.clientX, y: e.clientY });

    if (taps.length >= 3) {
      taps = [];
      swallowClick = true;
      openPanel();
    }
  }, true);

  /* The third tap still produces a click on whatever was under the finger.
     Eat it, so opening the panel doesn't also switch a tab behind it. */
  var swallowClick = false;
  document.addEventListener('click', function (e) {
    if (!swallowClick) return;
    swallowClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  /* ---------------- install instructions ---------------- */

  var sheet = null;
  function sheetOpen() { return !!sheet && sheet.classList.contains('open'); }

  function instructions() {
    var name = IS_GALLERY ? 'the whole gallery' : homeName();
    var yours = IS_GALLERY ? '' :
      '<p>Want a different icon or name on your Home Screen? Set it first — ' +
      '<b>Home-screen icon</b> in this panel — then add it. The phone reads ' +
      'both at the moment you tap Add, so changing them afterwards won’t ' +
      'move what’s already there.</p>';
    if (isIOSSafari) {
      return '<h3>Add ' + esc(name) + ' to your Home Screen</h3>' +
        '<ol>' +
        '<li>Tap the <b>Share</b> button — the square with an arrow, in Safari’s ' +
          'bottom bar.</li>' +
        '<li>Scroll down and tap <b>Add to Home Screen</b>.</li>' +
        '<li>Tap <b>Add</b>.</li>' +
        '</ol>' +
        '<p>It gets its own icon and opens fullscreen with no Safari bars. ' +
        'Each dashboard can be added separately — do this from any of them.</p>' +
        yours;
    }
    if (isIOS) {
      return '<h3>Open this in Safari first</h3>' +
        '<p>Only Safari can add pages to the iPhone Home Screen — Chrome and the ' +
        'others can’t. Copy the address, open <b>Safari</b>, paste it, then use ' +
        '<b>Share → Add to Home Screen</b>.</p>';
    }
    if (isAndroid) {
      return '<h3>Add ' + esc(name) + ' to your Home Screen</h3>' +
        '<ol>' +
        '<li>Tap the <b>⋮</b> menu, top-right in Chrome.</li>' +
        '<li>Tap <b>Add to Home screen</b> (sometimes under <b>Install app</b>).</li>' +
        '<li>Tap <b>Add</b>.</li>' +
        '</ol>' +
        '<p>Each dashboard can be added separately — do this from any of them.</p>' +
        yours;
    }
    return '<h3>Fullscreen &amp; install</h3>' +
      '<p>Press <b>F</b> for fullscreen, or use the install icon in your browser’s ' +
      'address bar.</p>' +
      '<p>The home-screen icons are really meant for a phone: run ' +
      '<b>Krypt LARP.cmd</b>, scan the QR code, then use this button there.</p>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function openSheet() {
    if (FRAMED) return delegate('install');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'krypt-sheet';
      sheet.innerHTML = '<div class="krypt-sheet-card" role="dialog" aria-modal="true">' +
        instructions() +
        '<button class="krypt-sheet-close" type="button">Got it</button></div>';
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet || e.target.classList.contains('krypt-sheet-close')) closeSheet();
      });
      document.body.appendChild(sheet);
    }
    sheet.classList.add('open');
  }
  function closeSheet() { if (sheet) sheet.classList.remove('open'); }

  /* ---------------- keyboard ---------------- */

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else if (e.key === 'h' || e.key === 'H') ui.style.display = ui.style.display ? '' : 'none';
    else if (e.key === 'Escape') { closeSheet(); closePanel(); close(); }
  });

  /* ---------------- editing indicator + first-run coach ----------------

     The panel holds everything this app can do — edit, reset, currency,
     the home-screen icon, the demo watermark — and nothing on screen
     announces it, deliberately: a mock with a settings gear bolted to
     the corner stops looking like the app it is imitating.

     Which makes the one sentence that *does* announce it load-bearing,
     and the previous version was not up to the job. It was a toast:
     phone only, visible for four and a half seconds, once ever. On a
     desktop nothing said it at all; on a phone it said it while you
     were still looking at the balance, and then never again.

     This one waits to be dealt with instead of expiring, and it names
     the affordance the device in front of you actually has — the pill
     is display:none under 560px and the triple-tap handler returns
     early when !isPhone(), so the two really are different gestures
     rather than one described two ways.

     It clears itself the moment the panel opens by any route, so it
     never asks you to acknowledge something you already found. */

  var COACH_KEY = 'krypt-coach';
  var coachEl = null;

  function coachSeen() {
    // A blocked localStorage counts as seen: better to skip the card
    // than to show it on every single load in a private window.
    try { return !!localStorage.getItem(COACH_KEY); } catch (e) { return true; }
  }

  function dismissCoach() {
    try { localStorage.setItem(COACH_KEY, '1'); } catch (e) { /* private mode */ }
    if (!coachEl) return;
    var el = coachEl;
    coachEl = null;
    el.classList.remove('show');
    setTimeout(function () { el.remove(); }, 320);
  }

  function showCoach() {
    if (coachEl || coachSeen()) return;
    var phone = isPhone();

    coachEl = document.createElement('div');
    coachEl.className = 'krypt-coach';
    coachEl.setAttribute('role', 'note');
    coachEl.innerHTML =
      '<b>Everything lives in one place</b>' +
      '<p>' +
        (phone ? 'Tap <em>three times</em> anywhere on this screen'
               : 'Click the <em>dot</em> in the bottom-left corner') +
        ' to edit the values, reset them, or add this to your Home Screen.' +
      '</p>' +
      '<button type="button">Got it</button>';

    coachEl.querySelector('button').addEventListener('click', dismissCoach);
    document.body.appendChild(coachEl);
    setTimeout(function () { if (coachEl) coachEl.classList.add('show'); }, 900);
  }

  function mountExtras() {
    var badge = document.createElement('div');
    badge.className = 'krypt-editing';
    badge.textContent = 'EDITING · TAP 3× WHEN DONE';
    document.body.appendChild(badge);

    // The gallery explains itself in its own welcome card; this is for
    // the dashboards, where the gesture is the only way in.
    if (!IS_GALLERY) showCoach();
  }

  /* ---------------- go ---------------- */

  function mount() {
    /* The mark goes on whichever document the imported dashboard cannot
       reach. On a built-in screen that is this one. In the viewer it is
       the *parent*: the headless copy draws it over the frame, so a file
       someone downloaded cannot delete the label on its own screenshot.
       The framed copy therefore draws none, or there would be two.

       The gallery is skipped — it is plainly a gallery, and it already
       carries the banner. */
    if (!FRAMED && !IS_GALLERY) renderMark();

    // Headless mounts no control of its own: the viewer has its own
    // fallback bar, and the copy inside the frame has the real one.
    if (HEADLESS) return;
    document.body.appendChild(ui);
    syncFullscreenBtn();
    adoptPageControls();
    mountExtras();
    // The viewer shows a fallback control until this lands, so a
    // dashboard that fails to load still has a way out.
    if (FRAMED) toParent({ __kryptReady: 1 });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  /* The two faces custom/view.html needs to open on the frame's behalf.
     Exposed rather than duplicated, so an imported dashboard's install
     sheet and icon picker are the same ones every other screen gets —
     including the manifest rewriting, which is the fiddly part. */
  window.kryptApp = {
    openSheet: function () { openSheet(); },
    openIconPicker: function () { openIconPicker(); },
    setLabel: function (name) { window.kryptLabel = name; },
  };
})();
