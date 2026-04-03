/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO + Permission check
   v2.2 fixes:
   - หลัง login → redirect dashboard ทันที
   - ไม่มี redirect loop กรณีไม่มี permission
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
   PERMISSION CONFIG — แก้ที่นี่ที่เดียว
   วิธีที่ 1: จำกัด domain
     ALLOWED_DOMAIN = 'kingpower.com'
   วิธีที่ 2: whitelist email ทีละคน
     ALLOWED_DOMAIN = null + เพิ่มใน ALLOWED_EMAILS
══════════════════════════════════════════════ */
var ALLOWED_DOMAIN = null;
var ALLOWED_EMAILS = [
  'sawitree.jakkrawannit@kingpower.com',
  'chawanop.witthayaphirak@kingpower.com',
  'petchpailin.tocharoen@kingpower.com',
  'natpapat.kwaopiwong@kingpower.com',
  'sawi.kpc@gmail.com',
  /* เพิ่ม email ที่นี่ */
];

/* ── Permission check ────────────────────── */
function isAllowed(email) {
  if (!email) return false;
  if (ALLOWED_DOMAIN)
    return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN.toLowerCase());
  return ALLOWED_EMAILS
    .map(function(e){ return e.toLowerCase().trim(); })
    .indexOf(email.toLowerCase().trim()) >= 0;
}

/* ── Screen states ───────────────────────── */
function showLoading() {
  document.getElementById('auth-loading').style.display    = 'flex';
  document.getElementById('auth-login-wrap').style.display = 'none';
  document.getElementById('auth-permission-error').style.display = 'none';
  document.getElementById('auth-screen').style.display     = 'flex';
  document.getElementById('app-screen').style.display      = 'none';
}

function showLogin(errorMsg) {
  document.getElementById('auth-loading').style.display    = 'none';
  document.getElementById('auth-login-wrap').style.display = 'block';
  document.getElementById('auth-permission-error').style.display = 'none';
  document.getElementById('auth-screen').style.display     = 'flex';
  document.getElementById('app-screen').style.display      = 'none';
  var btn = document.getElementById('auth-google-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
  var err = document.getElementById('auth-error');
  if (err) err.textContent = errorMsg || '';
}

function showApp(user) {
  /* Reset auth screen states before hiding */
  document.getElementById('auth-loading').style.display    = 'none';
  document.getElementById('auth-login-wrap').style.display = 'block';
  document.getElementById('auth-permission-error').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';
  var emailEl  = document.getElementById('auth-user-email');
  if (emailEl) emailEl.textContent = user.displayName || user.email;
  var avatarEl = document.getElementById('auth-user-avatar');
  if (avatarEl && user.photoURL) {
    avatarEl.src = user.photoURL;
    avatarEl.style.display = 'inline-block';
  }
  if (typeof loadData === 'function') {
    try { loadData(); } catch(e) { console.error('[Auth] loadData error:', e); }
  } else {
    setTimeout(function(){ if (typeof loadData === 'function') loadData(); }, 300);
  }
}

function showPermissionError(email) {
  /* ── Mark session as denied ──────────────
     ใช้ sessionStorage แทน signOut
     ป้องกัน redirect loop:
     signOut → onAuthStateChanged(null) → showLogin
     → user click sign in → same account → loop
  ─────────────────────────────────────────*/
  sessionStorage.setItem('gdb_denied_email', email);
  document.getElementById('auth-loading').style.display    = 'none';
  document.getElementById('auth-login-wrap').style.display = 'none';
  document.getElementById('auth-permission-error').style.display = 'block';
  document.getElementById('auth-screen').style.display     = 'flex';
  document.getElementById('app-screen').style.display      = 'none';
  var emailEl = document.getElementById('auth-denied-email');
  if (emailEl) emailEl.textContent = email || '';
}

/* ── Init: loading state immediately ─────── */
showLoading();

/* ── Handle redirect result ─────────────── */
getRedirectResult(auth)
  .then(function(result) { /* onAuthStateChanged handles */ })
  .catch(function(e) {
    var msg = 'Sign-in failed. Please try again.';
    if (e.code === 'auth/unauthorized-domain') msg = 'Domain not authorized. Contact admin.';
    showLogin(msg);
  });

/* ── Auth state observer ─────────────────── */
onAuthStateChanged(auth, function(user) {
  if (user) {
    if (isAllowed(user.email)) {
      sessionStorage.removeItem('gdb_denied_email');
      showApp(user);
    } else {
      /* ไม่ sign out — แค่แสดง error และ sign out เบื้องหลัง */
      showPermissionError(user.email);
      signOut(auth); /* sign out เงียบๆ ไม่ trigger redirect loop */
    }
  } else {
    /* user = null → check ว่าเคย denied ไปแล้วหรือเปล่า */
    var denied = sessionStorage.getItem('gdb_denied_email');
    if (denied) {
      /* ยังอยู่หน้า denied — ไม่ต้องทำอะไร permission error ยังแสดงอยู่ */
    } else {
      showLogin();
    }
  }
});

/* ── Sign in ─────────────────────────────── */
function signInWithGoogle() {
  sessionStorage.removeItem('gdb_denied_email');
  var btn = document.getElementById('auth-google-btn');
  var err = document.getElementById('auth-error');
  if (err) err.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting\u2026'; }
  signInWithRedirect(auth, provider)
    .catch(function(e){ showLogin('Sign-in failed: ' + (e.message || e.code)); });
}

/* ── Wire up ─────────────────────────────── */
document.getElementById('auth-google-btn')
  ?.addEventListener('click', signInWithGoogle);

document.getElementById('auth-logout-btn')
  ?.addEventListener('click', function(){
    sessionStorage.removeItem('gdb_denied_email');
    signOut(auth);
  });

document.getElementById('auth-try-again-btn')
  ?.addEventListener('click', function(){
    sessionStorage.removeItem('gdb_denied_email');
    showLogin();
  });
