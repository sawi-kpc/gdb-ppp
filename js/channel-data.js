/* ══════════════════════════════════════════════
   CHANNEL DATA — fetch, parse, UI state
   Depends on: channel-config.js (load first)
══════════════════════════════════════════════ */

var D           = null;
var CHANNEL_CFG = null;
var currentYear = '2025';
var CHARTS      = {};
var MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Init from page ──────────────────────────
   Each channel HTML calls:
     initChannel('KP1');
─────────────────────────────────────────────*/
function initChannel(channelKey) {
  CHANNEL_CFG = CHANNEL_REGISTRY[channelKey];
  if (!CHANNEL_CFG) {
    showError('Unknown channel key: ' + channelKey);
    return;
  }
  applyChannelTheme(CHANNEL_CFG);
  init();
}

/* ── Apply channel branding to DOM ──────────*/
function applyChannelTheme(cfg) {
  /* CSS vars */
  document.documentElement.style.setProperty('--accent',  cfg.accent);
  document.documentElement.style.setProperty('--accent2', cfg.accent2);

  /* Header elements */
  var logo = document.getElementById('ch-logo');
  if (logo) { logo.textContent = cfg.logoText; logo.style.background = cfg.logoBg; }

  var brandName = document.getElementById('ch-brand-name');
  if (brandName) brandName.textContent = cfg.brand;

  var brandSub = document.getElementById('ch-brand-sub');
  if (brandSub) brandSub.textContent = cfg.brandSub;

  var badge = document.getElementById('ch-badge');
  if (badge) {
    badge.textContent = cfg.badge;
    badge.style.background = cfg.accent + '22';
    badge.style.border     = '1px solid ' + cfg.accent + '44';
    badge.style.color      = cfg.accent;
  }

  var loadingText = document.getElementById('ch-loading-text');
  if (loadingText) loadingText.textContent = 'Loading ' + cfg.brand + ' data...';

  var title = document.querySelector('title');
  if (title) title.textContent = cfg.brand + ' | KPI Dashboard';
}

/* ── Fetch data from Apps Script ─────────── */
function loadData(channelKey, onSuccess, onError) {
  /* Use JSONP instead of fetch() to bypass CORS restriction
     Apps Script does not send Access-Control-Allow-Origin headers,
     so fetch() always fails from GitHub Pages.
     JSONP uses <script> tag which is not subject to CORS. */
  var baseUrl = (CHANNEL_CFG && CHANNEL_CFG.appsScriptUrl) ? CHANNEL_CFG.appsScriptUrl : APPS_SCRIPT_URL;
  var cbName  = '_gdbCb_' + channelKey + '_' + Date.now();
  var script  = document.createElement('script');
  var timer   = null;

  /* Timeout after 15 seconds */
  timer = setTimeout(function() {
    cleanup();
    onError('Request timed out. Check Apps Script URL.');
  }, 15000);

  function cleanup() {
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) { window[cbName] = undefined; }
  }

  window[cbName] = function(json) {
    cleanup();
    try {
      if (json.error) throw new Error(json.error);
      if (!json[channelKey]) throw new Error('No data for channel: ' + channelKey);
      onSuccess(json[channelKey], json._meta);
    } catch(e) {
      onError(e.message);
    }
  };

  script.onerror = function() {
    cleanup();
    onError('Failed to load data. Check Apps Script URL and deployment settings.');
  };

  script.src = baseUrl + '?channel=' + channelKey + '&callback=' + cbName;
  document.head.appendChild(script);
}

/* ── Lifecycle ───────────────────────────── */
function init() {
  destroyCharts();
  /* Hide error bar from previous load attempt */
  var errBar = document.getElementById('error-bar');
  if (errBar) errBar.style.display = 'none';
  showLoading('Fetching ' + CHANNEL_CFG.brand + ' data...');
  loadData(
    CHANNEL_CFG.key,
    function(data, meta) {
      D = data;
      hideLoading();
      setTimestamp(meta);
      /* Small timeout to ensure charts are fully destroyed before rebuilding */
      setTimeout(function() { buildPage(); }, 50);
    },
    showError
  );
}

/* ── UI helpers ──────────────────────────── */
function destroyCharts() {
  Object.keys(CHARTS).forEach(function(k) {
    if (CHARTS[k]) { CHARTS[k].destroy(); CHARTS[k] = null; }
  });
  CHARTS = {};
}

function showLoading(msg) {
  var el = document.getElementById('loading-screen');
  if (el) {
    el.style.display = 'flex';
    var t = el.querySelector('.loading-sub');
    if (t && msg) t.textContent = msg;
  }
}

function hideLoading() {
  var el = document.getElementById('loading-screen');
  if (el) el.style.display = 'none';
}

function showError(msg) {
  hideLoading();
  var el = document.getElementById('error-bar');
  if (el) {
    el.style.display = 'block';
    var em = el.querySelector('#error-msg');
    if (em) em.textContent = msg;
  }
}

function setTimestamp(meta) {
  var el = document.getElementById('last-update');
  if (!el || !meta) return;
  var d = new Date(meta.generated);
  el.textContent = 'Updated: ' + d.toLocaleString('th-TH', {timeZone: 'Asia/Bangkok', hour12: false});
}

/* ── Tab switcher ────────────────────────── */
function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b)   { b.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  if (D) {
    var lbl25   = MONTHS.map(function(m) { return m + ' 25'; });
    var lbl2526 = lbl25.concat(['Jan 26', 'Feb 26']);
    if (id === 'tr') buildTrSection(lbl25, lbl2526);
    if (id === 'rv') buildRvSection(lbl25, lbl2526);
  }
}

/* ── Year toggle ─────────────────────────── */
function setYr(yr, btn) {
  currentYear = yr;
  document.querySelectorAll('.ybtn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  buildOvCards(yr);
}
