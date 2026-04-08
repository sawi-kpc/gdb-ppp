/* ══════════════════════════════════════════════
   CHANNEL DATA — fetch, parse, UI state
   Depends on: channel-config.js (load first)
══════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════
   CACHE — localStorage, TTL driven by CACHE_CONFIG in config.js
   Key format:  gdb_ch_<channelKey>
   Stored JSON: { ts: <epoch ms>, data: <D object>, meta: <_meta> }
══════════════════════════════════════════════════════════════ */

function _cacheGet(key) {
  if (!CACHE_CONFIG.enabled) return null;
  try {
    var raw = localStorage.getItem(CACHE_CONFIG.prefix + key);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    var ageMin = (Date.now() - obj.ts) / 60000;
    if (ageMin > CACHE_CONFIG.ttlMinutes) return null;   /* stale */
    return obj;
  } catch(e) { return null; }
}

function _cacheSet(key, data, meta) {
  if (!CACHE_CONFIG.enabled) return;
  try {
    localStorage.setItem(CACHE_CONFIG.prefix + key, JSON.stringify({
      ts:   Date.now(),
      data: data,
      meta: meta,
    }));
  } catch(e) { /* storage full — silently skip */ }
}

/* Called by header Clear Cache button */
function clearAllCache() {
  try {
    Object.keys(localStorage)
      .filter(function(k) { return k.startsWith(CACHE_CONFIG.prefix); })
      .forEach(function(k) { localStorage.removeItem(k); });
  } catch(e) {}
}

/* Returns { ageMin, ageLabel } for the current channel's cache, or null */
function getCacheAge(channelKey) {
  try {
    var raw = localStorage.getItem(CACHE_CONFIG.prefix + channelKey);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    var ageMin = (Date.now() - obj.ts) / 60000;
    if (ageMin > CACHE_CONFIG.ttlMinutes) return null;
    var label = ageMin < 1
      ? 'just now'
      : ageMin < 60
        ? Math.floor(ageMin) + 'm ago'
        : Math.floor(ageMin / 60) + 'h ago';
    return { ageMin: ageMin, label: label };
  } catch(e) { return null; }
}


/* Thin wrappers → delegate to gdbSetCacheBadge in header.js */
function _showCacheBadge(ageInfo) {
  if (typeof gdbSetCacheBadge === 'function')
    gdbSetCacheBadge('cached', ageInfo ? '⚡ Cached · ' + ageInfo.label : '⚡ Cached');
}
function _showLiveBadge() {
  if (typeof gdbSetCacheBadge === 'function')
    gdbSetCacheBadge('live', '● Live data');
}
function _showLoadingBadge() {
  if (typeof gdbSetCacheBadge === 'function')
    gdbSetCacheBadge('loading', 'Loading…');
}
function _hideCacheBadge() {
  if (typeof gdbSetCacheBadge === 'function')
    gdbSetCacheBadge('hide');
}

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
  /* ── Cache check ─────────────────────────────────────── */
  var cached = _cacheGet(channelKey);
  if (cached) {
    /* Serve from cache — skip network entirely */
    _showCacheBadge(getCacheAge(channelKey));
    onSuccess(cached.data, cached.meta);
    return;
  }

  /* No valid cache — fetch live data */
  _showLoadingBadge();

  var baseUrl = (CHANNEL_CFG && CHANNEL_CFG.appsScriptUrl) ? CHANNEL_CFG.appsScriptUrl : APPS_SCRIPT_URL;
  var cbName  = '_gdbCb_' + channelKey + '_' + Date.now();
  var script  = document.createElement('script');
  var timer   = null;
  var done    = false;

  timer = setTimeout(function() {
    if (done) return;
    done = true;
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    onError('Request timed out. Check Apps Script URL.');
  }, 15000);

  window[cbName] = function(json) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    try {
      if (json.error) throw new Error(json.error);
      if (!json[channelKey]) throw new Error('No data for channel: ' + channelKey);
      _cacheSet(channelKey, json[channelKey], json._meta);
      _showLiveBadge();
      onSuccess(json[channelKey], json._meta);
    } catch(e) { onError(e.message); }
  };

  script.onerror = function() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    onError('Failed to load. Check Apps Script URL and deployment settings.');
  };

  /* No crossorigin attr — JSONP does not need CORS */
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
  /* Small delay to let Firebase auth and DOM fully settle — fixes Safari */
  setTimeout(function() {
    loadData(
      CHANNEL_CFG.key,
    function(data, meta) {
      D = data;
      hideLoading();
      /* Hide any previous error bar */
      var errBar = document.getElementById('gdb-error');
      if (errBar) errBar.style.display = 'none';
      setTimestamp(meta);
      /* Update shared header time */
      if (meta && typeof setGdbUpdateTime === 'function') setGdbUpdateTime(meta.generated);
      setTimeout(function() { buildPage(); }, 50);
    },
      showError
    );
  }, 100);
}

/* ── UI helpers ──────────────────────────── */
function destroyCharts() {
  Object.keys(CHARTS).forEach(function(k) {
    if (CHARTS[k]) { CHARTS[k].destroy(); CHARTS[k] = null; }
  });
  CHARTS = {};
}

function showLoading(msg) {
  var el = document.getElementById('loading-screen') || document.getElementById('gdb-loading');
  if (el) { el.style.display = 'flex'; }
}

function hideLoading() {
  var el = document.getElementById('loading-screen') || document.getElementById('gdb-loading');
  if (el) el.style.display = 'none';
}

function showError(msg) {
  hideLoading();
  var el = document.getElementById('gdb-error');
  if (el) { el.style.display = 'block'; el.textContent = '⚠ Cannot load data — ' + msg; }
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
