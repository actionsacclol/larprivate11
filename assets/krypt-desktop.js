/* ============================================================
   krypt-desktop.js — the parts of the desktop app that live in the
   page rather than the main process.

   Inert in a plain browser: everything below is behind a check for
   window.krypt, which only the Electron preload provides. Loading
   this file over the Wi-Fi server on a phone costs one no-op.

   Provides:
     - first-run onboarding
     - the Phone panel (QR + start/stop + firewall help), opened
       from the Phone menu, the tray, or Ctrl+P
     - tells Discord Rich Presence which dashboard is open
   ============================================================ */

(function () {
  'use strict';

  if (!window.krypt || !window.krypt.isDesktop) return;

  var K = window.krypt;

  /* The label krypt-app.js was given is the dashboard's proper name. */
  var labelEl = document.querySelector('script[data-label]');
  var LABEL = (labelEl && labelEl.getAttribute('data-label')) || 'Krypt LARP';
  var IS_GALLERY = !!document.querySelector('script[data-gallery]');

  try { K.rpc.setPage(IS_GALLERY ? '' : LABEL); } catch (e) { /* presence is cosmetic */ }

  /* ---------------- styles ---------------- */

  var css = document.createElement('style');
  css.textContent = [
    '.kd-veil{position:fixed;inset:0;z-index:2147483400;display:none;',
    '  align-items:center;justify-content:center;padding:28px;',
    '  background:rgba(4,4,8,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);',
    '  font:400 14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '.kd-veil.open{display:flex;animation:kdFade .16s ease;}',
    '@keyframes kdFade{from{opacity:0}to{opacity:1}}',
    '@keyframes kdRise{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}',

    '.kd-card{width:100%;max-width:560px;background:#121216;color:#ECECF1;',
    '  border:1px solid #26262E;border-radius:22px;overflow:hidden;',
    '  box-shadow:0 40px 100px rgba(0,0,0,.7);animation:kdRise .24s cubic-bezier(.2,.8,.3,1);}',
    '.kd-card.narrow{max-width:440px;}',

    '.kd-top{padding:3px;background:linear-gradient(120deg,#7C3AED,#22D3EE);}',
    '.kd-top-in{background:#121216;border-radius:19px 19px 0 0;padding:26px 30px 22px;text-align:center;}',
    '.kd-mark{width:56px;height:56px;margin:0 auto 12px;border-radius:16px;',
    '  background:linear-gradient(135deg,#7C3AED,#22D3EE);display:flex;align-items:center;',
    '  justify-content:center;font:800 26px/1 -apple-system,BlinkMacSystemFont,sans-serif;',
    '  color:#0A0A0F;box-shadow:0 10px 30px rgba(124,58,237,.35);}',
    '.kd-title{font-size:19px;font-weight:800;letter-spacing:-.02em;}',
    '.kd-sub{font-size:13px;color:#8A8A98;margin-top:5px;}',

    '.kd-body{padding:24px 30px 8px;}',
    '.kd-body p{margin:0 0 12px;color:#B9B9C6;}',
    '.kd-body b{color:#fff;font-weight:650;}',
    '.kd-body code{font:600 12.5px ui-monospace,Consolas,monospace;background:#1D1D24;',
    '  border:1px solid #2C2C35;border-radius:6px;padding:2px 6px;color:#D7D7E2;}',

    '.kd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 4px;}',
    '.kd-feat{background:#17171D;border:1px solid #25252D;border-radius:12px;padding:12px 13px;}',
    '.kd-feat .t{font-size:13px;font-weight:700;color:#fff;}',
    '.kd-feat .d{font-size:11.5px;color:#8A8A98;margin-top:3px;line-height:1.4;}',

    '.kd-note{display:flex;gap:11px;background:rgba(255,212,0,.08);',
    '  border:1px solid rgba(255,212,0,.28);border-radius:12px;padding:13px 14px;margin:4px 0 6px;}',
    '.kd-note .i{color:#FFD400;font-weight:800;flex:none;}',
    '.kd-note .x{font-size:12.5px;color:#D8D2B6;line-height:1.5;}',

    /* community links on the last onboarding screen */
    '.kd-links{display:flex;gap:10px;margin:14px 0 2px;}',
    '.kd-link{flex:1;display:flex;align-items:center;gap:10px;text-decoration:none;',
    '  border-radius:12px;padding:12px 13px;cursor:pointer;transition:filter .15s ease;}',
    '.kd-link:hover{filter:brightness(1.12);}',
    '.kd-link.dc{background:linear-gradient(120deg,#5865F2,#7A84FF);}',
    '.kd-link.kc{background:linear-gradient(120deg,#0EA5A5,#22D3EE);}',
    '.kd-link.yt{background:linear-gradient(120deg,#D9364C,#F0655C);}',
    '.kd-link.yt .g svg{fill:#fff;stroke:none;}',
    '.kd-link .t{display:block;font-size:13px;font-weight:700;color:#fff;}',
    '.kd-link .d{display:block;font-size:11.5px;color:rgba(255,255,255,.82);margin-top:2px;}',
    '.kd-link .g{width:26px;height:26px;border-radius:50%;flex:none;',
    '  background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;}',
    '.kd-link .g svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2;',
    '  stroke-linecap:round;stroke-linejoin:round;}',

    '.kd-foot{display:flex;align-items:center;gap:10px;padding:18px 30px 24px;}',
    '.kd-dots{display:flex;gap:6px;flex:1;}',
    '.kd-dots i{width:6px;height:6px;border-radius:50%;background:#33333E;display:block;}',
    '.kd-dots i.on{background:#7C3AED;}',

    '.kd-btn{border:0;border-radius:11px;padding:11px 20px;cursor:pointer;',
    '  font:650 13.5px/1 inherit;background:#7C3AED;color:#fff;transition:background .15s;}',
    '.kd-btn:hover{background:#8B4CF0;}',
    '.kd-btn.ghost{background:#22222B;color:#D7D7E2;}',
    '.kd-btn.ghost:hover{background:#2C2C36;}',
    '.kd-btn[disabled]{opacity:.5;cursor:default;}',

    /* phone panel */
    '.kd-qrwrap{display:flex;gap:22px;align-items:center;padding:4px 30px 6px;}',
    '.kd-qr{background:#fff;border-radius:16px;padding:11px;line-height:0;flex:none;}',
    '.kd-qr svg{width:172px;height:172px;display:block;}',
    '.kd-qrside{flex:1;min-width:0;}',
    '.kd-url{font:650 15px/1.35 ui-monospace,Consolas,monospace;background:#0C0C10;',
    '  border:1px solid #2A2A34;border-radius:10px;padding:11px 13px;word-break:break-all;',
    '  user-select:all;color:#8AB4FF;}',
    '.kd-alt{margin-top:10px;font-size:11.5px;color:#71717F;line-height:1.6;}',
    '.kd-alt span{color:#9A9AA8;}',
    '.kd-state{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:650;',
    '  color:#8A8A98;margin-bottom:12px;}',
    '.kd-state i{width:7px;height:7px;border-radius:50%;background:#4A4A56;display:block;}',
    '.kd-state.on i{background:#00E676;box-shadow:0 0 0 3px rgba(0,230,118,.18);}',
    '.kd-err{font-size:12.5px;color:#FF8A8A;margin-top:10px;}',
  ].join('');
  document.head.appendChild(css);

  /* ---------------- shell ---------------- */

  function veil(cls) {
    var v = document.createElement('div');
    v.className = 'kd-veil';
    var card = document.createElement('div');
    card.className = 'kd-card' + (cls ? ' ' + cls : '');
    v.appendChild(card);
    v.addEventListener('click', function (e) { if (e.target === v) v.classList.remove('open'); });
    document.body.appendChild(v);
    return { veil: v, card: card, open: function () { v.classList.add('open'); },
             close: function () { v.classList.remove('open'); } };
  }

  function head(title, sub) {
    return '<div class="kd-top"><div class="kd-top-in">' +
      '<div class="kd-mark">K</div>' +
      '<div class="kd-title">' + title + '</div>' +
      '<div class="kd-sub">' + sub + '</div>' +
      '</div></div>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- onboarding ---------------- */

  var ob = null, obStep = 0;

  var STEPS = [
    {
      title: 'Krypt LARP',
      sub: '31 app screens, rebuilt from scratch.',
      body:
        '<p>Every screen in here is a hand-built recreation — the real layouts, ' +
        'animations and interactions, with none of the real app behind them. ' +
        'Click any card to open it.</p>' +
        '<div class="kd-grid">' +
        '<div class="kd-feat"><div class="t">Editable</div><div class="d">Hit Edit and click any ' +
          'value to change it. Saved locally.</div></div>' +
        '<div class="kd-feat"><div class="t">Animated</div><div class="d">Counters, charts and ' +
          'view transitions all run.</div></div>' +
        '<div class="kd-feat"><div class="t">Mobile + desktop</div><div class="d">Phone frames and ' +
          'browser-window frames, toggled in the gallery.</div></div>' +
        '<div class="kd-feat"><div class="t">Self-contained</div><div class="d">One HTML file each. ' +
          'No build step, nothing phones home.</div></div>' +
        '</div>' +
        /* Offered at the start, where "I would rather be shown this"
           is a live thought. It leaves the app — nothing is embedded. */
        '<div class="kd-links">' +
          '<a class="kd-link yt" data-ext="https://www.youtube.com/watch?v=jPjsNWckGiQ">' +
            '<span class="g"><svg viewBox="0 0 24 24"><path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.4-6.4' +
            'a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z"/></svg></span>' +
            '<span><span class="t">Watch the guide</span>' +
            '<span class="d">The whole app in one video, on YouTube</span></span></a>' +
        '</div>' +
        '<div class="kd-note"><span class="i">!</span><span class="x">Every screen carries a ' +
        '<b>LARP · not a real app</b> mark in the corner, so a screenshot still says what it ' +
        'is after it leaves here. You can turn it off per device — tap 3× on a phone, or use ' +
        'the corner control — and from then on your screenshots won\'t be marked. These are ' +
        'invented products: they are not the real services and can\'t do anything real.' +
        '</span></div>',
    },
    {
      title: 'Use it on your phone',
      sub: 'No website, no hosting, no account.',
      body:
        '<p>Press <code>Ctrl</code>+<code>P</code> — or the <b>Phone</b> menu — and Krypt LARP ' +
        'serves the collection over your own Wi-Fi and shows you a QR code. Scan it and the ' +
        'gallery opens on your phone.</p>' +
        '<p>From there, <b>Share → Add to Home Screen</b> installs any dashboard as its own app, ' +
        'with its own icon, opening fullscreen with no browser bars.</p>' +
        '<div class="kd-note"><span class="i">i</span><span class="x">Your phone and this PC have ' +
        'to be on the same Wi-Fi. If the phone can\'t connect it\'s almost always the Windows ' +
        'firewall — the Phone panel has a one-click fix.</span></div>',
    },
    {
      title: 'Two things worth knowing',
      sub: 'Then you\'re set.',
      body:
        '<p><b>On a phone</b>, the on-screen buttons are hidden so the mock fills the screen — ' +
        'tap <b>three times anywhere</b> to get Edit, Reset, Gallery and Fullscreen in a panel.</p>' +
        '<p><b>On this PC</b>, Edit and Reset sit at the top of each dashboard, ' +
        '<code>F</code> toggles fullscreen and <code>Ctrl</code>+<code>G</code> returns to the ' +
        'gallery.</p>' +
        '<p>Closing the window while the phone server is running drops the app to the tray so ' +
        'your phone keeps working. Quit properly from the tray icon.</p>' +
        '<div class="kd-links">' +
          '<a class="kd-link dc" data-ext="https://discord.gg/muzFKR657F">' +
            '<span class="g"><svg viewBox="0 0 24 24"><path d="M5 18V7a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H9z"/>' +
            '<circle cx="10" cy="10.5" r="1.1" fill="#fff" stroke="none"/>' +
            '<circle cx="14.5" cy="10.5" r="1.1" fill="#fff" stroke="none"/></svg></span>' +
            '<span><span class="t">Join the Discord</span>' +
            '<span class="d">Ask questions, request a dashboard</span></span></a>' +
          '<a class="kd-link kc" data-ext="https://krypt.cc/">' +
            '<span class="g"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.4"/>' +
            '<path d="M4.5 20c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6"/></svg></span>' +
            '<span><span class="t">Make a profile</span>' +
            '<span class="d">krypt.cc</span></span></a>' +
        '</div>',
    },
  ];

  function renderOnboarding() {
    var s = STEPS[obStep];
    var dots = STEPS.map(function (_, i) {
      return '<i class="' + (i === obStep ? 'on' : '') + '"></i>';
    }).join('');
    ob.card.innerHTML =
      head(esc(s.title), esc(s.sub)) +
      '<div class="kd-body">' + s.body + '</div>' +
      '<div class="kd-foot"><div class="kd-dots">' + dots + '</div>' +
      (obStep > 0 ? '<button class="kd-btn ghost" data-act="back">Back</button>' : '') +
      '<button class="kd-btn" data-act="next">' +
        (obStep === STEPS.length - 1 ? 'Get started' : 'Next') + '</button></div>';

    /* Community links leave the app rather than advancing the wizard. */
    ob.card.querySelectorAll('[data-ext]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var url = a.getAttribute('data-ext');
        if (window.krypt && window.krypt.app) window.krypt.app.openExternal(url);
        else window.open(url, '_blank', 'noopener');
      });
    });

    ob.card.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.act === 'back') { obStep--; renderOnboarding(); return; }
        if (obStep === STEPS.length - 1) {
          ob.close();
          try { K.onboarding.markSeen(); } catch (e) { /* ignore */ }
          return;
        }
        obStep++;
        renderOnboarding();
      });
    });
  }

  function showOnboarding() {
    if (!ob) ob = veil();
    obStep = 0;
    renderOnboarding();
    ob.open();
  }

  /* ---------------- phone panel ---------------- */

  var ph = null;
  var chosenUrl = null;   // address the user pinned, if the auto-pick was wrong

  function renderPhone(state) {
    if (!ph) return;
    var running = state && state.running;

    var body;
    if (!running) {
      body =
        '<div class="kd-body">' +
        '<div class="kd-state"><i></i>Server stopped</div>' +
        '<p>Krypt LARP will serve the collection over your Wi-Fi. Your phone opens it in a ' +
        'browser — nothing is uploaded and nothing leaves your network.</p>' +
        (state && !state.hasLan
          ? '<div class="kd-note"><span class="i">!</span><span class="x">No Wi-Fi or LAN ' +
            'connection found. Only this PC will be able to reach it.</span></div>'
          : '') +
        (state && state.error ? '<div class="kd-err">' + esc(state.error) + '</div>' : '') +
        '</div>' +
        '<div class="kd-foot"><div style="flex:1"></div>' +
        '<button class="kd-btn ghost" data-act="close">Close</button>' +
        '<button class="kd-btn" data-act="start">Start server</button></div>';
    } else {
      // Every address except localhost, so a wrong automatic pick can be
      // corrected by tapping the right one — the QR follows.
      var alts = (state.urls || []).filter(function (u) {
        return u.lan && u.url !== state.primary;
      }).map(function (u) {
        return '<div><a data-url="' + esc(u.url) + '">' + esc(u.url) + '</a> — ' +
               esc(u.name) + '</div>';
      }).join('');

      body =
        '<div class="kd-qrwrap">' +
        '<div class="kd-qr">' + (state.qrSvg || '') + '</div>' +
        '<div class="kd-qrside">' +
        '<div class="kd-state on"><i></i>Serving on port ' + state.port + '</div>' +
        '<div class="kd-url">' + esc(state.primary || '') + '</div>' +
        '<div class="kd-alt">Point your phone camera at the code. Both devices have to be on ' +
        'the same Wi-Fi.' +
        (alts ? '<br><br>Not working? Try another address:<br>' + alts : '') +
        '</div></div></div>' +
        '<div class="kd-body" style="padding-top:16px">' +
        // A live VPN is the single most confusing failure: the phone reaches
        // nothing and it looks exactly like the app is broken.
        (state.vpn && state.vpn.length
          ? '<div class="kd-note"><span class="i">!</span><span class="x"><b>A VPN is running</b> (' +
            esc(state.vpn.join(', ')) + '). That usually stops your phone reaching this PC even ' +
            'on the same Wi-Fi — the page just never loads. Turn it off, or enable its ' +
            '“allow local network” setting.</span></div>'
          : '') +
        (state.platform === 'win32'
          ? '<div class="kd-note"><span class="i">!</span><span class="x">Phone stuck loading? ' +
            'Windows blocks incoming connections on networks marked <b>Public</b>. Open the port ' +
            'below, or set your Wi-Fi to <b>Private</b> in Windows settings.</span></div>'
          : '') +
        '</div>' +
        '<div class="kd-foot">' +
        (state.platform === 'win32'
          ? '<button class="kd-btn ghost" data-act="firewall">Open port ' + state.port +
            '</button>' : '') +
        '<div style="flex:1"></div>' +
        '<button class="kd-btn ghost" data-act="stop">Stop</button>' +
        '<button class="kd-btn" data-act="close">Done</button></div>';
    }

    ph.card.innerHTML = head('Use it on your phone', 'Same Wi-Fi, no website involved.') + body;

    ph.card.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.act;
        if (act === 'close') return ph.close();
        if (act === 'firewall') { K.phone.allowFirewall(); return; }
        b.disabled = true;
        var p = act === 'start' ? K.phone.start() : K.phone.stop();
        Promise.resolve(p).then(function (s) { renderPhone(s); });
      });
    });

    // Pick a different address — re-ask for the state pinned to it so the
    // QR is regenerated for the one the user chose.
    ph.card.querySelectorAll('[data-url]').forEach(function (a) {
      a.style.cursor = 'pointer';
      a.addEventListener('click', function () {
        chosenUrl = a.getAttribute('data-url');
        Promise.resolve(K.phone.status(chosenUrl)).then(renderPhone);
      });
    });
  }

  function showPhone() {
    if (!ph) ph = veil();
    ph.open();
    Promise.resolve(K.phone.status(chosenUrl)).then(renderPhone);
  }

  /* ---------------- wiring ---------------- */

  K.phone.onShow(showPhone);
  K.phone.onChange(function (s) {
    if (ph && ph.veil.classList.contains('open')) renderPhone(s);
  });

  // Help -> Show the welcome guide pushes this.
  K.onboarding.onShow(showOnboarding);

  /* The gallery's own "Show the welcome again" link defers to this when
     it is here, so the desktop replays the three screens it was actually
     shown rather than the browser card it never saw. Exported rather
     than duplicated for the same reason the panel faces are. */
  window.kryptDesktop = { showOnboarding: showOnboarding };

  // First run is a *pull*, not a push. The main process used to fire
  // 'krypt:showOnboarding' on ready-to-show, which raced this deferred
  // script registering its listener — dev startup won the race, a cold
  // packaged start lost it and onboarding silently never appeared.
  // Asking on load can't race. Gallery only: onboarding on top of a
  // dashboard would make no sense.
  if (IS_GALLERY) {
    Promise.resolve(K.onboarding.seen()).then(function (seen) {
      if (!seen) showOnboarding();
    }).catch(function () { /* never block the page on this */ });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (ph) ph.close();
      // Onboarding is deliberately not Esc-dismissible on first run — it's
      // three screens and it explains the triple-tap gesture.
    }
  });
})();
