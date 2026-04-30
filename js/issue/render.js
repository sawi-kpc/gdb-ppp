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
var _chartGroupBy   = 'week'; /* 'week' | 'month' */

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

/* ── Group: d.Group column first, fallback to 2nd Summary bracket ──
   e.g. "[INCIDENT] [JD] ..." → "JD"                                */
function _getGroupSafe(d) {
  if (d.Group && d.Group.trim()) return d.Group.trim();
  /* fallback: extract 2nd bracket from Summary */
  var brackets = [];
  var re = /\[([^\]]+)\]/g, m;
  var s = d.Summary || '';
  while ((m = re.exec(s)) !== null) brackets.push(m[1]);
  if (brackets.length >= 2) return brackets[1];
  if (brackets.length === 1) return brackets[0];
  return null;
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

/* ── Charts ─────────────────────────────────────────────── */
function buildCharts(data) {
  buildWeekChart(data);
  buildHeatmapChart(data);
  buildRiskHeatmap(data);
  buildPerfHeatmap(data);
}

function toggleChartGroup(mode) {
  _chartGroupBy = mode;
  buildWeekChart(_lastFilteredData || []);
  var w = document.getElementById('toggle-week');
  var m = document.getElementById('toggle-month');
  if (w) w.classList.toggle('active', mode === 'week');
  if (m) m.classList.toggle('active', mode === 'month');
}

/* ── Chart 1: Vertical stacked bar — incidents by week/month ── */
function buildWeekChart(data) {
  var el = document.getElementById('chart-status');
  if (!el) return;
  _lastFilteredData = data;

  var NO_DATE_KEY = 'No date';
  var buckets = {};

  data.forEach(function(d) {
    var key, sortKey;
    if (!d.FailureOccurs) {
      key = NO_DATE_KEY;
      sortKey = '0000-00';
    } else {
      var dt = _parseDate(d.FailureOccurs);
      if (!dt) {
        key = NO_DATE_KEY;
        sortKey = '0000-00';
      } else if (_chartGroupBy === 'month') {
        key = _MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
        /* sortKey: YYYY-MM for correct ASC sort */
        sortKey = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0');
      } else {
        var day1 = new Date(dt.getFullYear(), 0, 1);
        var wk = Math.ceil(((dt - day1) / 86400000 + day1.getDay() + 1) / 7);
        key = 'W' + String(wk).padStart(2, '0') + " '" + String(dt.getFullYear()).slice(2);
        sortKey = String(dt.getFullYear()) + '-' + String(wk).padStart(2,'0');
      }
    }
    if (!buckets[key]) buckets[key] = { resolved: 0, pending: 0, sortKey: sortKey };
    if (d.FailureResolved) buckets[key].resolved++;
    else buckets[key].pending++;
  });

  /* sort: "No date" first, then dated buckets ASC by date */
  var keys = Object.keys(buckets).sort(function(a, b) {
    if (a === NO_DATE_KEY) return -1;
    if (b === NO_DATE_KEY) return 1;
    var sa = buckets[a].sortKey || a;
    var sb = buckets[b].sortKey || b;
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });

  var maxVal = keys.reduce(function(m, k) {
    return Math.max(m, buckets[k].resolved + buckets[k].pending);
  }, 0) || 1;

  /* y-axis steps */
  var yTop   = Math.ceil(maxVal / 3) * 3 || 3;
  var yStep  = Math.ceil(yTop / 3);
  var yGrids = [0, yStep, yStep * 2, yTop];

  /* bar width responsive */
  var BAR_W = Math.max(28, Math.min(72, Math.floor(460 / Math.max(keys.length, 1)) - 10));

  var togW = _chartGroupBy === 'week';
  var toggleHtml =
    '<div class="chart-toggle">' +
      '<button id="toggle-week"  class="ctog' + (togW  ? ' active' : '') + '" data-cgrp="week">Week</button>' +
      '<button id="toggle-month" class="ctog' + (!togW ? ' active' : '') + '" data-cgrp="month">Month</button>' +
    '</div>';

  /* bars HTML */
  var barsHtml = keys.map(function(k) {
    var b    = buckets[k];
    var tot  = b.resolved + b.pending;
    var resP = Math.round(b.resolved / maxVal * 100);
    var penP = Math.round(b.pending  / maxVal * 100);
    var isND = k === NO_DATE_KEY;
    var stackStyle = isND
      ? 'opacity:0.55;border:1.5px dashed var(--border);border-radius:3px 3px 0 0;box-sizing:border-box'
      : '';
    var sepStyle = isND
      ? 'margin-right:10px;padding-right:10px;border-right:1px solid var(--border)'
      : '';
    return '<div class="vbar-col" style="flex:1;max-width:' + (BAR_W*2) + 'px;min-width:' + BAR_W + 'px;' + sepStyle + '">' +
      '<div class="vbar-stack" style="' + stackStyle + '">' +
        (b.pending  ? '<div class="vbar-seg" style="height:' + penP + '%;background:#f97316;min-height:3px" title="Pending: '  + b.pending  + '"></div>' : '') +
        (b.resolved ? '<div class="vbar-seg" style="height:' + resP + '%;background:#3fb950;min-height:3px" title="Resolved: ' + b.resolved + '"></div>' : '') +
      '</div>' +
      '<div class="vbar-x-label"' + (isND ? ' style="color:var(--text3);font-style:italic"' : '') + '>' + k + '</div>' +
    '</div>';
  }).join('');

  /* y-axis labels */
  var yLabelsHtml = yGrids.slice().reverse().map(function(v) {
    return '<span class="vbar-y-tick">' + v + '</span>';
  }).join('');

  /* grid lines */
  var gridHtml = yGrids.map(function(v) {
    var pct = Math.round(v / yTop * 100);
    return '<div class="vbar-hline" style="bottom:' + pct + '%"></div>';
  }).join('');

  el.innerHTML =
    '<div class="chart-head">' +
      '<div>' +
        '<div class="chart-title">Incidents by ' + (_chartGroupBy === 'week' ? 'Week' : 'Month') + '</div>' +
        '<div class="chart-desc">Failure occurrence — stacked by resolution status</div>' +
      '</div>' +
      toggleHtml +
    '</div>' +
    '<div class="vbar-area">' +
      '<div class="vbar-y-axis">' + yLabelsHtml + '</div>' +
      '<div class="vbar-inner">' +
        '<div class="vbar-grid">' + gridHtml + '</div>' +
        '<div class="vbar-bars">' + barsHtml + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="chart-legend">' +
      '<span class="cleg"><span class="cleg-dot" style="background:#3fb950"></span>Resolved</span>' +
      '<span class="cleg"><span class="cleg-dot" style="background:#f97316"></span>Pending</span>' +
    '</div>';
}


/* ── Chart 2: replace with Option A — Component × Status count ── */
function buildHeatmapChart(data) {
  var el = document.getElementById('chart-priority');
  if (!el) return;

  var STATUS_ORDER = ['Open','Investigating','In Progress','Resolved','Done'];
  var STATUS_COLORS = {
    'Open':          {bg:'rgba(226,75,74,.15)',  fg:'#A32D2D'},
    'Investigating': {bg:'rgba(239,159,39,.15)', fg:'#854F0B'},
    'In Progress':   {bg:'rgba(55,138,221,.15)', fg:'#185FA5'},
    'Resolved':      {bg:'rgba(29,158,117,.15)', fg:'#0F6E56'},
    'Done':          {bg:'rgba(63,185,80,.12)',  fg:'#27500A'},
  };

  /* collect comp × status */
  var compSet = {};
  var matrix  = {}; /* comp → status → count */

  data.forEach(function(d) {
    var comps = (d.Components||'').split(';').map(function(c){ return c.trim(); }).filter(Boolean);
    if (!comps.length) comps = ['Unknown'];
    comps.forEach(function(comp) {
      compSet[comp] = true;
      if (!matrix[comp]) matrix[comp] = {};
      var st = d.Status || 'Unknown';
      matrix[comp][st] = (matrix[comp][st] || 0) + 1;
    });
  });

  var comps    = Object.keys(compSet).sort();
  var statuses = STATUS_ORDER.filter(function(s) {
    return comps.some(function(c) { return matrix[c] && matrix[c][s]; });
  });

  if (!comps.length) {
    el.innerHTML = '<div class="chart-title">Issue Status Heatmap</div>'+
      '<div style="color:var(--text3);font-size:12px;padding:20px 0">No component data</div>';
    return;
  }

  var thead = '<tr><th class="hm-th hm-corner">Component</th>'+
    statuses.map(function(s){
      return '<th class="hm-th">'+s+'</th>';
    }).join('')+
    '<th class="hm-th">Total</th>'+
  '</tr>';

  var tbody = comps.map(function(comp) {
    var row   = matrix[comp] || {};
    var total = statuses.reduce(function(s,st){ return s+(row[st]||0); }, 0);
    var openCnt = (row['Open']||0) + (row['Investigating']||0) + (row['In Progress']||0);
    var rowAccent = openCnt >= 3 ? 'border-left:2px solid var(--down)' :
                    openCnt >= 2 ? 'border-left:2px solid var(--amber)' : '';
    return '<tr style="'+rowAccent+'">'+
      '<td class="hm-comp">'+comp+'</td>'+
      statuses.map(function(st) {
        var n  = row[st] || 0;
        var sc = STATUS_COLORS[st] || {bg:'var(--surface2)', fg:'var(--text2)'};
        return '<td class="hm-cell" style="background:'+(n ? sc.bg : 'transparent')+
               ';color:'+(n ? sc.fg : 'var(--text3)')+'">'+
               (n || '—')+'</td>';
      }).join('')+
      '<td class="hm-cell" style="font-weight:600;color:var(--text)">'+total+'</td>'+
    '</tr>';
  }).join('');

  /* legend */
  var legendHtml = '<div class="hm-legend">'+
    statuses.map(function(s) {
      var sc = STATUS_COLORS[s];
      return '<span class="hm-leg-item">'+
               '<span class="hm-leg-dot" style="background:'+sc.bg+';border:1px solid '+sc.fg+'"></span>'+
               s+'</span>';
    }).join('')+
  '</div>';

  el.innerHTML =
    '<div class="chart-title">Issue Status Heatmap — Component × Status</div>'+
    '<div class="chart-desc">Issue count per component, colored by status type</div>'+
    '<div class="hm-wrap"><table class="hm-table"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table></div>'+
    legendHtml;
}

/* ── Option B: Component × Priority risk ─────────────────────────── */
function buildRiskHeatmap(data) {
  var el = document.getElementById('chart-risk');
  if (!el) return;

  var PRI_ORDER   = ['Highest','High','Medium','Low','Lowest'];
  var PRI_WEIGHT  = {Highest:3, High:2, Medium:1, Low:0.5, Lowest:0};
  var PRI_COLORS  = {
    Highest: {bg:'rgba(226,75,74,.18)',  fg:'#A32D2D'},
    High:    {bg:'rgba(249,115,22,.15)', fg:'#7c3d12'},
    Medium:  {bg:'rgba(239,159,39,.15)', fg:'#854F0B'},
    Low:     {bg:'rgba(63,185,80,.12)',  fg:'#27500A'},
    Lowest:  {bg:'rgba(107,114,128,.1)', fg:'var(--text3)'},
  };

  var compSet = {}, matrix = {};
  data.forEach(function(d) {
    var comps = (d.Components||'').split(';').map(function(c){ return c.trim(); }).filter(Boolean);
    if (!comps.length) comps = ['Unknown'];
    var p = d.Priority || 'Unknown';
    comps.forEach(function(comp) {
      compSet[comp] = true;
      if (!matrix[comp]) matrix[comp] = {};
      matrix[comp][p] = (matrix[comp][p]||0) + 1;
    });
  });

  var comps = Object.keys(compSet).sort();
  var pris  = PRI_ORDER.filter(function(p){ return comps.some(function(c){ return matrix[c]&&matrix[c][p]; }); });
  if (!comps.length) { el.innerHTML=''; return; }

  var thead = '<tr><th class="hm-th hm-corner">Component</th>'+
    pris.map(function(p){ return '<th class="hm-th">'+p+'</th>'; }).join('')+
    '<th class="hm-th">Risk score</th></tr>';

  /* max score for color scale */
  var scores = comps.map(function(comp) {
    return pris.reduce(function(s,p){ return s+(matrix[comp][p]||0)*PRI_WEIGHT[p]; }, 0);
  });
  var maxScore = Math.max.apply(null, scores) || 1;

  var tbody = comps.map(function(comp, i) {
    var row   = matrix[comp] || {};
    var score = scores[i];
    var pct   = score / maxScore;
    var scoreBg = pct >= .67 ? 'rgba(226,75,74,.2)'  :
                  pct >= .34 ? 'rgba(239,159,39,.2)' :
                               'rgba(63,185,80,.12)';
    var scoreFg = pct >= .67 ? '#A32D2D' : pct >= .34 ? '#854F0B' : '#27500A';
    return '<tr>'+
      '<td class="hm-comp">'+comp+'</td>'+
      pris.map(function(p) {
        var n = row[p]||0;
        var pc = PRI_COLORS[p]||{bg:'transparent',fg:'var(--text3)'};
        return '<td class="hm-cell" style="background:'+(n?pc.bg:'transparent')+
               ';color:'+(n?pc.fg:'var(--text3)')+'">'+
               (n||'—')+'</td>';
      }).join('')+
      '<td class="hm-cell" style="background:'+scoreBg+';color:'+scoreFg+';font-weight:600">'+score.toFixed(1)+'</td>'+
    '</tr>';
  }).join('');

  el.innerHTML =
    '<div class="chart-title">Risk Heatmap — Component × Priority</div>'+
    '<div class="chart-desc">Issue count per priority; risk score = Highest×3 + High×2 + Medium×1</div>'+
    '<div class="hm-wrap"><table class="hm-table"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table></div>';
}

/* ── Option C: Component × Response + MTTR performance ───────────── */
function buildPerfHeatmap(data) {
  var el = document.getElementById('chart-perf');
  if (!el) return;

  var compResp = {}, compMttr = {};

  data.forEach(function(d) {
    var comps = (d.Components||'').split(';').map(function(c){ return c.trim(); }).filter(Boolean);
    if (!comps.length) return;

    if (d.FailureOccurs && d.CorrectionBegins) {
      var rh = (_parseDate(d.CorrectionBegins) - _parseDate(d.FailureOccurs)) / 3600000;
      if (rh > 0) comps.forEach(function(c) {
        if (!compResp[c]) compResp[c] = [];
        compResp[c].push(rh);
      });
    }
    if (d.FailureOccurs && d.FailureResolved) {
      var mh = (_parseDate(d.FailureResolved) - _parseDate(d.FailureOccurs)) / 3600000;
      if (mh > 0) comps.forEach(function(c) {
        if (!compMttr[c]) compMttr[c] = [];
        compMttr[c].push(mh);
      });
    }
  });

  var allComps = Object.keys(Object.assign({}, compResp, compMttr)).sort();
  if (!allComps.length) { el.innerHTML=''; return; }

  function avg(arr) { return arr&&arr.length ? arr.reduce(function(s,v){return s+v;},0)/arr.length : null; }
  function fmtH(h)  { if(h===null)return '—'; return h<24 ? h.toFixed(1)+'h' : (h/24).toFixed(1)+'d'; }

  var maxResp = allComps.reduce(function(m,c){ var a=avg(compResp[c]); return a&&a>m?a:m; },0)||1;
  var maxMttr = allComps.reduce(function(m,c){ var a=avg(compMttr[c]); return a&&a>m?a:m; },0)||1;

  function heatColor(val, maxVal) {
    if (val===null) return {bg:'transparent', fg:'var(--text3)'};
    var p = Math.min(val/maxVal, 1);
    if (p < 0.33) return {bg:'rgba(63,185,80,.15)',  fg:'#27500A'};
    if (p < 0.66) return {bg:'rgba(239,159,39,.18)', fg:'#854F0B'};
    return              {bg:'rgba(226,75,74,.2)',    fg:'#A32D2D'};
  }

  var thead = '<tr><th class="hm-th hm-corner">Component</th>'+
    '<th class="hm-th">Avg response</th>'+
    '<th class="hm-th">Avg MTTR</th>'+
    '<th class="hm-th">Performance</th></tr>';

  var tbody = allComps.map(function(comp) {
    var rAvg = avg(compResp[comp]);
    var mAvg = avg(compMttr[comp]);
    var rc   = heatColor(rAvg, maxResp);
    var mc   = heatColor(mAvg, maxMttr);
    var rPct = rAvg ? rAvg/maxResp : 0;
    var mPct = mAvg ? mAvg/maxMttr : 0;
    var combined = (rPct + mPct) / 2;
    var perf = combined >= .67 ? {bg:'rgba(226,75,74,.2)',  fg:'#A32D2D', lbl:'Critical'} :
               combined >= .34 ? {bg:'rgba(239,159,39,.18)',fg:'#854F0B', lbl:'Slow'} :
               mAvg            ? {bg:'rgba(63,185,80,.15)', fg:'#27500A', lbl:'OK'} :
                                 {bg:'transparent',          fg:'var(--text3)', lbl:'—'};
    return '<tr>'+
      '<td class="hm-comp">'+comp+'</td>'+
      '<td class="hm-cell" style="background:'+rc.bg+';color:'+rc.fg+'">'+fmtH(rAvg)+'</td>'+
      '<td class="hm-cell" style="background:'+mc.bg+';color:'+mc.fg+'">'+fmtH(mAvg)+'</td>'+
      '<td class="hm-cell" style="background:'+perf.bg+';color:'+perf.fg+';font-weight:500">'+perf.lbl+'</td>'+
    '</tr>';
  }).join('');

  var scaleHtml = '<div class="hm-scale">'+
    '<span class="hm-scale-lbl">Fast / low</span>'+
    '<div class="hm-scale-bar"></div>'+
    '<span class="hm-scale-lbl">Slow / high</span>'+
  '</div>';

  el.innerHTML =
    '<div class="chart-title">Performance Heatmap — Component × Response + MTTR</div>'+
    '<div class="chart-desc">Average response time and time-to-resolve per component</div>'+
    '<div class="hm-wrap"><table class="hm-table"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table></div>'+
    scaleHtml;
}


/* ── Populate filter dropdowns ───────────────────────────── */
function populateFilters(data) {
  var priorities = [], severities = [], comps = [], groups = [];
  data.forEach(function(d) {
    if (d.Priority && priorities.indexOf(d.Priority) < 0) priorities.push(d.Priority);
    if (d.Severity && severities.indexOf(d.Severity) < 0) severities.push(d.Severity);
    (d.Components||'').split(';').forEach(function(cc){
      cc = cc.trim();
      if (cc && comps.indexOf(cc) < 0) comps.push(cc);
    });
    var g = _getGroupSafe(d);
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
      if (_getGroupSafe(d) !== _filterGroup) return false;
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
    if (dueFmt) {
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
