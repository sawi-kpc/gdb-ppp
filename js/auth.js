/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO
   Depends on: config.js, render.js, data.js
   (all must load before this module)
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

/* Optional: restrict to org domain only
   provider.setCustomParameters({ hd: 'kingpower.com' }); */

/* ── Wait for all scripts to be ready ───────
   data.js sets window._appReady=true at end.
   auth.js waits for it before showing dashboard.
─────────────────────────────────────────────*/
function waitForApp(cb) {
  if (window._appReady) { cb(); return; }
  const t = setInterval(function() {
    if (window._appReady) { clearInterval(t); cb(); }
  }, 50);
  /* Timeout after 5s to avoid infinite wait */
  setTimeout(function() { clearInterval(t); cb(); }, 5000);
}

/* ── Auth state ──────────────────────────── */
onAuthStateChanged(auth, function(user) {
  if (user) {
    waitForApp(function() {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app-screen').style.display  = 'block';

      /* Show user info */
      var emailEl = document.getElementById('auth-user-email');
      if (emailEl) emailEl.textContent = user.displayName || user.email;

      var avatarEl = document.getElementById('auth-user-avatar');
      if (avatarEl && user.photoURL) {
        avatarEl.src = user.photoURL;
        avatarEl.style.display = 'inline-block';
      }

      /* Load dashboard data */
      if (typeof loadData === 'function') {
        loadData();
      } else {
        console.error('[Auth] loadData not found — check script load order');
      }
    });
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display  = 'none';
  }
});

/* ── Sign in ─────────────────────────────── */
async function signInWithGoogle() {
  var btn = document.getElementById('auth-google-btn');
  var err = document.getElementById('auth-error');
  if (err) err.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    var msg = 'Sign-in failed. Please try again.';
    if (e.code === 'auth/popup-closed-by-user')  msg = 'Sign-in cancelled.';
    if (e.code === 'auth/popup-blocked')          msg = 'Popup blocked \u2014 allow popups for this site.';
    if (e.code === 'auth/unauthorized-domain')    msg = 'Domain not authorized. Contact admin.';
    if (err) err.textContent = msg;
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
  }
}

/* ── Wire up ─────────────────────────────── */
document.getElementById('auth-google-btn')
  ?.addEventListener('click', signInWithGoogle);

document.getElementById('auth-logout-btn')
  ?.addEventListener('click', function() { signOut(auth); });
