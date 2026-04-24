/* ══════════════════════════════════════════════════════════════
   ISSUE RENDER  —  js/issue/render.js
   Depends on: js/issue/config.js, js/issue/data.js (loaded first)
══════════════════════════════════════════════════════════════ */

/* ── State ───────────────────────────────────────────────── */
var _filterStatus   = 'all';
var _filterPriority = 'all';
var _filterSeverity = 'all';
var _filterComp     = 'all';
var _searchQ        = '';
var _sortCol        = 'Key';
var _sortAsc        = true;
var _activeView     = 'board';

/* ── Status board columns ────────────────────────────────── */
var STATUSES = [
  { key:'Open',          label:'Open',          color:'var(--down)'   },
  { key:'Investigating', label:'Investigating',  color:'var(--amber)'  },
  { key:'In Progress',   label:'In Progress',    color:'var(--accent)' },
  { key:'Resolved',      label:'Resolved',       color:'var(--teal)'   },
  { key:'Done',          label:'Done',           color:'var(--up)'     },
];

function _normaliseStatus(s) {
  if (!s) return 'Open';
  if (s === 'Closed') return 'Done';
  return s;
}

/* ── Priority / Severity colors ──────────────────────────── */
var PRIORITY_COLOR = {
  Highest:'var(--down)', High:'#f97316', Medium:'var(--amber)',
  Low:'var(--up)', Lowest:'var(--text3)',
};
var SEVERITY_COLOR = {
  Critical:'var(--down)', High:'#f97316',
  Moderate:'var(--amber)', Low:'var(--up)',
};
function _pColor(p) { return PRIORITY_COLOR[p] || 'var(--text2)'; }
function _sColor(s) { return SEVERITY_COLOR[s] || 'var(--text2)'; }

/* severity → CSS class for .sev-badge */
function _sevCls(s) {
  var m = { Critical:'critical', High:'high', Moderate:'moderate', Low:'low' };
  return m[s] || '';
}

/* ── Helpers ─────────────────────────────────────────────── */
function _secToH(sec) {
  if (!sec || sec <= 0) return null;
  var h = Math.round(sec / 3600);
  if (h < 24) return h + 'h';
  var d = Math.round(h / 24 * 10) / 10;
  return d + 'd';
}

function statusTag(s) {
  s = _normaliseStatus(s);
  var cls = { Open:'open','In Progress':'in-progress',Investigating:'investigating',
              Resolved:'resolved',Done:'done' };
  return '<span class="stag '+(cls[s]||'open')+'">'+s+'</span>';
}

function compsHtml(raw) {
  if (!raw) return '';
  return raw.split(';').map(function(c){
    c = c.trim();
    return c ? '<span class="comp-chip">'+c+'</span>' : '';
  }).join('');
}

function calcMTTR(fo, fr) {
  if (!fo || !fr) return null;
  var ms = new Date(fr) - new Date(fo);
  if (ms <= 0) return null;
  var h = ms / 3600000;
  if (h < 24) return h.toFixed(1) + 'h';
  return (h / 24).toFixed(1) + 'd';
}

function calcMTTRHours(fo, fr) {
  if (!fo || !fr) return null;
  var h = (new Date(fr) - new Date(fo)) / 3600000;
  return h > 0 ? h : null;
}

function calcResponseHours(fo, cb) {
  if (!fo || !cb) return null;
  var h = (new Date(cb) - new Date(fo)) / 3600000;
  return h > 0 ? h : null;
}

function isOverdue(due, status) {
  if (!due || status === 'Done' || status === 'Resolved') return false;
  return new Date(due) < new Date();
}

/* ── Date formatter: "23 Mar 2026" ──────────────────────── */
function _fmtDate(raw) {
  if (!raw) return null;
  var d = new Date(raw);
  if (isNaN(d)) return raw;
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

/* ── Time formatter for timeline dots: "22:30:00" ───────── */
function _fmtTime(raw) {
  if (!raw) return null;
  var d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toTimeString().substring(0,8);
}

function buildIncidentTimeline(d) {
  var hasTimeline = d.FailureOccurs || d.CorrectionBegins || d.FailureResolved;
  if (!hasTimeline) return '';

  var mttr  = calcMTTR(d.FailureOccurs, d.FailureResolved);
  var mttrH = calcMTTRHours(d.FailureOccurs, d.FailureResolved);
  var respH = calcResponseHours(d.FailureOccurs, d.CorrectionBegins);
  var respLbl = respH ? (respH < 1 ? Math.round(respH*60)+'m' : respH.toFixed(1)+'h') : null;

  /* ── 2-segment progress bar ── */
  /* grey = response period (failure→fix started), green = fix period (fix started→resolved) */
  var totalH   = mttrH || 0;
  var fixH     = d.CorrectionBegins && d.FailureResolved
                   ? calcMTTRHours(d.CorrectionBegins, d.FailureResolved) : null;
  var respPct  = (totalH > 0 && respH) ? Math.min(Math.round(respH / totalH * 100), 40) : 15;
  var fixPct   = 100 - respPct;
  var isOngoing = !d.FailureResolved;
  var barLabel = mttr ? mttr : (respH ? Math.round(respH)+'h so far' : '');

  /* dot timestamps */
  function dotHtml(color, dateRaw, label) {
    var dt = new Date(dateRaw);
    var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var dateStr = dt.getDate()+' '+mon[dt.getMonth()]+' '+dt.getFullYear();
    var timeStr = dt.toTimeString().substring(0,8);
    return '<span class="tl2-dot" style="background:'+color+'"></span>'+
           '<span class="tl2-ts">'+dateStr+' '+timeStr+'</span>';
  }

  var html = '<div class="tl2">';

  /* bar */
  html += '<div class="tl2-bar-wrap">';
  html += '<div class="tl2-bar">';
  html += '<div class="tl2-seg-grey" style="width:'+respPct+'%"></div>';
  html += '<div class="tl2-seg-green" style="width:'+fixPct+'%">';
  if (barLabel) html += '<span class="tl2-bar-label">'+barLabel+'</span>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  /* dots row */
  html += '<div class="tl2-dots">';
  if (d.FailureOccurs)    html += dotHtml('#888', d.FailureOccurs, 'failure');
  if (d.CorrectionBegins) html += dotHtml('#f97316', d.CorrectionBegins, 'fix');
  if (d.FailureResolved)  html += dotHtml('#3fb950', d.FailureResolved, 'resolved');
  else if (isOngoing)     html += '<span class="tl2-pending">● pending</span>';

  /* metrics */
  html += '<span class="tl2-divider">|</span>';
  if (respLbl) html += '<span class="tl2-metric">Response: <b>'+respLbl+'</b></span>';
  if (mttr) {
    var fixDur = fixH ? (fixH < 24 ? fixH.toFixed(1)+'h' : (fixH/24).toFixed(1)+'d') : mttr;
    html += '<span class="tl2-metric">Fix: <b class="tl2-fix">'+fixDur+'</b></span>';
    html += '<span class="tl2-metric">MTTR: <b class="tl2-mttr">'+mttr+'</b></span>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

/* ── Populate filter dropdowns ───────────────────────────── */
function populateFilters(data) {
  var priorities = [], severities = [], comps = [];
  data.forEach(function(d) {
    if (d.Priority && !priorities.includes(d.Priority)) priorities.push(d.Priority);
    if (d.Severity && !severities.includes(d.Severity)) severities.push(d.Severity);
    (d.Components||'').split(';').forEach(function(c){
      c = c.trim();
      if (c && !comps.includes(c)) comps.push(c);
    });
  });

  function fillSelect(id, values) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    values.sort().forEach(function(v){
      var o = document.createElement('option');
      o.value = o.textContent = v;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }
  fillSelect('filter-priority',  priorities);
  fillSelect('filter-severity',  severities);
  fillSelect('filter-component', comps);
}

/* ── Filter + sort pipeline ──────────────────────────────── */
function applyFilters() {
  var raw = (window.issueData || []).map(function(d){
    var copy = Object.assign({}, d);
    copy.Status = _normaliseStatus(copy.Status);
    return copy;
  });

  _searchQ = (document.getElementById('issue-search')||{}).value || '';

  var out = raw.filter(function(d) {
    if (_filterStatus !== 'all' && d.Status !== _filterStatus) return false;
    if (_filterPriority !== 'all' && d.Priority !== _filterPriority) return false;
    if (_filterSeverity !== 'all' && d.Severity !== _filterSeverity) return false;
    if (_filterComp !== 'all') {
      var comps = (d.Components||'').split(';').map(function(c){return c.trim();});
      if (!comps.includes(_filterComp)) return false;
    }
    if (_searchQ) {
      var q = _searchQ.toLowerCase();
      var hay = ((d.Key||'')+' '+(d.Summary||'')+' '+(d.Assignee||'')+' '+(d.Components||'')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  var col = _sortCol;
  out.sort(function(a,b){
    var av = (a[col]||'').toString(), bv = (b[col]||'').toString();
    var cmp = av.localeCompare(bv, undefined, {numeric:true});
    return _sortAsc ? cmp : -cmp;
  });

  if (_activeView === 'board') buildBoard(out);
  else                         buildTable(out);
}

function onStatusFilter(status) {
  _filterStatus = status;
  document.querySelectorAll('.status-btn').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  applyFilters();
}

function onDropdownChange() {
  _filterPriority = (document.getElementById('filter-priority')||{}).value || 'all';
  _filterSeverity = (document.getElementById('filter-severity')||{}).value || 'all';
  _filterComp     = (document.getElementById('filter-component')||{}).value || 'all';
  applyFilters();
}

function sortIssueBy(col) {
  if (_sortCol === col) _sortAsc = !_sortAsc;
  else { _sortCol = col; _sortAsc = true; }
  applyFilters();
}

function switchView(view) {
  _activeView = view;
  var bw = document.getElementById('board-view-wrap');
  var tw = document.getElementById('table-view-wrap');
  var btnB = document.getElementById('view-btn-board');
  var btnT = document.getElementById('view-btn-table');
  if (bw) bw.style.display = view === 'board' ? '' : 'none';
  if (tw) tw.style.display = view === 'table' ? '' : 'none';
  if (btnB) btnB.classList.toggle('active', view === 'board');
  if (btnT) btnT.classList.toggle('active', view === 'table');
  applyFilters();
}

/* ── Build board view ────────────────────────────────────── */
function buildBoard(data) {
  var countEl = document.getElementById('count-label');
  if (countEl) countEl.textContent = 'Showing '+data.length+' issue'+(data.length!==1?'s':'');

  var boardEl = document.getElementById('issue-board');
  if (!boardEl) return;

  /* group by status */
  var groups = {};
  STATUSES.forEach(function(s){ groups[s.key] = []; });
  data.forEach(function(d){
    var sk = d.Status;
    if (!groups[sk]) sk = 'Open';
    groups[sk].push(d);
  });

  boardEl.innerHTML = STATUSES.map(function(s){
    var items = groups[s.key] || [];
    return '<div class="iboard-col">'+
      '<div class="iboard-col-hd" style="border-top-color:'+s.color+'">'+
        '<span class="iboard-col-name">'+s.label+'</span>'+
        '<span class="iboard-col-cnt">'+items.length+'</span>'+
      '</div>'+
      items.map(function(d){ return buildCard(d); }).join('')+
    '</div>';
  }).join('');
}

/* ── priority → CSS class / color ───────────────────────── */
function _priBadgeCls(p) {
  var m = { Highest:'pri-highest', High:'pri-high', Medium:'pri-medium',
            Low:'pri-low', Lowest:'pri-lowest' };
  return m[p] || '';
}

/* ── Build single card ───────────────────────────────────── */
function buildCard(d) {
  var overdue     = isOverdue(d.Due, d.Status);
  var multiCh     = (d.Components||'').split(';').filter(Boolean).length >= 3;
  var firstComp   = (d.Components||'').split(';')[0].trim();
  var timelineHtml = buildIncidentTimeline(d);
  var dueFmt      = _fmtDate(d.Due);

  /* ── overdue warning ── */
  var overdueWarn = '';
  if (overdue && d.Status !== 'Done' && d.Status !== 'Resolved') {
    overdueWarn = '<div class="overdue-warn">'+
      '<span class="ow-icon">⚠</span>'+
      '<div class="ow-body">Overdue since '+dueFmt+'. This issue has passed its due date and requires immediate attention.</div>'+
    '</div>';
  }

  /* ── meta row: severity · comp · due (NO assignee, NO status tag) ── */
  var metaParts = [];
  if (d.Severity) {
    metaParts.push('<span class="sev-badge '+_sevCls(d.Severity)+'">'+d.Severity+'</span>');
  }
  if (firstComp) {
    if (metaParts.length) metaParts.push('<span class="meta-sep">·</span>');
    metaParts.push('<span class="comp-chip">'+firstComp+'</span>');
  }
  if (dueFmt && d.Status !== 'Done') {
    if (metaParts.length) metaParts.push('<span class="meta-sep">·</span>');
    metaParts.push('<span class="meta-due'+(overdue?' overdue':'')+'">'+dueFmt+'</span>');
  }
  var metaHtml = metaParts.length ? '<div class="icard-meta">'+metaParts.join('')+'</div>' : '';

  /* ── priority badge top-right ── */
  var priBadge = d.Priority
    ? '<span class="pri-badge '+_priBadgeCls(d.Priority)+'">'+d.Priority+'</span>'
    : '';

  var cls = {Open:'open','In Progress':'in-progress',Investigating:'investigating',
             Resolved:'resolved',Done:'done'}[d.Status] || 'open';

  return '<div class="icard '+cls+'">'+
    '<div class="icard-top">'+
      '<span class="ikey"><a href="'+ISSUE_JIRA_BASE+d.Key+'" target="_blank">'+d.Key+' ↗</a></span>'+
      (multiCh ? '<span class="tag multi-ch">Multi-channel</span>' : '')+
      (!d.Assignee && d.Status !== 'Done' ? '<span class="tag unassigned-tag">Unassigned</span>' : '')+
      '<span class="icard-pri">'+priBadge+'</span>'+
    '</div>'+
    '<div class="isummary">'+d.Summary+'</div>'+
    metaHtml+
    timelineHtml+
    overdueWarn+
  '</div>';
}


/* ── Build table view ────────────────────────────────────── */
function buildTable(data) {
  var countEl = document.getElementById('count-label');
  if (countEl) countEl.textContent = 'Showing '+data.length+' issue'+(data.length!==1?'s':'');

  var tbody = document.getElementById('issue-tbody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No issues match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function(d){
    var overdue = isOverdue(d.Due, d.Status);
    var dueFmt  = _fmtDate(d.Due);

    /* open/re-open > 1 week warning */
    var staleSt = (d.Status === 'Open' || d.Status === 'Re-open' || d.Status === 'Reopened');
    var staleWarn = false;
    if (staleSt && d.CreatedDate) {
      var ageH = (Date.now() - new Date(d.CreatedDate)) / 3600000;
      if (ageH > 168) staleWarn = true; /* 168h = 7 days */
    }

    /* due date cell */
    var dueCell = '—';
    if (dueFmt && d.Status !== 'Done') {
      dueCell = '<span style="color:'+(overdue?'var(--down)':'var(--text2)')+'">'+dueFmt+'</span>';
      if (overdue) {
        dueCell += '<div class="tbl-warn">⚠ Overdue</div>';
      } else if (staleWarn) {
        dueCell += '<div class="tbl-warn">⚠ Open &gt;1 week</div>';
      }
    } else if (staleWarn && d.Status !== 'Done') {
      dueCell = '—<div class="tbl-warn">⚠ Open &gt;1 week</div>';
    }

    return '<tr>'+
      '<td><a href="'+ISSUE_JIRA_BASE+d.Key+'" target="_blank" style="color:var(--accent);font-weight:700;text-decoration:none;white-space:nowrap">'+d.Key+' ↗</a></td>'+
      '<td style="min-width:200px;max-width:280px">'+d.Summary+'</td>'+
      '<td>'+statusTag(d.Status)+'</td>'+
      '<td style="white-space:nowrap;color:'+_pColor(d.Priority)+';font-weight:600">'+(d.Priority||'—')+'</td>'+
      '<td style="white-space:nowrap;color:'+_sColor(d.Severity)+';font-weight:600">'+(d.Severity||'—')+'</td>'+
      '<td style="white-space:nowrap;font-size:12px">'+(d.Assignee||'<span style="color:var(--text3)">—</span>')+'</td>'+
      '<td style="font-size:12px;min-width:100px">'+dueCell+'</td>'+
    '</tr>';
  }).join('');
}

/* ── Systemic issues section ─────────────────────────────── */
function buildSystemicSection(data) {
  var el = document.getElementById('issue-init-section');
  if (!el) return;

  var systemic = data.filter(function(d){
    var multiCh = (d.Components||'').split(';').filter(Boolean).length >= 3;
    return multiCh || (d.Summary||'').includes('System Down');
  });

  if (!systemic.length) {
    el.innerHTML = '<p style="color:var(--text2);font-size:13px;padding:10px 0">No systemic issues identified in current data.</p>';
    return;
  }

  el.innerHTML = systemic.map(function(d){
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'+
      '<span style="color:var(--accent);font-weight:700;font-size:12px;white-space:nowrap">'+d.Key+'</span>'+
      '<div style="flex:1;font-size:12px">'+
        '<div style="font-weight:600;color:var(--text)">'+d.Summary+'</div>'+
        '<div style="color:var(--text2);margin-top:3px">'+(d.RootCause||'Root cause not documented')+'</div>'+
      '</div>'+
      statusTag(d.Status)+
    '</div>';
  }).join('');
}

/* ── Render pipeline (called after data is ready) ───────── */
function _renderIssues() {
  var data = window.issueData || [];
  data.forEach(function(d){ d.Status = _normaliseStatus(d.Status); });
  populateFilters(data);
  applyFilters();
  buildSystemicSection(data);
}

/* ── initIssueBoard: called by index.html onDOMContentLoaded ─
   Delegates to data.js loadIssueData(onSuccess, onError)       */
function initIssueBoard() {
  if (typeof loadIssueData === 'function') {
    loadIssueData(
      function() { _renderIssues(); },
      function(msg) {
        var b = document.getElementById('issue-board');
        if (b) b.innerHTML = '<div style="padding:40px;color:var(--down);text-align:center;font-size:13px">⚠ ' + msg + '</div>';
        var t = document.getElementById('issue-tbody');
        if (t) t.innerHTML = '<tr><td colspan="9" class="empty">⚠ ' + msg + '</td></tr>';
        var c = document.getElementById('count-label');
        if (c) c.textContent = 'Error loading data';
      }
    );
  } else {
    _renderIssues();
  }
}
