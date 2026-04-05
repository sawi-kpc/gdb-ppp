/* ══════════════════════════════════════════════
   GDB Header v4.0 — shared across ALL pages
   Renders topbar + nav, handles auth state
══════════════════════════════════════════════ */

/* ── NAV CONFIG ─────────────────────────────── */
var GDB_NAV = [
  { label: 'Summary',     href: '/gdb-ppp/channel/',             icon: '◉' },
  { label: 'Initiatives', href: '/gdb-ppp/initiative/index.html',    icon: '◈' },
  { type: 'divider' },
  { label: 'KP.com',   href: '/gdb-ppp/channel/kp.html',      color: '#3b82f6' },
  { label: 'Firster',  href: '/gdb-ppp/channel/firster.html',  color: '#a855f7' },
  { label: 'KP.CN',    href: '/gdb-ppp/channel/kpcn.html',     color: '#f0900d' },
  { label: 'THT',      href: '/gdb-ppp/channel/tht.html',      color: '#10b981' },
  { label: 'Dmall',    href: '/gdb-ppp/channel/dmall.html',    color: '#f59e0b' },
  { label: 'JD',       href: '/gdb-ppp/channel/jd.html',       color: '#f43f5e' },
];

/* ── BUILD HEADER ───────────────────────────── */
function buildGdbHeader(opts) {
  opts = opts || {};
  var currentPath = window.location.pathname;

  /* Header HTML */
  var headerHtml = '<header class="gdb-header">' +
    '<a class="gdb-header-brand" href="/gdb-ppp/summary.html">' +
      '<div class="gdb-logo">GDB</div>' +
      '<div><div class="gdb-brand-name">GDB Dashboard</div>' +
      '<div class="gdb-brand-sub">King Power Digital Commerce</div></div>' +
    '</a>' +
    '<div class="gdb-header-spacer"></div>' +
    '<div class="gdb-header-right">' +
      (opts.showRefresh ? '<button class="gdb-refresh-btn" id="gdb-refresh-btn">↻ Refresh</button>' : '') +
      '<div class="gdb-update-time" id="gdb-update-time"></div>' +
      '<div class="gdb-user">' +
        '<div class="gdb-user-avatar" id="gdb-user-avatar"><span id="gdb-user-initial">?</span><img id="gdb-user-photo" src="" alt="" style="display:none"></div>' +
        '<span class="gdb-user-name" id="gdb-user-name"></span>' +
      '</div>' +
      '<button class="gdb-signout-btn" id="gdb-signout-btn">Sign out</button>' +
    '</div>' +
  '</header>';

  /* Nav HTML */
  var navHtml = '<nav class="gdb-nav">';
  GDB_NAV.forEach(function(item) {
    if (item.type === 'divider') {
      navHtml += '<div class="gdb-nav-divider"></div>';
    } else {
      var isActive = currentPath === item.href || currentPath.endsWith(item.href.split('/gdb-ppp')[1]);
      var cls = 'gdb-nav-item' + (isActive ? ' active' : '');
      var dot = item.color ? '<span class="gdb-nav-channel-dot" style="background:' + item.color + '"></span>' : '';
      navHtml += '<a class="' + cls + '" href="' + item.href + '">' + dot + item.label + '</a>';
    }
  });
  navHtml += '</nav>';

  /* Inject into page */
  document.body.insertAdjacentHTML('afterbegin', navHtml);
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
      else if (typeof loadSummary === 'function') loadSummary();
    });
  }
}

/* ── SET USER INFO ───────────────────────────── */
function setGdbUser(user) {
  var nameEl    = document.getElementById('gdb-user-name');
  var initEl    = document.getElementById('gdb-user-initial');
  var photoEl   = document.getElementById('gdb-user-photo');
  var avatarEl  = document.getElementById('gdb-user-avatar');

  if (!user) return;

  var name = user.displayName || user.email || '';
  if (nameEl)   nameEl.textContent = name;
  if (initEl)   initEl.textContent = name.charAt(0).toUpperCase();
  if (photoEl && user.photoURL) {
    photoEl.src = user.photoURL;
    photoEl.style.display = 'block';
    if (initEl) initEl.style.display = 'none';
  }
}

/* ── SET UPDATE TIME ─────────────────────────── */
function setGdbUpdateTime(ts) {
  var el = document.getElementById('gdb-update-time');
  if (!el || !ts) return;
  var d = new Date(ts);
  el.textContent = 'Updated: ' + d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', hour12: false,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/* ── AUTH GUARD for channel/initiative pages ─── */
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
    if (!user) {
      window.location.href = '/gdb-ppp/';
      return;
    }
    setGdbUser(user);
    if (typeof onUser === 'function') onUser(user, _auth);
  });
}
