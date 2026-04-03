/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO
   Depends on: config.js, render.js, data.js
══════════════════════════════════════════════ */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup,
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

/* Optional: restrict to org domain
   provider.setCustomParameters({ hd: 'kingpower.com' }); */

/* ── Show / Hide screens ─────────────────────
   Use explicit style to avoid CSS race condition
─────────────────────────────────────────────*/
function showApp(user) {
  var authScreen = document.getElementById('auth-screen');
  var appScreen  = document.getElementById('app-screen');
  if (authScreen) authScreen.style.display = 'none';
  if (appScreen)  appScreen.style.display  = 'block';

  /* User info in topbar */
  var emailEl = document.getElementById('auth-user-email');
  if (emailEl) emailEl.textContent = user.displayName || user.email;

  var avatarEl = document.getElementById('auth-user-avatar');
  if (avatarEl && user.photoURL) {
    avatarEl.src = user.photoURL;
    avatarEl.style.display = 'inline-block';
  }

  /* Load data — guard against loadData not ready */
  if (typeof loadData === 'function') {
    try { loadData(); } catch(e) { console.error('[Auth] loadData error:', e); }
  } else {
    /* Retry once after 200ms in case of slow parse */
    setTimeout(function() {
      if (typeof loadData === 'function') loadData();
      else console.error('[Auth] loadData not found after retry — check js/data.js');
    }, 200);
  }
}

function showLogin() {
  var authScreen = document.getElementById('auth-screen');
  var appScreen  = document.getElementById('app-screen');
  if (authScreen) authScreen.style.display = 'flex';
  if (appScreen)  appScreen.style.display  = 'none';
}

/* ── Auth state observer ─────────────────────
   Fires on: page load (cached session), after
   signIn, after signOut.
─────────────────────────────────────────────*/
onAuthStateChanged(auth, function(user) {
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

/* ── Sign in with Google ─────────────────── */
function signInWithGoogle() {
  var btn = document.getElementById('auth-google-btn');
  var err = document.getElementById('auth-error');
  if (err) err.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }

  signInWithPopup(auth, provider)
    .catch(function(e) {
      var msg = 'Sign-in failed. Please try again.';
      if (e.code === 'auth/popup-closed-by-user')  msg = 'Sign-in cancelled.';
      if (e.code === 'auth/popup-blocked')          msg = 'Popup blocked \u2014 allow popups for this site.';
      if (e.code === 'auth/unauthorized-domain')    msg = 'Domain not authorized. Contact admin.';
      if (err) err.textContent = msg;
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
    });
}

/* ── Wire up buttons ─────────────────────── */
var loginBtn  = document.getElementById('auth-google-btn');
var logoutBtn = document.getElementById('auth-logout-btn');

if (loginBtn)  loginBtn.addEventListener('click', signInWithGoogle);
if (logoutBtn) logoutBtn.addEventListener('click', function() { signOut(auth); });
