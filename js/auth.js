/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO
   Depends on: config.js (must load first)
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

/* ── Auth state ──────────────────────────── */
onAuthStateChanged(auth, function(user) {
  if (user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display  = 'block';
    const emailEl = document.getElementById('auth-user-email');
    if (emailEl) emailEl.textContent = user.displayName || user.email;
    const avatarEl = document.getElementById('auth-user-avatar');
    if (avatarEl && user.photoURL) {
      avatarEl.src = user.photoURL;
      avatarEl.style.display = 'inline-block';
    }
    if (typeof loadData === 'function') loadData();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display  = 'none';
  }
});

/* ── Sign in ─────────────────────────────── */
async function signInWithGoogle() {
  const btn = document.getElementById('auth-google-btn');
  const err = document.getElementById('auth-error');
  if (err) err.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    let msg = 'Sign-in failed. Please try again.';
    if (e.code === 'auth/popup-closed-by-user')  msg = 'Sign-in cancelled.';
    if (e.code === 'auth/popup-blocked')          msg = 'Popup blocked \u2014 allow popups for this site.';
    if (e.code === 'auth/unauthorized-domain')    msg = 'Domain not authorized. Contact admin.';
    if (err) err.textContent = msg;
    if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }
  }
}

/* ── Sign out ────────────────────────────── */
document.getElementById('auth-google-btn')?.addEventListener('click', signInWithGoogle);
document.getElementById('auth-logout-btn')?.addEventListener('click', () => signOut(auth));
