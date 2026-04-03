/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO + Permission check
   v2.1 — fixed redirect flash with loading state
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
   วิธีที่ 1: จำกัด domain (แนะนำ)
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
  /* เพิ่ม email ที่ต้องการให้เข้าได้ที่นี่ */
];

/* ── Permission check ────────────────────── */
function isAllowed(email) {
  if (!email) return false;
  if (ALLOWED_DOMAIN)
    return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN.toLowerCase());
  return ALLOWED_EMAILS.map(function(e){ return e.toLowerCase().trim(); })
    .indexOf(email.toLowerCase().trim()) >= 0;
}

/* ── Screen states ───────────────────────────
   4 states: loading → login | app | denied
   ตอน page load แสดง loading ก่อนเสมอ
   ป้องกัน login flash ระหว่าง Firebase check
─────────────────────────────────────────────*/
function showLoading() {
  document.getElementById('auth-loading').style.display  = 'flex';
  document.getElementById('auth-login-wrap').style.display = 'none';
  document.getElementById('auth-permission-error').style.display = 'none';
  document.getElementById('auth-screen').style.display   = 'flex';
  document.getElementById('app-screen').style.display    = 'none';
}

function showLogin(errorMsg) {
  document.getElementById('auth-loading').style.display  = 'none';
  document.getElementById('auth-login-wrap').style.display = 'block';
  document.getElementById('auth-permission-error').style.display = 'none';
  document.getElementById('auth-screen').style.display   = 'flex';
  document.getElementById('app-screen').style.display    = 'none';
  var btn = document.getElementById('auth-google-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
  var err = document.getElementById('auth-error');
  if (err) err.textContent = errorMsg || '';
}

function showApp(user) {
  document.getElementById('auth-screen').style.display   = 'none';
  document.getElementById('app-screen').style.display    = 'block';
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
  document.getElementById('auth-loading').style.display  = 'none';
  document.getElementById('auth-login-wrap').style.display = 'none';
  document.getElementById('auth-permission-error').style.display = 'block';
  document.getElementById('auth-screen').style.display   = 'flex';
  document.getElementById('app-screen').style.display    = 'none';
  var emailEl = document.getElementById('auth-denied-email');
  if (emailEl) emailEl.textContent = email || '';
}

/* ── Init: show loading immediately ─────────
   Firebase ต้องการเวลา check session
   แสดง loading spinner ระหว่างรอ
─────────────────────────────────────────────*/
showLoading();

/* ── Handle redirect return ─────────────── */
getRedirectResult(auth)
  .then(function(result) { /* onAuthStateChanged จะ handle */ })
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
      signOut(auth).then(function(){ showPermissionError(user.email); });
    }
  } else {
    /* user = null → not logged in → show login */
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
    .catch(function(e){ showLogin('Sign-in failed: ' + (e.message || e.code)); });
}

/* ── Wire up buttons ─────────────────────── */
document.getElementById('auth-google-btn')
  ?.addEventListener('click', signInWithGoogle);
document.getElementById('auth-logout-btn')
  ?.addEventListener('click', function(){ signOut(auth); });
document.getElementById('auth-try-again-btn')
  ?.addEventListener('click', function(){ showLogin(); });
