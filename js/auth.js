/* ══════════════════════════════════════════════
   AUTH v2.3 — Simple & Reliable
   Firebase Google SSO for GitHub Pages
══════════════════════════════════════════════ */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider,
         signInWithRedirect, getRedirectResult,
         signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/* ── Firebase init ───────────────────────── */
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

/* ══ PERMISSION CONFIG ════════════════════
   วิธีที่ 1 (แนะนำ): จำกัด domain
     ALLOWED_DOMAIN = 'kingpower.com'
   วิธีที่ 2: whitelist email
     ALLOWED_DOMAIN = null
     เพิ่ม email ใน ALLOWED_EMAILS
════════════════════════════════════════════ */
const ALLOWED_DOMAIN = null;
const ALLOWED_EMAILS = [
  'sawitree.jakkrawannit@kingpower.com',
  'chawanop.witthayaphirak@kingpower.com',
  'petchpailin.tocharoen@kingpower.com',
  'natpapat.kwaopiwong@kingpower.com',
  'sawi.kpc@gmail.com',
  /* เพิ่ม email ที่นี่ */
];

function isAllowed(email) {
  if (!email) return false;
  if (ALLOWED_DOMAIN)
    return email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN.toLowerCase());
  return ALLOWED_EMAILS
    .map(e => e.toLowerCase().trim())
    .includes(email.toLowerCase().trim());
}

/* ── DOM helpers ─────────────────────────── */
const $ = id => document.getElementById(id);

function show(id)  { const el = $(id); if(el) el.style.display = 'block'; }
function hide(id)  { const el = $(id); if(el) el.style.display = 'none';  }
function flex(id)  { const el = $(id); if(el) el.style.display = 'flex';  }

/* ── Screen states ───────────────────────── */
function setState(state, data) {
  /* Always start by hiding everything */
  hide('app-screen');
  flex('auth-screen');
  hide('auth-loading');
  hide('auth-login-wrap');
  hide('auth-permission-error');

  const errEl = $('auth-error');
  if (errEl) errEl.textContent = '';

  if (state === 'loading') {
    flex('auth-loading');

  } else if (state === 'login') {
    show('auth-login-wrap');
    const btn = $('auth-google-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
    if (data && errEl) errEl.textContent = data;

  } else if (state === 'app') {
    hide('auth-screen');
    show('app-screen');
    const emailEl  = $('auth-user-email');
    const avatarEl = $('auth-user-avatar');
    if (emailEl)  emailEl.textContent = data.displayName || data.email;
    if (avatarEl && data.photoURL) {
      avatarEl.src = data.photoURL;
      avatarEl.style.display = 'inline-block';
    }
    if (typeof loadData === 'function') {
      try { loadData(); } catch(e) { console.error('[Auth]', e); }
    } else {
      setTimeout(() => { if (typeof loadData === 'function') loadData(); }, 300);
    }

  } else if (state === 'denied') {
    show('auth-permission-error');
    const deniedEl = $('auth-denied-email');
    if (deniedEl) deniedEl.textContent = data || '';
  }
}

/* ── Init: show loading immediately ─────── */
setState('loading');

/* ── Handle return from Google redirect ─── */
getRedirectResult(auth).catch(e => {
  console.warn('[Auth] getRedirectResult error:', e.code);
  setState('login', 'Sign-in failed. Please try again.');
});

/* ── Auth state observer ─────────────────── */
let authResolved = false;

onAuthStateChanged(auth, user => {
  authResolved = true;
  if (user) {
    if (isAllowed(user.email)) {
      sessionStorage.removeItem('gdb_denied');
      setState('app', user);
    } else {
      /* Sign out quietly, show denied, set flag to prevent login flash */
      sessionStorage.setItem('gdb_denied', user.email);
      setState('denied', user.email);
      signOut(auth);
    }
  } else {
    /* user = null */
    const denied = sessionStorage.getItem('gdb_denied');
    if (denied) {
      /* Already showing denied screen — keep it */
      setState('denied', denied);
    } else {
      setState('login');
    }
  }
});

/* ── Sign in ─────────────────────────────── */
$('auth-google-btn')?.addEventListener('click', () => {
  sessionStorage.removeItem('gdb_denied');
  setState('loading');
  signInWithRedirect(auth, provider).catch(e => {
    setState('login', 'Sign-in failed: ' + (e.message || e.code));
  });
});

/* ── Sign out ────────────────────────────── */
$('auth-logout-btn')?.addEventListener('click', () => {
  sessionStorage.removeItem('gdb_denied');
  signOut(auth);
});

/* ── Try again (after denied) ────────────── */
$('auth-try-again-btn')?.addEventListener('click', () => {
  sessionStorage.removeItem('gdb_denied');
  setState('login');
});
