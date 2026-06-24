/* King Barbo — responsive hamburger nav (independent overlay).
   The page is rendered by a reactive bundler that re-creates its own nodes,
   which destroys element-bound listeners. So this builds a SELF-CONTAINED
   menu in <body> and handles every click through document-level delegation,
   which keeps working across re-renders. The bundler's own (overflowing)
   nav links are hidden on mobile via a CSS rule on `nav > div`. */
(function () {
  'use strict';

  var MQ = '(max-width:820px)';

  function lum(str) {
    var m = (str || '').match(/\d+(\.\d+)?/g);
    if (!m) return 1;
    return 0.2126 * (m[0] / 255) + 0.7152 * (m[1] / 255) + 0.0722 * (m[2] / 255);
  }

  // ---- theme (computed only once the real nav is rendered) ----------------
  // Detect dark/light from the NAV background, not <body>: the bundler keeps a
  // light loader background on <body> and applies the real theme to an inner
  // container, so reading <body> too early mis-detects the royal (dark) page.
  var theme = null;
  function isTransparent(bg) {
    return !bg || /rgba?\(0,\s*0,\s*0,\s*0\)|transparent/.test(bg);
  }
  function getTheme() {
    if (theme) return theme;
    var nav = document.querySelector('nav');
    if (!nav) return null;                       // wait for render
    var navBg = getComputedStyle(nav).backgroundColor;
    var dark;
    if (!isTransparent(navBg)) {
      dark = lum(navBg) < 0.4;
    } else {
      dark = lum(getComputedStyle(document.body).backgroundColor) < 0.4;
    }
    var accent = dark ? '#c9a24b' : '#7a1f2b';
    var res = [].slice.call(nav.querySelectorAll('button, a')).filter(function (e) {
      return /reserv/i.test(e.textContent);
    })[0];
    if (res) {
      var bg = getComputedStyle(res).backgroundColor;
      if (!isTransparent(bg)) accent = bg;
    }
    var an = accent.indexOf('#') === 0
      ? [parseInt(accent.substr(1, 2), 16), parseInt(accent.substr(3, 2), 16), parseInt(accent.substr(5, 2), 16)]
      : (accent.match(/\d+/g) || [201, 162, 75]).map(Number);
    theme = {
      dark: dark,
      accent: accent,
      ring: 'rgba(' + an[0] + ',' + an[1] + ',' + an[2] + ',0.55)',
      panelBg: dark ? 'rgba(12,12,12,0.985)' : 'rgba(250,249,245,0.985)',
      text: dark ? '#efe6d6' : '#17130D',
      line: dark ? 'rgba(201,162,75,0.22)' : 'rgba(23,19,13,0.12)',
      resText: lum(accent) > 0.5 ? '#0a0a0a' : '#ffffff'
    };
    return theme;
  }

  // ---- default menu items (ids are stable on the page) --------------------
  var ITEMS = [
    { t: 'Diensten', h: '#diensten' },
    { t: 'Openingsuren', h: '#uren' },
    { t: 'Contact', h: '#contact' }
  ];

  function ensureStyle() {
    if (document.getElementById('kb-style')) return;
    var t = getTheme();
    if (!t) return;
    var s = document.createElement('style');
    s.id = 'kb-style';
    s.textContent = [
      '#kb-hamb{display:none}',
      '#kb-panel{display:none}',
      '@media ' + MQ + '{',
      '  nav > div{display:none !important}',
      '  #kb-hamb{display:flex;flex-direction:column;justify-content:center;gap:5px;position:fixed;top:16px;right:5vw;width:44px;height:44px;background:transparent;border:0;cursor:pointer;z-index:1001}',
      '  #kb-hamb span{display:block;width:26px;height:2px;margin:0 auto;border-radius:2px;background:' + t.accent + ';transition:transform .25s ease,opacity .2s ease}',
      '  #kb-hamb.kb-open span:nth-child(1){transform:translateY(7px) rotate(45deg)}',
      '  #kb-hamb.kb-open span:nth-child(2){opacity:0}',
      '  #kb-hamb.kb-open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}',
      '  #kb-panel{display:flex;flex-direction:column;gap:4px;position:fixed;top:0;left:0;right:0;z-index:1000;background:' + t.panelBg + ';backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:84px 6vw 30px;box-shadow:0 16px 34px rgba(0,0,0,.42);transform:translateY(-105%);transition:transform .33s ease}',
      '  #kb-panel.kb-open{transform:translateY(0)}',
      '  #kb-panel a{color:' + t.text + ';text-decoration:none;font-size:19px;letter-spacing:.3px;padding:15px 2px;border-bottom:1px solid ' + t.line + '}',
      '  #kb-panel .kb-row{display:flex;gap:10px;align-items:center;margin-top:18px}',
      '  #kb-panel .kb-lang{padding:9px 16px;border:1px solid ' + t.line + ';background:transparent;color:' + t.text + ';border-radius:6px;cursor:pointer;font-size:15px;font-family:inherit}',
      '  #kb-panel .kb-lang.kb-active{background:' + t.accent + ';color:' + t.resText + ';border-color:' + t.accent + '}',
      '  #kb-panel .kb-res{flex:1;padding:15px;border:0;border-radius:8px;background:' + t.accent + ';color:' + t.resText + ';font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:.5px}',
      // --- mobile layout fixes: collapse 2-column sections to a single column ---
      // About (royal: photo | text) -> stack, and move the photo BELOW the text.
      '  [style*="grid-template-columns: 1fr 1fr; gap: 0px"]{grid-template-columns:1fr !important;gap:22px !important}',
      '  [style*="grid-template-columns: 1fr 1fr; gap: 0px"] > *:first-child{order:2 !important}',
      // About (light: heading | paragraph) -> stack.
      '  [style*="grid-template-columns: 0.9fr 1.1fr"]{grid-template-columns:1fr !important;gap:18px !important}',
      // Opening hours: stack "Op afspraak" and "Vrije inloop" cards.
      '  #uren [style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important;gap:18px !important}',
      // Contact: put the Marnixplaats block below the "Kom langs"/Reserveren block.
      '  #contact[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important}',
      '}',

      // ---- hover states (desktop / real pointers only) ----
      '@media (hover:hover){',
      '  #dc-root button{transition:transform .16s ease,box-shadow .25s ease,filter .2s ease,background-color .2s ease,border-color .2s ease !important}',
      '  #dc-root button:hover{transform:translateY(-2px) !important;filter:brightness(1.06) !important;box-shadow:0 0 0 2px ' + t.ring + ',0 10px 24px rgba(0,0,0,.30) !important}',
      '  #dc-root button:active{transform:translateY(0) !important}',
      '  #dc-root a.kb-link{transition:color .2s ease !important}',
      '  #dc-root a.kb-link:hover{color:' + t.accent + ' !important}',
      '  #kb-panel a:hover,#kb-panel .kb-lang:hover{color:' + t.accent + ' !important}',
      '}',

      // ---- scroll reveal ----
      '@media (prefers-reduced-motion:no-preference){',
      '  .kb-reveal{opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.2,.6,.2,1),transform .7s cubic-bezier(.2,.6,.2,1)}',
      '  .kb-reveal.kb-in{opacity:1;transform:none}',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureHamb() {
    if (document.getElementById('kb-hamb')) return;
    var b = document.createElement('button');
    b.id = 'kb-hamb';
    b.setAttribute('aria-label', 'Menu');
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(b);
  }

  function ensurePanel() {
    if (document.getElementById('kb-panel')) return;
    var p = document.createElement('div');
    p.id = 'kb-panel';
    var html = ITEMS.map(function (it) {
      return '<a href="' + it.h + '">' + it.t + '</a>';
    }).join('');
    html += '<div class="kb-row">' +
      '<button class="kb-lang" data-lang="NL">NL</button>' +
      '<button class="kb-lang" data-lang="EN">EN</button>' +
      '<button class="kb-res">Reserveren</button>' +
      '</div>';
    p.innerHTML = html;
    document.body.appendChild(p);
  }

  // The bundler rebuilds <head>, wiping the static <title>/favicon — so set
  // them from JS too and re-apply on each tick until things settle.
  var TITLE = 'King Barbo — Barbershop Antwerpen Zuid';
  function ensureHead() {
    if (document.title !== TITLE) document.title = TITLE;
    if (!document.getElementById('kb-fav')) {
      var l = document.createElement('link');
      l.id = 'kb-fav';
      l.rel = 'icon';
      l.type = 'image/svg+xml';
      l.href = '/favicon.svg';
      (document.head || document.documentElement).appendChild(l);
    }
  }

  // Embed a Google map of the location into the "Marnixplaats" placeholder block.
  function ensureMap() {
    var block = document.querySelector('#contact > :last-child');
    if (!block || block.querySelector('#kb-map')) return;
    block.style.position = 'relative';
    block.style.minHeight = '320px';
    block.style.overflow = 'hidden';
    var w = document.createElement('div');
    w.id = 'kb-map';
    w.style.cssText = 'position:absolute;inset:0;z-index:1';
    var f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=Marnixplaats,2000+Antwerpen&z=15&output=embed';
    f.loading = 'lazy';
    f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    f.setAttribute('title', 'Kaart — Marnixplaats, het Zuid in Antwerpen');
    f.style.cssText = 'width:100%;height:100%;border:0;display:block';
    w.appendChild(f);
    block.appendChild(w);
  }

  // Tweak the location wording site-wide.
  function fixText() {
    var rx = /in het Zuid van Antwerpen/g;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (rx.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(rx, 'op het Zuid in Antwerpen');
    }
  }

  // Reveal-on-scroll for headings, paragraphs and price rows.
  var revealDone = false, revealLast = -1;
  function ensureReveal() {
    if (revealDone) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) { revealDone = true; return; }
    var root = document.getElementById('dc-root');
    if (!root) return;
    var nodes = [].slice.call(root.querySelectorAll('h1,h2,h3,p,[style*="grid-template-columns: 1fr auto"]')).filter(function (el) {
      return el.textContent.trim() && !el.closest('nav') && !el.closest('#kb-panel');
    });
    // wait until the rendered count is sizeable AND stable across two ticks
    if (nodes.length < 8 || nodes.length !== revealLast) { revealLast = nodes.length; return; }
    revealDone = true;
    if (!('IntersectionObserver' in window)) return;   // no hiding without an observer
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('kb-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    var perSection = new Map();
    nodes.forEach(function (el) {
      var sec = el.closest('section') || root;
      var i = perSection.get(sec) || 0;
      perSection.set(sec, i + 1);
      el.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
      el.classList.add('kb-reveal');
      io.observe(el);
    });
    // safety net: nothing stays hidden indefinitely
    setTimeout(function () { nodes.forEach(function (el) { el.classList.add('kb-in'); }); }, 9000);
  }

  function ensure() {
    if (!document.documentElement) return;
    ensureHead();
    if (!document.body) return;
    fixText();
    if (!getTheme()) return;          // wait until the nav (and theme) is ready
    ensureStyle();
    ensureHamb();
    ensurePanel();
    ensureMap();
    ensureReveal();
  }

  // ---- open / close -------------------------------------------------------
  function setOpen(open) {
    var h = document.getElementById('kb-hamb');
    var p = document.getElementById('kb-panel');
    if (!h || !p) return;
    if (open) syncLabels();
    h.classList.toggle('kb-open', open);
    p.classList.toggle('kb-open', open);
    h.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function isOpen() {
    var p = document.getElementById('kb-panel');
    return !!(p && p.classList.contains('kb-open'));
  }

  // Mirror the live nav link labels (so EN/NL switch stays in sync)
  function syncLabels() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var live = [].slice.call(nav.querySelectorAll('a[href^="#"]')).filter(function (a) {
      return a.getAttribute('href') !== '#top' && a.textContent.trim();
    });
    var mine = document.querySelectorAll('#kb-panel a');
    live.forEach(function (a) {
      var href = a.getAttribute('href');
      for (var i = 0; i < mine.length; i++) {
        if (mine[i].getAttribute('href') === href) mine[i].textContent = a.textContent.trim();
      }
    });
  }

  // Click a real control rendered by the bundler (by text), even if hidden.
  function clickReal(match) {
    var nav = document.querySelector('nav');
    var pools = [nav ? nav.querySelectorAll('button') : [], document.querySelectorAll('button')];
    for (var i = 0; i < pools.length; i++) {
      var arr = [].slice.call(pools[i]);
      for (var j = 0; j < arr.length; j++) {
        if (match(arr[j].textContent.trim())) { arr[j].click(); return true; }
      }
    }
    return false;
  }

  // ---- delegated click handling (survives re-renders) ---------------------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest && t.closest('#kb-hamb')) { e.preventDefault(); setOpen(!isOpen()); return; }
    if (!t.closest) return;
    if (t.closest('#kb-panel a')) { setOpen(false); return; }      // native #hash jump proceeds
    var lang = t.closest('#kb-panel .kb-lang');
    if (lang) { var L = lang.getAttribute('data-lang'); clickReal(function (s) { return s === L; }); setOpen(false); return; }
    if (t.closest('#kb-panel .kb-res')) { clickReal(function (s) { return /^reserv/i.test(s); }); setOpen(false); return; }
  }, true);

  // Re-ensure nodes exist (cheap insurance against subtree wipes)
  ensure();
  var ticks = 0;
  var iv = setInterval(function () {
    ensure();
    if (++ticks > 60) clearInterval(iv);   // ~30s of guarding, then settle
  }, 500);
})();
