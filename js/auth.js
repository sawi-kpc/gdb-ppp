/* ══════════════════════════════════════════════
   AUTH v4.0 — Email/Password (Firebase Compat)
   ไม่ใช้ Google SSO — simple and reliable
══════════════════════════════════════════════ */

var firebaseConfig = {
  apiKey:            "AIzaSyCaS5kLNbm5lSLRHd1rdr0sXRCS5lB_Rgc",
  authDomain:        "gdb-dashboard-prod.firebaseapp.com",
  projectId:         "gdb-dashboard-prod",
  storageBucket:     "gdb-dashboard-prod.firebasestorage.app",
  messagingSenderId: "170622130981",
  appId:             "1:170622130981:web:23302ed9a5ce4e82ac58cc"
};

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();

/* ── Helpers ─────────────────────────────── */
function el(id) { return document.getElementById(id); }

function showApp(user) {
  el('auth-screen').style.display = 'none';
  el('app-screen').style.display  = 'block';
  var emailEl  = el('auth-user-email');
  var avatarEl = el('auth-user-avatar');
  if (emailEl)  emailEl.textContent = user.email;
  if (avatarEl) avatarEl.style.display = 'none';
  if (typeof loadData === 'function') {
    try { loadData(); } catch(e) { console.error('[Auth]', e); }
  } else {
    setTimeout(function(){ if (typeof loadData === 'function') loadData(); }, 300);
  }
}

function showLogin(errMsg) {
  el('auth-screen').style.display = 'flex';
  el('app-screen').style.display  = 'none';
  var btn = el('auth-login-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
  var errEl = el('auth-error');
  if (errEl) errEl.textContent = errMsg || '';
}

/* ── Auth state ──────────────────────────── */
auth.onAuthStateChanged(function(user) {
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

/* ── Login handler ───────────────────────── */
window.addEventListener('DOMContentLoaded', function() {
  var loginBtn  = el('auth-login-btn');
  var logoutBtn = el('auth-logout-btn');
  var emailInp  = el('auth-email');
  var passInp   = el('auth-password');

  function doLogin() {
    var email = emailInp ? emailInp.value.trim() : '';
    var pass  = passInp  ? passInp.value : '';
    var errEl = el('auth-error');
    if (!email || !pass) {
      if (errEl) errEl.textContent = 'Please enter email and password.';
      return;
    }
    if (errEl) errEl.textContent = '';
    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Signing in\u2026'; }

    auth.signInWithEmailAndPassword(email, pass)
      .catch(function(e) {
        var msg = 'Login failed. Please check your credentials.';
        if (e.code === 'auth/user-not-found')    msg = 'Email not found.';
        if (e.code === 'auth/wrong-password')     msg = 'Incorrect password.';
        if (e.code === 'auth/invalid-email')      msg = 'Invalid email format.';
        if (e.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
        if (e.code === 'auth/too-many-requests')  msg = 'Too many attempts. Try again later.';
        showLogin(msg);
      });
  }

  if (loginBtn)  loginBtn.addEventListener('click', doLogin);
  if (passInp)   passInp.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
  if (logoutBtn) logoutBtn.addEventListener('click', function(){ auth.signOut(); });
});
