/* ══════════════════════════════════════════════════════════════
   SUPPORT DATA — fetch + cache + badge
   Depends on: js/support/config.js (load first)
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
  var cached = _supCacheGet();
  if (cached) {
    supportData = cached.data;
    var age = getSupportCacheAge();
    if (typeof gdbSetCacheBadge === 'function')
      gdbSetCacheBadge('cached', age ? '⚡ Cached · ' + age.label : '⚡ Cached');
    if (typeof onSuccess === 'function') onSuccess(supportData);
    return;
  }

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
    supportData = getEmbeddedSupports();
    _supCacheSet(supportData);
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Embedded data');
    if (typeof onSuccess === 'function') onSuccess(supportData);
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
      if (typeof onError === 'function') onError(e.message);
    }
  };

  script.onerror = function() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[cbName]; } catch(e) {}
    supportData = getEmbeddedSupports();
    _supCacheSet(supportData);
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Embedded data');
    if (typeof onSuccess === 'function') onSuccess(supportData);
  };

  script.src = SUPPORT_APPS_SCRIPT_URL + '?sheet=supports&callback=' + cbName;
  document.head.appendChild(script);
}

/* ── Embedded sample data ─────────────────────────────────── */
function getEmbeddedSupports() {
  return [
    {Key:"GIT-2",Summary:"[Tiktok] กพ ยอด diff เยอะ by บัญชี",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202603",Due:"3/27/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:288000},
    {Key:"GIT-3",Summary:"[TikTok] ทีมบัญชีขอ report ประจำเดือน Mar 2026",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202604",Due:"",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:3600},
    {Key:"GIT-5",Summary:"[TikTok] Export Weekly Product Information - Mar 2026 (Week 4)",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202603",Due:"3/30/2026",Assignee:"Somrythi Pipat",TimeSpentSec:3600},
    {Key:"GIT-8",Summary:"[TikTok] Export weekly sales report for F&A - Mar 2026 (Week 4)",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202603",Due:"4/1/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:3600},
    {Key:"GIT-11",Summary:"[TikTok] Memo ออเดอร์ refund manual",Status:"In Progress",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"",Due:"",Assignee:"",TimeSpentSec:0},
    {Key:"GIT-12",Summary:"[F1 MA] Set Up Birthday Privileges - 21 Apr 2026",Status:"To do",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202604",Due:"4/21/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
    {Key:"GIT-13",Summary:"[F1 MA] Set Up Main Campaign - 20 Apr 2026",Status:"To do",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202604",Due:"4/20/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
    {Key:"GIT-14",Summary:"[F1 MA] Set Up Partner BeNeat&bTaskee Coupon",Status:"Done",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202603",Due:"3/1/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:86400},
    {Key:"GIT-19",Summary:"[F1 MA] Set Up Main Campaign - 2 Mar 2026",Status:"Done",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202603",Due:"3/2/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:7200},
    {Key:"GIT-20",Summary:"[F1 MA] Set Up At Risk Promotion - 15 Jan 2026",Status:"Done",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202601",Due:"1/15/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:57600},
    {Key:"GIT-23",Summary:"[F1 MA] Set Up New Customer First Order Coupon - 20 Apr 2026",Status:"To do",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202604",Due:"4/20/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
    {Key:"GIT-24",Summary:"[F1 MA] Set Up VIP + Loyal (RFM) Promotion - 21-22 Mar 2026",Status:"Done",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202603",Due:"3/21/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:7200},
    {Key:"GIT-36",Summary:"[F1 MA] Set Up At Risk Promotion - 20 Apr 2026",Status:"To do",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202604",Due:"4/20/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
    {Key:"GIT-37",Summary:"[F1 MA] Set Up VIP + Loyal (RFM) Promotion - 16-17 Apr 2026",Status:"To do",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202604",Due:"",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
    {Key:"GIT-38",Summary:"[Tiktok] Update stock support March (1)",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_update_stock",Labels:"GDB_SUPPORT_202603",Due:"3/5/2026",Assignee:"Natpapat Kwaopiwong",TimeSpentSec:1800},
    {Key:"GIT-43",Summary:"[F1 MA] Request new SFMC account for Marketing team",Status:"In Progress",Components:"firster-commerce",Group:"marketing_automation",Labels:"GDB_SUPPORT_202604",Due:"4/10/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
    {Key:"GIT-45",Summary:"[Tiktok] Query order report for accounting - March 2026",Status:"To do",Components:"",Group:"firster_tiktok_report",Labels:"",Due:"",Assignee:"Somrythi Pipat",TimeSpentSec:0},
    {Key:"GIT-46",Summary:"[TikTok] Export weekly sales report for F&A - Mar 2026 (Week 1)",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202603",Due:"3/10/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:3600},
    {Key:"GIT-49",Summary:"[TikTok] Export daily sales report for F&A (1-14 Feb 2026)",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202602",Due:"2/16/2026",Assignee:"Somrythi Pipat",TimeSpentSec:54000},
    {Key:"GIT-51",Summary:"[TikTok] Export daily sales report for F&A - Jan 2026",Status:"Done",Components:"firster-tiktok-social-commerce",Group:"firster_tiktok_report",Labels:"GDB_SUPPORT_202601",Due:"2/2/2026",Assignee:"Somrythi Pipat",TimeSpentSec:111600},
    {Key:"GIT-52",Summary:"[Salesforce CRM] Add CRM user role",Status:"Done",Components:"firster-commerce",Group:"other",Labels:"GDB_SUPPORT_202601",Due:"1/30/2026",Assignee:"Sodsaran Lertsirisampan",TimeSpentSec:0},
  ];
}
