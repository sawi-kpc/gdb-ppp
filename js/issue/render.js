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

function buildIncidentTimeline(d) {
  var hasTimeline = d.FailureOccurs || d.CorrectionBegins || d.FailureResolved;
  if (!hasTimeline) return '';
  var mttr   = calcMTTR(d.FailureOccurs, d.FailureResolved);
  var mttrH  = calcMTTRHours(d.FailureOccurs, d.FailureResolved);
  var respH  = calcResponseHours(d.FailureOccurs, d.CorrectionBegins);
  var respLbl= respH ? (respH < 1 ? Math.round(respH*60)+'m' : respH.toFixed(1)+'h') : null;
  var pct    = mttrH ? Math.min(Math.round(mttrH/48*100),100) : 0;

  var html = '<div class="tl">';
  html += '<div class="tl-label">Incident timeline</div>';
  html += '<div class="tl-dots">';
  html += '<div class="td">Failure<span>'+(d.FailureOccurs||'—')+'</span></div>';
  html += '<div class="td">Fix started<span>'+(d.CorrectionBegins||'—')+'</span></div>';
  html += '<div class="td">Resolved<span>'+(d.FailureResolved||'<span style="color:var(--amber)">Ongoing</span>')+'</span></div>';
  html += '</div>';
  if (mttr || respLbl) {
    html += '<div class="tl-metrics">';
    if (respLbl) html += '<span>Response: <b>'+respLbl+'</b></span>';
    if (mttr)    html += '<span>Fix: <b style="color:var(--amber)">'+mttr+'</b></span>';
    if (mttr)    html += '<span>MTTR: <b style="color:var(--up)">'+mttr+'</b></span>';
    html += '</div>';
  }
  if (mttr) {
    html += '<div class="mttr-wrap">';
    html += '<div style="font-size:10px;color:var(--text2);display:flex;justify-content:space-between"><span>MTTR</span><span style="color:var(--up);font-weight:600">'+mttr+'</span></div>';
    html += '<div class="mttr-bar"><div class="mttr-fill" style="width:'+pct+'%"></div></div>';
    html += '</div>';
  }
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
  var raw = (window._issueData || []).map(function(d){
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

/* ── Build single card ───────────────────────────────────── */
function buildCard(d) {
  var overdue  = isOverdue(d.Due, d.Status);
  var mttrH    = calcMTTRHours(d.FailureOccurs, d.FailureResolved);
  var hasTimeline = d.FailureOccurs || d.CorrectionBegins || d.FailureResolved;
  var multiCh  = (d.Components||'').split(';').filter(Boolean).length >= 3;
  var isSystemic = multiCh || (d.Summary||'').includes('System Down');

  /* first component only for meta row */
  var firstComp = (d.Components||'').split(';')[0].trim();

  var timelineHtml = buildIncidentTimeline(d);

  var initHint = '';
  if (d.Key === 'GIT-42') {
    initHint = '<div class="init-hint"><span>◆</span><div class="ih-body">Process gap: no automated float monitoring at month-end. Recurring risk → consider payment ops initiative</div></div>';
  }
  if (d.Key === 'GIT-9' || d.Key === 'GIT-4') {
    initHint = '<div class="init-hint"><span>◆</span><div class="ih-body">Cross-channel system resilience gap. Relates to PPP-9 (Single Commerce Platform) scope.</div></div>';
  }

  /* ── meta row: severity · firstComp · assignee · due (1 line) ── */
  var metaParts = [];
  if (d.Severity) {
    metaParts.push('<span class="sev-badge '+_sevCls(d.Severity)+'">'+d.Severity+'</span>');
  }
  if (firstComp) {
    if (metaParts.length) metaParts.push('<span class="meta-sep">·</span>');
    metaParts.push('<span class="comp-chip">'+firstComp+'</span>');
  }
  if (metaParts.length) metaParts.push('<span class="meta-sep">·</span>');
  if (d.Assignee) {
    metaParts.push('<span class="meta-assignee">'+d.Assignee+'</span>');
  } else {
    metaParts.push('<span class="meta-assignee" style="color:var(--down)">Unassigned</span>');
  }
  if (d.Due && d.Status !== 'Done') {
    metaParts.push('<span class="meta-sep">·</span>');
    metaParts.push('<span class="meta-due'+(overdue?' overdue':'')+'">Due '+d.Due+'</span>');
  }
  var metaHtml = '<div class="icard-meta">'+metaParts.join('')+'</div>';

  var cls = {Open:'open','In Progress':'in-progress',Investigating:'investigating',
             Resolved:'resolved',Done:'done'}[d.Status] || 'open';

  return '<div class="icard '+cls+'">'+
    '<div class="icard-top">'+
      '<span class="ikey"><a href="'+JIRA_BASE+d.Key+'" target="_blank">'+d.Key+' ↗</a></span>'+
      statusTag(d.Status)+
      (multiCh ? '<span class="tag multi-ch">Multi-channel</span>' : '')+
      (overdue ? '<span class="tag overdue-tag">Overdue</span>' : '')+
      (!d.Assignee && d.Status !== 'Done' ? '<span class="tag unassigned-tag">Unassigned</span>' : '')+
    '</div>'+
    '<div class="isummary">'+d.Summary+'</div>'+
    metaHtml+
    (d.RootCause ? '<div class="iroot">Root cause: '+d.RootCause+'</div>' : '')+
    timelineHtml+
    initHint+
  '</div>';
}

/* ── Build table view ────────────────────────────────────── */
function buildTable(data) {
  var countEl = document.getElementById('count-label');
  if (countEl) countEl.textContent = 'Showing '+data.length+' issue'+(data.length!==1?'s':'');

  var tbody = document.getElementById('issue-tbody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">No issues match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function(d){
    var overdue = isOverdue(d.Due, d.Status);
    var mttr    = calcMTTR(d.FailureOccurs, d.FailureResolved);
    var respH   = calcResponseHours(d.FailureOccurs, d.CorrectionBegins);
    var respLbl = respH ? (respH < 1 ? Math.round(respH*60)+'m' : respH.toFixed(1)+'h') : '—';

    var tlHtml = '';
    if (d.FailureOccurs || d.CorrectionBegins || d.FailureResolved) {
      tlHtml = '<div style="font-size:10px;line-height:1.8;white-space:nowrap">'+
        '<div>Failure: '+(d.FailureOccurs||'—')+'</div>'+
        '<div>Fix started: '+(d.CorrectionBegins||'—')+'</div>'+
        '<div>Resolved: '+(d.FailureResolved||'<span style="color:var(--amber)">Ongoing</span>')+'</div>'+
        '<div>Response: <b>'+respLbl+'</b> | MTTR: <b>'+(mttr||'—')+'</b></div>'+
      '</div>';
    }

    return '<tr>'+
      '<td><a href="'+JIRA_BASE+d.Key+'" target="_blank" style="color:var(--accent);font-weight:700;text-decoration:none;white-space:nowrap">'+d.Key+' ↗</a></td>'+
      '<td style="min-width:200px;max-width:300px">'+d.Summary+'</td>'+
      '<td>'+statusTag(d.Status)+(overdue?'<br><span class="tag open" style="margin-top:3px">Overdue</span>':'')+'</td>'+
      '<td style="white-space:nowrap;color:'+_pColor(d.Priority)+';font-weight:600">'+(d.Priority||'—')+'</td>'+
      '<td style="white-space:nowrap;color:'+_sColor(d.Severity)+';font-weight:600">'+(d.Severity||'—')+'</td>'+
      '<td style="font-size:11px">'+compsHtml(d.Components)+'</td>'+
      '<td style="white-space:nowrap;font-size:12px">'+(d.Assignee||'<span style="color:var(--down)">—</span>')+'</td>'+
      '<td style="white-space:nowrap;font-size:12px;color:'+(overdue?'var(--down)':'var(--text2)')+'">'+
        (d.Due && d.Status !== 'Done' ? d.Due : '—')+
      '</td>'+
      '<td style="font-size:11px;max-width:200px">'+(d.RootCause||'—')+'</td>'+
      '<td>'+tlHtml+'</td>'+
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

/* ── Kick off after data loaded ──────────────────────────── */
function loadIssueData() {
  var data = window._issueData || [];

  /* normalise statuses in place */
  data.forEach(function(d){ d.Status = _normaliseStatus(d.Status); });

  populateFilters(data);
  applyFilters();
  buildSystemicSection(data);
}

function clearIssueCache() {
  Object.keys(localStorage).forEach(function(k){
    if (k.startsWith('gdb_issue_')) localStorage.removeItem(k);
  });
}
