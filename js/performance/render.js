/* ══════════════════════════════════════════════
   Performance Report — render.js  (4-column layout)
   Used by: performance/personal.html
══════════════════════════════════════════════ */

/* Whitelist — only these first names appear in the dropdown */
var PERF_PEOPLE = ['Chalotorn','Chawanop','Natpapat','Petchpailin','Sawitree','Sodsaran','Somrythi'];

var _perf = {
  initData: [],
  issueData: [],
  supData:   [],
  ready: {init:false, issue:false, sup:false},
  curPerson: '',
  curYear: String(new Date().getFullYear()),
};

/* ── All three sources ready → render ── */
function _perfCheckReady() {
  if (!_perf.ready.init || !_perf.ready.issue || !_perf.ready.sup) return;
  var loadEl = document.getElementById('gdb-loading');
  if (loadEl) loadEl.style.display = 'none';
  var contEl = document.getElementById('perf-content');
  if (contEl) contEl.style.display = 'block';
  _perfBuildPeople();
  _perfRender();
}

/* ── Build person dropdown (whitelist only) ── */
function _perfBuildPeople() {
  var sel = document.getElementById('perf-person-select');
  if (!sel) return;
  sel.innerHTML = PERF_PEOPLE.map(function(n) {
    return '<option value="' + n + '">' + n + '</option>';
  }).join('');
  if (!_perf.curPerson || PERF_PEOPLE.indexOf(_perf.curPerson) < 0) {
    _perf.curPerson = PERF_PEOPLE[0];
  }
  sel.value = _perf.curPerson;
}

/* ── Year chips ── */
function _perfGetYears() {
  var yrs = new Set();
  _perf.initData.forEach(function(d) {
    var m = (d['Roadmap Year Plan'] || '').match(/(\d{4})/);
    if (m) yrs.add(m[1]);
  });
  _perf.issueData.forEach(function(d) {
    var m = d.FailureOccurs ? String(d.FailureOccurs).match(/(\d{4})/) : null;
    if (m) yrs.add(m[1]);
  });
  _perf.supData.forEach(function(d) {
    var lm = (d.Labels||'').match(/(\d{4})/);
    if (lm) { yrs.add(lm[1]); return; }
    var dm = d.Due ? String(d.Due).match(/(\d{4})/) : null;
    if (dm) yrs.add(dm[1]);
  });
  return Array.from(yrs).sort().reverse();
}

function _perfBuildYearFilter() {
  var el = document.getElementById('perf-year-chips');
  if (!el) return;
  var years = _perfGetYears();
  el.innerHTML = '';
  ['All'].concat(years).forEach(function(y) {
    var b = document.createElement('button');
    var val = y === 'All' ? 'All' : y;
    b.className = 'fb-btn' + (_perf.curYear === val ? ' active' : '');
    b.textContent = y === 'All' ? 'All years' : y;
    b.onclick = function() { _perf.curYear = val; _perfRender(); };
    el.appendChild(b);
  });
}

/* ── Helpers ── */
function _pfn(raw) { return (raw||'').trim().split(' ')[0]; }
function _pyr(d)   { var m=(d['Roadmap Year Plan']||'').match(/(\d{4})/); return m?m[1]:''; }
function _iyr(d)   { var m=d.FailureOccurs?String(d.FailureOccurs).match(/(\d{4})/):null; return m?m[1]:''; }
function _syr(d)   {
  var lm=(d.Labels||'').match(/(\d{4})/); if(lm) return lm[1];
  var dm=d.Due?String(d.Due).match(/(\d{4})/):null; return dm?dm[1]:'';
}
function _ym(y,cy) { return cy==='All'||y===cy; }
function _pct(a,b) { return b===0?0:Math.round(a/b*100); }
function _clamp(v) { return Math.min(100,Math.max(0,v)); }

/* ── Main render ── */
function _perfRender() {
  _perfBuildYearFilter();

  var p  = _perf.curPerson;
  var cy = _perf.curYear;

  /* Slice data for this person + year */
  var myI1 = _perf.initData.filter(function(d) {
    return _pfn(d['Assignee.displayName'])===p && _ym(_pyr(d),cy);
  });
  var myI2 = _perf.initData.filter(function(d) {
    var names=(d['Assignee (2nd).displayName']||'').split(';').map(function(n){return _pfn(n);});
    return names.indexOf(p)>=0 && _ym(_pyr(d),cy);
  });
  var myIs = _perf.issueData.filter(function(d) {
    return _pfn(d.Assignee)===p && _ym(_iyr(d),cy);
  });
  var mySup = _perf.supData.filter(function(d) {
    return _pfn(d.Assignee)===p && _ym(_syr(d),cy);
  });

  /* Team totals */
  var allI  = _perf.initData.filter(function(d){return _ym(_pyr(d),cy);});
  var allIs = _perf.issueData.filter(function(d){return _ym(_iyr(d),cy);});
  var allSup= _perf.supData.filter(function(d){return _ym(_syr(d),cy);});

  function isDoneInit(d){return d.Status==='Done';}
  function isDoneIssue(d){var s=d.Status||'';return s==='Closed'||s==='Done'||s==='Resolved';}
  function isDoneSup(d){return d.Status==='Done';}

  var i1Done  = myI1.filter(isDoneInit).length;
  var i2Done  = myI2.filter(isDoneInit).length;
  var isDone  = myIs.filter(isDoneIssue).length;
  var sDone   = mySup.filter(isDoneSup).length;

  var ti1Done = allI.filter(isDoneInit).length;
  var ti2Done = allI.filter(function(d){return isDoneInit(d)&&(d['Assignee (2nd).displayName']||'').trim()!=='';}).length;
  var tisDone = allIs.filter(isDoneIssue).length;
  var tsDone  = allSup.filter(isDoneSup).length;

  /* Avatar + name */
  var av = document.getElementById('perf-avatar');
  if (av) av.textContent = p?p[0]:'?';
  var nm = document.getElementById('perf-name');
  if (nm) nm.textContent = p;

  /* KPI strip — use CSS theme variables */
  var kpiEl = document.getElementById('perf-kpi-strip');
  if (kpiEl) kpiEl.innerHTML =
    _kpi(i1Done, ti1Done, 'Lead Done',     'var(--chart-blue)')   +
    _kpi(i2Done, ti2Done, 'Support Done',  'var(--chart-teal)')   +
    _kpi(isDone, tisDone, 'Issues Closed', 'var(--chart-red)')    +
    _kpi(sDone,  tsDone,  'Tasks Done',    'var(--chart-amber)');

  /* 4 columns */
  _colRender('s1', myI1,  'init-lead',    i1Done, ti1Done);
  _colRender('s2', myI2,  'init-support', i2Done, ti2Done);
  _colRender('s3', myIs,  'issue',        isDone, tisDone);
  _colRender('s4', mySup, 'support',      sDone,  tsDone);
}

function _kpi(mine, total, label, color) {
  var p = _pct(mine, total);
  return '<div class="perf-kpi">' +
    '<div class="perf-kpi-num" style="color:'+color+'">' + mine + '</div>' +
    '<div class="perf-kpi-frac">of ' + total + ' team</div>' +
    '<div class="perf-kpi-bar"><div class="perf-kpi-fill" style="width:'+_clamp(p)+'%;background:'+color+'"></div></div>' +
    '<div class="perf-kpi-lab">' + label + '</div>' +
    '</div>';
}

/* ── Column renderer ── */
function _colRender(id, items, type, doneCount, teamDone) {
  var total = items.length;
  var badge = document.getElementById(id+'-badge');
  if (badge) badge.textContent = total;

  var perf = document.getElementById(id+'-perf');
  if (!perf) return;

  if (!total) {
    perf.innerHTML = '<div class="perf-empty">No items</div>';
    var listEl = document.getElementById(id+'-list');
    if (listEl) listEl.innerHTML = '';
    return;
  }

  var inProg = items.filter(function(d){
    var s=d.Status||''; return s==='In Progress'||s==='Delivery';
  }).length;
  var todo = total - doneCount - inProg;
  var compPct  = _pct(doneCount, total);
  var sharePct = _pct(doneCount, teamDone);

  var html = '';

  /* Block 1: Completion */
  html += '<div class="perf-metric-block">' +
    '<div class="perf-metric-label">Completion</div>' +
    '<div class="perf-metric-row"><span class="perf-big">'+compPct+'%</span><span class="perf-of">'+doneCount+'/'+total+'</span></div>' +
    '<div class="perf-pbar"><div class="perf-pbar-fill" style="width:'+_clamp(compPct)+'%;background:var(--up)"></div></div>' +
    '<div class="perf-dots">' +
      '<div class="pd-item"><span class="pd-dot" style="background:var(--up)"></span>Done: '+doneCount+'</div>' +
      '<div class="pd-item"><span class="pd-dot" style="background:var(--accent)"></span>Active: '+inProg+'</div>' +
      '<div class="pd-item"><span class="pd-dot" style="background:var(--border)"></span>Pending: '+(todo<0?0:todo)+'</div>' +
    '</div>' +
    '</div>';

  /* Block 2: Team share */
  html += '<div class="perf-divider"></div>' +
    '<div class="perf-metric-block">' +
    '<div class="perf-metric-label">Team Share</div>' +
    '<div class="perf-metric-row"><span class="perf-big">'+sharePct+'%</span><span class="perf-of">'+doneCount+'/'+teamDone+'</span></div>' +
    '<div class="perf-pbar"><div class="perf-pbar-fill" style="width:'+_clamp(sharePct)+'%;background:var(--accent)"></div></div>' +
    '</div>';

  /* Block 3: type-specific detail */
  if (type==='init-lead'||type==='init-support') {
    var delayed=0,atRisk=0,onTrack=0;
    items.forEach(function(d){
      var s=d.Status||''; var mon=(d['Project Monitoring Status']||'').toLowerCase();
      if(s==='Done'){}
      else if(mon.includes('delay')){delayed++;}
      else if(mon.includes('risk')){atRisk++;}
      else if(s==='Delivery'){onTrack++;}
    });
    html += '<div class="perf-divider"></div>' +
      '<div class="perf-metric-block">' +
      '<div class="perf-metric-label">Delivery Health</div>' +
      '<div class="perf-dots">' +
        (onTrack?'<div class="pd-item"><span class="pd-dot" style="background:var(--up)"></span>On track: '+onTrack+'</div>':'')+
        (atRisk? '<div class="pd-item"><span class="pd-dot" style="background:var(--amber)"></span>At risk: '+atRisk+'</div>':'')+
        (delayed?'<div class="pd-item"><span class="pd-dot" style="background:var(--down)"></span>Delayed: '+delayed+'</div>':'')+
      '</div>' +
      '</div>';
  } else if (type==='issue') {
    var crit=items.filter(function(d){return d.Priority==='Highest'||d.Severity==='Critical';}).length;
    var high=items.filter(function(d){return d.Priority==='High'||d.Severity==='High';}).length;
    html += '<div class="perf-divider"></div>' +
      '<div class="perf-metric-block">' +
      '<div class="perf-metric-label">Severity</div>' +
      '<div class="perf-dots">' +
        (crit?'<div class="pd-item"><span class="pd-dot" style="background:var(--down)"></span>Critical: '+crit+'</div>':'')+
        (high?'<div class="pd-item"><span class="pd-dot" style="background:var(--amber)"></span>High: '+high+'</div>':'')+
        (!crit&&!high?'<div class="pd-item" style="color:var(--text3)">—</div>':'')+
      '</div>' +
      '</div>';
  } else if (type==='support') {
    var hrs = items.reduce(function(s,d){
      var h=parseFloat(d.Effort||d.effort||d['Effort (hours)']||0);
      return s+(isNaN(h)?0:h);
    },0);
    html += '<div class="perf-divider"></div>' +
      '<div class="perf-metric-block">' +
      '<div class="perf-metric-label">Effort</div>' +
      '<div class="perf-metric-row"><span class="perf-big" style="color:var(--teal)">'+hrs.toFixed(0)+'</span><span class="perf-of">hours</span></div>' +
      '</div>';
  }

  perf.innerHTML = html;

  /* Item list */
  var listEl = document.getElementById(id+'-list');
  if (listEl) {
    listEl.innerHTML = items.map(function(d){ return _lrow(d, type); }).join('');
  }
}

function _lrow(d, type) {
  var key = d.Key||d.key||'';
  var sum = d.Summary||d.summary||'';
  var st  = d.Status||d.status||'';
  var done   = st==='Done'||st==='Closed'||st==='Resolved';
  var active = st==='In Progress'||st==='Delivery';
  var tagCls = done?'perf-tag-done':active?'perf-tag-prog':
    st==='Delayed'?'perf-tag-del':st==='At risk'?'perf-tag-risk':'perf-tag-todo';
  var tagLbl = done?'Done':active?'Active':
    st==='Delayed'?'Delayed':st==='At risk'?'At risk':(st||'Pending');
  var meta = '';
  if (type==='support') {
    var h=parseFloat(d.Effort||d.effort||d['Effort (hours)']||0);
    meta='<span class="perf-row-meta">'+(isNaN(h)?'—':h)+'h</span>';
  } else if (type==='issue') {
    var sev=d.Priority||d.Severity||'';
    meta=sev?'<span class="perf-row-meta">'+sev+'</span>':'';
  } else {
    var yr=(d['Roadmap Year Plan']||'').match(/(\d{4})/);
    meta=yr?'<span class="perf-row-meta">'+yr[1]+'</span>':'';
  }
  return '<div class="perf-lrow">' +
    '<span class="perf-lkey">'+key+'</span>' +
    '<span class="perf-lsum" title="'+sum+'">'+sum+'</span>' +
    meta +
    '<span class="perf-tag '+tagCls+'">'+tagLbl+'</span>' +
    '</div>';
}

/* ── Toggle collapsible list ── */
function perfToggleList(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var open = el.classList.toggle('open');
  var icon = btn.querySelector('.perf-toggle-icon');
  if (icon) icon.style.transform = open ? 'rotate(90deg)' : '';
  var txt = btn.querySelector('.perf-toggle-text') || btn;
  if (txt !== btn) txt.textContent = open ? 'Hide items' : 'Show items';
}
