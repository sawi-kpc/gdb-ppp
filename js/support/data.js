/* ══════════════════════════════════════════════════════════════
   SUPPORT DATA — fetch + cache
   Depends on: js/support/config.js
   No embedded fallback — live or cache data only.
══════════════════════════════════════════════════════════════ */

var supportData = [];

/* ── Cache helpers ──────────────────────────────────────────── */
function _supCacheGet() {
  if (!SUPPORT_CACHE_CONFIG.enabled) return null;
  try {
    var raw = localStorage.getItem(SUPPORT_CACHE_CONFIG.prefix + 'all');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if ((Date.now() - obj.ts) / 60000 > SUPPORT_CACHE_CONFIG.ttlMinutes) return null;
    return obj;
  } catch(e) { return null; }
}

function _supCacheSet(data) {
  if (!SUPPORT_CACHE_CONFIG.enabled) return;
  try {
    localStorage.setItem(SUPPORT_CACHE_CONFIG.prefix + 'all',
      JSON.stringify({ ts: Date.now(), data: data }));
  } catch(e) {}
}

function clearSupportCache() {
  try {
    Object.keys(localStorage)
      .filter(function(k) { return k.startsWith(SUPPORT_CACHE_CONFIG.prefix); })
      .forEach(function(k) { localStorage.removeItem(k); });
  } catch(e) {}
}

function getSupportCacheAge() {
  try {
    var raw = localStorage.getItem(SUPPORT_CACHE_CONFIG.prefix + 'all');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    var ageMin = (Date.now() - obj.ts) / 60000;
    if (ageMin > SUPPORT_CACHE_CONFIG.ttlMinutes) return null;
    var label = ageMin < 1 ? 'just now'
      : ageMin < 60 ? Math.floor(ageMin) + 'm ago'
      : Math.floor(ageMin / 60) + 'h ago';
    return { ageMin: ageMin, label: label };
  } catch(e) { return null; }
}

/* ── JSONP fetch ────────────────────────────────────────────── */
function loadSupportData(onSuccess, onError) {
  /* 1. Serve from cache if still fresh */
  var cached = _supCacheGet();
  if (cached) {
    supportData = cached.data;
    var age = getSupportCacheAge();
    if (typeof gdbSetCacheBadge === 'function')
      gdbSetCacheBadge('cached', age ? '⚡ Cached · ' + age.label : '⚡ Cached');
    if (typeof onSuccess === 'function') onSuccess(supportData);
    return;
  }

  /* 2. Fetch live */
  if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('loading', 'Loading…');

  var cbName = '_gdbSupCb_' + Date.now();
  var script = document.createElement('script');
  var timer  = null;
  var done   = false;

  timer = setTimeout(function() {
    if (done) return;
    done = true;
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('hide');
    if (typeof onError === 'function')
      onError('Request timed out. Please check your network connection or try again later.');
  }, 15000);

  window[cbName] = function(json) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    try {
      if (json.error) throw new Error(json.error);
      supportData = json.supports || [];
      _supCacheSet(supportData);
      if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');
      if (typeof setGdbUpdateTime === 'function' && json._meta && json._meta.generated)
        setGdbUpdateTime(json._meta.generated);
      if (typeof onSuccess === 'function') onSuccess(supportData);
    } catch(e) {
      if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('hide');
      if (typeof onError === 'function') onError(e.message);
    }
  };

  script.onerror = function() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('hide');
    if (typeof onError === 'function')
      onError('Data source is currently unavailable. Please try again later or contact the dashboard administrator.');
  };

  script.src = SUPPORT_APPS_SCRIPT_URL + '?sheet=supports&callback=' + cbName;
  document.head.appendChild(script);
}
