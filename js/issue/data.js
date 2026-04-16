/* ══════════════════════════════════════════════════════════════
   ISSUE DATA — fetch + cache
   Depends on: js/issue/config.js
   No embedded fallback — live or cache data only.
══════════════════════════════════════════════════════════════ */

var issueData = [];

/* ── Cache helpers ──────────────────────────────────────────── */
function _issueCacheGet() {
  if (!ISSUE_CACHE_CONFIG.enabled) return null;
  try {
    var raw = localStorage.getItem(ISSUE_CACHE_CONFIG.prefix + 'all');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if ((Date.now() - obj.ts) / 60000 > ISSUE_CACHE_CONFIG.ttlMinutes) return null;
    return obj;
  } catch(e) { return null; }
}

function _issueCacheSet(data) {
  if (!ISSUE_CACHE_CONFIG.enabled) return;
  try {
    localStorage.setItem(ISSUE_CACHE_CONFIG.prefix + 'all',
      JSON.stringify({ ts: Date.now(), data: data }));
  } catch(e) {}
}

function clearIssueCache() {
  try {
    Object.keys(localStorage)
      .filter(function(k) { return k.startsWith(ISSUE_CACHE_CONFIG.prefix); })
      .forEach(function(k) { localStorage.removeItem(k); });
  } catch(e) {}
}

function getIssueCacheAge() {
  try {
    var raw = localStorage.getItem(ISSUE_CACHE_CONFIG.prefix + 'all');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    var ageMin = (Date.now() - obj.ts) / 60000;
    if (ageMin > ISSUE_CACHE_CONFIG.ttlMinutes) return null;
    var label = ageMin < 1 ? 'just now'
      : ageMin < 60 ? Math.floor(ageMin) + 'm ago'
      : Math.floor(ageMin / 60) + 'h ago';
    return { ageMin: ageMin, label: label };
  } catch(e) { return null; }
}

/* ── JSONP fetch ────────────────────────────────────────────── */
function loadIssueData(onSuccess, onError) {
  /* 1. Serve from cache if still fresh */
  var cached = _issueCacheGet();
  if (cached) {
    issueData = cached.data;
    var age = getIssueCacheAge();
    if (typeof gdbSetCacheBadge === 'function')
      gdbSetCacheBadge('cached', age ? '⚡ Cached · ' + age.label : '⚡ Cached');
    if (typeof onSuccess === 'function') onSuccess(issueData);
    return;
  }

  /* 2. Fetch live from Apps Script */
  if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('loading', 'Loading…');

  var cbName = '_gdbIssueCb_' + Date.now();
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
      issueData = json.issues || [];
      _issueCacheSet(issueData);
      if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');
      if (typeof setGdbUpdateTime === 'function' && json._meta && json._meta.generated)
        setGdbUpdateTime(json._meta.generated);
      if (typeof onSuccess === 'function') onSuccess(issueData);
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

  script.src = ISSUE_APPS_SCRIPT_URL + '?sheet=issues&callback=' + cbName;
  document.head.appendChild(script);
}
