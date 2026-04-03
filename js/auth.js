/* ══════════════════════════════════════════════
   AUTH — Firebase Google SSO (Redirect flow)
   ใช้ signInWithRedirect แทน signInWithPopup
   เพราะ GitHub Pages ส่ง COOP header ที่บล็อก popup
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

/* Optional: restrict to org domain only
   provider.setCustomParameters({ hd: 'kingpower.com' }); */

/* ── Show / Hide screens ─────────────────── */
function showApp(user) {
  var authScreen = document.getElementById('auth-screen');
  var appScreen  = document.getElementById('app-screen');
  if (authScreen) authScreen.style.display = 'none';
  if (appScreen)  appScreen.style.display  = 'block';

  var emailEl = document.getElementById('auth-user-email');
  if (emailEl) emailEl.textContent = user.displayName || user.email;

  var avatarEl = document.getElementById('auth-user-avatar');
  if (avatarEl && user.photoURL) {
    avatarEl.src = user.photoURL;
    avatarEl.style.display = 'inline-block';
  }

  if (typeof loadData === 'function') {
    try { loadData(); }
    catch(e) { console.error('[Auth] loadData error:', e); }
  } else {
    setTimeout(function() {
      if (typeof loadData === 'function') loadData();
      else console.error('[Auth] loadData not found');
    }, 300);
  }
}

function showLogin(msg) {
  var authScreen = document.getElementById('auth-screen');
  var appScreen  = document.getElementById('app-screen');
  if (authScreen) authScreen.style.display = 'flex';
  if (appScreen)  appScreen.style.display  = 'none';

  /* Reset button state */
  var btn = document.getElementById('auth-google-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Sign in with Google'; }

  if (msg) {
    var err = document.getElementById('auth-error');
    if (err) err.textContent = msg;
  }
}

/* ── Handle redirect result on page load ────
   เมื่อ Google redirect กลับมา ให้ดึงผล login
─────────────────────────────────────────────*/
getRedirectResult(auth)
  .then(function(result) {
    /* result จะเป็น null ถ้าไม่ได้มาจาก redirect */
    if (result && result.user) {
      /* onAuthStateChanged จะ handle ต่อเอง */
    }
  })
  .catch(function(e) {
    var msg = 'Sign-in failed. Please try again.';
    if (e.code === 'auth/unauthorized-domain') msg = 'Domain not authorized. Contact admin.';
    if (e.code === 'auth/account-exists-with-different-credential') msg = 'Account exists with different sign-in method.';
    showLogin(msg);
  });

/* ── Auth state observer ─────────────────── */
onAuthStateChanged(auth, function(user) {
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

/* ── Sign in: redirect to Google ─────────── */
function signInWithGoogle() {
  var btn = document.getElementById('auth-google-btn');
  var err = document.getElementById('auth-error');
  if (err) err.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting\u2026'; }

  signInWithRedirect(auth, provider)
    .catch(function(e) {
      showLogin('Sign-in failed: ' + (e.message || e.code));
    });
}

/* ── Sign out ────────────────────────────── */
var loginBtn  = document.getElementById('auth-google-btn');
var logoutBtn = document.getElementById('auth-logout-btn');

if (loginBtn)  loginBtn.addEventListener('click', signInWithGoogle);
if (logoutBtn) logoutBtn.addEventListener('click', function() { signOut(auth); });
