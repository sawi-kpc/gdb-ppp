/* ── Date formatters ────────────────────────────────────── */
var _MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var _FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function _fmtDate(raw) {
  if (!raw) return '—';
  var d = new Date(String(raw).trim());
  if (isNaN(d.getTime())) return raw;
  return d.getDate() + ' ' + _FULL_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}
function _fmtDateTime(raw) {
  if (!raw) return '—';
  var d = new Date(String(raw).trim());
  if (isNaN(d.getTime())) return raw;
  var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  return d.getDate() + ' ' + _MONTHS[d.getMonth()] + ' ' + d.getFullYear() +
    ' ' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') +
    ':' + String(s).padStart(2,'0');
}

/* ══════════════════════════════════════════════════════════════
   ISSUE RENDER — js/issue/render.js
   Depends on: js/issue/config.js, js/issue/data.js (loaded first)
   All rendering logic for issue/index.html
══════════════════════════════════════════════════════════════ */

/* ── State ───────────────────────────────────────────────── */
var _filterStatuses  = ['all']; /* array — multi-select */
var _filterPriority  = 'all';
var _filterSeverity  = 'all';
var _filterComps     = ['all']; /* array — multi-select */
var _filterRootCause = 'all';
var _searchQ        = '';
var _sortCol        = 'Key';
var _sortAsc        = true;
var _activeView     = 'board';   /* 'board' | 'table' */

/* ── Status definitions (5-column board) ─────────────────── */
var STATUSES = [
  { key:'Open',          label:'Open',          color:'var(--down)' },
  { key:'Investigating', label:'Investigating',  color:'var(--amber)' },
  { key:'In Progress',   label:'In Progress',    color:'var(--accent)' },
  { key:'Resolved',      label:'Resolved',       color:'var(--teal)' },
  { key:'Done',          label:'Done',           color:'var(--up)' },
];
/* Also handle 'Closed' as alias for 'Done' */
function _normaliseStatus(s) {
  if (!s) return 'Open';
  if (s === 'Closed') return 'Done';
  return s;
}

/* ── Priority / Severity colors ──────────────────────────── */
var PRIORITY_COLOR = {
  'Highest': 'var(--down)',
  'High':    '#f97316',
  'Medium':  'var(--amber)',
  'Low':     'var(--up)',
  'Lowest':  'var(--text3)',
};
var SEVERITY_COLOR = {
  'Critical': 'var(--down)',
  'High':     '#f97316',
  'Moderate': 'var(--amber)',
  'Low':      'var(--up)',
};
function _pColor(p)  { return PRIORITY_COLOR[p]  || 'var(--text2)'; }
function _sColor(s)  { return SEVERITY_COLOR[s]  || 'var(--text2)'; }

/* ── Formatters ──────────────────────────────────────────── */
function _secToH(s) { return s > 0 ? (s/3600).toFixed(1)+'h' : '—'; }
function _tag(text, color, bg) {
  return '<span style="display:inline-flex;align-items:center;font-size:10px;'+
    'font-weight:600;padding:1px 6px;border-radius:3px;white-space:nowrap;'+
    'color:'+color+';background:'+bg+';border:1px solid '+color+'44">'+text+'</span>';
}
function _statusTag(s) {
  var ns = _normaliseStatus(s);
  var STYLE = {
    'Open':          {color:'var(--down)',   bg:'rgba(248,81,73,.1)',  border:'rgba(248,81,73,.3)'},
    'Investigating': {color:'var(--amber)',  bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.3)'},
    'In Progress':   {color:'var(--accent)', bg:'rgba(88,166,255,.1)', border:'rgba(88,166,255,.25)'},
    'Resolved':      {color:'var(--teal)',   bg:'rgba(34,211,164,.1)', border:'rgba(34,211,164,.3)'},
    'Done':          {color:'var(--up)',     bg:'rgba(63,185,80,.1)',  border:'rgba(63,185,80,.28)'},
  };
  var st  = STYLE[ns] || STYLE['Open'];
  var lbl = s || 'Open';
  return '<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:600;'+
    'padding:3px 10px;border-radius:20px;white-space:nowrap;'+
    'color:'+st.color+';background:'+st.bg+';border:1px solid '+st.border+'">'+lbl+'</span>';
}

/* ── Components display (truncated) ─────────────────────── */
function _compsHtml(c, maxShow) {
  maxShow = maxShow || 2;
  var parts = (c || '').split(';').map(function(p){ return p.trim(); }).filter(Boolean);
  if (!parts.length) return '<span style="color:var(--text3)">—</span>';
  var html = parts.slice(0, maxShow).map(function(p){
    return '<span style="font-size:9px;padding:1px 6px;border-radius:10px;'+
      'background:var(--surface);border:1px solid var(--border);color:var(--text2)">'+p+'</span>';
  }).join('');
  if (parts.length > maxShow)
    html += '<span style="font-size:9px;color:var(--text3);padding:1px 4px">+'+
            (parts.length - maxShow)+' more</span>';
  return html;
}

/* ── MTTR / incident timeline ────────────────────────────── */
function _durLabel(ms) {
  if (!ms || ms <= 0) return null;
  var h = ms / 3600000;
  if (h < 1)  return Math.round(h*60)+'min';
  if (h < 24) return h.toFixed(1)+'h';
  return (h/24).toFixed(1)+'d';
}
function buildIncidentTimeline(d) {
  var F   = d.FailureOccurs     ? new Date(d.FailureOccurs)     : null;
  var C   = d.CorrectionBegins  ? new Date(d.CorrectionBegins)  : null;
  var R   = d.FailureResolved   ? new Date(d.FailureResolved)   : null;
  var NOW = new Date();
  var detectMs  = (F && C) ? C - F : null;
  var fixMs     = (C && R) ? R - C : null;
  var totalMs   = (F && R) ? R - F : null;
  var ongoingMs = (C && !R) ? NOW - C : null;
  var segments  = [];
  if (F && C && R) {
    var tot = R - F;
    var w1  = Math.max(Math.round((C-F)/tot*100), 8);
    segments = [
      {cls:'detect',  w:w1,     dur:_durLabel(detectMs)},
      {cls:'resolved',w:100-w1, dur:_durLabel(fixMs)},
    ];
  } else if (F && C && !R) {
    var dw = Math.max(Math.round((C-F)/((NOW-F)||1)*100), 15);
    segments = [
      {cls:'detect', w:dw,     dur:_durLabel(detectMs)},
      {cls:'ongoing',w:100-dw, dur:(_durLabel(ongoingMs)||'0m')+' so far'},
    ];
  } else if (C) {
    segments = [{cls:'ongoing',w:100,dur:(_durLabel(NOW-C)||'0m')+' so far'}];
  } else if (F) {
    segments = [{cls:'ongoing',w:100,dur:_durLabel(NOW-F)}];
  }
  if (!segments.length) return '';
  var barHtml = segments.map(function(s){
    return '<div class="itl-seg '+s.cls+'" style="flex:'+s.w+'" title="'+s.dur+'">'+
      (s.w>=15 ? s.dur : '') +'</div>';
  }).join('');
  var mils = [];
  if (F) mils.push({l:'⬤ Detected',v:_fmtDateTime(d.FailureOccurs)});
  if (C) mils.push({l:'⬤ Fix started',v:_fmtDateTime(d.CorrectionBegins)});
  if (R) mils.push({l:'⬤ Resolved',v:_fmtDateTime(d.FailureResolved)});
  else   mils.push({l:'⬤ Ongoing',v:'<span style="color:var(--down)">pending</span>'});
  var markHtml = '<div class="itl-marks" style="grid-template-columns:repeat('+mils.length+',1fr)">'+
    mils.map(function(m){
      return '<div class="itl-mark"><div class="itl-mark-label">'+m.l+'</div>'+
             '<div class="itl-mark-val">'+m.v+'</div></div>';
    }).join('')+'</div>';
  var durs = '';
  if (detectMs)  durs += '<span class="itl-dur d-detect">⏱ Response: '+_durLabel(detectMs)+'</span>';
  if (fixMs)     durs += '<span class="itl-dur d-fix">🔧 Fix time: '+_durLabel(fixMs)+'</span>';
  if (totalMs)   durs += '<span class="itl-dur d-total">✓ MTTR: '+_durLabel(totalMs)+'</span>';
  if (ongoingMs) durs += '<span class="itl-dur d-ongoing">● Ongoing: '+_durLabel(ongoingMs)+'</span>';
  return '<div class="itl"><div class="itl-title">Incident timeline</div>'+
    '<div class="itl-bar-wrap"><div class="itl-bar-track">'+barHtml+'</div></div>'+
    markHtml+(durs?'<div class="itl-durations">'+durs+'</div>':'')+
  '</div>';
}

/* ── Filter pipeline ─────────────────────────────────────── */
function _getFiltered() {
  return issueData.filter(function(d) {
    var s   = _normaliseStatus(d.Status);
    var okS = _filterStatuses.indexOf('all') !== -1 ||
              _filterStatuses.indexOf(s) !== -1 ||
              (_filterStatuses.indexOf('Done') !== -1 && d.Status === 'Closed');
    var okP  = _filterPriority === 'all' || d.Priority === _filterPriority;
    var okSv = _filterSeverity === 'all' || d.Severity === _filterSeverity;
    /* Components: multi-select — any selected comp must appear in issue's component list */
    var okC  = _filterComps.indexOf('all') !== -1 ||
               _filterComps.some(function(fc) {
                 return (d.Components||'').toLowerCase().includes(fc.toLowerCase());
               });
    /* Root Cause filter */
    var okRC = _filterRootCause === 'all' ||
               (d.RootCause||'').toLowerCase().includes(_filterRootCause.toLowerCase());
    var q    = _searchQ.toLowerCase();
    var okQ  = !q || d.Key.toLowerCase().includes(q) ||
               d.Summary.toLowerCase().includes(q) ||
               (d.Assignee||'').toLowerCase().includes(q);
    return okS && okP && okSv && okC && okRC && okQ;
  }).sort(function(a, b) {
    var va = a[_sortCol] || '', vb = b[_sortCol] || '';
    if (va < vb) return _sortAsc ? -1 : 1;
    if (va > vb) return _sortAsc ? 1 : -1;
    return 0;
  });
}

/* ── Build summary strip ─────────────────────────────────── */
function buildStrip(data) {
  var total   = data.length;
  var open    = data.filter(function(d){ return _normaliseStatus(d.Status)==='Open'; }).length;
  var invest  = data.filter(function(d){ return d.Status==='Investigating'; }).length;
  var inprog  = data.filter(function(d){ return d.Status==='In Progress'; }).length;
  var resDone = data.filter(function(d){
    var s = d.Status;
    return s==='Resolved'||s==='Done'||s==='Closed';
  }).length;
  var unassigned = data.filter(function(d){ return !d.Assignee && d.Status!=='Done' && d.Status!=='Closed'; }).length;
  var critical   = data.filter(function(d){ return d.Severity==='Critical'||d.Priority==='Highest'; }).length;
  document.getElementById('issue-strip').innerHTML =
    _sc('Total Issues','blue',total,'all statuses')+
    _sc('Open','red',open, unassigned>0?unassigned+' unassigned':'')+
    _sc('Investigating','amber',invest,'under investigation')+
    _sc('In Progress','accent',inprog,'being fixed')+
    _sc('Resolved / Done','green',resDone,'closed this cycle')+
    _sc('Critical / Highest','purple',critical,'priority issues');
}
function _sc(label, cls, num, sub) {
  var colors = {blue:'var(--accent)',red:'var(--down)',amber:'var(--amber)',
                accent:'var(--accent)',green:'var(--up)',purple:'var(--purple)'};
  var borders= {blue:'var(--accent)',red:'var(--down)',amber:'var(--amber)',
                accent:'var(--accent)',green:'var(--up)',purple:'var(--purple)'};
  var c = colors[cls]||'var(--accent)';
  return '<div style="background:var(--surface);border:1px solid var(--border);'+
    'border-top:2px solid '+c+';border-radius:8px;padding:12px 16px">'+
    '<div style="font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase;'+
    'letter-spacing:.06em;margin-bottom:6px">'+label+'</div>'+
    '<div style="font-size:24px;font-weight:700;color:'+c+';line-height:1;margin-bottom:2px">'+num+'</div>'+
    '<div style="font-size:11px;color:var(--text2)">'+sub+'</div></div>';
}

/* ── Build dropdown filters ──────────────────────────────── */
function buildDropdownFilters(data) {
  var PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
  var SEVERITIES = ['Critical', 'Major', 'Moderate', 'Low'];

  document.getElementById('filter-priority').innerHTML =
    '<option value="all">All priorities</option>' +
    PRIORITIES.map(function(p) { return '<option value="'+p+'">'+p+'</option>'; }).join('');

  document.getElementById('filter-severity').innerHTML =
    '<option value="all">All severity</option>' +
    SEVERITIES.map(function(s) { return '<option value="'+s+'">'+s+'</option>'; }).join('');

  /* Components: dynamic pills (multi-select) */
  var comps = [], seen = {};
  data.forEach(function(d) {
    (d.Components||'').split(';').forEach(function(c) {
      c = c.trim();
      if (c && !seen[c]) { seen[c] = true; comps.push(c); }
    });
  });
  comps.sort();
  var compEl = document.getElementById('comp-filter');
  if (compEl) {
    var compHtml = '<button class="fb active" data-val="all" onclick="_setCompFilter(\x27all\x27,this)">All</button>';
    comps.forEach(function(c) {
      compHtml += '<button class="fb" data-val="' + c + '" onclick="_setCompFilter(\x27' + c + '\x27,this)">' + c + '</button>';
    });
    compEl.innerHTML = compHtml;
  }

  /* Root Cause: dynamic dropdown */
  var rcs = [], rcSeen = {};
  data.forEach(function(d) {
    var rc = (d.RootCause||'').trim();
    if (rc && !rcSeen[rc]) { rcSeen[rc] = true; rcs.push(rc); }
  });
  rcs.sort();
  var rcEl = document.getElementById('filter-rootcause');
  if (rcEl) {
    rcEl.innerHTML =
      '<option value="all">All root causes</option>' +
      rcs.map(function(r) { return '<option value="'+r+'">'+r+'</option>'; }).join('');
  }
}

/* Component multi-select toggle */
function _setCompFilter(val, btn) {
  if (val === 'all') {
    _filterComps = ['all'];
    document.querySelectorAll('#comp-filter .fb').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
  } else {
    var ai = _filterComps.indexOf('all');
    if (ai !== -1) _filterComps.splice(ai, 1);
    var vi = _filterComps.indexOf(val);
    if (vi !== -1) { _filterComps.splice(vi, 1); btn.classList.remove('active'); }
    else           { _filterComps.push(val);      btn.classList.add('active'); }
    if (_filterComps.length === 0) {
      _filterComps = ['all'];
      var allBtn = document.querySelector('#comp-filter .fb[data-val="all"]');
      if (allBtn) allBtn.classList.add('active');
    }
  }
  applyFilters();
}

/* ── BOARD VIEW (5-column kanban by status) ───────────────── */
function buildBoard(data) {
  var byStatus = {};
  STATUSES.forEach(function(s){ byStatus[s.key] = []; });
  data.forEach(function(d) {
    var ns = _normaliseStatus(d.Status);
    if (!byStatus[ns]) byStatus[ns] = [];
    byStatus[ns].push(d);
  });

  var html = STATUSES.map(function(s) {
    var cards = byStatus[s.key] || [];
    var colCards = cards.map(function(d) {
      var hasTimeline = d.FailureOccurs || d.CorrectionBegins || d.FailureResolved;
      var multiCh = (d.Components||'').split(';').length >= 3;
      return '<div class="iboard-card" style="'+(d.Severity==='Critical'?'border-color:rgba(248,81,73,.5);background:rgba(248,81,73,.06);':'')+'">'
        +'<div class="ibc-top">'
          +'<a href="'+ISSUE_JIRA_BASE+d.Key+'" target="_blank" class="ibc-key">'+d.Key+' ↗</a>'
          +(d.Priority?'<span style="font-size:9px;font-weight:700;color:'+_pColor(d.Priority)+'">'+d.Priority+'</span>':'')
        +'</div>'
        +'<div class="ibc-summary">'+d.Summary+'</div>'
        +(d.Severity?'<div style="margin:4px 0"><span style="font-size:9px;font-weight:600;'+
          'background:'+_sColor(d.Severity)+'22;color:'+_sColor(d.Severity)+';'+
          'padding:1px 6px;border-radius:3px;border:1px solid '+_sColor(d.Severity)+'33">'+
          d.Severity+'</span></div>':'')
        +'<div class="ibc-comps">'+_compsHtml(d.Components, 1)+'</div>'
        +(d.Assignee?'<div class="ibc-assign">'+d.Assignee+'</div>':'')
        +(hasTimeline ? buildIncidentTimeline(d) : '')
      +'</div>';
    }).join('');

    return '<div class="iboard-col">'
      +'<div class="iboard-col-head" style="border-top:3px solid '+s.color+'">'
        +'<span class="iboard-col-label">'+s.label+'</span>'
        +'<span class="iboard-col-count">'+cards.length+'</span>'
      +'</div>'
      +'<div class="iboard-col-body">'+
        (colCards || '<div style="font-size:11px;color:var(--text3);text-align:center;padding:20px 0">No issues</div>')
      +'</div>'
    +'</div>';
  }).join('');

  document.getElementById('issue-board').innerHTML = html;
  document.getElementById('issue-count-label').textContent =
    data.length + ' issue' + (data.length !== 1 ? 's' : '');
}

/* ── TABLE VIEW ──────────────────────────────────────────── */
function buildTable(data) {
  document.getElementById('issue-count-label').textContent =
    data.length + ' issue' + (data.length !== 1 ? 's' : '');
  if (!data.length) {
    document.getElementById('issue-tbody').innerHTML =
      '<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text3)">No issues match this filter.</td></tr>';
    return;
  }

  document.getElementById('issue-tbody').innerHTML = data.map(function(d) {
    var overdue = d.Due && d.Status !== 'Done' && d.Status !== 'Closed' && new Date(d.Due) < new Date();
    var hasTL   = d.FailureOccurs || d.CorrectionBegins || d.FailureResolved;

    /* row 1 — main columns */
    var row1 = '<tr>'
      + '<td style="white-space:nowrap;vertical-align:top;padding:8px 10px ' + (hasTL?'2px':'8px') + '">'
          + '<a href="' + ISSUE_JIRA_BASE + d.Key + '" target="_blank" '
          + 'style="color:var(--accent);font-weight:700;text-decoration:none">' + d.Key + ' ↗</a>'
      + '</td>'
      + '<td style="max-width:480px;vertical-align:top;padding:8px 10px ' + (hasTL?'2px':'8px') + '">'
          + '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500" title="' + d.Summary + '">'
              + d.Summary
          + '</div>'
      + '</td>'
      + '<td style="vertical-align:top;padding:8px 10px ' + (hasTL?'2px':'8px') + '">'
          + _statusTag(d.Status)
      + '</td>'
      + '<td style="vertical-align:top;padding:8px 10px ' + (hasTL?'2px':'8px') + ';font-size:11px;white-space:nowrap">'
          + (d.Priority ? '<span style="font-weight:600;color:' + _pColor(d.Priority) + '">' + d.Priority + '</span>' : '—')
      + '</td>'
      + '<td style="vertical-align:top;padding:8px 10px ' + (hasTL?'2px':'8px') + ';font-size:11px;white-space:nowrap">'
          + (d.Severity ? '<span style="font-weight:600;color:' + _sColor(d.Severity) + '">' + d.Severity + '</span>' : '—')
      + '</td>'
      + '<td style="vertical-align:top;padding:8px 10px ' + (hasTL?'2px':'8px') + ';font-size:11px;white-space:nowrap">'
          + (d.Due ? '<span style="color:' + (overdue?'var(--down)':'var(--text2)') + '">' + _fmtDate(d.Due) + '</span>' : '—')
      + '</td>'
      + '</tr>';

    /* row 2 — incident timeline */
    var row2 = '';
    if (hasTL) {
      var tlHtml = buildIncidentTimeline(d);
      if (tlHtml) {
        row2 = '<tr>'
          + '<td colspan="6" style="padding:2px 10px 10px;border-bottom:1px solid var(--border)">'
              + '<div style="background:var(--surface2);border-radius:7px;padding:10px 14px">'
                  + tlHtml
              + '</div>'
          + '</td>'
          + '</tr>';
      } else {
        row1 = row1.replace('</tr>', '<td style="border-bottom:1px solid var(--border)"></td></tr>');
      }
    } else {
      /* add bottom border via style on last cell */
      row1 = row1.replace(/padding:8px 10px 8px">/g, 'padding:8px 10px;border-bottom:1px solid var(--border)">');
    }

    return row1 + row2;
  }).join('');
}

/* ── Initiative conversion hints ────────────────────────── */
function buildInitSection(data) {
  var el = document.getElementById('issue-init-section');
  if (!el) return;
  var systemic = data.filter(function(d){
    return (d.Components||'').split(';').length >= 3 ||
           d.Priority === 'Highest' || d.Severity === 'Critical' ||
           (d.Summary||'').includes('System Down');
  });
  if (!systemic.length) { el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">No systemic patterns detected.</div>'; return; }
  var payment  = systemic.filter(function(d){ return d.Summary.includes('OMISE')||d.Summary.includes('K2')||d.Summary.includes('Refund'); });
  var platform = systemic.filter(function(d){ return d.Summary.includes('System Down')||d.Summary.includes('SAP'); });
  var other    = systemic.filter(function(d){ return !payment.includes(d)&&!platform.includes(d); });
  var html = '';
  if (platform.length) html += _initCard('🖥','Platform Resilience — '+platform.length+' system-down events',
    'var(--down)','Platform outages affecting all channels. Recommend adding to PPP-9 scope.',
    platform.map(function(d){return d.Key;}).join(', '),'All channels','New PPP candidate');
  if (payment.length)  html += _initCard('💳','Payment Operations Gap — '+payment.length+' recurring issues',
    'var(--amber)','OMISE float shortage and K2 refund failures indicate no automated payment monitoring.',
    payment.map(function(d){return d.Key;}).join(', '),'Monthly recurrence','New PPP candidate');
  if (other.length)    html += _initCard('⚠','Other critical issues ('+other.length+')',
    'var(--accent)',other.map(function(d){return d.Key+': '+d.Summary;}).join(' · '),'—','Review needed','');
  el.innerHTML = html;
}
function _initCard(icon, title, color, desc, keys, freq, badge) {
  return '<div style="background:var(--surface2);border-radius:7px;padding:14px 16px;'+
    'border-left:3px solid '+color+';margin-bottom:10px;display:flex;gap:12px">'
    +'<div style="width:36px;height:36px;border-radius:6px;display:flex;align-items:center;'+
      'justify-content:center;font-size:16px;flex-shrink:0;background:'+color+'18;'+
      'border:1px solid '+color+'33">'+icon+'</div>'
    +'<div style="flex:1">'
      +'<div style="font-size:12px;font-weight:600;margin-bottom:4px;display:flex;'+
        'align-items:center;gap:6px;flex-wrap:wrap">'+title
        +(badge?'<span style="font-size:10px;font-weight:600;color:var(--purple);'+
          'background:rgba(167,139,250,.12);padding:1px 6px;border-radius:3px;'+
          'border:1px solid rgba(167,139,250,.25)">'+badge+'</span>':'')
      +'</div>'
      +'<div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:5px">'+desc+'</div>'
      +'<div style="display:flex;gap:12px;flex-wrap:wrap">'
        +'<div style="font-size:10px;color:var(--text3)">Issues: <strong style="color:var(--text2)">'+keys+'</strong></div>'
        +'<div style="font-size:10px;color:var(--text3)">Pattern: <strong style="color:var(--text2)">'+freq+'</strong></div>'
      +'</div>'
    +'</div>'
  +'</div>';
}

/* ── Event handlers ──────────────────────────────────────── */
function applyFilters() {
  _searchQ = (document.getElementById('issue-search')||{}).value || '';
  var data = _getFiltered();
  if (_activeView === 'board') buildBoard(data);
  else buildTable(data);
  buildTrendChart(data);
  buildCompSevChart(data);
}
function setStatusFilter(val, btn) {
  if (val === 'all') {
    _filterStatuses = ['all'];
    document.querySelectorAll('#issue-status-filter .fb').forEach(function(b){ b.classList.remove('active'); });
    document.querySelector('#issue-status-filter .fb[data-val="all"]').classList.add('active');
  } else {
    /* Remove 'all' if specific selected */
    var idx = _filterStatuses.indexOf('all');
    if (idx !== -1) _filterStatuses.splice(idx, 1);
    /* Toggle this value */
    var vi = _filterStatuses.indexOf(val);
    if (vi !== -1) {
      _filterStatuses.splice(vi, 1);
      btn.classList.remove('active');
    } else {
      _filterStatuses.push(val);
      btn.classList.add('active');
    }
    /* If nothing selected, reset to all */
    if (_filterStatuses.length === 0) {
      _filterStatuses = ['all'];
      document.querySelector('#issue-status-filter .fb[data-val="all"]').classList.add('active');
    }
  }
  applyFilters();
}
function onDropdownChange() {
  _filterPriority  = document.getElementById('filter-priority').value;
  _filterSeverity  = document.getElementById('filter-severity').value;
  var rcEl = document.getElementById('filter-rootcause');
  _filterRootCause = rcEl ? rcEl.value : 'all';
  applyFilters();
}
function setIssueView(view, btn) {
  _activeView = view;
  document.querySelectorAll('.vbtn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('board-view-wrap').style.display  = view === 'board' ? 'block' : 'none';
  document.getElementById('table-view-wrap').style.display  = view === 'table' ? 'block' : 'none';
  applyFilters();
}
function sortIssueBy(col) {
  if (_sortCol === col) _sortAsc = !_sortAsc;
  else { _sortCol = col; _sortAsc = true; }
  applyFilters();
}

/* ══════════════════════════════════════════════════════════════
   ISSUE TREND CHART — Created vs Done by Week / Month
   Uses Chart.js (already loaded via CDN in issue/index.html)
══════════════════════════════════════════════════════════════ */

var _trendPeriod = 'month';  /* 'week' | 'month' */
var _trendChart  = null;

function buildTrendChart(data) {
  var el = document.getElementById('issue-trend-chart');
  if (!el) return;

  function _periodKey(raw) {
    if (!raw) return null;
    var d = new Date(String(raw).trim());
    if (isNaN(d.getTime())) return null;
    if (_trendPeriod === 'week') {
      var jan4 = new Date(d.getFullYear(), 0, 4);
      var w = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
      return d.getFullYear() + '-W' + String(w).padStart(2, '0');
    }
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function _label(k) {
    if (_trendPeriod === 'week') return k;
    var p = k.split('-');
    return _MONTHS[parseInt(p[1]) - 1] + ' ' + p[0];
  }

  /* X-axis = FailureOccurs period (when the incident happened).
     Stacked bars per period:
       Bottom (green) = Resolved   — FailureResolved is set
       Top    (red)   = Open/Pending — no FailureResolved yet  */
  var resolved = {}, pending = {};

  data.forEach(function(d) {
    var occDate = d.FailureOccurs || d.CorrectionBegins;
    if (!occDate) return;
    var ck = _periodKey(occDate);
    if (!ck) return;
    if (d.FailureResolved) {
      resolved[ck] = (resolved[ck] || 0) + 1;
    } else {
      pending[ck] = (pending[ck] || 0) + 1;
    }
  });

  var allKeys = Array.from(new Set(Object.keys(resolved).concat(Object.keys(pending)))).sort();
  if (!allKeys.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">No incident date data (FailureOccurs) available</div>';
    return;
  }

  var labels       = allKeys.map(_label);
  var resolvedVals = allKeys.map(function(k){ return resolved[k] || 0; });
  var pendingVals  = allKeys.map(function(k){ return pending[k]  || 0; });

  if (_trendChart) { _trendChart.destroy(); _trendChart = null; }
  var canvas = document.getElementById('issue-trend-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';

  var cText = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#8b949e';
  var cGrid = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#30363d';

  _trendChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Resolved',      data: resolvedVals,
          backgroundColor: '#3fb950cc', borderColor: '#3fb950',
          borderWidth: 1, borderRadius: 0, stack: 'st' },
        { label: 'Open / Pending', data: pendingVals,
          backgroundColor: '#f85149cc', borderColor: '#f85149',
          borderWidth: 1, borderRadius: 3, stack: 'st' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: cText, font: { size: 11 } } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { stacked: true,
             ticks: { color: cText, font: { size: 10 }, maxRotation: 45 },
             grid: { color: cGrid + '44' } },
        y: { stacked: true, beginAtZero: true,
             ticks: { color: cText, font: { size: 11 }, stepSize: 1 },
             grid: { color: cGrid + '44' },
             title: { display: true, text: 'Issues', color: cText, font: { size: 11 } } }
      }
    }
  });
}

function setTrendPeriod(period, btn) {
  _trendPeriod = period;
  document.querySelectorAll('.trend-period-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  buildTrendChart(_getFiltered()); /* apply current filters */
}


/* ══════════════════════════════════════════════════════════════
   COMPONENT × SEVERITY CHART — grouped bar chart
   X-axis = component (short name), bars grouped by severity
══════════════════════════════════════════════════════════════ */
var _compSevChart = null; /* kept for compat — not used in table mode */

function buildCompSevChart(data) {
  var el = document.getElementById('issue-compsev-chart');
  if (!el) return;

  /* hide canvas — we use HTML table instead */
  var canvas = document.getElementById('issue-compsev-canvas');
  if (canvas) canvas.style.display = 'none';

  var SEVERITIES = ['Critical', 'Major', 'Moderate', 'Low'];
  var SEV_COLORS = { 'Critical':'#f85149','Major':'#f97316','Moderate':'#f5a524','Low':'#3fb950' };
  var SEV_BG    = { 'Critical':'rgba(248,81,73,.12)','Major':'rgba(249,115,22,.10)',
                    'Moderate':'rgba(245,165,36,.10)','Low':'rgba(63,185,80,.10)' };

  /* Collect components */
  var seen = {};
  data.forEach(function(d) {
    (d.Components||'').split(';').forEach(function(c) {
      c = c.trim(); if (c) seen[c] = true;
    });
  });
  var comps = Object.keys(seen).sort();

  function _short(c) {
    return c.replace('firster-commerce','F1-Web')
            .replace('firster-tiktok-social-commerce','F1-TikTok')
            .replace('kingpower-commerce-th','KP-TH')
            .replace('kingpower-commerce-cn','KP-CN')
            .replace('kingpower-douyin-social-commerce','KP-Douyin')
            .replace('jd-phamacy-marketplace-cn','JD-CN')
            .replace('taihaitao-commerce-cn','THT');
  }

  /* Build 2D matrix: cell[sev][comp] = count */
  var matrix = {};
  var rowTotals = {}, colTotals = {};
  var grand = 0;
  SEVERITIES.forEach(function(s) { matrix[s] = {}; rowTotals[s] = 0; });
  comps.forEach(function(c) { colTotals[c] = 0; });

  data.forEach(function(d) {
    var sev = d.Severity || '';
    if (!matrix[sev]) return;
    (d.Components||'').split(';').forEach(function(c) {
      c = c.trim(); if (!c) return;
      matrix[sev][c] = (matrix[sev][c] || 0) + 1;
      rowTotals[sev]++;
      colTotals[c] = (colTotals[c] || 0) + 1;
      grand++;
    });
  });

  /* Filter out empty rows/cols */
  var activeSevs = SEVERITIES.filter(function(s){ return rowTotals[s] > 0; });
  var activeComps = comps.filter(function(c){ return colTotals[c] > 0; });

  if (!activeSevs.length || !activeComps.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">No severity/component data</div>';
    return;
  }

  /* Build HTML table */
  var th = function(txt, style) {
    return '<th style="padding:5px 8px;font-size:10px;font-weight:700;color:var(--text3);'
         + 'text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;border-bottom:1px solid var(--border);'
         + (style||'') + '">' + txt + '</th>';
  };

  var html = '<div style="overflow-x:auto;padding:4px">'
           + '<table style="width:100%;border-collapse:collapse;font-size:11px">'
           + '<thead><tr>'
           + th('Severity \\ Component', 'text-align:left;min-width:90px');

  activeComps.forEach(function(c) {
    html += th(_short(c), 'text-align:center;min-width:70px');
  });
  html += th('Total', 'text-align:center;min-width:60px');
  html += '</tr></thead><tbody>';

  activeSevs.forEach(function(sev) {
    html += '<tr>';
    /* Severity label cell */
    html += '<td style="padding:6px 8px;font-weight:700;color:' + SEV_COLORS[sev]
          + ';white-space:nowrap;border-bottom:1px solid var(--border22);background:' + SEV_BG[sev] + '">'
          + sev + '</td>';

    activeComps.forEach(function(c) {
      var count = matrix[sev][c] || 0;
      var rowPct = rowTotals[sev] > 0 ? Math.round(count / rowTotals[sev] * 100) : 0;
      var colPct = colTotals[c]   > 0 ? Math.round(count / colTotals[c]   * 100) : 0;
      /* cell intensity — based on % of row total */
      var intensity = rowTotals[sev] > 0 ? count / rowTotals[sev] : 0;
      var alpha = count > 0 ? (0.08 + intensity * 0.5).toFixed(2) : '0';
      var bg = count > 0
        ? 'rgba(' + hexToRgb(SEV_COLORS[sev]) + ',' + alpha + ')'
        : 'transparent';

      html += '<td style="padding:5px 6px;text-align:center;border-bottom:1px solid var(--border22);background:' + bg + '">';
      if (count > 0) {
        html += '<div style="font-weight:700;font-size:13px;color:var(--text)">' + count + '</div>'
              + '<div style="font-size:9px;color:var(--text2)">row ' + rowPct + '% · col ' + colPct + '%</div>';
      } else {
        html += '<span style="color:var(--text3)">—</span>';
      }
      html += '</td>';
    });

    /* Row total */
    var rowPct = grand > 0 ? Math.round(rowTotals[sev] / grand * 100) : 0;
    html += '<td style="padding:5px 8px;text-align:center;font-weight:700;border-bottom:1px solid var(--border22);background:var(--surface2)">'
          + rowTotals[sev]
          + '<div style="font-size:9px;color:var(--text2)">' + rowPct + '%</div>'
          + '</td>';
    html += '</tr>';
  });

  /* Column totals row */
  html += '<tr style="background:var(--surface2)">';
  html += '<td style="padding:6px 8px;font-weight:700;color:var(--text2);font-size:10px;text-transform:uppercase">Total</td>';
  activeComps.forEach(function(c) {
    var colPct = grand > 0 ? Math.round(colTotals[c] / grand * 100) : 0;
    html += '<td style="padding:5px 6px;text-align:center;font-weight:700">'
          + colTotals[c]
          + '<div style="font-size:9px;color:var(--text2)">' + colPct + '%</div>'
          + '</td>';
  });
  html += '<td style="padding:5px 8px;text-align:center;font-weight:700">' + grand + '</td>';
  html += '</tr></tbody></table></div>';

  el.innerHTML = html;
}

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return r + ',' + g + ',' + b;
}

/* ── Main init ───────────────────────────────────────────── */
function init(data) {
  buildStrip(data);
  buildDropdownFilters(data);
  buildBoard(_getFiltered());
  buildTrendChart(data);
  buildCompSevChart(data);
  buildInitSection(data);
}
