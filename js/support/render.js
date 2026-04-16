/* ── Date formatter ─────────────────────────────────────── */
var _MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var _FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function _fmtDate(raw) {
  if (!raw) return '—';
  var d = new Date(String(raw).trim());
  if (isNaN(d.getTime())) return raw;
  return d.getDate() + ' ' + _FULL_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

/* ══════════════════════════════════════════════════════════════
   SUPPORT RENDER — js/support/render.js
   Depends on: js/support/config.js, js/support/data.js (loaded first)
   All rendering logic for support/index.html
   supportData global is set by data.js before init() is called.
══════════════════════════════════════════════════════════════ */

/* ── Helpers ─────────────────────────────────────────────── */
var JIRA_BASE = 'https://kingpower.atlassian.net/browse/';
function secToHours(s) {
  if (!s || s <= 0) return '—';
  var totalH = s / 3600;
  var totalD = totalH / 8;   /* 8h = 1d */
  var totalW = totalD / 5;   /* 5d = 1w */
  if (totalW >= 1) {
    var w = Math.floor(totalW);
    var remD = Math.round(totalD - w * 5);
    return remD > 0 ? w + 'w ' + remD + 'd' : w + 'w';
  }
  if (totalD >= 1) {
    var d = Math.floor(totalD);
    var remH = Math.round(totalH - d * 8);
    return remH > 0 ? d + 'd ' + remH + 'h' : d + 'd';
  }
  return totalH.toFixed(1) + 'h';
}
function fmtGroup(g){ return g.replace(/_/g,' '); }
function statusTag(s){
  var cls = s==='Done'?'done':s==='In Progress'?'in-progress':'todo';
  return '<span class="tag '+cls+'">'+s+'</span>';
}
function isOverdue(due,status){
  if(!due||status==='Done') return false;
  return new Date(due)<new Date();
}

/* ── State ───────────────────────────────────────────────── */
var activeStatuses=['all'];  /* multi-select */
var _taskPage = 1;
var _taskPageSize = 20;
var activeGroups  =['all'];  /* multi-select */
var activePriority='all';
var activeLabels  =['all'];  /* multi-select */
var searchQ='', sortCol='Key', sortAsc=true;

/* ── Build summary strip ─────────────────────────────────── */
function _ssc(label,cls,num,sub){
  var colors={accent:'var(--accent)',green:'var(--up)',amber:'var(--amber)',teal:'var(--teal)',purple:'var(--purple)'};
  var c=colors[cls]||'var(--accent)';
  return '<div style="background:var(--surface);border:1px solid var(--border);border-top:2px solid '+c+
    ';border-radius:8px;padding:12px 16px"><div style="font-size:10px;font-weight:600;color:var(--text2);'+
    'text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">'+label+'</div>'+
    '<div style="font-size:24px;font-weight:700;color:'+c+';line-height:1;margin-bottom:2px">'+num+'</div>'+
    '<div style="font-size:11px;color:var(--text2)">'+sub+'</div></div>';
}
function buildStrip(data){
  var total=data.length;
  var todo=data.filter(function(d){return d.Status==='To do';}).length;
  var inprog=data.filter(function(d){return d.Status==='In Progress';}).length;
  var done=data.filter(function(d){return d.Status==='Done';}).length;
  var totalSec=data.reduce(function(a,d){return a+d.TimeSpentSec;},0);
  var recurring=data.filter(function(d){return d.Group==='marketing_automation'||d.Group==='firster_tiktok_report';}).length;
  var overdue=data.filter(function(d){return isOverdue(d.Due,d.Status);}).length;
  document.getElementById('strip').innerHTML=
    _ssc('Total Tasks','accent',total,'all statuses')+
    _ssc('Done','green',done,'completed')+
    _ssc('Pending','amber',todo,(overdue>0?'<span style="color:var(--down)">'+overdue+' overdue</span>':'on track'))+
    _ssc('In Progress','accent',inprog,'active now')+
    _ssc('Hours Logged','teal',secToHours(totalSec),'across all assignees')+
    _ssc('Recurring','purple',recurring,'→ initiative candidates');
}

/* ── Build group bar chart ───────────────────────────────── */
function buildGroupChart(data){
  var counts={};
  data.forEach(function(d){
    var g = (d.Group && d.Group.trim()) ? d.Group.trim() : 'other';
    counts[g] = (counts[g]||0) + 1;
  });
  var sorted=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
  var max=sorted[0]?sorted[0][1]:1;
  var colors={'marketing_automation':'#a78bfa','firster_tiktok_report':'#58a6ff',
    'firster_tiktok_update_stock':'#f59e0b','firster_report':'#3fb950','other':'#484f58'};
  var html=sorted.map(function(e){
    var pct=Math.round(e[1]/max*100);
    var col=colors[e[0]]||'#484f58';
    return '<div class="brow"><div class="blabel">'+fmtGroup(e[0])+'</div>'+
      '<div class="btrack"><div class="bfill" style="width:'+pct+'%;background:'+col+'">'+e[1]+'</div></div>'+
      '<div class="bcount">'+e[1]+'</div></div>';
  }).join('');
  document.getElementById('group-chart').innerHTML=html;
}

/* ── Build assignee table ────────────────────────────────── */
function buildAssigneeTable(data){
  var agg={};
  data.forEach(function(d){
    var name=d.Assignee||'(unassigned)';
    if(!agg[name]) agg[name]={tasks:0,sec:0,pending:0};
    agg[name].tasks++;
    agg[name].sec+=d.TimeSpentSec;
    if(d.Status==='To do'||d.Status==='In Progress') agg[name].pending++;
  });
  var rows=Object.entries(agg).sort(function(a,b){return b[1].tasks-a[1].tasks;});
  var maxH=Math.max.apply(null,rows.map(function(r){return r[1].sec;}));
  var html='<thead><tr><th>Assignee</th><th>Tasks</th>'+
    '<th>Hours</th><th>Load</th>'+
    '<th>Pending</th></tr></thead><tbody>'+
    rows.map(function(r){
      var n=r[0],v=r[1];
      var barW=maxH>0?Math.round(v.sec/maxH*80):4;
      return '<tr><td style="font-weight:600">'+n+'</td>'+
        '<td>'+v.tasks+'</td>'+
        '<td style="color:var(--teal)">'+secToHours(v.sec)+'</td>'+
        '<td><div style="display:flex;align-items:center;gap:6px"><div class="hbar" style="width:'+barW+'px"></div></div></td>'+
        '<td>'+(v.pending>0?'<span class="tag todo">'+v.pending+'</span>':'—')+'</td></tr>';
    }).join('')+'</tbody>';
  document.getElementById('assignee-tbl').innerHTML=html;
}

/* ── Build group filter pills ─────────────────────────────── */
function buildGroupFilter(data){
  var groups=[...new Set(data.map(function(d){
    return (d.Group && d.Group.trim()) ? d.Group.trim() : 'other';
  }))].sort();
  var el=document.getElementById('group-filter');
  el.innerHTML='<button class="fb active" data-val="all" onclick="setFilter(\'group\',\'all\',this)">All groups</button>'+
    groups.map(function(g){
      return '<button class="fb" data-val="'+g+'" onclick="setFilter(\'group\',\''+g+'\',this)">'+fmtGroup(g)+'</button>';
    }).join('');
}

function buildLabelFilter(data){
  var labels=[...new Set(
    data.flatMap(function(d){ return (d.Labels||'').split(';').map(function(l){return l.trim();}); })
        .filter(Boolean)
  )].sort();
  var el=document.getElementById('label-filter');
  if(!el) return;
  el.innerHTML='<button class="fb active" data-val="all" onclick="setFilter(\'label\',\'all\',this)">All labels</button>'+
    labels.map(function(l){
      return '<button class="fb" data-val="'+l+'" onclick="setFilter(\'label\',\''+l+'\',this)">'+l+'</button>';
    }).join('');
}

function buildPriorityDropdown(data){
  var el=document.getElementById('filter-priority');
  if(!el) return;
  var PRIORITIES=['Highest','High','Medium','Low','Lowest'];
  el.innerHTML='<option value="all">All priorities</option>'+
    PRIORITIES.map(function(p){return '<option value="'+p+'">'+p+'</option>';}).join('');
}

/* ── Build task table ────────────────────────────────────── */
function buildTaskTable(data){
  if(!data.length){
    document.getElementById('task-tbody').innerHTML='<tr><td colspan="8" class="empty">No tasks match this filter.</td></tr>';
    document.getElementById('task-count-label').textContent='0 tasks';
    return;
  }
  var totalPages = Math.max(1, Math.ceil(data.length / _taskPageSize));
  _taskPage = Math.min(_taskPage, totalPages);
  var pageData = data.slice((_taskPage-1)*_taskPageSize, _taskPage*_taskPageSize);
  document.getElementById('task-count-label').textContent=
    'Showing '+pageData.length+' of '+data.length+' tasks (page '+_taskPage+'/'+totalPages+')';
  var today=new Date();
  var html=pageData.map(function(d){
    var overdue=isOverdue(d.Due,d.Status);
    var dueHtml=d.Due
      ?(overdue?'<span style="color:var(--down);font-weight:600">'+_fmtDate(d.Due)+'</span>':_fmtDate(d.Due))
      :'—';
    var timeHtml=d.TimeSpentSec>0?'<span style="color:var(--teal)">'+secToHours(d.TimeSpentSec)+'</span>':'—';
    return '<tr>'+
      '<td><a href="'+JIRA_BASE+d.Key+'" target="_blank" style="color:var(--accent);font-weight:700;text-decoration:none;white-space:nowrap">'+d.Key+'↗</a></td>'+
      '<td style="min-width:260px;max-width:380px">'+d.Summary+'</td>'+
      '<td>'+statusTag(d.Status)+'</td>'+
      '<td><span style="font-size:11px;color:var(--text2)">'+fmtGroup(d.Group||'—')+'</span></td>'+
      '<td><span style="font-size:10px;color:var(--text3)">'+((d.Components||'').split(';')[0]||'—')+'</span></td>'+
      '<td style="font-size:11px;white-space:nowrap">'+(d.Assignee||'<span style="color:var(--down)">unassigned</span>')+'</td>'+
      '<td style="font-size:11px;white-space:nowrap">'+dueHtml+'</td>'+
      '<td>'+timeHtml+'</td>'+
      '</tr>';
  }).join('');
  document.getElementById('task-tbody').innerHTML=html;

  /* Pagination controls */
  var pgEl = document.getElementById('task-pagination');
  if (pgEl) {
    if (totalPages <= 1) { pgEl.innerHTML = ''; }
    else {
      var btns = '';
      btns += '<button class="pg-btn" onclick="_goPage(1)" '+((_taskPage===1)?'disabled':'')+'>«</button>';
      btns += '<button class="pg-btn" onclick="_goPage('+(_taskPage-1)+')" '+((_taskPage===1)?'disabled':'')+'>‹</button>';
      var start = Math.max(1, _taskPage-2), end = Math.min(totalPages, _taskPage+2);
      for (var pi=start;pi<=end;pi++) {
        btns += '<button class="pg-btn'+(pi===_taskPage?' active':'')+'" onclick="_goPage('+pi+')">'+pi+'</button>';
      }
      btns += '<button class="pg-btn" onclick="_goPage('+(_taskPage+1)+')" '+((_taskPage===totalPages)?'disabled':'')+'>›</button>';
      btns += '<button class="pg-btn" onclick="_goPage('+totalPages+')" '+((_taskPage===totalPages)?'disabled':'')+'>»</button>';
      pgEl.innerHTML = btns;
    }
  }
}

/* ── Patterns analysis (dynamic) ───────────────────────────── */
function buildPatterns(data){
  var groups={};
  data.forEach(function(d){
    if(!groups[d.Group]) groups[d.Group]={count:0,sec:0,assignees:new Set()};
    groups[d.Group].count++;
    groups[d.Group].sec+=d.TimeSpentSec;
    if(d.Assignee) groups[d.Group].assignees.add(d.Assignee);
  });
  var html='';
  Object.entries(groups).sort(function(a,b){return b[1].count-a[1].count;}).forEach(function(e){
    var g=e[0],v=e[1];
    if(v.count<3) return;
    var isSingle=v.assignees.size===1;
    var hrs=(v.sec/3600).toFixed(1);
    var priority=v.count>=15?'high':'med';
    var icon=g.includes('marketing')?'⚙':g.includes('tiktok')?'📊':'📋';
    var pppHint=g==='marketing_automation'?'→ SFMC Journey automation':
                g==='firster_tiktok_report'?'→ Accelerate PPP-2 (TikTok F&A Report)':
                g==='firster_tiktok_update_stock'?'→ Automate stock sync process':'→ Review process';
    html+='<div class="pcard '+priority+'">'+
      '<div class="pcard-icon">'+icon+'</div>'+
      '<div style="flex:1">'+
        '<div class="pcard-title">'+fmtGroup(g)+
          ' — '+v.count+' tasks'+
          (isSingle?'<span class="tag ppp">Single assignee risk</span>':'')+
          '<span class="tag"style="background:rgba(88,166,255,.1);color:var(--accent);border:1px solid rgba(88,166,255,.2)">'+(priority==='high'?'High':'Medium')+' priority</span>'+
        '</div>'+
        '<div class="pcard-desc">'+v.count+' recurring tasks logged. '+
          (hrs>0?'<strong>'+hrs+'h</strong> manual time spent. ':'')+
          (isSingle?'All assigned to single person — single point of failure. ':'')+
          pppHint+
        '</div>'+
        '<div class="pcard-meta">'+
          '<div class="pm">Tasks: <strong>'+v.count+'</strong></div>'+
          '<div class="pm">Hours: <strong>'+(hrs>0?hrs+'h':'—')+'</strong></div>'+
          '<div class="pm">Assignees: <strong>'+[...v.assignees].join(', ')+'</strong></div>'+
        '</div>'+
      '</div>'+
    '</div>';
  });
  document.getElementById('patterns').innerHTML=html||'<div class="empty">No recurring patterns detected.</div>';
}

/* ── Filter + sort pipeline ──────────────────────────────── */
function getFiltered(){
  return supportData.filter(function(d){
    var _g = (d.Group && d.Group.trim()) ? d.Group.trim() : 'other';
    var okStatus  = activeStatuses.indexOf('all')!=-1 || activeStatuses.indexOf(d.Status)!=-1;
    var okGroup   = activeGroups.indexOf('all')!=-1   || activeGroups.indexOf(_g)!=-1;
    var okPriority= activePriority==='all'            || d.Priority===activePriority;
    var okLabels  = activeLabels.indexOf('all')!=-1   || activeLabels.some(function(l){
                      return (d.Labels||'').split(';').map(function(x){return x.trim();}).indexOf(l)!=-1;
                    });
    var q=searchQ.toLowerCase();
    var okSearch = !q||d.Key.toLowerCase().includes(q)||d.Summary.toLowerCase().includes(q)||
                   (d.Assignee||'').toLowerCase().includes(q);
    return okStatus&&okGroup&&okPriority&&okLabels&&okSearch;
  }).sort(function(a,b){
    var va=a[sortCol]||'', vb=b[sortCol]||'';
    if(sortCol==='Hours'){ va=a.TimeSpentSec; vb=b.TimeSpentSec; }
    if(va<vb) return sortAsc?-1:1;
    if(va>vb) return sortAsc?1:-1;
    return 0;
  });
}
function applyFilters(){
  _taskPage = 1; /* reset to page 1 on filter change */
  var filtered = getFiltered();
  buildTaskTable(filtered);
  buildSupportTrendChart(filtered);
}
function _toggleMulti(arr, val, filterId) {
  if (val === 'all') {
    /* reset to all */
    document.querySelectorAll('#'+filterId+' .fb').forEach(function(b){b.classList.remove('active');});
    document.querySelector('#'+filterId+' .fb[data-val="all"]').classList.add('active');
    return ['all'];
  }
  var idx = arr.indexOf('all');
  if (idx !== -1) arr.splice(idx, 1);
  var vi = arr.indexOf(val);
  if (vi !== -1) { arr.splice(vi, 1); }
  else           { arr.push(val); }
  if (arr.length === 0) {
    document.querySelectorAll('#'+filterId+' .fb').forEach(function(b){b.classList.remove('active');});
    document.querySelector('#'+filterId+' .fb[data-val="all"]').classList.add('active');
    return ['all'];
  }
  return arr;
}
function setFilter(type, val, btn) {
  if (type === 'status') {
    if (val === 'all') { activeStatuses = ['all']; document.querySelectorAll('#status-filter .fb').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); }
    else {
      activeStatuses = _toggleMulti(activeStatuses, val, 'status-filter');
      if (activeStatuses.indexOf(val) !== -1) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  } else if (type === 'group') {
    if (val === 'all') { activeGroups = ['all']; document.querySelectorAll('#group-filter .fb').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); }
    else {
      activeGroups = _toggleMulti(activeGroups, val, 'group-filter');
      if (activeGroups.indexOf(val) !== -1) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  } else if (type === 'label') {
    if (val === 'all') { activeLabels = ['all']; document.querySelectorAll('#label-filter .fb').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); }
    else {
      activeLabels = _toggleMulti(activeLabels, val, 'label-filter');
      if (activeLabels.indexOf(val) !== -1) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }
  applyFilters();
}
function sortBy(col){
  if(sortCol===col) sortAsc=!sortAsc; else { sortCol=col; sortAsc=true; }
  applyFilters();
}

/* ══════════════════════════════════════════════════════════════
   SUPPORT TREND CHART — Task volume by Week / Month
   Stacked: To do + In Progress + Done
══════════════════════════════════════════════════════════════ */
var _supTrendPeriod = 'month';
var _supTrendChart  = null;

function buildSupportTrendChart(data) {
  var el = document.getElementById('support-trend-chart');
  if (!el) return;

  /* Parse GDB_SUPPORT_yyyyMM label → period key */
  function _labelToKey(raw) {
    if (!raw) return null;
    var parts = String(raw).split(';');
    /* Use first label that matches GDB_SUPPORT_yyyyMM pattern */
    for (var i=0;i<parts.length;i++) {
      var m = parts[i].trim().match(/GDB_SUPPORT_(\d{4})(\d{2})/);
      if (m) return m[1] + '-' + m[2]; /* "2026-01" */
    }
    return null;
  }

  var created = {}, done = {};
  data.forEach(function(d) {
    var ck = _labelToKey(d.Labels);
    if (ck) created[ck] = (created[ck]||0) + 1;
    if (d.Status === 'Done') {
      var dk = ck || _labelToKey(d.Labels);
      if (dk) done[dk] = (done[dk]||0) + 1;
    }
  });

  var allKeys = [...new Set([...Object.keys(created),...Object.keys(done)])].sort();
  if (!allKeys.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">No date data available</div>';
    return;
  }

  function _label(k) {
    if (_supTrendPeriod === 'week') return k;
    var p = k.split('-');
    return _MONTHS[parseInt(p[1])-1]+' '+p[0];
  }

  if (_supTrendChart) { _supTrendChart.destroy(); _supTrendChart = null; }
  var canvas = document.getElementById('support-trend-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';

  var cCreated = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#58a6ff';
  var cDone    = getComputedStyle(document.documentElement).getPropertyValue('--up').trim()||'#3fb950';
  var cText    = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim()||'#8b949e';
  var cGrid    = getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#30363d';

  _supTrendChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: allKeys.map(_label),
      datasets: [
        { label: 'Done', data: allKeys.map(function(k){return done[k]||0;}),
          backgroundColor: cDone+'cc', borderColor: cDone, borderWidth:1, borderRadius:0,
          stack: 'stack0' },
        { label: 'Open / Pending', data: allKeys.map(function(k){return Math.max(0,(created[k]||0)-(done[k]||0));}),
          backgroundColor: cCreated+'cc', borderColor: cCreated, borderWidth:1, borderRadius:3,
          stack: 'stack0' },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { labels: { color:cText, font:{size:11} } },
        tooltip: { mode:'index', intersect:false }
      },
      scales: {
        x: { ticks:{color:cText,font:{size:10},maxRotation:45}, grid:{color:cGrid+'44'},
             stacked:true },
        y: { ticks:{color:cText,font:{size:11},stepSize:1}, grid:{color:cGrid+'44'},
             beginAtZero:true, stacked:true,
             title:{display:true,text:'Tasks',color:cText,font:{size:11}} }
      }
    }
  });
}

function setSupportTrendPeriod(period, btn) {
  _supTrendPeriod = period;
  document.querySelectorAll('.sup-trend-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  buildSupportTrendChart(getFiltered());
}

/* ── Init ───────────────────────────────────────────────── */
function init(){
  document.getElementById('last-updated').textContent=
    'Last updated: '+new Date().toLocaleString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  buildStrip(supportData);
  buildGroupChart(supportData);
  buildAssigneeTable(supportData);
  buildGroupFilter(supportData);
  buildTaskTable(getFiltered());
  buildPatterns(supportData);
}
function onDropdownChange() {
  activePriority = document.getElementById('filter-priority') ? document.getElementById('filter-priority').value : 'all';
  applyFilters();
}

function _goPage(n) {
  _taskPage = n;
  buildTaskTable(getFiltered());
}
