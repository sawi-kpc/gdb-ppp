/* ══════════════════════════════════════════════
   AUTH v3.0 — Firebase Compat (non-module)
   ใช้ Firebase compat SDK ไม่ใช่ ES module
   เพื่อหลีกเลี่ยงปัญหา CORS/module import
══════════════════════════════════════════════ */

/* ══ PERMISSION CONFIG ════════════════════
   วิธีที่ 1 (แนะนำ): จำกัด domain
     ALLOWED_DOMAIN = 'kingpower.com'
   วิธีที่ 2: whitelist email
     ALLOWED_DOMAIN = null
     เพิ่ม email ใน ALLOWED_EMAILS
════════════════════════════════════════════ */
var ALLOWED_DOMAIN = null;
var ALLOWED_EMAILS = [
  'sawitree.jakkrawannit@kingpower.com',
  'chawanop.witthayaphirak@kingpower.com',
  'petchpailin.tocharoen@kingpower.com',
  'natpapat.kwaopiwong@kingpower.com',
  'sawi.kpc@gmail.com'
  /* เพิ่ม email ที่นี่ */
];

/* ── Firebase init (compat SDK) ──────────── */
var firebaseConfig = {
  apiKey:            "AIzaSyCaS5kLNbm5lSLRHd1rdr0sXRCS5lB_Rgc",
  authDomain:        "gdb-dashboard-prod.firebaseapp.com",
  projectId:         "gdb-dashboard-prod",
  storageBucket:     "gdb-dashboard-prod.firebasestorage.app",
  messagingSenderId: "170622130981",
  appId:             "1:170622130981:web:23302ed9a5ce4e82ac58cc"
};

firebase.initializeApp(firebaseConfig);
var auth     = firebase.auth();
var provider = new firebase.auth.GoogleAuthProvider();

/* ── Permission check ────────────────────── */
function isAllowed(email) {
  if (!email) return false;
  if (ALLOWED_DOMAIN)
    return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN.toLowerCase());
  return ALLOWED_EMAILS
    .map(function(e){ return e.toLowerCase().trim(); })
    .indexOf(email.toLowerCase().trim()) >= 0;
}

/* ── DOM helpers ─────────────────────────── */
function el(id) { return document.getElementById(id); }
function show(id, type) { var e=el(id); if(e) e.style.display = type||'block'; }
function hide(id) { var e=el(id); if(e) e.style.display = 'none'; }

/* ── State machine ───────────────────────── */
function setState(state, data) {
  hide('app-screen');
  show('auth-screen','flex');
  hide('auth-loading');
  hide('auth-login-wrap');
  hide('auth-permission-error');
  var errEl = el('auth-error');
  if (errEl) errEl.textContent = '';

  if (state === 'loading') {
    show('auth-loading','flex');

  } else if (state === 'login') {
    show('auth-login-wrap');
    var btn = el('auth-google-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
    if (data && errEl) errEl.textContent = data;

  } else if (state === 'app') {
    hide('auth-screen');
    show('app-screen');
    var emailEl  = el('auth-user-email');
    var avatarEl = el('auth-user-avatar');
    if (emailEl)  emailEl.textContent = data.displayName || data.email;
    if (avatarEl && data.photoURL) {
      avatarEl.src = data.photoURL;
      avatarEl.style.display = 'inline-block';
    }
    if (typeof loadData === 'function') {
      try { loadData(); } catch(e) { console.error('[Auth] loadData:', e); }
    } else {
      setTimeout(function(){ if (typeof loadData === 'function') loadData(); }, 300);
    }

  } else if (state === 'denied') {
    show('auth-permission-error');
    var deniedEl = el('auth-denied-email');
    if (deniedEl) deniedEl.textContent = data || '';
  }
}

/* ── Init ────────────────────────────────── */
setState('loading');

/* ── Handle redirect result ──────────────── */
auth.getRedirectResult()
  .then(function(result) { /* onAuthStateChanged handles */ })
  .catch(function(e) {
    console.warn('[Auth] redirect error:', e.code, e.message);
    setState('login', 'Sign-in failed. Please try again.');
  });

/* ── Auth state observer ─────────────────── */
auth.onAuthStateChanged(function(user) {
  if (user) {
    if (isAllowed(user.email)) {
      sessionStorage.removeItem('gdb_denied');
      setState('app', user);
    } else {
      sessionStorage.setItem('gdb_denied', user.email);
      setState('denied', user.email);
      auth.signOut();
    }
  } else {
    var denied = sessionStorage.getItem('gdb_denied');
    if (denied) {
      setState('denied', denied);
    } else {
      setState('login');
    }
  }
});

/* ── Sign in ─────────────────────────────── */
el('auth-google-btn').addEventListener('click', function() {
  sessionStorage.removeItem('gdb_denied');
  setState('loading');
  auth.signInWithRedirect(provider).catch(function(e) {
    setState('login', 'Sign-in failed: ' + (e.message || e.code));
  });
});

/* ── Sign out ────────────────────────────── */
var logoutBtn = el('auth-logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', function() {
  sessionStorage.removeItem('gdb_denied');
  auth.signOut();
});

/* ── Try again ───────────────────────────── */
var tryAgainBtn = el('auth-try-again-btn');
if (tryAgainBtn) tryAgainBtn.addEventListener('click', function() {
  sessionStorage.removeItem('gdb_denied');
  setState('login');
});
