/* ══════════════════════════════════════════════
   GDB Header v4.1 — shared across ALL pages
   Performance: Summary + Channels
   PPP: Initiatives (dropdown) + Issues + Support
══════════════════════════════════════════════ */

/* ── CSS for dropdown nav ────────────────── */
var _headerStyle = document.createElement('style');
_headerStyle.textContent = '.gdb-nav{position:fixed;top:var(--header-h);left:0;right:0;z-index:99;height:var(--nav-h);background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:stretch;padding:0 20px;gap:2px;overflow:visible;}.gdb-nav::-webkit-scrollbar{height:0;}.gdb-nav-item{display:flex;align-items:center;padding:0 12px;font-size:12px;font-weight:500;color:var(--text2);text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;cursor:pointer;background:none;border-top:none;border-left:none;border-right:none;}.gdb-nav-item:hover{color:var(--text);text-decoration:none;}.gdb-nav-item.active{color:var(--accent);border-bottom-color:var(--accent);}.gdb-nav-divider{width:1px;background:var(--border);margin:10px 8px;}.gdb-nav-section{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;padding:0 8px 0 4px;}.gdb-nav-channel-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px;flex-shrink:0;}.gdb-nav-badge{font-size:9px;font-weight:700;color:var(--text3);background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:1px 5px;margin-left:5px;}.gdb-clear-cache-btn{display:flex;align-items:center;gap:5px;padding:0 11px;height:28px;font-size:11px;font-weight:600;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:5px;cursor:pointer;transition:all .15s;white-space:nowrap;}.gdb-clear-cache-btn:hover{color:var(--text);border-color:var(--text2);}.gdb-clear-cache-btn:active{opacity:.7;}.gdb-cache-badge{display:none;align-items:center;gap:5px;font-size:10px;font-weight:600;border-radius:4px;padding:2px 8px;white-space:nowrap;transition:all .3s;}.gdb-cache-badge.is-cached{color:#58a6ff;background:rgba(88,166,255,.1);border:1px solid rgba(88,166,255,.25);}.gdb-cache-badge.is-live{color:#3fb950;background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.25);}.gdb-cache-badge.is-loading{color:var(--text3);background:var(--surface2);border:1px solid var(--border);}@keyframes gdb-pulse{0%,100%{opacity:1}50%{opacity:.35}}.gdb-cache-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0;}.is-live .gdb-cache-dot{background:#3fb950;animation:gdb-pulse 1.8s ease-in-out infinite;}.is-cached .gdb-cache-dot{background:#58a6ff;}.is-loading .gdb-cache-dot{background:var(--text3);}.gdb-init-subnav{position:fixed;top:calc(var(--header-h) + var(--nav-h));left:0;right:0;z-index:98;height:36px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:stretch;padding:0 20px;gap:2px;}.gdb-init-tab{display:flex;align-items:center;padding:0 14px;font-size:12px;font-weight:500;color:var(--text2);text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;}.gdb-init-tab:hover{color:var(--text);text-decoration:none;}.gdb-init-tab.active{color:var(--accent);border-bottom-color:var(--accent);}.has-init-subnav{padding-top:calc(var(--header-h) + var(--nav-h) + 36px) !important;}.gdb-theme-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;font-size:15px;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:5px;cursor:pointer;transition:all .15s;flex-shrink:0;}.gdb-theme-btn:hover{color:var(--text);border-color:var(--text2);}[data-theme=light] body{background:var(--bg) !important;color:var(--text) !important;}[data-theme=light] .gdb-header{background:var(--surface);border-bottom-color:var(--border);}[data-theme=light] .gdb-nav{background:var(--surface);border-bottom-color:var(--border);}[data-theme=light] .gdb-nav-item{color:var(--text2);}[data-theme=light] .gdb-nav-item.active{color:var(--accent);}[data-theme=light] .gdb-nav-section{color:var(--text3);}[data-theme=light] .gdb-nav-badge{color:var(--text3);background:var(--surface2);border-color:var(--border);}[data-theme=light] .gdb-nav-divider{background:var(--border);}[data-theme=light] .gdb-init-subnav{background:var(--surface2);border-bottom-color:var(--border);}[data-theme=light] .gdb-refresh-btn{color:var(--text2);background:var(--surface2);border-color:var(--border);}[data-theme=light] .gdb-clear-cache-btn{color:var(--text2);background:var(--surface2);border-color:var(--border);}';
document.head.appendChild(_headerStyle);


/* ── Initiative sub-tab bar ──────────────────────────────
   Call this on initiative pages to render a tab bar
   that appears below the main nav bar.
   Styled identically to channel tab-bar (tabs-bar).
─────────────────────────────────────────────────── */
function buildGdbInitiativeSubNav() {
  var p = window.location.pathname;
  var timelineActive  = (p.endsWith('/initiative/index.html') || p.endsWith('/initiative/')) ? ' active' : '';
  var dashActive      = p.endsWith('/initiative/dashboard.html') ? ' active' : '';
  var listActive      = p.endsWith('/initiative/list.html') ? ' active' : '';
  var compActive      = p.endsWith('/initiative/completed.html') ? ' active' : '';

  var subNav = '<div class="gdb-init-subnav" id="gdb-init-subnav">' +
    '<a class="gdb-init-tab' + timelineActive + '" href="/gdb-ppp/initiative/index.html">Timeline</a>' +
    '<a class="gdb-init-tab' + dashActive + '" href="/gdb-ppp/initiative/dashboard.html">Dashboard</a>' +
    '<a class="gdb-init-tab' + listActive + '" href="/gdb-ppp/initiative/list.html">List</a>' +
    '<a class="gdb-init-tab' + compActive + '" href="/gdb-ppp/initiative/completed.html">Completed</a>' +
  '</div>';

  document.body.insertAdjacentHTML('afterbegin', subNav);

  /* Align subnav left edge with the PPP divider in the nav bar */
  requestAnimationFrame(function() {
    var subNavEl = document.getElementById('gdb-init-subnav');
    if (!subNavEl) return;
    /* Find the divider before PPP section to align from that point */
    var divider = document.querySelector('.gdb-nav-divider');
    if (divider) {
      var rect = divider.getBoundingClientRect();
      subNavEl.style.left = rect.right + 'px';
    }
  });
}



/* ── Cache status badge helpers (used by channel + initiative) ── */
function gdbSetCacheBadge(state, label) {
  /* state: 'live' | 'cached' | 'loading' | 'hide' */
  var el  = document.getElementById('gdb-cache-badge');
  var lbl = document.getElementById('gdb-cache-label');
  if (!el) return;
  el.classList.remove('is-live', 'is-cached', 'is-loading');
  if (state === 'hide') { el.style.display = 'none'; return; }
  el.style.display = 'inline-flex';
  el.classList.add('is-' + state);
  if (lbl) lbl.textContent = label || state;
}

/* ── BUILD HEADER ────────────────────────── */
function buildGdbHeader(opts) {
  /* Apply saved theme before rendering to avoid flash */
  (function() {
    var t = localStorage.getItem('gdb_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    /* Remove any stale inline background so CSS vars take full effect */
    document.documentElement.style.removeProperty('background');
  })();
  opts = opts || {};
  var p = window.location.pathname;

  var headerHtml = '<header class="gdb-header">' +
    '<a class="gdb-header-brand" href="/gdb-ppp/channel/">' +
      '<div class="gdb-logo">GDB</div>' +
      '<div><div class="gdb-brand-name">GDB Dashboard</div>' +
      '<div class="gdb-brand-sub">King Power Digital Commerce</div></div>' +
    '</a>' +
    '<div class="gdb-header-spacer"></div>' +
    '<div class="gdb-header-right">' +
      '<span class="gdb-cache-badge" id="gdb-cache-badge"><span class="gdb-cache-dot"></span><span id="gdb-cache-label"></span></span>' +
      '<div class="gdb-update-time" id="gdb-update-time"></div>' +
      (opts.showRefresh ? '<button class="gdb-refresh-btn" id="gdb-refresh-btn">\u21bb Refresh</button>' : '') +
      '<button class="gdb-clear-cache-btn" id="gdb-clear-cache-btn" title="Clear cached data and reload">\u2715 Clear cache</button>' +
      '<button class="gdb-theme-btn" id="gdb-theme-btn">&#9680;</button>' +
      '<div class="gdb-user">' +
        '<div class="gdb-user-avatar" id="gdb-user-avatar">' +
          '<span id="gdb-user-initial">?</span>' +
          '<img id="gdb-user-photo" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;border-radius:50%">' +
        '</div>' +
        '<span class="gdb-user-name" id="gdb-user-name"></span>' +
      '</div>' +
      '<button class="gdb-signout-btn" id="gdb-signout-btn">Sign out</button>' +
    '</div>' +
  '</header>';

  /* ── NAV ── */
  var nav = '<nav class="gdb-nav">';

  /* Performance section */
  nav += '<span class="gdb-nav-section">Performance</span>';

  /* Summary */
  var sumActive = (p.endsWith('/channel/') || p.endsWith('/channel/index.html')) ? ' active' : '';
  nav += '<a class="gdb-nav-item' + sumActive + '" href="/gdb-ppp/channel/">Summary</a>';

  /* Channel links */
  var channels = [
    { key:'KP1',   label:'KP.com',  color:'#3b82f6', href:'/gdb-ppp/channel/kp.html' },
    { key:'F1',    label:'Firster', color:'#a855f7', href:'/gdb-ppp/channel/firster.html' },
    { key:'KPCN',  label:'KP.CN',   color:'#f0900d', href:'/gdb-ppp/channel/kpcn.html' },
    { key:'THT',   label:'THT',     color:'#10b981', href:'/gdb-ppp/channel/tht.html' },
    { key:'DMALL', label:'Dmall',   color:'#f59e0b', href:'/gdb-ppp/channel/dmall.html' },
    { key:'JD',    label:'JD',      color:'#f43f5e', href:'/gdb-ppp/channel/jd.html' },
  ];
  channels.forEach(function(ch) {
    var isActive = p.endsWith(ch.href.split('/gdb-ppp')[1]) ? ' active' : '';
    nav += '<a class="gdb-nav-item' + isActive + '" href="' + ch.href + '">' +
           '<span class="gdb-nav-channel-dot" style="background:' + ch.color + '"></span>' +
           ch.label + '</a>';
  });

  /* Divider */
  nav += '<div class="gdb-nav-divider"></div>';

  /* PPP section */
  nav += '<span class="gdb-nav-section">Products &amp; Projects Portfolio</span>';

  /* Initiatives dropdown */
  var initPaths = ['/initiative/', '/initiative/index.html', '/initiative/dashboard.html', '/initiative/list.html', '/initiative/completed.html'];
  var initActive = initPaths.some(function(ip){ return p.includes(ip); }) ? ' active' : '';
  var dashActive = (p.endsWith('/initiative/dashboard.html')) ? ' active' : '';
  var listActive = p.endsWith('/initiative/list.html') ? ' active' : '';
  var compActive = p.endsWith('/initiative/completed.html') ? ' active' : '';

  /* Initiatives — single nav item; sub-tabs rendered by buildGdbInitiativeSubNav() */
  nav += '<a class="gdb-nav-item' + initActive + '" href="/gdb-ppp/initiative/index.html">Initiatives</a>';

  /* Issues */
  var issueActive = p.includes('/issue/') ? ' active' : '';
  nav += '<a class="gdb-nav-item' + issueActive + '" href="/gdb-ppp/issue/">' +
         'Issues <span class="gdb-nav-badge">soon</span></a>';

  /* Support */
  var suppActive = p.includes('/support/') ? ' active' : '';
  nav += '<a class="gdb-nav-item' + suppActive + '" href="/gdb-ppp/support/">' +
         'Support Tasks <span class="gdb-nav-badge">soon</span></a>';

  nav += '</nav>';

  document.body.insertAdjacentHTML('afterbegin', nav);
  document.body.insertAdjacentHTML('afterbegin', headerHtml);

  /* Wire sign out */
  var signoutBtn = document.getElementById('gdb-signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', function() {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(function() {
          window.location.href = '/gdb-ppp/';
        });
      }
    });
  }

  /* Wire refresh */
  var refreshBtn = document.getElementById('gdb-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      if (typeof init === 'function') init();
      else if (typeof loadData === 'function') loadData();
      else if (typeof loadSummary === 'function') loadSummary();
    });
  }
  /* ── Clear Cache button ─────────────────────────────────── */
  var clearCacheBtn = document.getElementById('gdb-clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', function() {
      if (typeof clearAllCache === 'function') {
        clearAllCache();
      } else {
        try {
          Object.keys(localStorage)
            .filter(function(k) { return k.startsWith('gdb_'); })
            .forEach(function(k) { localStorage.removeItem(k); });
        } catch(e) {}
      }
      var badge = document.getElementById('gdb-cache-badge');
      if (badge) badge.style.display = 'none';
      clearCacheBtn.textContent = '↺ Clearing…';
      clearCacheBtn.disabled = true;
      setTimeout(function() { window.location.reload(); }, 300);
    });
  }

  /* ── Theme toggle button ─────────────────────────────── */
  var _themeBtn = document.getElementById('gdb-theme-btn');
  if (_themeBtn) {
    function _syncThemeBtn() {
      var t = document.documentElement.getAttribute('data-theme') || 'dark';
      _themeBtn.innerHTML = t === 'light' ? '&#9681;' : '&#9680;';
      _themeBtn.title = t === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    }
    _syncThemeBtn();
    _themeBtn.addEventListener('click', function() {
      var cur  = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.style.removeProperty('background');
      localStorage.setItem('gdb_theme', next);
      _syncThemeBtn();
      if (typeof rebuildCharts === 'function') setTimeout(rebuildCharts, 40);
    });
  }
}

/* ── SET USER ────────────────────────────── */
function setGdbUser(user) {
  if (!user) return;
  var name = user.displayName || user.email || '';
  var nameEl   = document.getElementById('gdb-user-name');
  var initEl   = document.getElementById('gdb-user-initial');
  var photoEl  = document.getElementById('gdb-user-photo');
  if (nameEl)  nameEl.textContent = name;
  if (initEl)  initEl.textContent = name.charAt(0).toUpperCase();
  if (photoEl && user.photoURL) {
    photoEl.src = user.photoURL;
    photoEl.style.display = 'block';
    if (initEl) initEl.style.display = 'none';
  }
}

/* ── SET UPDATE TIME ─────────────────────── */
function setGdbUpdateTime(ts) {
  var el = document.getElementById('gdb-update-time');
  if (!el || !ts) return;
  var d = new Date(ts);
  el.textContent = d.toLocaleString('en-GB', {
    timeZone: 'Asia/Bangkok', hour12: false,
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

/* ── AUTH GUARD ──────────────────────────── */
function gdbAuthGuard(onUser) {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey:            'AIzaSyCaS5kLNbm5lSLRHd1rdr0sXRCS5lB_Rgc',
      authDomain:        'gdb-dashboard-prod.firebaseapp.com',
      projectId:         'gdb-dashboard-prod',
      storageBucket:     'gdb-dashboard-prod.firebasestorage.app',
      messagingSenderId: '170622130981',
      appId:             '1:170622130981:web:23302ed9a5ce4e82ac58cc'
    });
  }
  var _auth = firebase.auth();
  var _unsub = _auth.onAuthStateChanged(function(user) {
    _unsub();
    if (!user) { window.location.href = '/gdb-ppp/'; return; }
    setGdbUser(user);
    if (typeof onUser === 'function') onUser(user, _auth);
  });
}
