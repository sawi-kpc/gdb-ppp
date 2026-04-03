/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO + Permission check
   Depends on: config.js, render.js, data.js
══════════════════════════════════════════════ */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider,
         signInWithRedirect, getRedirectResult,
         signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCaS5kLNbm5lSLRHd1rdr0sXRCS5lB_Rgc",
  authDomain:        "gdb-dashboard-prod.firebaseapp.com",
  projectId:         "gdb-dashboard-prod",
  storageBucket:     "gdb-dashboard-prod.firebasestorage.app",
  messagingSenderId: "170622130981",
  appId:             "1:170622130981:web:23302ed9a5ce4e82ac58cc"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

/* ══════════════════════════════════════════════
   PERMISSION CONFIG
   วิธีจำกัดสิทธิ์ — เลือกวิธีใดวิธีหนึ่ง:

   วิธีที่ 1 (แนะนำ): จำกัด domain
     ตั้ง ALLOWED_DOMAIN = 'kingpower.com'
     ทุก @kingpower.com เข้าได้หมด

   วิธีที่ 2: whitelist รายชื่อ email
     ตั้ง ALLOWED_DOMAIN = null
     แล้วเพิ่ม email ใน ALLOWED_EMAILS
══════════════════════════════════════════════ */
var ALLOWED_DOMAIN = null;          /* เช่น 'kingpower.com' */
var ALLOWED_EMAILS = [
  'sawitree.jakkrawannit@kingpower.com',
  'chawanop.witthayaphirak@kingpower.com',
  'petchpailin.tocharoen@kingpower.com',
  'natpapat.kwaopiwong@kingpower.com',
  'sawi.kpc@gmail.com',
  /* เพิ่ม email ที่ต้องการให้เข้าได้ที่นี่ */
];

/* ── Permission check ────────────────────── */
function isAllowed(email) {
  if (!email) return false;
  /* ถ้าตั้ง domain — check domain ก่อน */
  if (ALLOWED_DOMAIN) {
    return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN.toLowerCase());
  }
  /* ไม่ตั้ง domain — check whitelist */
  return ALLOWED_EMAILS.map(function(e) {
    return e.toLowerCase().trim();
  }).indexOf(email.toLowerCase().trim()) >= 0;
}

/* ── Show / Hide screens ─────────────────── */
function showApp(user) {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';

  var emailEl = document.getElementById('auth-user-email');
  if (emailEl) emailEl.textContent = user.displayName || user.email;

  var avatarEl = document.getElementById('auth-user-avatar');
  if (avatarEl && user.photoURL) {
    avatarEl.src = user.photoURL;
    avatarEl.style.display = 'inline-block';
  }

  if (typeof loadData === 'function') {
    try { loadData(); } catch(e) { console.error('[Auth] loadData error:', e); }
  } else {
    setTimeout(function() {
      if (typeof loadData === 'function') loadData();
    }, 300);
  }
}

function showLogin(errorMsg) {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';

  var btn = document.getElementById('auth-google-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }

  var err = document.getElementById('auth-error');
  if (err) err.textContent = errorMsg || '';

  var permErr = document.getElementById('auth-permission-error');
  if (permErr) permErr.style.display = 'none';
}

function showPermissionError(email) {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';

  /* Hide login button, show permission error panel */
  var loginWrap = document.getElementById('auth-login-wrap');
  if (loginWrap) loginWrap.style.display = 'none';

  var permErr = document.getElementById('auth-permission-error');
  if (permErr) {
    permErr.style.display = 'block';
    var emailEl = permErr.querySelector('#auth-denied-email');
    if (emailEl) emailEl.textContent = email || '';
  }
}

/* ── Handle redirect result ──────────────── */
getRedirectResult(auth)
  .then(function(result) { /* onAuthStateChanged handles it */ })
  .catch(function(e) {
    var msg = 'Sign-in failed. Please try again.';
    if (e.code === 'auth/unauthorized-domain') msg = 'Domain not authorized. Contact admin.';
    showLogin(msg);
  });

/* ── Auth state observer ─────────────────── */
onAuthStateChanged(auth, function(user) {
  if (user) {
    if (isAllowed(user.email)) {
      showApp(user);
    } else {
      /* Sign out immediately, show permission error */
      signOut(auth).then(function() {
        showPermissionError(user.email);
      });
    }
  } else {
    showLogin();
  }
});

/* ── Sign in ─────────────────────────────── */
function signInWithGoogle() {
  var btn = document.getElementById('auth-google-btn');
  var err = document.getElementById('auth-error');
  if (err) err.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting\u2026'; }
  signInWithRedirect(auth, provider)
    .catch(function(e) { showLogin('Sign-in failed: ' + (e.message || e.code)); });
}

/* ── Wire up ─────────────────────────────── */
var loginBtn  = document.getElementById('auth-google-btn');
var logoutBtn = document.getElementById('auth-logout-btn');
var tryAgain  = document.getElementById('auth-try-again-btn');

if (loginBtn)  loginBtn.addEventListener('click', signInWithGoogle);
if (logoutBtn) logoutBtn.addEventListener('click', function() { signOut(auth); });
if (tryAgain)  tryAgain.addEventListener('click', function() {
  var loginWrap = document.getElementById('auth-login-wrap');
  var permErr   = document.getElementById('auth-permission-error');
  if (loginWrap) loginWrap.style.display = 'block';
  if (permErr)   permErr.style.display   = 'none';
});
