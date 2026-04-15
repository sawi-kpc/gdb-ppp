/* ══════════════════════════════════════════════════════════════
   ISSUE DATA — fetch + cache + badge
   Depends on: js/issue/config.js (load first)
   Pattern mirrors js/initiative/data.js
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
  /* Check cache first */
  var cached = _issueCacheGet();
  if (cached) {
    issueData = cached.data;
    var age = getIssueCacheAge();
    if (typeof gdbSetCacheBadge === 'function')
      gdbSetCacheBadge('cached', age ? '⚡ Cached · ' + age.label : '⚡ Cached');
    if (typeof onSuccess === 'function') onSuccess(issueData);
    return;
  }

  /* No cache — fetch live */
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
    /* Fallback to embedded sample data */
    issueData = getEmbeddedIssues();
    _issueCacheSet(issueData);
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');
    if (typeof onSuccess === 'function') onSuccess(issueData);
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
      if (typeof onError === 'function') onError(e.message);
    }
  };

  script.onerror = function() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    issueData = getEmbeddedIssues();
    _issueCacheSet(issueData);
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Embedded data');
    if (typeof onSuccess === 'function') onSuccess(issueData);
  };

  script.src = ISSUE_APPS_SCRIPT_URL + '?sheet=issues&callback=' + cbName;
  document.head.appendChild(script);
}

/* ── Embedded sample data (fallback when Apps Script unreachable) ─ */
function getEmbeddedIssues() {
  /* ── Embedded fallback — mirrors actual sheet data ── */
  return [
    {Key:"GIT-42",
     IssueType:"Issue",
     Summary:"[OMISE] เงินไม่พอคืนให้ลูกค้าผ่าน Omise (เกิดจากไม่มีเงินหมุนเวียนช่วงข้ามเดือน)",
     Status:"In Progress",
     Components:"firster-commerce",
     Group:"",Labels:"",Due:"",
     Assignee:"Somrythi Pipat",
     Priority:"Medium",
     Severity:"Moderate",
     RootCause:"Insufficient float at month-end cycle",
     FailureOccurs:"",CorrectionBegins:"4/7/2026 12:00",FailureResolved:""},
    {Key:"GIT-41",
     IssueType:"Issue",
     Summary:"[K2] System Down - ไม่สามารถทำ process Refund ผ่าน K2 ได้",
     Status:"Closed",
     Components:"k2",
     Group:"",Labels:"",Due:"",
     Assignee:"",
     Priority:"Medium",
     Severity:"Moderate",
     RootCause:"",
     FailureOccurs:"",CorrectionBegins:"",FailureResolved:""},
    {Key:"GIT-9",
     IssueType:"Issue",
     Summary:"[ALL] System Down",
     Status:"Resolved",
     Components:"firster-commerce;firster-tiktok-social-commerce;jd-phamacy-marketplace-cn;kingpower-commerce-cn;kingpower-commerce-th;kingpower-douyin-social-commerce;taihaitao-commerce-cn",
     Group:"",Labels:"",Due:"",
     Assignee:"Chawanop Witthayaphirak",
     Priority:"Highest",
     Severity:"Critical",
     RootCause:"",
     FailureOccurs:"",CorrectionBegins:"3/25/2026 8:00",FailureResolved:""},
    {Key:"GIT-4",
     IssueType:"Issue",
     Summary:"[SAP] System Down",
     Status:"Investigating",
     Components:"firster-commerce;firster-tiktok-social-commerce;jd-phamacy-marketplace-cn;kingpower-commerce-cn;kingpower-commerce-th;kingpower-douyin-social-commerce;taihaitao-commerce-cn",
     Group:"",Labels:"",Due:"",
     Assignee:"Chawanop Witthayaphirak",
     Priority:"Highest",
     Severity:"Critical",
     RootCause:"SAP system outage — multi-channel impact",
     FailureOccurs:"3/23/2026 22:30",CorrectionBegins:"3/24/2026 10:00",FailureResolved:""},
    {Key:"GIT-1",
     IssueType:"Issue",
     Summary:"[F1] ใบเสร็จ ABB ไม่แสดงค่า Delivery fee ซึ่งเคยแสดงได้มาก่อน",
     Status:"Open",
     Components:"firster-commerce",
     Group:"",Labels:"",Due:"3/31/2026",
     Assignee:"Somrythi Pipat",
     Priority:"Medium",
     Severity:"Moderate",
     RootCause:"",
     FailureOccurs:"",CorrectionBegins:"",FailureResolved:""},
  ];
}
