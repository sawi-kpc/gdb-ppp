/* ══════════════════════════════════════════════════════════════
   SUPPORT RENDER — js/support/render.js
   Depends on: js/support/config.js, js/support/data.js (loaded first)
   All rendering logic for support/index.html
   supportData global is set by data.js before init() is called.
══════════════════════════════════════════════════════════════ */

/* ── Helpers ─────────────────────────────────────────────── */
var JIRA_BASE = 'https://kingpower.atlassian.net/browse/';
function secToHours(s){ return s>0?(s/3600).toFixed(1)+'h':'—'; }
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
var activeStatus='all', activeGroup='all', searchQ='', sortCol='Key', sortAsc=true;

/* ── Build summary strip ─────────────────────────────────── */
function buildStrip(data){
  var total=data.length;
  var todo=data.filter(d=>d.Status==='To do').length;
  var inprog=data.filter(d=>d.Status==='In Progress').length;
  var totalSec=data.reduce(function(a,d){return a+d.TimeSpentSec;},0);
  var recurring=data.filter(d=>d.Group==='marketing_automation'||d.Group==='firster_tiktok_report').length;
  var overdue=data.filter(d=>isOverdue(d.Due,d.Status)).length;
  document.getElementById('strip').innerHTML=
    '<div class="sc blue"><div class="sc-label">Total Tasks</div><div class="sc-num">'+total+'</div><div class="sc-sub">Jan–Apr 2026</div></div>'+
    '<div class="sc amber"><div class="sc-label">Pending / To do</div><div class="sc-num">'+todo+'</div><div class="sc-sub">'+(overdue>0?'<span style="color:var(--down)">'+overdue+' overdue</span>':'all on track')+'</div></div>'+
    '<div class="sc blue"><div class="sc-label">In Progress</div><div class="sc-num">'+inprog+'</div><div class="sc-sub">active now</div></div>'+
    '<div class="sc teal"><div class="sc-label">Total Hours Logged</div><div class="sc-num">'+secToHours(totalSec)+'</div><div class="sc-sub">across all assignees</div></div>'+
    '<div class="sc purple"><div class="sc-label">Recurring Tasks</div><div class="sc-num">'+recurring+'</div><div class="sc-sub">→ initiative candidates</div></div>';
}

/* ── Build group bar chart ───────────────────────────────── */
function buildGroupChart(data){
  var counts={};
  data.forEach(function(d){ counts[d.Group]=(counts[d.Group]||0)+1; });
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
  var html='<thead><tr><th>Assignee</th><th style="text-align:right">Tasks</th>'+
    '<th style="text-align:right">Hours</th><th style="text-align:right">Load</th>'+
    '<th style="text-align:right">Pending</th></tr></thead><tbody>'+
    rows.map(function(r){
      var n=r[0],v=r[1];
      var barW=maxH>0?Math.round(v.sec/maxH*80):4;
      return '<tr><td style="font-weight:600">'+n+'</td>'+
        '<td>'+v.tasks+'</td>'+
        '<td style="color:var(--teal)">'+secToHours(v.sec)+'</td>'+
        '<td><div class="hbar-wrap"><div class="hbar" style="width:'+barW+'px"></div></div></td>'+
        '<td>'+(v.pending>0?'<span class="tag todo">'+v.pending+'</span>':'—')+'</td></tr>';
    }).join('')+'</tbody>';
  document.getElementById('assignee-tbl').innerHTML=html;
}

/* ── Build group filter pills ─────────────────────────────── */
function buildGroupFilter(data){
  var groups=[...new Set(data.map(function(d){return d.Group;}).filter(Boolean))].sort();
  var el=document.getElementById('group-filter');
  el.innerHTML='<button class="fb active" onclick="setFilter(\'group\',\'all\',this)">All groups</button>'+
    groups.map(function(g){
      return '<button class="fb" onclick="setFilter(\'group\',\''+g+'\',this)">'+fmtGroup(g)+'</button>';
    }).join('');
}

/* ── Build task table ────────────────────────────────────── */
function buildTaskTable(data){
  if(!data.length){
    document.getElementById('task-tbody').innerHTML='<tr><td colspan="8" class="empty">No tasks match this filter.</td></tr>';
    document.getElementById('task-count-label').textContent='0 tasks';
    return;
  }
  document.getElementById('task-count-label').textContent='Showing '+data.length+' tasks';
  var today=new Date();
  var html=data.map(function(d){
    var overdue=isOverdue(d.Due,d.Status);
    var dueHtml=d.Due
      ?(overdue?'<span style="color:var(--down);font-weight:600">'+d.Due+'</span>':d.Due)
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
      '<td style="text-align:right">'+timeHtml+'</td>'+
      '</tr>';
  }).join('');
  document.getElementById('task-tbody').innerHTML=html;
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
    var okStatus = activeStatus==='all'||d.Status===activeStatus;
    var okGroup  = activeGroup==='all'||d.Group===activeGroup;
    var q=searchQ.toLowerCase();
    var okSearch = !q||d.Key.toLowerCase().includes(q)||d.Summary.toLowerCase().includes(q)||
                   (d.Assignee||'').toLowerCase().includes(q);
    return okStatus&&okGroup&&okSearch;
  }).sort(function(a,b){
    var va=a[sortCol]||'', vb=b[sortCol]||'';
    if(sortCol==='Hours'){ va=a.TimeSpentSec; vb=b.TimeSpentSec; }
    if(va<vb) return sortAsc?-1:1;
    if(va>vb) return sortAsc?1:-1;
    return 0;
  });
}
function applyFilters(){ buildTaskTable(getFiltered()); }
function setFilter(type,val,btn){
  if(type==='status'){
    activeStatus=val;
    document.querySelectorAll('#status-filter .fb').forEach(function(b){b.classList.remove('active');});
  } else {
    activeGroup=val;
    document.querySelectorAll('#group-filter .fb').forEach(function(b){b.classList.remove('active');});
  }
  btn.classList.add('active');
  applyFilters();
}
function sortBy(col){
  if(sortCol===col) sortAsc=!sortAsc; else { sortCol=col; sortAsc=true; }
  applyFilters();
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