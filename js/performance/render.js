/* ══════════════════════════════════════════════
   Performance Report — render.js
   Used by: performance/personal.html
══════════════════════════════════════════════ */

var PERF_PEOPLE = ['Chalotorn','Chawanop','Natpapat','Petchpailin','Sawitree','Sodsaran','Somrythi'];

var PERF_STAGES = ['Parking Lot','Budget Approval','Discovery','Ready for Delivery','Delivery','Done'];
var PERF_ST_COLOR = {
  'Parking Lot':        'var(--text3)',
  'Budget Approval':    'var(--amber)',
  'Discovery':          'var(--purple)',
  'Ready for Delivery': 'var(--teal)',
  'Delivery':           'var(--accent)',
  'Done':               'var(--up)'
};
var PERF_GOAL_ORDER = ['Increase Revenue','Improve Customer Experience','Improve Customer Engagement','Improve Internal Operation','Strategic Direction'];
var PERF_GOAL_COLORS = {
  'Increase Revenue':           '#88C470',
  'Improve Customer Experience':'#9B8FE0',
  'Improve Customer Engagement':'#D97890',
  'Improve Internal Operation': '#6BAED4',
  'Strategic Direction':        '#D4A850'
};

var _perf = {
  initData: [],
  issueData: [],
  supData:   [],
  ready: {init:false, issue:false, sup:false},
  curPerson: '',
  curYear: String(new Date().getFullYear()),
  curRole: 'any',        /* 'lead' | 'any' | 'support' */
  listCollapsed: true,   /* Initiative List collapsed by default */
};

/* ── Progressive ready: show page as soon as init data arrives ── */
function _perfCheckReady() {
  if (!_perf.ready.init) return;
  var loadEl = document.getElementById('gdb-loading');
  if (loadEl) loadEl.style.display = 'none';
  var contEl = document.getElementById('perf-content');
  if (contEl && contEl.style.display === 'none') {
    contEl.style.display = 'block';
    _perfBuildPeople();
  }
  _perfRender();
}

function _perfSectionSkeleton(panelId, subId) {
  var el = document.getElementById(panelId);
  if (el) el.innerHTML = '<div style="padding:32px 0;text-align:center;color:var(--text3);font-size:12px;letter-spacing:.03em">Loading…</div>';
  var sub = document.getElementById(subId);
  if (sub) sub.textContent = '';
}

/* ── Build person dropdown ── */
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
function _ym(y,cy) { return cy==='All'||y===cy; }

function _perfParseDate(v) {
  if (!v) return null;
  try { var o = JSON.parse(v); return o.start || null; } catch(e) { return null; }
}
function _perfDateQ(s) {
  if (!s) return null;
  var m = parseInt((s.split('-')[1] || '0'), 10);
  if (m >= 1 && m <= 3) return 1;
  if (m >= 4 && m <= 6) return 2;
  if (m >= 7 && m <= 9) return 3;
  return 4;
}

/* ── Main render ── */
function _perfRender() {
  if (!_perf.ready.init) return;
  _perfBuildYearFilter();

  var p  = _perf.curPerson;
  var cy = _perf.curYear;

  var myI1 = _perf.initData.filter(function(d) {
    return _pfn(d['Assignee.displayName'])===p && _ym(_pyr(d),cy);
  });
  var myI2 = _perf.initData.filter(function(d) {
    var names=(d['Assignee (2nd).displayName']||'').split(';').map(function(n){return _pfn(n);});
    return names.indexOf(p)>=0 && _ym(_pyr(d),cy);
  });

  /* Union de-duped by Key */
  var seen = {};
  var myAll = [];
  myI1.concat(myI2).forEach(function(d) {
    var k = d.Key || d.key || '';
    if (!seen[k]) { seen[k] = true; myAll.push(d); }
  });

  /* Avatar + name */
  var av = document.getElementById('perf-avatar');
  if (av) av.textContent = p ? p[0] : '?';
  var nm = document.getElementById('perf-name');
  if (nm) nm.textContent = p;

  /* For specific year: count only items with Target End date in that year (matches table logic) */
  var _headerI1 = myI1, _headerI2 = myI2, _headerAll = myAll;
  if (cy !== 'All') {
    var _fy = parseInt(cy);
    _headerI1 = myI1.filter(function(d){ return _perfInitQ(d,_fy)!==null; });
    _headerI2 = myI2.filter(function(d){ return _perfInitQ(d,_fy)!==null; });
    var _seen2 = {}; _headerAll = [];
    _headerI1.concat(_headerI2).forEach(function(d){
      var k=d.Key||d.key||''; if(!_seen2[k]){_seen2[k]=true;_headerAll.push(d);}
    });
  }

  var subEl = document.getElementById('perf-person-sub');
  if (subEl) subEl.textContent = 'Lead: '+_headerI1.length+' · Support: '+_headerI2.length+' · Total: '+_headerAll.length+' initiatives';

  /* Update initiative section sub-label */
  var initSub = document.getElementById('sec-init-sub');
  if (initSub) initSub.textContent = _headerAll.length + ' initiatives' + (cy !== 'All' ? ' · ' + cy : '');
  var snavInit = document.getElementById('snav-count-init');
  if (snavInit) snavInit.textContent = _headerAll.length;

  _buildPerfKpi(myI1, myI2, cy);
  _buildPerfOverviewByQuarter(myAll, myI1, myI2, cy);
  _buildPerfCompletionHeatmap(myAll, myI1, myI2, cy);
  _buildPerfInitList(myAll, myI1, myI2, cy);
  if (_perf.ready.issue) {
    _buildPerfIssueSection(p, cy);
  } else {
    _perfSectionSkeleton('perf-issue-panels', 'sec-issue-sub');
  }
  if (_perf.ready.sup) {
    _buildPerfSupportSection(p, cy);
  } else {
    _perfSectionSkeleton('perf-support-panels', 'sec-sup-sub');
  }
}

/* ══════════════════════════════════════════════
   Overview by Quarter
   2 Sections (Lead Assignee / Support Assignee)
   Each section = 2 panels side-by-side:
     Left  (Logic A): excl Won't Do only          → "ยกเว้นเฉพาะ Won't Do"
     Right (Logic B): excl Won't Do + Later + Obs → "ยกเว้น Won't Do · Later · Observer role"
   Matches summary page logic exactly:
     On Time = Actual Project End.end ≤ Target Project End.end
     Delayed = Project Monitoring Status = "Delayed"
     Quarter = from Target Project End.end (strict, no fallback)
══════════════════════════════════════════════ */

/* Parse .end field — summary page uses end, not start */
function _perfParseDateEnd(v) {
  if (!v) return null;
  try { var o = JSON.parse(v); return o.end || null; } catch(e) { return null; }
}

/* Quarter from Target Project End.end — strict, no fallback (mirrors summary page) */
function _perfInitQ(d, filterYear) {
  var end = _perfParseDateEnd(d['Target Project End']);
  if (!end) return null;
  var yr = parseInt((end.split('-')[0]||'0'), 10);
  if (yr !== filterYear) return null;
  return _perfDateQ(end);
}

/* On Time: Actual Project End.end ≤ Target Project End.end */
function _perfIsOnTime(d) {
  var tgt = _perfParseDateEnd(d['Target Project End']); if (!tgt) return false;
  var act = _perfParseDateEnd(d['Actual Project End']); if (!act) return false;
  return new Date(act) <= new Date(tgt);
}

/* Delayed: Project Monitoring Status = "Delayed" */
function _perfIsDelayed(d) { return (d['Project Monitoring Status']||'') === 'Delayed'; }

/* Logic A: exclude Won't Do only */
function _perfFilterA(items) {
  return items.filter(function(d){ return (d['Roadmap Status']||'').trim() !== "Won't do"; });
}

/* Logic B: exclude Won't Do + Later + Observer role */
function _perfFilterB(items) {
  return items.filter(function(d){
    var rs = (d['Roadmap Status']||'').trim();
    var pm = (d['PM Role']||'').trim();
    return rs !== "Won't do" && rs.toLowerCase() !== 'later' && pm !== 'Observer';
  });
}

/* Shared table: rows = Quarter (or Year for "All"), cols = Total | On Time | Delayed | % On Time */
function _perfQTable(items, year) {
  var thead = '<thead><tr>'+
    '<th class="col-person">'+(year==='All'?'Year':'Target Quarter')+'</th>'+
    '<th class="col-total" style="text-align:center">Total</th>'+
    '<th style="color:var(--up);text-align:center">On Time</th>'+
    '<th style="color:var(--down);text-align:center">Delayed</th>'+
    '<th style="min-width:110px">% On Time</th>'+
    '</tr></thead>';

  function dash() { return '<span style="color:var(--text3)">—</span>'; }

  /* pre-compute per-quarter max for heatmap scaling */
  var _qMax = { total: 1, onTime: 1 };
  (function() {
    var filterYear2 = year === 'All' ? null : parseInt(year);
    var quarters = [1,2,3,4];
    quarters.forEach(function(q) {
      var inQ = filterYear2
        ? items.filter(function(d){ return _perfInitQ(d,filterYear2)===q; })
        : items;
      var t = inQ.length;
      var ot = inQ.filter(_perfIsOnTime).length;
      var dl = inQ.filter(_perfIsDelayed).length;
      if (t  > _qMax.total)   _qMax.total   = t;
      if (ot > _qMax.onTime)  _qMax.onTime  = ot;
    });
  })();
  function _qHmBg(val, maxVal, r, g, b) {
    if (!val || !maxVal) return '';
    var op = Math.min(0.08 + (val/maxVal)*0.52, 0.6).toFixed(2);
    return ';background:rgba('+r+','+g+','+b+','+op+')';
  }

  function makeQRow(label, rowItems, isTotalRow) {
    var total   = rowItems.length;
    var onTime  = rowItems.filter(_perfIsOnTime).length;
    var delayed = rowItems.filter(_perfIsDelayed).length;
    var pct     = total ? Math.round(onTime/total*100) : null;
    var barColor = pct===null?'':pct>=80?'var(--up)':pct>=50?'var(--amber)':'var(--down)';
    var pctCell = pct===null ? dash() :
      '<div class="ovr-rate-bar">'+
        '<div class="ovr-rate-track"><div class="ovr-rate-fill" style="width:'+pct+'%;background:'+barColor+'"></div></div>'+
        '<span class="ovr-rate-pct" style="color:'+barColor+'">'+pct+'%</span>'+
      '</div>';
    if (isTotalRow) {
      var brd = 'border-top:2px solid var(--border);background:var(--surface2);font-weight:700';
      return '<tr>'+
        '<td class="col-person" style="'+brd+'">'+label+'</td>'+
        '<td class="col-total" style="text-align:center;border-top:2px solid var(--border)">'+total+'</td>'+
        '<td style="text-align:center;color:var(--up);'+brd+'">'+(onTime||dash())+'</td>'+
        '<td style="text-align:center;color:var(--down);'+brd+'">'+(delayed||dash())+'</td>'+
        '<td style="'+brd+'">'+pctCell+'</td>'+
        '</tr>';
    }
    var bgT  = _qHmBg(total,  _qMax.total,  88,166,255);
    var bgOT = _qHmBg(onTime, _qMax.onTime, 63,185,80);
    return '<tr>'+
      '<td class="col-person">'+label+'</td>'+
      '<td class="col-total" style="text-align:center'+bgT+'">'+total+'</td>'+
      '<td style="text-align:center;color:var(--up)'+bgOT+'">'+(onTime||dash())+'</td>'+
      '<td style="text-align:center;color:var(--down)">'+(delayed||dash())+'</td>'+
      '<td>'+pctCell+'</td>'+
      '</tr>';
  }

  var rows = '';
  var totalItems = items;
  if (year === 'All') {
    var yearMap = {};
    items.forEach(function(d){
      var end = _perfParseDateEnd(d['Target Project End']); if (!end) return;
      var yr = end.split('-')[0];
      if (!yearMap[yr]) yearMap[yr] = [];
      yearMap[yr].push(d);
    });
    var years = Object.keys(yearMap).sort();
    if (!years.length) return '<div style="padding:10px;font-size:11px;color:var(--text3)">No data</div>';
    years.forEach(function(yr){ rows += makeQRow(yr, yearMap[yr], false); });
    totalItems = items;
  } else {
    var filterYear = parseInt(year);
    var currentQ = Math.ceil((new Date().getMonth()+1)/3);
    [1,2,3,4].forEach(function(q){
      var inQ = items.filter(function(d){ return _perfInitQ(d,filterYear)===q; });
      var lbl = 'Q'+q+' '+year+
        (q===currentQ?' <span style="font-size:8px;background:var(--accent);color:#fff;padding:1px 5px;border-radius:3px;margin-left:3px;vertical-align:middle">now</span>':'');
      rows += makeQRow(lbl, inQ, false);
    });
    totalItems = items.filter(function(d){ return _perfInitQ(d, filterYear) !== null; });
  }
  if (!rows) return '<div style="padding:10px;font-size:11px;color:var(--text3)">No data</div>';
  rows += makeQRow('Total', totalItems, true);
  return '<div class="stbl-wrap"><table class="stbl" style="min-width:300px">'+thead+'<tbody>'+rows+'</tbody></table></div>';
}

/* ── Half-panel (one logic scope) ── */
function _perfPanelHalf(icon, title, sublabel, items, year, borderLeft) {
  return '<div style="flex:1;min-width:0;'+(borderLeft?'border-left:1px solid var(--border)':'')+'">' +
    '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:8px 12px 4px">' +
      icon+' '+title+
      '<span style="font-size:10px;font-weight:400;text-transform:none;letter-spacing:0"> — '+sublabel+'</span>'+
    '</div>'+
    _perfQTable(items, year)+
  '</div>';
}

/* ── Section (one role: Lead or Support) ── */
function _perfSection(roleLabel, color, baseItems, year) {
  var iA = _perfFilterA(baseItems);
  var iB = _perfFilterB(baseItems);
  return '<div style="border-top:1px solid var(--border)">'+
    '<div style="padding:4px 14px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">'+
      '<span style="display:inline-block;width:3px;height:12px;background:'+color+';border-radius:2px;flex-shrink:0"></span>'+
      '<span style="font-size:10px;font-weight:700;color:'+color+';letter-spacing:.05em;text-transform:uppercase">'+roleLabel+'</span>'+
      '<span style="font-size:10px;color:var(--text3);margin-left:2px">· '+baseItems.length+' initiatives</span>'+
    '</div>'+
    '<div style="display:flex">'+
      _perfPanelHalf('📋','Full Roadmap Scope',"ยกเว้นเฉพาะ Won't Do", iA, year, false)+
      _perfPanelHalf('🎯','Active Commitment', "ยกเว้น Won't Do · Later · Observer role", iB, year, true)+
    '</div>'+
  '</div>';
}

/* ── Overview by Quarter: 2 sections × 2 panels ── */
function _buildPerfOverviewByQuarter(myAll, myI1, myI2, year) {
  var el = document.getElementById('perf-overview-quarter');
  if (!el) return;

  el.innerHTML =
    '<div style="padding:9px 14px;display:flex;align-items:center;border-bottom:1px solid var(--border)">'+
      '<span style="font-size:12px;font-weight:700;color:var(--text)">Overview by Quarter</span>'+
      '<span style="font-size:11px;color:var(--text3);margin-left:auto">completion rate × on time delivery</span>'+
    '</div>'+
    _perfSection('Lead Assignee',    'var(--accent)', myI1, year)+
    _perfSection('Support Assignee', 'var(--teal)',   myI2, year);
}

/* Color helpers (mirrors summary page) */
function _perfCssVar(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function _perfRgba(hex, a) {
  hex = (hex||'').replace('#','');
  if (hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (!hex||hex.length!==6) return 'transparent';
  var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);
  return 'rgba('+r+','+g+','+b+','+Math.min(1,a).toFixed(2)+')';
}

/* ── Completion Heatmap: Project Goal × Status — 3 column groups ── */
function _buildPerfCompletionHeatmap(myAll, myI1, myI2, year) {
  var el = document.getElementById('perf-completion-heatmap');
  if (!el) return;
  if (!myAll.length) { el.innerHTML = _perfEmptyPanel('Completion Heatmap','No data for this person / year'); return; }

  var ST_ABBR = ['Parking Lot','Budget Appr.','Discovery','Ready','Delivery','Done'];

  /* Global max for consistent color scale */
  var gmax = 0, maxComb = 0;
  [myI1, myI2, myAll].forEach(function(pool) {
    PERF_GOAL_ORDER.concat(['']).forEach(function(goal) {
      PERF_STAGES.forEach(function(st) {
        var v = pool.filter(function(d){
          return (goal===''?!(d['Project Goal']||'').trim():(d['Project Goal']||'').trim()===goal) && d.Status===st;
        }).length;
        if (v > gmax) gmax = v;
      });
    });
  });
  PERF_GOAL_ORDER.concat(['']).forEach(function(goal) {
    PERF_STAGES.forEach(function(st) {
      var v = myAll.filter(function(d){
        return (goal===''?!(d['Project Goal']||'').trim():(d['Project Goal']||'').trim()===goal) && d.Status===st;
      }).length;
      if (v > maxComb) maxComb = v;
    });
  });

  function hmBg(val, maxVal) {
    if (!val || !maxVal) return null;
    var op = Math.min(0.08 + (val/maxVal)*0.52, 0.6).toFixed(2);
    return 'rgba(88,166,255,'+op+')';
  }
  function hmBgDone(val, maxVal) {
    if (!val || !maxVal) return null;
    var op = Math.min(0.08 + (val/maxVal)*0.52, 0.6).toFixed(2);
    return 'rgba(63,185,80,'+op+')';
  }
  function hmCell(val, status, role) {
    var bg = status==='Done' ? hmBgDone(val, gmax) : hmBg(val, gmax);
    if (!bg) return '<span class="hm hm-0">—</span>';
    return '<span class="hm" style="background:'+bg+';color:var(--text)">'+val+'</span>';
  }
  function hmCellComb(val, status) {
    var bg = status==='Done' ? hmBgDone(val, maxComb) : hmBg(val, maxComb);
    if (!bg) return '<span class="hm hm-0">—</span>';
    return '<span class="hm" style="background:'+bg+';color:var(--text)">'+val+'</span>';
  }

  var N = PERF_STAGES.length;

  /* Header row 1 */
  var html = '<thead><tr>'+
    '<th class="col-person" rowspan="2" style="border-bottom:2px solid var(--border)">Project Goal</th>'+
    '<th colspan="'+(N+1)+'" class="cg-head cg-lead sep">Lead Initiative</th>'+
    '<th colspan="'+(N+1)+'" class="cg-head cg-sup sep">Support Initiative</th>'+
    '<th colspan="'+(N+1)+'" class="cg-head" style="background:rgba(100,100,100,.07);border-left:2px solid var(--border)">Grand Total (Lead + Support)</th>'+
  '</tr>';

  /* Header row 2 */
  function stRow(borderLeft) {
    return ST_ABBR.map(function(s,i){
      return '<th'+(i===0&&borderLeft?' style="border-left:2px solid var(--border)"':'')+'>'+s+'</th>';
    }).join('') + '<th class="sep" style="color:var(--text)">Total</th>';
  }
  html += '<tr>'+stRow(false)+stRow(false)+stRow(true)+'</tr></thead><tbody>';

  /* Goal row */
  function goalRow(goal, color) {
    var leadI = myI1.filter(function(d){ return goal===''?!(d['Project Goal']||'').trim():(d['Project Goal']||'').trim()===goal; });
    var suppI = myI2.filter(function(d){ return goal===''?!(d['Project Goal']||'').trim():(d['Project Goal']||'').trim()===goal; });
    var allI  = myAll.filter(function(d){ return goal===''?!(d['Project Goal']||'').trim():(d['Project Goal']||'').trim()===goal; });
    if (goal === '' && !leadI.length && !suppI.length && !allI.length) return '';
    var dot = color ? '<span class="p-dot" style="background:'+color+'"></span>' : '';
    var lbl = goal ? dot+goal : '<span style="color:var(--text3);font-style:italic">(not set)</span>';
    function gc(items, role) {
      return PERF_STAGES.map(function(s){ return '<td>'+hmCell(items.filter(function(d){return d.Status===s;}).length, s, role)+'</td>'; }).join('') +
        '<td class="sep col-total">'+items.length+'</td>';
    }
    function gcc(items) {
      return PERF_STAGES.map(function(s,i){ return '<td'+(i===0?' style="border-left:2px solid var(--border)"':'')+'>'+hmCellComb(items.filter(function(d){return d.Status===s;}).length, s)+'</td>'; }).join('') +
        '<td class="col-total">'+items.length+'</td>';
    }
    return '<tr><td class="col-person">'+lbl+'</td>'+gc(leadI,'lead')+gc(suppI,'sup')+gcc(allI)+'</tr>';
  }

  var tbody = '';
  PERF_GOAL_ORDER.forEach(function(g){ tbody += goalRow(g, PERF_GOAL_COLORS[g]||''); });
  if (myAll.filter(function(d){ return !(d['Project Goal']||'').trim(); }).length) tbody += goalRow('','');
  if (!tbody) { el.innerHTML = _perfEmptyPanel('Completion Heatmap','No initiative data'); return; }

  /* Footer */
  function footerGc(pool, role) {
    return PERF_STAGES.map(function(s){ var v=pool.filter(function(d){return d.Status===s;}).length; return '<td><span style="font-weight:700;color:var(--text)">'+v+'</span></td>'; }).join('') +
      '<td class="sep col-total">'+pool.length+'</td>';
  }
  function footerGcc(pool) {
    return PERF_STAGES.map(function(s,i){ var v=pool.filter(function(d){return d.Status===s;}).length; return '<td'+(i===0?' style="border-left:2px solid var(--border)"':'')+'>'+v+'</td>'; }).join('') +
      '<td class="col-total">'+pool.length+'</td>';
  }
  var tfoot = '<tfoot><tr style="border-top:2px solid var(--border);background:var(--surface2)">'+
    '<td class="col-person" style="border-top:2px solid var(--border);font-weight:700;color:var(--text3)">Total</td>'+
    footerGc(myI1,'lead')+footerGc(myI2,'sup')+footerGcc(myAll)+
  '</tr></tfoot>';

  var sub = 'count per role × status — with grand total · '+(year==='All'?'all years':year);
  el.innerHTML = '<div style="padding:9px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">'+
    '<span style="font-size:12px;font-weight:700;color:var(--text)">Completion Heatmap</span>'+
    '<span style="font-size:11px;color:var(--text3);margin-left:auto">'+sub+'</span>'+
    '</div>'+
    '<div style="padding:12px 14px"><div class="stbl-wrap">'+
    '<table class="stbl">'+html+'<tbody>'+tbody+'</tbody>'+tfoot+'</table>'+
    '</div></div>';
}

/* ── Initiative List ── */
function _buildPerfInitList(myAll, myI1, myI2, year) {
  var el = document.getElementById('perf-init-list');
  if (!el) return;
  /* Cache for collapse toggle */
  window.__perfMyAll = myAll; window.__perfMyI1 = myI1; window.__perfMyI2 = myI2;

  /* Build role lookup */
  var leadKeys = {}, suppKeys = {};
  myI1.forEach(function(d){ leadKeys[d.Key||d.key||''] = true; });
  myI2.forEach(function(d){ suppKeys[d.Key||d.key||''] = true; });

  function getRole(d) {
    var k = d.Key||d.key||'';
    var l = !!leadKeys[k], s = !!suppKeys[k];
    if (l && s) return 'both';
    if (l) return 'lead';
    return 'support';
  }

  /* Sort key helpers */
  function qSortKey(d) {
    var end = _perfParseDateEnd(d['Target Project End']);
    if (!end) return 99999;
    return parseInt(end.split('-')[0]) * 10 + (_perfDateQ(end) || 9);
  }
  var RS_ORDER = ['Active','On Track','At Risk','Delayed','On Hold','Later',"Won't do",''];
  function rsSortKey(d) {
    var rs = (d['Roadmap Status']||'').trim();
    var i = RS_ORDER.indexOf(rs);
    return i < 0 ? RS_ORDER.length - 1 : i;
  }

  /* Filter by curRole */
  var items = myAll.filter(function(d){
    var r = getRole(d);
    if (_perf.curRole === 'lead')    return r === 'lead' || r === 'both';
    if (_perf.curRole === 'support') return r === 'support' || r === 'both';
    return true;
  });

  /* Sort: Quarter → Roadmap Status → Status */
  items.sort(function(a, b) {
    var dq = qSortKey(a) - qSortKey(b);
    if (dq) return dq;
    var dr = rsSortKey(a) - rsSortKey(b);
    if (dr) return dr;
    return PERF_STAGES.indexOf(a.Status||'') - PERF_STAGES.indexOf(b.Status||'');
  });

  /* Quarter label — always "Q1 2026" format */
  function qLabel(d) {
    var end = _perfParseDateEnd(d['Target Project End']);
    if (!end) return 'Unsched.';
    var yr = end.split('-')[0];
    var q = _perfDateQ(end);
    return q ? 'Q'+q+' '+yr : 'Unsched.';
  }

  /* Role badge */
  function roleBadge(d) {
    var r = getRole(d);
    if (r === 'both')    return '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(88,166,255,.18);color:var(--accent)">Lead</span>'+
                                '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(34,211,164,.18);color:var(--teal);margin-left:3px">Support</span>';
    if (r === 'lead')    return '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(88,166,255,.18);color:var(--accent)">Lead</span>';
    return '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(34,211,164,.18);color:var(--teal)">Support</span>';
  }

  /* Status badge */
  function stBadge(d) {
    var st = d.Status||'—';
    var col = PERF_ST_COLOR[st]||'var(--text3)';
    return '<span style="font-size:10px;color:'+col+';font-weight:600">'+st+'</span>';
  }

  /* Goal dot */
  function goalCell(d) {
    var g = (d['Project Goal']||'').trim();
    var c = PERF_GOAL_COLORS[g]||'';
    var dot = c ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+c+';margin-right:5px;flex-shrink:0;vertical-align:middle"></span>' : '';
    return dot + '<span style="font-size:10px;color:var(--text2)">'+(g||'<span style="color:var(--text3);font-style:italic">—</span>')+'</span>';
  }

  /* On-time indicator */
  function onTimeCell(d) {
    if (_perfIsOnTime(d)) return '<span style="color:var(--up);font-size:10px;font-weight:600">✓ On Time</span>';
    if (_perfIsDelayed(d)) return '<span style="color:var(--down);font-size:10px;font-weight:600">⚠ Delayed</span>';
    return '<span style="color:var(--text3);font-size:10px">—</span>';
  }

  var thSt = 'font-size:10px;font-weight:600;color:var(--text3);padding:6px 10px;border-bottom:1px solid var(--border);white-space:nowrap;text-align:left;text-transform:uppercase;letter-spacing:.04em';
  var thead = '<thead><tr>'+
    '<th style="'+thSt+'">Key</th>'+
    '<th style="'+thSt+';width:99%">Summary</th>'+
    '<th style="'+thSt+'">Assignee Role</th>'+
    '<th style="'+thSt+'">Quarter</th>'+
    '<th style="'+thSt+'">Status</th>'+
    '<th style="'+thSt+'">Roadmap Status</th>'+
    '<th style="'+thSt+'">Project Goal</th>'+
    '<th style="'+thSt+'">On Time</th>'+
    '</tr></thead>';

  var tdSt = 'padding:6px 10px;text-align:left;';
  var tbody = items.length ? items.map(function(d){
    var key = d.Key||d.key||'—';
    var jiraUrl = 'https://kingpower.atlassian.net/browse/'+key;
    var rs = (d['Roadmap Status']||'').trim();
    var rsColor = rs.toLowerCase()==="won't do"||rs.toLowerCase()==='later'?'var(--text3)':'var(--text2)';
    return '<tr style="border-bottom:1px solid var(--border)">'+
      '<td style="'+tdSt+'white-space:nowrap"><a href="'+jiraUrl+'" target="_blank" style="font-size:11px;font-weight:700;color:var(--accent);text-decoration:none">'+key+' ↗</a></td>'+
      '<td style="'+tdSt+'font-size:11px;color:var(--text);min-width:200px">'+((d.Summary||'').slice(0,100)+(d.Summary&&d.Summary.length>100?'…':''))+'</td>'+
      '<td style="'+tdSt+'white-space:nowrap">'+roleBadge(d)+'</td>'+
      '<td style="'+tdSt+'font-size:11px;font-weight:600;color:var(--text2);white-space:nowrap">'+qLabel(d)+'</td>'+
      '<td style="'+tdSt+'white-space:nowrap">'+stBadge(d)+'</td>'+
      '<td style="'+tdSt+'font-size:11px;color:'+rsColor+';white-space:nowrap">'+(rs||'—')+'</td>'+
      '<td style="'+tdSt+'white-space:nowrap">'+goalCell(d)+'</td>'+
      '<td style="'+tdSt+'white-space:nowrap">'+onTimeCell(d)+'</td>'+
      '</tr>';
  }).join('') : '<tr><td colspan="8" style="padding:16px;text-align:center;font-size:12px;color:var(--text3)">No initiatives</td></tr>';

  /* Segmented role filter */
  var ROLE_OPTS = [{val:'lead',label:'Lead'},{val:'any',label:'Any'},{val:'support',label:'Support'}];
  var segCtrl = '<div style="display:flex;border:1px solid var(--border);border-radius:20px;overflow:hidden;background:var(--surface2)">'+
    ROLE_OPTS.map(function(o){
      var active = _perf.curRole === o.val;
      var bg = active ? 'background:var(--accent);color:#fff;' : 'background:transparent;color:var(--text2);';
      return '<button onclick="_perf.curRole=\''+o.val+'\';_perfRender()" style="'+bg+
        'border:none;padding:4px 14px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s">'+o.label+'</button>';
    }).join('')+
    '</div>';

  var collapsed = _perf.listCollapsed;
  var chevron = collapsed ? '▶' : '▼';

  el.innerHTML =
    '<div class="panel-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;cursor:pointer" onclick="_perf.listCollapsed=!_perf.listCollapsed;_buildPerfInitList('+
      'window.__perfMyAll,window.__perfMyI1,window.__perfMyI2,\''+year+'\')">'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<span style="font-size:10px;color:var(--text3)">'+chevron+'</span>'+
        '<div><div class="panel-title">Initiative List</div>'+
        '<div class="panel-sub">'+items.length+' of '+myAll.length+' initiatives · '+(year==='All'?'all years':year)+'</div></div>'+
      '</div>'+
      '<div onclick="event.stopPropagation()">'+segCtrl+'</div>'+
    '</div>'+
    (collapsed ? '' :
      '<div class="tbl-scroll"><table style="width:100%;border-collapse:collapse">'+thead+'<tbody>'+tbody+'</tbody></table></div>');
}

/* ── KPI Strip — Split Tile (Logic A / Logic B) ── */
function _buildPerfKpi(myI1, myI2, year) {
  var el = document.getElementById('perf-kpi');
  if (!el) return;

  var i1A = _perfFilterA(myI1);
  var i1B = _perfFilterB(myI1);
  var i2A = _perfFilterA(myI2);
  var i2B = _perfFilterB(myI2);

  var tiles = [
    { label: 'Lead Done',       color: 'var(--accent)', arcColor: 'var(--up)',
      a: { v: i1A.filter(function(d){ return d.Status==='Done'; }).length, total: i1A.length },
      b: { v: i1B.filter(function(d){ return d.Status==='Done'; }).length, total: i1B.length } },
    { label: 'Lead On Time',    color: 'var(--accent)', arcColor: 'var(--accent)',
      a: { v: i1A.filter(_perfIsOnTime).length, total: i1A.length },
      b: { v: i1B.filter(_perfIsOnTime).length, total: i1B.length } },
    { label: 'Lead Delayed',    color: 'var(--accent)', arcColor: 'var(--down)',
      a: { v: i1A.filter(_perfIsDelayed).length, total: i1A.length },
      b: { v: i1B.filter(_perfIsDelayed).length, total: i1B.length } },
    { label: 'Support Done',    color: 'var(--teal)', arcColor: 'var(--up)',
      a: { v: i2A.filter(function(d){ return d.Status==='Done'; }).length, total: i2A.length },
      b: { v: i2B.filter(function(d){ return d.Status==='Done'; }).length, total: i2B.length } },
    { label: 'Support On Time', color: 'var(--teal)', arcColor: 'var(--accent)',
      a: { v: i2A.filter(_perfIsOnTime).length, total: i2A.length },
      b: { v: i2B.filter(_perfIsOnTime).length, total: i2B.length } },
    { label: 'Support Delayed', color: 'var(--teal)', arcColor: 'var(--down)',
      a: { v: i2A.filter(_perfIsDelayed).length, total: i2A.length },
      b: { v: i2B.filter(_perfIsDelayed).length, total: i2B.length } }
  ];

  function makeTile(t) {
    function donutSvg(v, total, size) {
      var sw = size <= 30 ? 2.5 : 3;
      var r = (size - sw * 2) / 2;
      var circ = +(2 * Math.PI * r).toFixed(3);
      var pct = total > 0 ? Math.min(v / total, 1) : 0;
      var filled = +(pct * circ).toFixed(3);
      var empty  = +(circ - filled).toFixed(3);
      var c = size / 2;
      var arc = pct <= 0
        ? ' stroke="none"'
        : ' stroke-dasharray="'+filled+' '+Math.max(empty, 0)+'" stroke-linecap="round"';
      return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" style="flex-shrink:0;transform:rotate(-90deg)">'+
        '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="var(--border)" stroke-width="'+sw+'"/>'+
        '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="'+t.arcColor+'" stroke-width="'+sw+'"'+arc+'/>'+
      '</svg>';
    }
    function half(data, scopeLabel, big) {
      var sub = data.total > 0 ? 'of '+data.total : '';
      var size = big ? 36 : 28;
      var pct = data.total > 0 ? data.v / data.total : 0;
      var numColor = pct <= 0 ? 'var(--text3)' : t.arcColor;
      return '<div style="padding:'+(big?'5px 10px 2px':'2px 10px 5px')+';display:flex;align-items:center;justify-content:space-between;gap:4px">'+
        '<div>'+
          '<div style="display:flex;align-items:baseline;gap:3px">'+
            '<span style="font-size:'+(big?18:13)+'px;font-weight:700;color:'+numColor+';font-variant-numeric:tabular-nums;line-height:1">'+data.v+'</span>'+
            (sub?'<span style="font-size:9px;color:var(--text3)">'+sub+'</span>':'')+
          '</div>'+
          '<div style="font-size:8px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-top:1px">'+scopeLabel+'</div>'+
        '</div>'+
        donutSvg(data.v, data.total, size)+
      '</div>';
    }
    return '<div style="flex:1;min-width:110px;background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden">'+
      half(t.a, 'Full Roadmap', true)+
      '<div style="height:1px;background:var(--border)"></div>'+
      half(t.b, 'Active Commitment', false)+
      '<div style="padding:3px 10px;background:var(--surface2);border-top:1px solid var(--border);display:flex;align-items:center;gap:4px">'+
        '<span style="display:inline-block;width:3px;height:8px;background:'+t.color+';border-radius:2px;flex-shrink:0"></span>'+
        '<span style="font-size:9px;font-weight:700;color:var(--text2)">'+t.label+'</span>'+
      '</div>'+
    '</div>';
  }

  function makeGroup(label, color, tileList, dim) {
    return '<div style="flex:1;min-width:0'+(dim?';opacity:0.6':'')+'">'+
      '<div style="display:flex;align-items:center;gap:5px;padding:3px 6px;margin-bottom:4px;background:var(--surface2);border-bottom:1px solid var(--border)">'+
        '<span style="display:inline-block;width:3px;height:10px;background:'+color+';border-radius:2px;flex-shrink:0"></span>'+
        '<span style="font-size:9px;font-weight:700;color:'+color+';letter-spacing:.06em;text-transform:uppercase">'+label+'</span>'+
      '</div>'+
      '<div style="display:flex;gap:5px">'+tileList.map(makeTile).join('')+'</div>'+
    '</div>';
  }

  el.innerHTML =
    '<div style="display:flex;gap:0;align-items:flex-start;flex-wrap:wrap">'+
      makeGroup('Lead Assignee',    'var(--accent)', tiles.slice(0,3), false)+
      '<div style="width:1px;background:var(--border);align-self:stretch;margin:0 20px;flex-shrink:0"></div>'+
      makeGroup('Support Assignee', 'var(--teal)',   tiles.slice(3),   true)+
    '</div>';
}

function _perfEmptyPanel(title, msg) {
  return '<div class="panel-head"><div><div class="panel-title">'+title+'</div></div></div>'+
    '<div class="panel-body"><div style="color:var(--text3);font-size:12px;padding:10px">'+msg+'</div></div>';
}

/* ══════════════════════════════════════════════
   Issue Section
══════════════════════════════════════════════ */
function _buildPerfIssueSection(person, year) {
  var el = document.getElementById('perf-issue-panels');
  if (!el) return;

  var ISSUE_STS_LIST = ['Open','Investigating','In Progress','Resolved','Closed'];

  function issueYear(d) {
    var m = d.FailureOccurs ? String(d.FailureOccurs).match(/(\d{4})/) : null;
    return m ? m[1] : '';
  }

  var myIssues = _perf.issueData.filter(function(d) {
    return _pfn(d.Assignee) === person;
  });
  var filtered = year === 'All' ? myIssues : myIssues.filter(function(d) {
    return issueYear(d) === year;
  });

  var countEl = document.getElementById('snav-count-issue');
  if (countEl) countEl.textContent = myIssues.length;
  var subEl = document.getElementById('sec-issue-sub');
  if (subEl) subEl.textContent = myIssues.length + ' issues' + (year !== 'All' ? ' · ' + year : '');

  if (!filtered.length) {
    el.innerHTML = '<div class="panel">'+_perfEmptyPanel('Issues','No issues for this person / year')+'</div>';
    return;
  }

  function stTag(s) {
    var styles = {
      'Open':         'background:rgba(245,158,11,.12);color:var(--amber);border:1px solid rgba(245,158,11,.3)',
      'Investigating':'background:rgba(167,139,250,.12);color:var(--purple);border:1px solid rgba(167,139,250,.3)',
      'In Progress':  'background:rgba(88,166,255,.12);color:var(--accent);border:1px solid rgba(88,166,255,.3)',
      'Resolved':     'background:rgba(63,185,80,.12);color:var(--up);border:1px solid rgba(63,185,80,.3)',
      'Closed':       'background:rgba(63,185,80,.08);color:var(--up);border:1px solid rgba(63,185,80,.2)',
    };
    var st = styles[s] || 'color:var(--text3)';
    return '<span style="border-radius:3px;padding:1px 6px;font-size:10px;font-weight:600;'+st+'">'+s+'</span>';
  }

  function miniKpi(label, val, color) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 8px">'+
      '<span style="font-size:20px;font-weight:700;color:'+(color||'var(--text)')+';font-variant-numeric:tabular-nums;line-height:1.1">'+val+'</span>'+
      '<span style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-top:3px;text-align:center">'+label+'</span>'+
    '</div>';
  }

  var open   = filtered.filter(function(d){ return d.Status==='Open'; }).length;
  var inprog = filtered.filter(function(d){ return d.Status==='Investigating'||d.Status==='In Progress'; }).length;
  var done   = filtered.filter(function(d){ return d.Status==='Resolved'||d.Status==='Closed'; }).length;
  var pct    = filtered.length ? Math.round(done/filtered.length*100) : 0;
  var pctColor = pct>=80?'var(--up)':pct>=50?'var(--amber)':'var(--down)';

  var kpiRow =
    '<div style="padding:9px 14px;display:flex;align-items:center;border-bottom:1px solid var(--border)">'+
      '<span style="font-size:12px;font-weight:700;color:var(--text)">Issue Breakdown</span>'+
      '<span style="font-size:11px;color:var(--text3);margin-left:auto">'+filtered.length+' issues · '+(year==='All'?'all years':year)+'</span>'+
    '</div>'+
    '<div style="display:flex;border-bottom:1px solid var(--border)">'+
      miniKpi('Total',      filtered.length, 'var(--text)')+
      '<div style="width:1px;background:var(--border)"></div>'+
      miniKpi('Open',       open,   'var(--amber)')+
      '<div style="width:1px;background:var(--border)"></div>'+
      miniKpi('In Progress',inprog, 'var(--accent)')+
      '<div style="width:1px;background:var(--border)"></div>'+
      miniKpi('Closed',     done,   'var(--up)')+
      '<div style="width:1px;background:var(--border)"></div>'+
      miniKpi('% Closed',   pct+'%', pctColor)+
    '</div>';

  var rows = filtered.map(function(d) {
    var st = ISSUE_STS_LIST.indexOf(d.Status)>=0 ? d.Status : 'Open';
    var yr = issueYear(d);
    return '<tr>'+
      '<td class="col-person" style="font-family:monospace;font-size:11px">'+
        '<a href="'+ISSUE_JIRA_BASE+(d.Key||'')+'" target="_blank" style="color:var(--accent);text-decoration:none">'+
          (d.Key||'—')+
        '</a>'+
      '</td>'+
      '<td style="text-align:left;max-width:320px"><span style="font-size:11.5px;color:var(--text)">'+(d.Summary||'—')+'</span></td>'+
      '<td>'+stTag(st)+'</td>'+
      '<td style="color:var(--text3);font-size:11px">'+yr+'</td>'+
    '</tr>';
  }).join('');

  el.innerHTML = '<div class="panel">'+
    kpiRow+
    '<div class="stbl-wrap"><table class="stbl" style="min-width:400px">'+
      '<thead><tr>'+
        '<th class="col-person">Key</th>'+
        '<th style="text-align:left">Summary</th>'+
        '<th>Status</th>'+
        '<th>Year</th>'+
      '</tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
    '</table></div>'+
  '</div>';
}

/* ══════════════════════════════════════════════
   Support Section
══════════════════════════════════════════════ */
function _buildPerfSupportSection(person, year) {
  var el = document.getElementById('perf-support-panels');
  if (!el) return;

  function supYear(d) {
    var lm = (d.Labels||'').match(/(\d{4})/); if (lm) return lm[1];
    var dm = (d.Due||d.due) ? String(d.Due||d.due).match(/(\d{4})/) : null;
    return dm ? dm[1] : '';
  }
  function supMonth(d) {
    var raw = d.Due || d.due || '';
    if (!raw) return '';
    var dt = new Date(raw); if (isNaN(dt)) return '';
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return m[dt.getMonth()]+' '+dt.getFullYear();
  }
  function supQuarter(d) {
    var raw = d.Due || d.due || '';
    if (!raw) return null;
    var dt = new Date(raw); if (isNaN(dt)) return null;
    var mo = dt.getMonth();
    return mo < 3 ? 'Q1' : mo < 6 ? 'Q2' : mo < 9 ? 'Q3' : 'Q4';
  }
  function supGroup(d) {
    return (d.Group && d.Group.trim()) ? d.Group.trim() : 'Other';
  }
  function isDoneStatus(s) { return s==='Done'||s==='Closed'||s==='Resolved'; }

  var myTasks = _perf.supData.filter(function(d) {
    return _pfn(d.Assignee) === person;
  });
  var filtered = year === 'All' ? myTasks : myTasks.filter(function(d) {
    return supYear(d) === year;
  });

  var countEl = document.getElementById('snav-count-sup');
  if (countEl) countEl.textContent = myTasks.length;
  var subEl = document.getElementById('sec-sup-sub');
  if (subEl) subEl.textContent = myTasks.length + ' tasks' + (year !== 'All' ? ' · ' + year : '');

  function stTagSup(s) {
    var isDone = isDoneStatus(s);
    var st = isDone
      ? 'background:rgba(63,185,80,.12);color:var(--up);border:1px solid rgba(63,185,80,.3)'
      : 'background:rgba(88,166,255,.12);color:var(--accent);border:1px solid rgba(88,166,255,.3)';
    return s ? '<span style="border-radius:3px;padding:1px 6px;font-size:10px;font-weight:600;'+st+'">'+s+'</span>'
             : '<span style="color:var(--text3)">—</span>';
  }

  function miniKpi(label, val, color) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 8px">'+
      '<span style="font-size:20px;font-weight:700;color:'+(color||'var(--text)')+';font-variant-numeric:tabular-nums;line-height:1.1">'+val+'</span>'+
      '<span style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-top:3px;text-align:center">'+label+'</span>'+
    '</div>';
  }

  var done = filtered.filter(function(d){ return isDoneStatus(d.Status); }).length;
  var pct  = filtered.length ? Math.round(done/filtered.length*100) : 0;
  var pctColor = pct>=80?'var(--up)':pct>=50?'var(--amber)':'var(--down)';

  /* ── KPI summary — 3 separate cards ── */
  function kpiCard(label, val, color) {
    return '<div class="panel" style="flex:1">'+
      '<div style="display:flex;flex-direction:column;align-items:center;padding:10px 8px">'+
        '<span style="font-size:20px;font-weight:700;color:'+(color||'var(--text)')+';font-variant-numeric:tabular-nums;line-height:1.1">'+val+'</span>'+
        '<span style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-top:3px;text-align:center">'+label+'</span>'+
      '</div>'+
    '</div>';
  }
  var kpiPanel = '<div style="display:flex;gap:12px">'+
    kpiCard('Total',   filtered.length, 'var(--text)')+
    kpiCard('Done',    done,   'var(--up)')+
    kpiCard('% Done',  pct+'%', pctColor)+
  '</div>';

  /* ── Chart 1: By Quarter ── */
  var QS = ['Q1','Q2','Q3','Q4'];
  var nowTag = '<span style="font-size:8px;background:var(--accent);color:#fff;padding:1px 5px;border-radius:3px;margin-left:4px;vertical-align:middle">now</span>';
  var currentQStr = 'Q' + Math.ceil((new Date().getMonth()+1)/3);

  function qItems(q) { return filtered.filter(function(d){ return supQuarter(d)===q; }); }

  function makeQSumRow(label, items, isTot) {
    var d_ = items.filter(function(d){ return isDoneStatus(d.Status); }).length;
    var p_ = items.length ? Math.round(d_/items.length*100) : 0;
    var pc = p_>=80?'var(--up)':p_>=50?'var(--amber)':'var(--down)';
    var rowBg = isTot ? 'background:var(--surface2)' : '';
    var fw = isTot ? '700' : '400';
    return '<tr style="'+rowBg+'">'+
      '<td style="padding:6px 14px;font-size:12px;font-weight:'+(isTot?'700':'600')+';color:var(--text);text-align:left">'+label+'</td>'+
      '<td style="padding:6px 12px;text-align:center;font-size:12px;font-weight:'+fw+';font-variant-numeric:tabular-nums;color:var(--text)">'+items.length+'</td>'+
      '<td style="padding:6px 12px;text-align:center;font-size:12px;font-weight:'+fw+';font-variant-numeric:tabular-nums;color:var(--up)">'+d_+'</td>'+
      '<td style="padding:6px 14px;min-width:120px">'+
        '<div class="ovr-rate-bar">'+
          '<div class="ovr-rate-track"><div class="ovr-rate-fill" style="width:'+p_+'%;background:'+pc+'"></div></div>'+
          '<span class="ovr-rate-pct" style="color:'+pc+'">'+p_+'%</span>'+
        '</div>'+
      '</td>'+
    '</tr>';
  }

  var chart1Rows = QS.map(function(q) {
    var lbl = year !== 'All'
      ? q + ' ' + year + (q === currentQStr ? nowTag : '')
      : q;
    return makeQSumRow(lbl, qItems(q), false);
  }).join('');
  chart1Rows += makeQSumRow('Total', filtered, true);

  var chart1 = '<div class="panel" style="flex:2;min-width:0;display:flex;flex-direction:column">'+
    '<div style="padding:9px 14px;border-bottom:1px solid var(--border)">'+
      '<span style="font-size:11px;font-weight:700;color:var(--text)">By Quarter</span>'+
    '</div>'+
    '<div class="stbl-wrap"><table class="stbl" style="min-width:300px">'+
      '<thead><tr>'+
        '<th style="text-align:left;padding:5px 14px">Quarter</th>'+
        '<th style="text-align:center">Total</th>'+
        '<th style="text-align:center">Done</th>'+
        '<th style="text-align:left;padding:5px 14px;min-width:120px">% Complete</th>'+
      '</tr></thead>'+
      '<tbody>'+chart1Rows+'</tbody>'+
    '</table></div>'+
  '</div>';

  /* ── Chart 1b: Done by Group — donut chart ── */
  var allGroups = [];
  filtered.forEach(function(d) {
    var g = supGroup(d);
    if (allGroups.indexOf(g) < 0) allGroups.push(g);
  });
  allGroups.sort();

  var PIE_COLORS = ['var(--accent)','var(--teal)','var(--amber)','var(--up)','var(--purple)','var(--down)','#79c0ff','#ffa657'];
  var groupDone = allGroups.map(function(g,i) {
    var cnt = filtered.filter(function(d){ return supGroup(d)===g && isDoneStatus(d.Status); }).length;
    return { g: g, cnt: cnt, color: PIE_COLORS[i % PIE_COLORS.length] };
  }).filter(function(x){ return x.cnt > 0; });

  (function() {
    /* top 5 by done count, rest → Other */
    var totalDone = groupDone.reduce(function(s,x){ return s+x.cnt; }, 0);
    if (!totalDone) { groupDone._svg = ''; groupDone._legend = ''; return; }

    var sorted = groupDone.slice().sort(function(a,b){ return b.cnt-a.cnt; });
    var top5 = sorted.slice(0,5);
    var rest = sorted.slice(5);
    if (rest.length) {
      var otherCnt = rest.reduce(function(s,x){ return s+x.cnt; }, 0);
      top5.push({ g: 'Other', cnt: otherCnt, color: 'var(--text3)' });
    }
    var display = top5;

    var cx=70, cy=70, R=60, ri=36;
    var paths = '';
    var angle = -Math.PI/2;
    display.forEach(function(x) {
      var slice = (x.cnt/totalDone)*2*Math.PI;
      if (slice < 0.001) return;
      var a2 = angle+slice;
      var lg = slice>Math.PI?1:0;
      var x1o=(cx+R*Math.cos(angle)).toFixed(2), y1o=(cy+R*Math.sin(angle)).toFixed(2);
      var x2o=(cx+R*Math.cos(a2)).toFixed(2),    y2o=(cy+R*Math.sin(a2)).toFixed(2);
      var x1i=(cx+ri*Math.cos(angle)).toFixed(2), y1i=(cy+ri*Math.sin(angle)).toFixed(2);
      var x2i=(cx+ri*Math.cos(a2)).toFixed(2),    y2i=(cy+ri*Math.sin(a2)).toFixed(2);
      paths += '<path d="M'+x1o+','+y1o+' A'+R+','+R+' 0 '+lg+',1 '+x2o+','+y2o+
        ' L'+x2i+','+y2i+' A'+ri+','+ri+' 0 '+lg+',0 '+x1i+','+y1i+' Z"'+
        ' style="fill:'+x.color+'" stroke="var(--surface)" stroke-width="2"/>';
      angle = a2;
    });
    groupDone._svg =
      '<svg viewBox="0 0 140 140" width="120" height="120" style="flex-shrink:0">'+
        paths+
        '<text x="70" y="65" text-anchor="middle" style="font-size:18px;font-weight:700;fill:var(--text);font-variant-numeric:tabular-nums">'+totalDone+'</text>'+
        '<text x="70" y="80" text-anchor="middle" style="font-size:9px;font-weight:600;fill:var(--text3);text-transform:uppercase;letter-spacing:.05em">Done</text>'+
      '</svg>';
    groupDone._legend = display.map(function(x) {
      var pct = Math.round(x.cnt/totalDone*100);
      return '<div style="display:flex;align-items:center;gap:6px;padding:4px 0">'+
        '<span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'+x.color+'"></span>'+
        '<span style="font-size:11px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+x.g+'">'+x.g+'</span>'+
        '<span style="font-size:11px;font-weight:700;color:var(--text2);font-variant-numeric:tabular-nums;white-space:nowrap">('+x.cnt+') '+pct+'%</span>'+
      '</div>';
    }).join('');
  })();

  var chart1b = '<div class="panel" style="flex:1;min-width:0;display:flex;flex-direction:column">'+
    '<div style="padding:9px 14px;border-bottom:1px solid var(--border)">'+
      '<span style="font-size:11px;font-weight:700;color:var(--text)">Done by Group</span>'+
    '</div>'+
    '<div style="flex:1;padding:12px 14px;display:flex;align-items:center;gap:12px">'+
      (groupDone._svg||'<span style="color:var(--text3);font-size:11px">No done tasks</span>')+
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">'+
        (groupDone._legend||'')+
      '</div>'+
    '</div>'+
  '</div>';

  var chart1row = '<div style="display:flex;gap:12px;align-items:stretch">'+chart1+chart1b+'</div>';

  var activeQs = QS.filter(function(q){ return filtered.some(function(d){ return supQuarter(d)===q; }); });

  function qgStats(g, q) {
    var items = filtered.filter(function(d){ return supGroup(d)===g && supQuarter(d)===q; });
    var d_ = items.filter(function(d){ return isDoneStatus(d.Status); }).length;
    var p_ = items.length ? Math.round(d_/items.length*100) : 0;
    return { total: items.length, done: d_, pct: p_ };
  }
  function qStats(q) {
    var items = filtered.filter(function(d){ return supQuarter(d)===q; });
    var d_ = items.filter(function(d){ return isDoneStatus(d.Status); }).length;
    var p_ = items.length ? Math.round(d_/items.length*100) : 0;
    return { total: items.length, done: d_, pct: p_ };
  }

  /* pre-compute max total for heatmap scaling */
  var _hmMax = 1;
  allGroups.forEach(function(g) {
    activeQs.forEach(function(q) {
      var n = qgStats(g,q).total; if (n > _hmMax) _hmMax = n;
    });
  });
  if (filtered.length > _hmMax) _hmMax = filtered.length;

  function hmBg(n) {
    if (!n) return '';
    var op = Math.min(0.08 + (n/_hmMax)*0.52, 0.6).toFixed(2);
    return 'background:rgba(88,166,255,'+op+')';
  }
  function doneBg(n) {
    if (!n) return '';
    var op = Math.min(0.08 + (n/_hmMax)*0.52, 0.6).toFixed(2);
    return 'background:rgba(63,185,80,'+op+')';
  }
  function pctBar(p, isTot) {
    if (p === null || p === undefined) return '<span style="color:var(--text3)">—</span>';
    var c = p>=80?'var(--up)':p>=50?'var(--amber)':'var(--down)';
    var fw = isTot ? '700' : '600';
    return '<div style="display:flex;align-items:center;gap:4px;min-width:70px">'+
      '<div style="flex:1;height:4px;background:var(--surface2);border-radius:2px;overflow:hidden;border:1px solid var(--border)">'+
        '<div style="height:100%;border-radius:2px;background:'+c+';width:'+p+'%"></div>'+
      '</div>'+
      '<span style="font-size:10px;font-weight:'+fw+';color:'+c+';white-space:nowrap;min-width:28px;text-align:right">'+p+'%</span>'+
    '</div>';
  }

  /* header row 1: quarter spans (3 cols each: Total, Done, %) */
  var hdr1 = '<tr>'+
    '<th style="text-align:left;padding:5px 10px;font-size:10px;font-weight:700;color:var(--text3)">Group</th>';
  activeQs.forEach(function(q) {
    var lbl = year !== 'All' ? q + ' ' + year + (q===currentQStr?nowTag:'') : q;
    hdr1 += '<th colspan="3" style="text-align:center;padding:5px 6px;font-size:10px;font-weight:700;color:var(--text);border-left:1px solid var(--border)">'+lbl+'</th>';
  });
  hdr1 += '<th colspan="3" style="text-align:center;padding:5px 6px;font-size:10px;font-weight:700;color:var(--text3);border-left:2px solid var(--border)">Total</th>';
  hdr1 += '</tr>';

  /* header row 2: sub-cols */
  var hdr2 = '<tr><th></th>';
  activeQs.forEach(function(q, qi) {
    var brd = 'border-left:1px solid var(--border)';
    hdr2 += '<th style="text-align:center;padding:3px 6px;font-size:10px;font-weight:600;color:var(--text2);'+brd+'">Total</th>';
    hdr2 += '<th style="text-align:center;padding:3px 6px;font-size:10px;font-weight:600;color:var(--up)">Done</th>';
    hdr2 += '<th style="text-align:center;padding:3px 8px;font-size:10px;font-weight:600;color:var(--text2);min-width:90px">%</th>';
  });
  hdr2 += '<th style="text-align:center;padding:3px 6px;font-size:10px;font-weight:600;color:var(--text2);border-left:2px solid var(--border)">Total</th>';
  hdr2 += '<th style="text-align:center;padding:3px 6px;font-size:10px;font-weight:600;color:var(--up)">Done</th>';
  hdr2 += '<th style="text-align:center;padding:3px 8px;font-size:10px;font-weight:600;color:var(--text2);min-width:90px">%</th>';
  hdr2 += '</tr>';

  /* data rows */
  var matRows = allGroups.map(function(g) {
    var r = '<tr><td style="padding:5px 10px;font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;text-align:left">'+g+'</td>';
    activeQs.forEach(function(q, qi) {
      var s = qgStats(g, q);
      var brd = 'border-left:1px solid var(--border)';
      var tbg = s.total ? hmBg(s.total) : '';
      var dbg = s.done  ? doneBg(s.done) : '';
      r += '<td style="padding:5px 6px;text-align:center;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;'+brd+';'+tbg+'">'+(s.total||'—')+'</td>';
      r += '<td style="padding:5px 6px;text-align:center;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;'+dbg+'">'+(s.done||'—')+'</td>';
      r += '<td style="padding:4px 8px">'+(s.total ? pctBar(s.pct,false) : '<span style="color:var(--text3)">—</span>')+'</td>';
    });
    var gt = filtered.filter(function(d){ return supGroup(d)===g; });
    var gd = gt.filter(function(d){ return isDoneStatus(d.Status); }).length;
    var gp = gt.length ? Math.round(gd/gt.length*100) : 0;
    r += '<td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;border-left:2px solid var(--border);'+hmBg(gt.length)+'">'+gt.length+'</td>';
    r += '<td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;'+doneBg(gd)+'">'+gd+'</td>';
    r += '<td style="padding:4px 8px">'+(gt.length ? pctBar(gp,true) : '<span style="color:var(--text3)">—</span>')+'</td>';
    r += '</tr>';
    return r;
  }).join('');

  /* total row */
  var totRow = '<tr style="border-top:2px solid var(--border);background:var(--surface2)">'+
    '<td style="padding:5px 10px;font-size:11px;font-weight:700;color:var(--text);text-align:left">Total</td>';
  activeQs.forEach(function(q) {
    var s = qStats(q);
    var brd = 'border-left:1px solid var(--border)';
    totRow += '<td style="padding:5px 6px;text-align:center;font-size:11px;font-weight:700;'+brd+'">'+s.total+'</td>';
    totRow += '<td style="padding:5px 6px;text-align:center;font-size:11px;font-weight:700;color:var(--up)">'+s.done+'</td>';
    totRow += '<td style="padding:4px 8px">'+pctBar(s.pct,true)+'</td>';
  });
  totRow += '<td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;border-left:2px solid var(--border)">'+filtered.length+'</td>';
  totRow += '<td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;color:var(--up)">'+done+'</td>';
  totRow += '<td style="padding:5px 8px;text-align:center">'+ pctBar(pct,true)+'</td>';
  totRow += '</tr>';

  var chart2 = '<div class="panel">'+
    '<div style="padding:9px 14px;border-bottom:1px solid var(--border)">'+
      '<span style="font-size:11px;font-weight:700;color:var(--text)">By Group & Quarter</span>'+
    '</div>'+
    '<div class="stbl-wrap"><table class="stbl">'+
      '<thead>'+hdr1+hdr2+'</thead>'+
      '<tbody>'+matRows+totRow+'</tbody>'+
    '</table></div>'+
  '</div>';

  /* ── Task table ── */
  var taskRows = filtered.map(function(d) {
    var mo = supMonth(d);
    var doneFl = isDoneStatus(d.Status);
    return '<tr>'+
      '<td class="col-person" style="font-family:monospace;font-size:11px">'+
        '<a href="'+SUPPORT_JIRA_BASE+(d.Key||'')+'" target="_blank" style="color:var(--teal);text-decoration:none">'+
          (d.Key||'—')+
        '</a>'+
      '</td>'+
      '<td style="text-align:left;max-width:320px">'+
        '<span style="font-size:11.5px;color:var(--text)'+(doneFl?';opacity:0.65':'')+'">'+(d.Summary||'—')+'</span>'+
      '</td>'+
      '<td>'+stTagSup(d.Status||'')+'</td>'+
      '<td style="color:var(--text3);font-size:11px">'+mo+'</td>'+
    '</tr>';
  }).join('');

  var taskPanel = '<div class="panel">'+
    '<div style="padding:9px 14px;display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none"'+
      ' onclick="var p=this.closest(\'.panel\'),b=p.querySelector(\'.sup-tl-body\'),ic=p.querySelector(\'.sup-tl-ic\'),o=b.style.display!=\'none\';b.style.display=o?\'none\':\'\';ic.textContent=o?\'▶\':\'▼\'">'+
      '<span style="font-size:11px;font-weight:700;color:var(--text)">Task List</span>'+
      '<span style="font-size:11px;color:var(--text3)">('+filtered.length+' tasks)</span>'+
      '<span class="sup-tl-ic" style="margin-left:auto;font-size:10px;color:var(--text3)">▶</span>'+
    '</div>'+
    '<div class="sup-tl-body" style="display:none">'+
      '<div class="stbl-wrap"><table class="stbl" style="min-width:400px">'+
        '<thead><tr>'+
          '<th class="col-person">Key</th>'+
          '<th style="text-align:left">Summary</th>'+
          '<th>Status</th>'+
          '<th>Due</th>'+
        '</tr></thead>'+
        '<tbody>'+taskRows+'</tbody>'+
      '</table></div>'+
    '</div>'+
  '</div>';
  el.innerHTML = kpiPanel + chart1row + chart2 + taskPanel;
}
