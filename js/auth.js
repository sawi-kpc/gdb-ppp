/* ══════════════════════════════════════════════
   AUTH — Firebase Authentication
   Depends on: config.js (must load first)
══════════════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/* ── Init Firebase ─────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyCaS5kLNbm5lSLRHd1rdr0sXRCS5lB_Rgc",
  authDomain:        "gdb-dashboard-prod.firebaseapp.com",
  projectId:         "gdb-dashboard-prod",
  storageBucket:     "gdb-dashboard-prod.firebasestorage.app",
  messagingSenderId: "170622130981",
  appId:             "1:170622130981:web:23302ed9a5ce4e82ac58cc"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ── Auth state observer ───────────────────── */
onAuthStateChanged(auth, function(user) {
  if (user) {
    /* Logged in — show dashboard, hide login screen */
    document.getElementById('auth-screen').style.display  = 'none';
    document.getElementById('app-screen').style.display   = 'block';
    document.getElementById('auth-user-email').textContent = user.email;
    /* Load data only after confirmed login */
    if (typeof loadData === 'function') loadData();
  } else {
    /* Not logged in — show login screen, hide dashboard */
    document.getElementById('auth-screen').style.display  = 'flex';
    document.getElementById('app-screen').style.display   = 'none';
  }
});

/* ── Login handler ─────────────────────────── */
document.getElementById('auth-login-btn').addEventListener('click', function() {
  var email    = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  var errorEl  = document.getElementById('auth-error');

  errorEl.textContent = '';
  document.getElementById('auth-login-btn').textContent = 'Signing in…';
  document.getElementById('auth-login-btn').disabled = true;

  signInWithEmailAndPassword(auth, email, password)
    .catch(function(err) {
      var msg = 'Login failed. Please check your email and password.';
      if (err.code === 'auth/user-not-found')   msg = 'Email not found.';
      if (err.code === 'auth/wrong-password')    msg = 'Incorrect password.';
      if (err.code === 'auth/invalid-email')     msg = 'Invalid email format.';
      if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
      errorEl.textContent = msg;
      document.getElementById('auth-login-btn').textContent = 'Sign in';
      document.getElementById('auth-login-btn').disabled = false;
    });
});

/* Allow Enter key to submit */
document.getElementById('auth-password').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('auth-login-btn').click();
});

/* ── Logout handler ────────────────────────── */
document.getElementById('auth-logout-btn').addEventListener('click', function() {
  signOut(auth);
});
