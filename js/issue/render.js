/* ══════════════════════════════════════════════════════════════
   ISSUE RENDER  —  js/issue/render.js
   Depends on: js/issue/config.js, js/issue/data.js (loaded first)
══════════════════════════════════════════════════════════════ */

/* ── State ───────────────────────────────────────────────── */
var _filterStatuses = {};   /* multi-select: {Open:true, Done:true ...} */
var _filterPriority = 'all';
var _filterSeverity = 'all';
var _filterComp     = 'all';
var _filterGroup    = 'all';
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
var _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Robust date parser: handles "2026-03-31", "31 Mar 2026", "Mar 31 2026" etc. ── */
function _parseDate(raw) {
  if (!raw) return null;
  var d = new Date(raw);
  if (!isNaN(d)) return d;
  /* fallback: try replacing space-separated parts */
  var iso = String(raw).replace(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/, function(_,day,mon,yr){
    var mi = (function(){ for(var i=0;i<_MONTHS.length;i++){ if(_MONTHS[i].toLowerCase()===mon.toLowerCase()) return i; } return -1; })();
    return yr+'-'+(mi>=0?String(mi+1).padStart(2,'0'):'01')+'-'+String(day).padStart(2,'0');
  });
  d = new Date(iso);
  return isNaN(d) ? null : d;
}

function _fmtDate(raw) {
  if (!raw) return null;
  var d = _parseDate(raw);
  if (!d) return String(raw).substring(0, 12); /* fallback: show raw */
  return d.getDate() + ' ' + _MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

function _fmtDateTime(raw) {
  if (!raw) return null;
  var d = _parseDate(raw);
  if (!d) return String(raw).substring(0, 20);
  var pad = function(n){ return String(n).padStart(2,'0'); };
  return d.getDate()+' '+_MONTHS[d.getMonth()]+' '+d.getFullYear()+
         ' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}

function buildIncidentTimeline(d) {
  var hasTimeline = d.FailureOccurs || d.CorrectionBegins || d.FailureResolved;
  if (!hasTimeline) return '';

  var mttrH = calcMTTRHours(d.FailureOccurs, d.FailureResolved);
  var respH = calcResponseHours(d.FailureOccurs, d.CorrectionBegins);
  var fixH  = d.CorrectionBegins && d.FailureResolved
              ? calcMTTRHours(d.CorrectionBegins, d.FailureResolved) : null;
  var respLbl = respH ? (respH < 1 ? Math.round(respH*60)+'m' : respH.toFixed(1)+'h') : null;
  var fixDur  = fixH  ? (fixH < 24 ? fixH.toFixed(1)+'h' : (fixH/24).toFixed(1)+'d') : null;
  var isOngoing = !d.FailureResolved;

  /* ── bar proportions ── */
  var totalH  = mttrH || (respH || 0);
  var respPct = (totalH > 0 && respH) ? Math.min(Math.round(respH / totalH * 100), 35) : 12;

  /* bar label = fix duration */
  var barLabel = fixDur || (isOngoing && respH ? Math.round(respH)+'h so far' : '');

  /* ── due date marker ── */
  var duePct = null;
  var dueFmtBar = null;
  if (d.Due && d.FailureOccurs) {
    var dtDue   = _parseDate(d.Due);
    var dtStart = _parseDate(d.FailureOccurs);
    var dtEnd   = d.FailureResolved ? _parseDate(d.FailureResolved) : new Date();
    if (dtDue && dtStart && dtEnd) {
      var spanH = (dtEnd - dtStart) / 3600000;
      var dueOffH = (dtDue - dtStart) / 3600000;
      if (spanH > 0) {
        duePct = Math.max(5, Math.min(95, Math.round(dueOffH / spanH * 100)));
        dueFmtBar = _fmtDate(d.Due);
      }
    }
  }

  /* ── dot builder ── */
  function dotHtml(color, raw) {
    if (!raw) return '';
    var dt = _parseDate(raw);
    if (!dt) return '';
    var pad = function(n){ return String(n).padStart(2,'0'); };
    var dateStr = dt.getDate()+' '+_MONTHS[dt.getMonth()]+' '+dt.getFullYear();
    var timeStr = pad(dt.getHours())+':'+pad(dt.getMinutes())+':'+pad(dt.getSeconds());
    return '<span class="tl2-dot-wrap">'+
             '<span class="tl2-dot" style="background:'+color+'"></span>'+
             '<span class="tl2-ts-wrap">'+
               '<span class="tl2-ts-date">'+dateStr+'</span>'+
               '<span class="tl2-ts-time">'+timeStr+'</span>'+
             '</span>'+
           '</span>';
  }

  var html = '<div class="tl2">';

  /* ── bar with due-date marker ABOVE bar ── */
  html += '<div class="tl2-bar-outer">';

  /* due label row above bar */
  if (duePct !== null) {
    html += '<div class="tl2-due-row" style="position:relative;height:14px;margin-bottom:1px">'+
              '<div class="tl2-due-marker-top" style="left:'+duePct+'%">'+
                '<span class="tl2-due-label-top">'+dueFmtBar+'</span>'+
                '<div class="tl2-due-tick"></div>'+
              '</div>'+
            '</div>';
  }

  /* bar — orange=ongoing, green=resolved */
  var fixColor = isOngoing ? '#f97316' : 'var(--up)';
  html += '<div class="tl2-bar">'+
    '<div class="tl2-seg-grey" style="width:'+respPct+'%"></div>'+
    '<div class="tl2-seg-fix" style="flex:1;background:'+fixColor+'"></div>'+
  '</div>';

  /* due date marker line overlapping bar */
  if (duePct !== null) {
    html += '<div class="tl2-due-line-wrap" style="left:'+duePct+'%"></div>';
  }
  html += '</div>'; /* /tl2-bar-outer */

  /* ── dots row ── */
  html += '<div class="tl2-dots-row">';
  html += dotHtml('#6e7681', d.FailureOccurs);
  html += dotHtml('#f97316', d.CorrectionBegins);
  if (d.FailureResolved) {
    html += dotHtml('#3fb950', d.FailureResolved);
  } else {
    html += '<span class="tl2-dot-wrap"><span class="tl2-dot" style="background:#f97316"></span>'+
            '<span class="tl2-ts-wrap"><span class="tl2-pending">pending</span></span></span>';
  }
  html += '</div>';

  /* ── metrics row: Response · Fix · MTTR ── */
  var mttrLbl = calcMTTR(d.FailureOccurs, d.FailureResolved);
  var metrics = [];
  if (respLbl)  metrics.push('Response: <b>'+respLbl+'</b>');
  if (fixDur)   metrics.push('Fix: <b class="tl2-fix">'+fixDur+'</b>');
  if (mttrLbl)  metrics.push('MTTR: <b class="tl2-mttr">'+mttrLbl+'</b>');
  if (metrics.length) {
    html += '<div class="tl2-metrics-row">'+
      metrics.map(function(m){ return '<span class="tl2-metric">'+m+'</span>'; })
             .join('<span class="tl2-divider">|</span>')+
    '</div>';
  }

  html += '</div>';
  return html;
}

/* ── Group helper — derive group from Summary prefix ────── */
function _getGroup(d) {
  if (d.IssueType && d.IssueType !== 'Issue') return d.IssueType;
  var m = (d.Summary||'').match(/^\[(INCIDENT|ISSUE|TASK|BUG|REQUEST)\]/i);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return 'Other';
}

/* ── KPI stat cards ─────────────────────────────────────── */
function buildKPI(data) {
  var el = document.getElementById('issue-kpi');
  if (!el) return;
  var total    = data.length;
  var open     = data.filter(function(d){ return d.Status === 'Open' || d.Status === 'Investigating'; }).length;
  var inprog   = data.filter(function(d){ return d.Status === 'In Progress'; }).length;
  var done     = data.filter(function(d){ return d.Status === 'Done' || d.Status === 'Resolved'; }).length;
  var critical = data.filter(function(d){ return d.Severity === 'Critical' || d.Priority === 'Highest'; }).length;
  var overdue  = data.filter(function(d){ return isOverdue(d.Due, d.Status); }).length;
  var unassigned = data.filter(function(d){ return !d.Assignee && d.Status !== 'Done'; }).length;

  el.innerHTML =
    kpiCard('TOTAL ISSUES', total, 'all statuses', 'accent') +
    kpiCard('OPEN', open, 'open & investigating', 'orange') +
    kpiCard('IN PROGRESS', inprog, 'being fixed', 'accent') +
    kpiCard('RESOLVED / DONE', done, 'closed this cycle', 'green') +
    kpiCard('CRITICAL / HIGHEST', critical, 'priority issues', 'purple') +
    kpiCard('OVERDUE', overdue, 'past due date', overdue > 0 ? 'orange' : '') +
    kpiCard('UNASSIGNED', unassigned, 'no owner', unassigned > 0 ? 'orange' : '');
}

function kpiCard(label, value, meta, cls) {
  return '<div class="kpi-card '+(cls||'')+'">'+
    '<div class="kpi-label">'+label+'</div>'+
    '<div class="kpi-value">'+value+'</div>'+
    '<div class="kpi-meta">'+meta+'</div>'+
  '</div>';
}

/* ── Charts: status bar + priority bar ─────────────────── */
function buildCharts(data) {
  buildStatusBar(data);
  buildPriorityBar(data);
}

function buildStatusBar(data) {
  var el = document.getElementById('chart-status');
  if (!el) return;
  var counts = {};
  STATUSES.forEach(function(s){ counts[s.key] = 0; });
  data.forEach(function(d){ if (counts[d.Status] !== undefined) counts[d.Status]++; });
  var total = data.length || 1;
  el.innerHTML = '<div class="chart-title">Issues by Status</div>'+
    '<div class="chart-desc">Distribution across all statuses</div>'+
    STATUSES.map(function(s){
      var n = counts[s.key] || 0;
      var pct = Math.round(n / total * 100);
      return '<div class="cbar-row">'+
        '<span class="cbar-label">'+s.label+'</span>'+
        '<div class="cbar-track"><div class="cbar-fill" style="width:'+pct+'%;background:'+s.color+'"></div></div>'+
        '<span class="cbar-val">'+n+'</span>'+
      '</div>';
    }).join('');
}

function buildPriorityBar(data) {
  var el = document.getElementById('chart-priority');
  if (!el) return;
  var order = ['Highest','High','Medium','Low','Lowest'];
  var colors = { Highest:'var(--down)', High:'#f97316', Medium:'var(--amber)', Low:'var(--up)', Lowest:'var(--text3)' };
  var counts = {};
  order.forEach(function(p){ counts[p] = 0; });
  data.forEach(function(d){ if (d.Priority && counts[d.Priority] !== undefined) counts[d.Priority]++; });
  var total = data.length || 1;
  el.innerHTML = '<div class="chart-title">Issues by Priority</div>'+
    '<div class="chart-desc">Breakdown by severity level</div>'+
    order.map(function(p){
      var n = counts[p] || 0;
      var pct = Math.round(n / total * 100);
      return '<div class="cbar-row">'+
        '<span class="cbar-label">'+p+'</span>'+
        '<div class="cbar-track"><div class="cbar-fill" style="width:'+pct+'%;background:'+colors[p]+'"></div></div>'+
        '<span class="cbar-val">'+n+'</span>'+
      '</div>';
    }).join('');
}

/* ── Populate filter dropdowns ───────────────────────────── */
function populateFilters(data) {
  var priorities = [], severities = [], comps = [], groups = [];
  data.forEach(function(d) {
    if (d.Priority && priorities.indexOf(d.Priority) < 0) priorities.push(d.Priority);
    if (d.Severity && severities.indexOf(d.Severity) < 0) severities.push(d.Severity);
    (d.Components||'').split(';').forEach(function(c){
      c = c.trim();
      if (c && comps.indexOf(c) < 0) comps.push(c);
    });
    var g = _getGroup(d);
    if (g && groups.indexOf(g) < 0) groups.push(g);
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
  fillSelect('filter-group',     groups);
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
    /* multi-select status */
    var activeStatuses = Object.keys(_filterStatuses).filter(function(k){ return _filterStatuses[k]; });
    if (activeStatuses.length > 0 && activeStatuses.indexOf(d.Status) < 0) return false;
    if (_filterPriority !== 'all' && d.Priority !== _filterPriority) return false;
    if (_filterSeverity !== 'all' && d.Severity !== _filterSeverity) return false;
    if (_filterComp !== 'all') {
      var comps = (d.Components||'').split(';').map(function(c){return c.trim();});
      if (comps.indexOf(_filterComp) < 0) return false;
    }
    if (_filterGroup !== 'all') {
      /* group by IssueType or Components prefix */
      var grp = _getGroup(d);
      if (grp !== _filterGroup) return false;
    }
    if (_searchQ) {
      var q = _searchQ.toLowerCase();
      var hay = ((d.Key||'')+' '+(d.Summary||'')+' '+(d.Assignee||'')+' '+(d.Components||'')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });

  var col = _sortCol;
  out.sort(function(a,b){
    var av = (a[col]||'').toString(), bv = (b[col]||'').toString();
    var cmp = av.localeCompare(bv, undefined, {numeric:true});
    return _sortAsc ? cmp : -cmp;
  });

  buildKPI(out);
  buildCharts(out);
  if (_activeView === 'board') buildBoard(out);
  else                         buildTable(out);
}

function onStatusFilter(status) {
  if (status === 'all') {
    _filterStatuses = {};
  } else {
    _filterStatuses[status] = !_filterStatuses[status];
    if (!_filterStatuses[status]) delete _filterStatuses[status];
  }
  /* update button active states */
  var active = Object.keys(_filterStatuses).filter(function(k){ return _filterStatuses[k]; });
  document.querySelectorAll('.status-btn').forEach(function(btn){
    var s = btn.dataset.status;
    if (s === 'all') {
      btn.classList.toggle('active', active.length === 0);
    } else {
      btn.classList.toggle('active', _filterStatuses[s] === true);
    }
  });
  applyFilters();
}

function onDropdownChange() {
  _filterPriority = (document.getElementById('filter-priority')||{}).value || 'all';
  _filterSeverity = (document.getElementById('filter-severity')||{}).value || 'all';
  _filterComp     = (document.getElementById('filter-component')||{}).value || 'all';
  _filterGroup    = (document.getElementById('filter-group')||{}).value || 'all';
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

/* ── Hidden status columns (persisted in memory) ─────────── */
var _hiddenCols = {};

function toggleStatusCol(key) {
  _hiddenCols[key] = !_hiddenCols[key];
  applyFilters();
}

/* delegate clicks on eye buttons via event bubbling */
document.addEventListener('click', function(ev) {
  var btn = ev.target.closest('[data-toggle-col]');
  if (btn) toggleStatusCol(btn.getAttribute('data-toggle-col'));
});

/* ── Build board view ────────────────────────────────────── */
function buildBoard(data) {
  var countEl = document.getElementById('count-label');
  if (countEl) countEl.textContent = 'Showing '+data.length+' issue'+(data.length!==1?'s':'');

  var boardEl = document.getElementById('issue-board');
  if (!boardEl) return;

  var groups = {};
  STATUSES.forEach(function(s){ groups[s.key] = []; });
  data.forEach(function(d){
    var sk = d.Status;
    if (!groups[sk]) sk = 'Open';
    groups[sk].push(d);
  });

  var eyeOpen   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var eyeClosed = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  boardEl.innerHTML = STATUSES.map(function(s){
    var items  = groups[s.key] || [];
    var hidden = !!_hiddenCols[s.key];

    if (hidden) {
      return '<div class="iboard-col iboard-col--hidden">'+
        '<div class="iboard-col-hd" style="border-top-color:'+s.color+';cursor:pointer" data-toggle-col="'+s.key+'">'+
          '<span class="iboard-col-name" style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px">'+s.label+'</span>'+
          '<span class="iboard-col-cnt" style="margin-top:6px">'+items.length+'</span>'+
          '<span class="iboard-col-eye">'+eyeOpen+'</span>'+
        '</div>'+
      '</div>';
    }

    return '<div class="iboard-col">'+
      '<div class="iboard-col-hd" style="border-top-color:'+s.color+'">'+
        '<span class="iboard-col-name">'+s.label+'</span>'+
        '<span class="iboard-col-cnt">'+items.length+'</span>'+
        '<button class="iboard-col-eye" data-toggle-col="'+s.key+'" title="Hide column">'+eyeClosed+'</button>'+
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
  buildKPI(data);
  buildCharts(data);
  applyFilters();
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
