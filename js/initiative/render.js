/* ══════════════════════════════════════════════
   RENDERING — UI, charts, timeline, filters
   Depends on: config.js  (must load first)
══════════════════════════════════════════════ */

var charts={};
var sumYearFilter=['ROADMAP_2026'],initYearFilter=['all'],showNoYear=false,sumStageFilter=[],hideNoDate=false,sumSearchQuery='';
var listYearFilter=['ROADMAP_2026'];
var listAssigneeFilter='all';
var listSearchQuery='';
var listRoadmapFilter=[];
var sumComponentFilter=[];
var listComponentFilter='all';
var doneComponentFilter='all';

var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var FULL_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
var STAGES=['Parking Lot','Budget Approval','Discovery','Ready for Delivery','Delivery','Done'];
var SC={'Parking Lot':'#9E9890','Budget Approval':'#E07878','Discovery':'#D4A850','Ready for Delivery':'#9B8FE0','Delivery':'#6BAED4','Done':'#6DBF9A'};
var RC={'New':'#6BAED4','Next':'#D4A850','Now':'#82B8D8','Completed':'#88C470','Completed With':'#6DBF9A'};
var GC={'Increase Revenue':'#88C470','Improve Internal Operation':'#6BAED4','Improve Customer Experience':'#9B8FE0','Improve Customer Engagement':'#D97890','Strategic Direction':'#D4A850'};
var TC={'Strategic':'#9B8FE0','BAU':'#6BAED4'};
var AC=['#6BAED4','#6DBF9A','#D4A850','#9B8FE0','#E07878','#88C470','#D97890','#D4B85A','#9E9890'];
var allData=[];

function switchTab(i){
  /* tab-btn: 0=Summary, 1=Initiatives(wrap+dropdown), 2=Issues, 3=Support */
  /* i: 0=Summary, 1=Initiatives, 2=List(sub), 3=Completed(sub), 4=Issues, 5=Support */
  var mainIdx=i===0?0:(i===1||i===2||i===3)?1:i-2;
  document.querySelectorAll('.tab-btn').forEach(function(b,j){b.classList.toggle('active',j===mainIdx);});
  document.querySelectorAll('.tab-dropdown-menu button').forEach(function(b,j){
    b.classList.toggle('active',(i===2&&j===0)||(i===3&&j===1));
  });
  document.querySelectorAll('.tab-content').forEach(function(t,j){t.classList.toggle('active',j===i);});
  if(i===2)renderList();
  if(i===3)renderCompleted();
}
function getJ(r){try{return JSON.parse(r)}catch(e){return null}}
function getStart(r){var p=getJ(r);return p?(p.start||null):(r&&/\d{4}-\d{2}-\d{2}/.test(r)?r.match(/(\d{4}-\d{2}-\d{2})/)[1]:null)}
function getEnd(r){var p=getJ(r);return p?(p.end||null):(r&&/\d{4}-\d{2}-\d{2}/.test(r)?r.match(/(\d{4}-\d{2}-\d{2})/)[1]:null)}
function fmtDate(d){
  if(!d)return'—';
  if(d.startsWith('{'))try{var o=JSON.parse(d);d=o.start||d;}catch(e){}
  var dt=new Date(d);
  if(isNaN(dt.getTime())){var p=d.split('-');return p.length>=3?parseInt(p[2])+' '+FULL_MONTHS[+p[1]-1]+' '+p[0]:'—';}
  return dt.getDate()+' '+FULL_MONTHS[dt.getMonth()]+' '+dt.getFullYear();
}
/* fmtMonYear: short format "Oct 2025" — for timeline target/actual dates */
function fmtMonYear(d){
  if(!d)return'—';
  if(d.startsWith('{'))try{var o=JSON.parse(d);d=o.start||d;}catch(e){}
  var dt=new Date(d);
  if(isNaN(dt.getTime())){var p=d.split('-');return p.length>=2?MONTHS[+p[1]-1]+' '+p[0]:'—';}
  return MONTHS[dt.getMonth()]+' '+dt.getFullYear();
}
function cl(v){return String(v||'').replace(/^"|"$/g,'').trim()}
function jiraLink(k){return '<a class="jira-link" href="'+CONFIG.JIRA_BASE+k+'" target="_blank">'+k+' ↗</a>';}
function monBadge(v){if(!v)return'<span style="color:var(--text3);font-size:10px">—</span>';var d=v.toLowerCase();if(d.includes('track'))return'<span class="mon-badge mon-ontrack">✅ On track</span>';if(d.includes('risk'))return'<span class="mon-badge mon-atrisk">⚠️ At risk</span>';if(d.includes('delay'))return'<span class="mon-badge mon-delayed">🆘 Delayed</span>';return'<span style="font-size:10px;color:var(--text2)">'+v+'</span>';}
function monEmoji(v){if(!v)return'';var d=v.toLowerCase();if(d.includes('delay'))return'🆘 ';if(d.includes('risk'))return'⚠️ ';if(d.includes('track'))return'✅ ';return'';}
function sPill(v){var m={'Parking Lot':'parking','Budget Approval':'budget','Discovery':'discovery','Ready for Delivery':'rfd','Delivery':'delivery','Done':'done'};var c=m[v]||'';return c?'<span class="pill p-'+c+'">'+v+'</span>':'<span style="font-size:10px;color:var(--text2)">'+(v||'—')+'</span>';}
function countBy(arr,key){return arr.reduce(function(a,d){var v=d[key]||'(none)';a[v]=(a[v]||0)+1;return a},{});}

/* Year filter */
function getYears(){var s=new Set();allData.forEach(function(d){(d['Roadmap Year Plan']||'').split(';').forEach(function(y){if(y.trim())s.add(y.trim());});});return['all'].concat(Array.from(s).sort());}
function renderYF(id,arr,cb){var _el=document.getElementById(id);if(!_el)return;_el.innerHTML=getYears().map(function(y){return'<button class="fb-btn '+(arr.includes(y)?'active':'')+'" onclick="('+cb.toString()+')(this,\''+y+'\')">'+( y==='all'?'All years':y.replace('ROADMAP_',''))+'</button>';}).join('');}
function toggleYF(arr,val){if(val==='all')return['all'];var w=arr.filter(function(x){return x!=='all';});var i=w.indexOf(val);if(i>=0){w.splice(i,1);return w.length===0?['all']:w;}return w.concat([val]);}
function filterYear(data,arr){if(arr.includes('all'))return data;return data.filter(function(d){var ys=(d['Roadmap Year Plan']||'').split(';').map(function(x){return x.trim();});return arr.some(function(y){return ys.includes(y);});});}
function filterNoYear(data){return data.filter(function(d){return!(d['Roadmap Year Plan']||'').trim();});}
function toggleNoYear(btn){showNoYear=!showNoYear;btn.classList.toggle('active',showNoYear);renderInitiatives();}
function toggleHideNoDate(btn){hideNoDate=!hideNoDate;btn.classList.toggle('active',hideNoDate);renderSummary();}

/* Metrics */
function buildMetrics(data,id){
  var dv=data.filter(function(d){return d.Status==='Delivery';}).length;
  var dl=data.filter(function(d){return(d['Project Monitoring Status']||'').toLowerCase().includes('delay');}).length;
  var ar=data.filter(function(d){return(d['Project Monitoring Status']||'').toLowerCase().includes('risk');}).length;
  var pl=data.filter(function(d){return d.Status==='Discovery'||d.Status==='Ready for Delivery';}).length;
  var bg=data.filter(function(d){return d.Status==='Budget Approval';}).length;
  var dn=data.filter(function(d){return d.Status==='Done';}).length;
  var pk=data.filter(function(d){return d.Status==='Parking Lot';}).length;
  var el=document.getElementById(id);
  if(!el)return;
  el.innerHTML=[
    {l:'Total',v:data.length,s:'All initiatives',cls:'m-total'},
    {l:'Active delivery',v:dv,s:'In delivery now',cls:'m-info'},
    {l:'Needs attention',v:dl+ar,s:'Delayed or at risk',cls:'m-danger'},
    {l:'In pipeline',v:pl,s:'Discovery / RFD',cls:'m-purple'},
    {l:'Budget approval',v:bg,s:'Awaiting decision',cls:'m-danger'},
    {l:'Completed',v:dn,s:'Done this cycle',cls:'m-green'},
    {l:'Parking lot',v:pk,s:'Backlog / not planned',cls:'m-gray'},
  ].map(function(m){return'<div class="m-card '+m.cls+'"><div class="m-label">'+m.l+'</div><div class="m-value">'+m.v+'</div><div class="m-sub">'+m.s+'</div></div>';}).join('');
}

/* Timeline selects */
function populateRangeSelects(){
  var ss=document.getElementById('tl-start'),se=document.getElementById('tl-end');
  if(!ss||!se)return;
  if(ss.options.length>0)return;
  CONFIG.TIMELINE_RANGE_OPTIONS.forEach(function(o){
    ss.appendChild(Object.assign(document.createElement('option'),{value:o.val,textContent:o.label}));
    se.appendChild(Object.assign(document.createElement('option'),{value:o.val,textContent:o.label}));
  });
  var yr=new Date().getFullYear(),defS=yr+'-01',defE=yr+'-12';
  var sOpts=Array.from(ss.options).map(function(o){return o.value;});
  ss.value=sOpts.includes(defS)?defS:(sOpts.find(function(v){return v>=defS;})||sOpts[0]);
  var eOpts=Array.from(se.options).map(function(o){return o.value;});
  var eM=eOpts.filter(function(v){return v<=defE;});
  se.value=eM.length?eM[eM.length-1]:eOpts[eOpts.length-1];
}

/* Timeline render */
function renderTimeline(data){
  populateRangeSelects();
  var tlStartEl=document.getElementById('tl-start');
  var tlEndEl=document.getElementById('tl-end');
  if(!tlStartEl||!tlEndEl)return;
  var ss=tlStartEl.value,se=tlEndEl.value;
  var syArr=ss.split('-').map(Number),eyArr=se.split('-').map(Number);
  var sy=syArr[0],sm=syArr[1],ey=eyArr[0],em=eyArr[1];
  var START=new Date(sy,sm-1,1),END=new Date(ey,em,0,23,59,59),totalMs=END-START,today=new Date();
  var tlData=hideNoDate?data.filter(function(d){return getStart(d['Target Project Start']||'')||getStart(d['Actual Project Start']||'');}):data;
  tlData=tlData.slice().sort(function(a,b){var as=getStart(a['Target Project Start']||''),bs=getStart(b['Target Project Start']||'');if(!as&&!bs)return 0;if(!as)return 1;if(!bs)return-1;return new Date(as)-new Date(bs);});
  var mCols=[];var cy=sy,cm=sm-1;
  while(new Date(cy,cm,1)<=END){mCols.push({year:cy,month:cm});cm++;if(cm>11){cm=0;cy++;}}
  var nM=mCols.length;
  var qtrs=[];var cur=null;
  mCols.forEach(function(mc){var ql='Q'+(Math.floor(mc.month/3)+1)+' '+mc.year;if(!cur||cur.label!==ql){if(cur)qtrs.push(cur);cur={label:ql,count:1};}else cur.count++;});
  if(cur)qtrs.push(cur);
  function pct(ds){if(!ds)return null;var d=new Date(ds);if(d<START)return 0;if(d>END)return 100;return((d-START)/totalMs*100);}
  function wPct(s,e){var ds=new Date(s),de=new Date(e),cs=Math.max(ds,START),ce=Math.min(de,END);if(ce<=cs)return 0.8;return((ce-cs)/totalMs*100);}
  var todayP=pct(today.toISOString().slice(0,10));
  var _tb=document.getElementById('today-badge');
  if(_tb)_tb.textContent='Today: '+today.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var todayMonIdx=mCols.findIndex(function(mc){return mc.year===today.getFullYear()&&mc.month===today.getMonth();});
  var todayColBg=todayMonIdx>=0?'<div class="tl-col-bg" style="left:'+(todayMonIdx/nM*100).toFixed(2)+'%;width:'+(100/nM).toFixed(2)+'%"></div>':'';
  var qtrHtml=qtrs.map(function(q){return'<div class="tl-qtr" style="flex:'+q.count+'">'+q.label+'</div>';}).join('');
  var monHtml=mCols.map(function(mc){return'<div class="tl-month-cell'+(today.getFullYear()===mc.year&&today.getMonth()===mc.month?' cur-month':'')+'">'+MONTHS[mc.month]+'</div>';}).join('');
  var rowsHtml=tlData.map(function(d){
    var mon=d['Project Monitoring Status']||'';
    var isD=mon.toLowerCase().includes('delay'),isR=mon.toLowerCase().includes('risk'),isT=mon.toLowerCase().includes('track');
    var rowCls=isD?'row-delayed':isR?'row-atrisk':isT?'row-ontrack':'';
    var tS=getStart(d['Target Project Start']||''),tE=getEnd(d['Target Project End']||'');
    var aS=getStart(d['Actual Project Start']||''),aE=getEnd(d['Actual Project End']||'');
    var hasPlan=tS&&tE,hasActual=!!aS;
    var planBar=hasPlan?'<div class="tl-bar tl-bar-plan" style="left:'+pct(tS).toFixed(2)+'%;width:'+wPct(tS,tE).toFixed(2)+'%"></div>':'';
    var actBar=hasActual?'<div class="tl-bar '+(isD?'tl-bar-actual-del':'tl-bar-actual-ok')+'" style="left:'+pct(aS).toFixed(2)+'%;width:'+(aE?wPct(aS,aE).toFixed(2):Math.max(.5,((Math.min(today,END)-new Date(aS))/totalMs*100)).toFixed(2))+'%"></div>':'';
    var tLine=(tS||tE)?'<span><span style="color:var(--accent);font-weight:600;min-width:40px;display:inline-block">Target</span>'+fmtMonYear(tS)+' → '+fmtMonYear(tE)+'</span>':'';
    var aLine=(aS||aE)?'<span><span style="color:'+(isD?'#E24B4A':'#1D9E75')+';font-weight:600;min-width:40px;display:inline-block">Actual</span>'+fmtMonYear(aS)+' → '+(aE?fmtMonYear(aE):'In progress')+'</span>':'';
    var dLine=(tLine||aLine)?'<div class="tl-date-line">'+[tLine,aLine].filter(Boolean).join('<br>')+'</div>':'';
    var emoji=mon?(isD?'🆘 ':isR?'⚠️ ':isT?'✅ ':''):'';
    return'<div class="tl-row '+rowCls+'"><div class="tl-label"><div class="tl-key-line">'+jiraLink(d.Key)+'</div><div class="tl-name" title="'+d.Summary+'">'+emoji+d.Summary+'</div>'+dLine+'</div><div class="tl-track">'+todayColBg+(todayP!==null?'<div class="tl-today-v" style="left:'+todayP.toFixed(2)+'%"><div class="tl-today-dot-v"></div></div>':'')+' '+(hasPlan||hasActual?planBar+actBar:'<div class="tl-no-date">No date set</div>')+'</div><div class="tl-status-col">'+(mon?monBadge(mon):sPill(d.Status))+'</div></div>';
  }).join('');
  var tlInner=document.getElementById('tl-inner');
  if(tlInner)tlInner.innerHTML='<div class="tl-header"><div class="tl-label-head"></div><div class="tl-grid-head"><div class="tl-qtr-row">'+qtrHtml+'</div><div class="tl-month-row">'+monHtml+'</div></div><div class="tl-status-head"></div></div>'+rowsHtml;
}

/* Charts */
function _chartTextColor(){return getComputedStyle(document.documentElement).getPropertyValue('--text2').trim()||'#8b949e';}
function mkVBar(id,labels,data,colors){
  if(charts[id])charts[id].destroy();
  var ctx=document.getElementById(id);if(!ctx)return;
  var total=data.reduce(function(a,b){return a+b;},0);
  var tc=_chartTextColor();
  charts[id]=new Chart(ctx,{type:'bar',data:{labels:labels,datasets:[{data:data,backgroundColor:colors,borderWidth:0,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10},autoSkip:false,maxRotation:35}},y:{display:false,beginAtZero:true}},
      animation:{onComplete:function(){var ch=this,c2=ch.ctx;c2.font='bold 10px Arial';c2.textAlign='center';c2.textBaseline='bottom';
        ch.data.datasets.forEach(function(ds,di){ds.data.forEach(function(v,bi){var bar=ch.getDatasetMeta(di).data[bi];var pct=total>0?Math.round(v/total*100):0;c2.fillStyle=tc;c2.fillText(v+' ('+pct+'%)',bar.x,bar.y-3);});});}}}});
}
function mkHBar(id,wrapId,labels,data,colors){
  if(charts[id])charts[id].destroy();
  var ctx=document.getElementById(id);if(!ctx)return;
  var wrap=document.getElementById(wrapId)||ctx.parentElement;
  wrap.style.height=Math.max(100,labels.length*30+50)+'px';
  var total=data.reduce(function(a,b){return a+b;},0);
  var tc=_chartTextColor();
  charts[id]=new Chart(ctx,{type:'bar',data:{labels:labels,datasets:[{data:data,backgroundColor:colors,borderWidth:0,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:65}},
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{display:false,beginAtZero:true},y:{grid:{display:false},ticks:{color:tc,font:{size:10}}}},
      animation:{onComplete:function(){var ch=this,c2=ch.ctx;c2.font='bold 10px Arial';c2.textAlign='left';c2.textBaseline='middle';
        ch.data.datasets.forEach(function(ds,di){ds.data.forEach(function(v,bi){var bar=ch.getDatasetMeta(di).data[bi];var pct=total>0?Math.round(v/total*100):0;c2.fillStyle=tc;c2.fillText(v+' ('+pct+'%)',bar.x+5,bar.y);});});}}}});
}
function mkDoughnut(id,labels,data,colors){
  GDB.doughnutChart({id:id,labels:labels,data:data,colors:colors,chartStore:charts});
}

/* buildStatusChart — renders the lifecycle status bar chart into #c-status */
function buildStatusChart(data){
  var sL=STAGES.filter(function(s){return data.some(function(d){return d.Status===s;});});
  mkVBar('c-status',sL,sL.map(function(s){return data.filter(function(d){return d.Status===s;}).length;}),sL.map(function(s){return SC[s];}));
}

/* buildAssigneeChart — primary assignee horizontal bar (kept for backward compat) */
function buildAssigneeChart(data){
  var a1={};
  data.forEach(function(d){var n=(d['Assignee']&&d['Assignee'].displayName||d['Assignee.displayName']||'').trim().split(' ')[0];if(n&&n!=='[no'&&n.length>1)a1[n]=(a1[n]||0)+1;});
  var a1K=Object.keys(a1).sort(function(a,b){return a1[b]-a1[a];});
  mkHBar('c-a1','c-a1-wrap',a1K,a1K.map(function(k){return a1[k];}),a1K.map(function(_,i){return AC[i%AC.length];}));
}

/* buildAssignee2Chart — 2nd assignee horizontal bar (kept for backward compat) */
function buildAssignee2Chart(data){
  var a2={};
  data.forEach(function(d){var n=(d['Assignee (2nd)']&&d['Assignee (2nd)'].displayName||d['Assignee (2nd).displayName']||'').trim().split(' ')[0];if(n&&n!=='[no'&&n.length>1)a2[n]=(a2[n]||0)+1;});
  var a2K=Object.keys(a2).sort(function(a,b){return a2[b]-a2[a];});
  mkHBar('c-a2','c-a2-wrap',a2K,a2K.map(function(k){return a2[k];}),a2K.map(function(_,i){return AC[i%AC.length];}));
}

/* buildAttention — renders the attention alerts section */
function buildAttention(filtered){
  var dl=filtered.filter(function(d){return(d['Project Monitoring Status']||'').toLowerCase().includes('delay');});
  var ar=filtered.filter(function(d){return(d['Project Monitoring Status']||'').toLowerCase().includes('risk');});
  var bg=filtered.filter(function(d){return d.Status==='Budget Approval';});
  var rd=filtered.filter(function(d){return d.Status==='Ready for Delivery';});
  var _rawAlerts=dl.map(function(d){return{t:'danger',key:d.Key,txt:'<strong>'+d.Summary+'</strong> — Delayed. Provide revised plan &amp; mitigation.'};})
    .concat(ar.map(function(d){return{t:'warn',key:d.Key,txt:'<strong>'+d.Summary+'</strong> — At risk. Identify blockers.'}}))
    .concat(bg.map(function(d){return{t:'info',key:d.Key,txt:'<strong>'+d.Summary+'</strong> — Pending budget approval.'}}))
    .concat(rd.map(function(d){return{t:'info',key:d.Key,txt:'<strong>'+d.Summary+'</strong> — Ready for Delivery. Confirm sprint kick-off.'}}));
  var _seen=new Set();
  var alerts=_rawAlerts.filter(function(a){if(_seen.has(a.key))return false;_seen.add(a.key);return true;});
  var el=document.getElementById('init-alerts');
  if(!el)return;
  el.innerHTML=alerts.length?alerts.map(function(a){return'<div class="alert-item '+a.t+'"><span style="font-weight:700;font-size:10px;color:'+(a.t==='danger'?'#A32D2D':a.t==='warn'?'#633806':'#0C447C')+';min-width:48px">'+jiraLink(a.key)+'</span><span style="font-size:11.5px;color:var(--text)">'+a.txt+'</span></div>';}).join(''):'<div style="color:var(--text3);font-size:12px;padding:4px 0">No items requiring attention.</div>';
}

/* ── Component filter helpers ─────────────────────────────── */
function _buildCompSelect(elId, data, curVal) {
  var opts = new Set();
  data.forEach(function(d) {
    (d['Components'] || '').split(';').forEach(function(c) {
      var t = c.trim(); if (t) opts.add(t);
    });
  });
  var sel = document.getElementById(elId); if (!sel) return;
  sel.innerHTML = '<option value="all">All components</option>' +
    Array.from(opts).sort().map(function(c) {
      return '<option value="' + c + '"' + (curVal === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
  sel.value = curVal;
}

function _filterComp(data, val) {
  if (!val || val === 'all') return data;
  return data.filter(function(d) {
    return (d['Components'] || '').split(';').map(function(c) { return c.trim(); }).indexOf(val) >= 0;
  });
}

/* Render summary */
function _buildCheckDropdown(wrapperId, btnLabelId, panelId, listId, values, activeArr, colorMap, toggleFn, clearFn) {
  var listEl = document.getElementById(listId); if (!listEl) return;
  listEl.innerHTML = values.map(function(v) {
    var checked = activeArr.indexOf(v) >= 0;
    var dot = (colorMap && colorMap[v])
      ? '<span style="width:8px;height:8px;border-radius:50%;background:'+colorMap[v]+';display:inline-block;flex-shrink:0"></span>'
      : '';
    return '<label style="display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:12px;color:var(--text)" '+
      'onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'">'+
      '<input type="checkbox"'+(checked?' checked':'')+' onchange="'+toggleFn+'(\''+v+'\')" style="accent-color:var(--accent);width:13px;height:13px;flex-shrink:0">'+
      dot+'<span>'+v+'</span></label>';
  }).join('');
  /* button label */
  var btnLabel = document.getElementById(btnLabelId);
  if (btnLabel) btnLabel.textContent = activeArr.length === 0 ? btnLabel.dataset.empty||'All' : activeArr.length === 1 ? activeArr[0] : activeArr.length+' selected';
  var btn = document.getElementById(wrapperId) && document.getElementById(wrapperId).querySelector('button');
  if (btn) btn.style.borderColor = activeArr.length > 0 ? 'var(--accent)' : 'var(--border)';
}

function renderSummary(){
  var filtered=filterYear(allData,sumYearFilter);
  renderYF('yf-sum',sumYearFilter,function(btn,val){sumYearFilter=toggleYF(sumYearFilter,val);renderSummary();});

  /* Stage dropdown */
  _buildCheckDropdown('stage-dropdown-wrap','stage-btn-label','stage-dropdown-panel','stage-checkbox-list',
    STAGES, sumStageFilter, SC, 'onSumStageToggle', 'clearSumStageFilter');

  /* Component dropdown */
  var compVals=[];
  allData.forEach(function(d){
    (d['Components']||'').split(';').forEach(function(c){ var t=c.trim(); if(t&&compVals.indexOf(t)<0)compVals.push(t); });
  });
  compVals.sort();
  _buildCheckDropdown('comp-dropdown-wrap','comp-btn-label','comp-dropdown-panel','comp-checkbox-list',
    compVals, sumComponentFilter, null, 'onSumCompToggle', 'clearSumCompFilter');

  /* Sync search box */
  var sumSearchEl=document.getElementById('sum-search');
  if(sumSearchEl&&sumSearchEl.value!==sumSearchQuery)sumSearchEl.value=sumSearchQuery;

  /* Apply filters */
  if(sumStageFilter.length>0) filtered=filtered.filter(function(d){return sumStageFilter.indexOf(d.Status)>=0;});
  if(sumComponentFilter.length>0){
    filtered=filtered.filter(function(d){
      var comps=(d['Components']||'').split(';').map(function(c){return c.trim();});
      return sumComponentFilter.some(function(f){return comps.indexOf(f)>=0;});
    });
  }
  if(sumSearchQuery.trim()){
    var q=sumSearchQuery.trim().toLowerCase();
    filtered=filtered.filter(function(d){return(d.Summary||'').toLowerCase().indexOf(q)>=0;});
  }

  buildMetrics(filtered,'sum-metrics');
  renderTimeline(filtered);
}

function onSumSearchChange(val){ sumSearchQuery=val||''; renderSummary(); }

function onSumStageToggle(val){
  var idx=sumStageFilter.indexOf(val);
  if(idx>=0)sumStageFilter.splice(idx,1); else sumStageFilter.push(val);
  renderSummary();
  var panel=document.getElementById('stage-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearSumStageFilter(){ sumStageFilter=[]; document.getElementById('stage-dropdown-panel').style.display='none'; renderSummary(); }

function onSumCompToggle(val){
  var idx=sumComponentFilter.indexOf(val);
  if(idx>=0)sumComponentFilter.splice(idx,1); else sumComponentFilter.push(val);
  renderSummary();
  var panel=document.getElementById('comp-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearSumCompFilter(){ sumComponentFilter=[]; document.getElementById('comp-dropdown-panel').style.display='none'; renderSummary(); }

/* ── Done initiatives list ────────────────── */
var doneYearFilter=['all'];
var doneBUFilter='all';

function renderCompleted(){
  /* Year filter */
  renderYF('yf-done',doneYearFilter,function(btn,val){
    doneYearFilter=toggleYF(doneYearFilter,val);
    renderCompleted();
  });

  /* BU Owner dropdown */
  var buOwners=new Set();
  allData.filter(function(d){return d.Status==='Done';}).forEach(function(d){
    var bu=(d['BU Owner']||'').replace(/@.+/,'').trim();
    if(bu)buOwners.add(bu);
  });
  var buSel=document.getElementById('done-bu-select');
  if(buSel){
    var curBU=buSel.value||'all';
    buSel.innerHTML='<option value="all">All BU owners</option>'+
      Array.from(buOwners).sort().map(function(bu){
        return'<option value="'+bu+'"'+(curBU===bu?' selected':'')+'>'+bu+'</option>';
      }).join('');
    buSel.value=doneBUFilter;
  }

  /* Component dropdown */
  _buildCompSelect('comp-done-select', allData, doneComponentFilter);

  /* Filter */
  var filtered=filterYear(allData,doneYearFilter);
  var done=filtered.filter(function(d){return d.Status==='Done';});
  if(doneBUFilter!=='all'){
    done=done.filter(function(d){
      return(d['BU Owner']||'').replace(/@.+/,'').trim()===doneBUFilter;
    });
  }
  done=_filterComp(done, doneComponentFilter);

  /* Sort by Go-live date DESC, fallback Actual End, Target End */
  done.sort(function(a,b){
    var da=getStart(a['Go-live Date']||'')||getEnd(a['Actual Project End']||'')||getEnd(a['Target Project End']||'')||'';
    var db=getStart(b['Go-live Date']||'')||getEnd(b['Actual Project End']||'')||getEnd(b['Target Project End']||'')||'';
    if(!da&&!db)return 0; if(!da)return 1; if(!db)return -1;
    return db.localeCompare(da);
  });

  var countEl=document.getElementById('done-count');
  if(countEl)countEl.textContent='Showing '+done.length+' completed initiative'+(done.length!==1?'s':'');

  var wrap=document.getElementById('done-list-wrap');
  if(!wrap)return;

  if(!done.length){
    wrap.innerHTML='<div style="color:var(--text3);text-align:center;padding:40px;font-size:13px">No completed initiatives.</div>';
    return;
  }

  wrap.innerHTML=done.map(function(d){
    var goLive=getStart(d['Go-live Date']||'');
    var aE=getEnd(d['Actual Project End']||'');
    var tE=getEnd(d['Target Project End']||'');
    var dateDisp=goLive?fmtDate(goLive):aE?fmtDate(aE):tE?fmtDate(tE):'';
    var buOwner=(d['BU Owner']||'').replace(/@.+/,'').trim();
    var goal=d['Project Goal']||'';
    var impact=d['Business Impact']||'';
    var kpi=d['KPI vs Target']||'';

    var html='<div class="done-item" style="margin-bottom:10px">';
    html+='<div class="done-key">'+jiraLink(d.Key)+'</div>';
    html+='<div class="done-body">';
    html+='<div class="done-name">'+d.Summary+'</div>';

    /* meta: goal · go-live · bu owner */
    var metaParts=[];
    if(goal)metaParts.push(goal);
    if(dateDisp)metaParts.push((goLive?'Go-live: ':'Completed: ')+dateDisp);
    if(buOwner)metaParts.push('BU: '+buOwner);
    if(metaParts.length)html+='<div class="done-meta">'+metaParts.join(' &middot; ')+'</div>';

    /* Business Impact with label */
    if(impact){
      html+='<div style="margin-top:6px">';
      html+='<span style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Business Impact</span>';
      html+='<div class="done-impact" style="margin-top:2px">'+impact+'</div>';
      html+='</div>';
    }

    /* KPI vs Target with label */
    if(kpi){
      html+='<div style="margin-top:5px">';
      html+='<span style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">KPI vs Target</span>';
      html+='<div class="done-meta" style="margin-top:2px;color:var(--accent)">'+kpi+'</div>';
      html+='</div>';
    }

    html+='</div></div>';
    return html;
  }).join('');
}

function onDoneBUChange(val){ doneBUFilter=val; renderCompleted(); }
function onDoneComponentChange(val){ doneComponentFilter=val||'all'; renderCompleted(); }

/* ══════════════════════════════════════════════════════════════
   DASHBOARD BUILD  —  initiative/dashboard.html
══════════════════════════════════════════════════════════════ */

var GOAL_WEIGHTS = {
  'Increase Revenue': 0.40,
  'Improve Internal Operation': 0.20,
  'Improve Customer Experience': 0.20,
  'Improve Customer Engagement': 0.20
};
var GOAL_FIELDS = Object.keys(GOAL_WEIGHTS);
var GOAL_COLORS = {
  'Increase Revenue': 'var(--accent)',
  'Improve Internal Operation': 'var(--teal)',
  'Improve Customer Experience': 'var(--purple)',
  'Improve Customer Engagement': 'var(--up)'
};

function _rawImpact(d) {
  return GOAL_FIELDS.reduce(function(s, g) { return s + (parseFloat(d[g]) || 0) * GOAL_WEIGHTS[g]; }, 0);
}
function _finalScore(d) {
  var ri = _rawImpact(d);
  return ri * (parseInt(d['Confident']) || 1) / (parseInt(d['Effort Estimation']) || 1);
}
function _monColor(mon) {
  if (!mon) return 'var(--text3)';
  if (mon.toLowerCase().includes('delayed') || mon.toLowerCase().includes('at risk')) return 'var(--down)';
  if (mon.toLowerCase().includes('on track')) return 'var(--up)';
  return 'var(--accent)';
}
function _initials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
function _firstName(name) {
  if (!name) return '—';
  return name.trim().split(/\s+/)[0];
}

function buildDashboard(filtered) {
  _buildKPI(filtered);
  _buildPipeline(filtered);
  _buildHealthMatrix(filtered);
  _buildScatter(filtered);
  _buildConfHeatmap(filtered);
  _buildImpactCoverage(filtered);
  _buildBauStrategic(filtered);
  _buildAssigneeCompact(filtered);
  buildStatusChart(filtered);
}

/* ── Section 1: KPI Strip ── */
function _buildKPI(data) {
  var el = document.getElementById('dash-kpi'); if (!el) return;
  var total    = data.length;
  var active   = data.filter(function(d){ return d.Status === 'Delivery'; }).length;
  var attn     = data.filter(function(d){ var m = (d['Project Monitoring Status']||'').toLowerCase(); return m.includes('delayed') || m.includes('at risk'); }).length;
  var pipeline = data.filter(function(d){ return d.Status === 'Discovery' || d.Status === 'Ready for Delivery'; }).length;
  var budget   = data.filter(function(d){ return d.Status === 'Budget Approval'; }).length;
  var done     = data.filter(function(d){ return d.Status === 'Done'; }).length;
  var parking  = data.filter(function(d){ return d.Status === 'Parking Lot'; }).length;
  function mc(label, val, sub, color) {
    var clsMap = {'var(--accent)':'accent','var(--up)':'green','var(--purple)':'purple','var(--amber)':'orange'};
    var cardCls = clsMap[color] || '';
    var topStyle = color === 'var(--teal)' ? 'border-top-color:var(--teal);' :
                   color === 'var(--down)' ? 'border-top-color:var(--down);' :
                   color === 'var(--text3)' ? '' : '';
    return '<div class="kpi-card '+cardCls+'" style="'+topStyle+'">'+
      '<div class="kpi-label">'+label+'</div>'+
      '<div class="kpi-value" style="color:'+(color||'var(--accent)')+'">'+val+'</div>'+
      '<div class="kpi-meta">'+sub+'</div></div>';
  }
  el.innerHTML =
    mc('Total', total, 'All initiatives', 'var(--accent)') +
    mc('Active delivery', active, 'In delivery now', 'var(--teal)') +
    mc('Needs attention', attn, 'Delayed / at risk', attn > 0 ? 'var(--down)' : 'var(--text3)') +
    mc('In pipeline', pipeline, 'Discovery / RFD', 'var(--purple)') +
    mc('Budget approval', budget, 'Awaiting decision', 'var(--amber)') +
    mc('Completed', done, 'Done this cycle', 'var(--up)') +
    mc('Parking lot', parking, 'Backlog / not planned', 'var(--text3)');
}

/* ── Section 2A: Unified Delivery & Action panel ── */
function _buildPipeline(data) {
  var el = document.getElementById('dash-delivery'); if (!el) return;

  /* Items to show: Delivery + Budget Approval + Ready for Delivery */
  var items = data.filter(function(d) {
    return d.Status === 'Delivery' || d.Status === 'Budget Approval' || d.Status === 'Ready for Delivery';
  });

  /* Build action map per key */
  function _actionFor(d) {
    var mon = (d['Project Monitoring Status'] || '').toLowerCase();
    if (mon.includes('delay')) return { label: 'Provide revised plan & mitigation', color: 'var(--down)' };
    if (mon.includes('risk'))  return { label: 'Identify blockers', color: 'var(--amber)' };
    if (d.Status === 'Budget Approval')     return { label: 'Pending budget approval', color: 'var(--accent)' };
    if (d.Status === 'Ready for Delivery')  return { label: 'Confirm sprint kick-off', color: 'var(--teal)' };
    return null;
  }

  /* Sort: delayed → at-risk → budget → ready → on-track */
  function _sortOrder(d) {
    var mon = (d['Project Monitoring Status'] || '').toLowerCase();
    if (mon.includes('delay')) return 0;
    if (mon.includes('risk'))  return 1;
    if (d.Status === 'Budget Approval')    return 2;
    if (d.Status === 'Ready for Delivery') return 3;
    return 4;
  }
  items = items.slice().sort(function(a, b) { return _sortOrder(a) - _sortOrder(b); });

  /* Avatar color map */
  var AVATAR_COLORS = ['#40b8a8','#b088e0','#d4a040','#4a9e5c','#e06050','#5bb8d4','#e07080'];
  var colorMap = {};
  var colorIdx = 0;
  data.forEach(function(d) {
    var n1 = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
    var n2 = (d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '';
    if (n1 && !colorMap[n1]) colorMap[n1] = AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length];
    if (n2 && !colorMap[n2]) colorMap[n2] = AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length];
  });

  function _avatar(name) {
    if (!name) return '';
    return '<span style="width:22px;height:22px;border-radius:50%;background:'+(colorMap[name]||'#6b5c48')+';color:#fff;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0" title="'+name+'">'+_initials(name)+'</span>';
  }

  var rows = items.map(function(d) {
    var mon = d['Project Monitoring Status'] || '';
    var monCol = _monColor(mon);
    var monTxt = d.Status === 'Delivery' ? (mon || 'On track') : d.Status;
    var action = _actionFor(d);
    var a1 = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
    var a2 = (d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '';
    var actionChip = action
      ? '<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:'+action.color+'22;color:'+action.color+';white-space:nowrap;flex-shrink:0">'+action.label+'</span>'
      : '';
    return '<div style="display:flex;align-items:center;gap:7px;padding:7px 0;border-bottom:1px solid var(--border);min-width:0">'+
      '<span style="width:7px;height:7px;border-radius:50%;background:'+monCol+';flex-shrink:0"></span>'+
      '<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:'+monCol+'22;color:'+monCol+';white-space:nowrap;flex-shrink:0;min-width:54px;text-align:center">'+monTxt+'</span>'+
      '<a href="'+CONFIG.JIRA_BASE+d.Key+'" target="_blank" style="font-size:10px;font-weight:700;color:var(--accent);text-decoration:none;white-space:nowrap;flex-shrink:0">'+d.Key+' ↗</a>'+
      '<span style="font-size:11px;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+d.Summary+'">'+d.Summary+'</span>'+
      actionChip+
      _avatar(a2)+
      _avatar(a1)+
    '</div>';
  }).join('');

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Delivery & action required</div><div class="panel-sub">Active delivery · budget · pipeline — sorted by urgency</div></div></div>'+
    '<div class="panel-body">'+(rows||'<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">No active items</div>')+'</div>';
}

/* ── Section 2B: Health Matrix ── */
function _buildHealthMatrix(data) {
  var el = document.getElementById('dash-health'); if (!el) return;
  var COL_STATUSES = ['Delivery', 'Discovery', 'Ready for Delivery', 'Delayed'];
  var assignees = [];
  data.forEach(function(d) {
    var name = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
    if (name && assignees.indexOf(name) < 0) assignees.push(name);
  });
  assignees.sort();

  function cellStyle(col, count) {
    if (!count) return 'background:transparent;color:var(--text3)';
    if (col === 'Delivery') return 'background:rgba(64,184,168,0.15);color:var(--teal);font-weight:600';
    if (col === 'Delayed')  return 'background:rgba(224,96,80,0.2);color:var(--down);font-weight:600';
    return 'background:rgba(212,160,64,0.15);color:var(--amber);font-weight:600';
  }

  var thead = '<tr><th style="text-align:left;font-size:10px;font-weight:600;color:var(--text3);padding:6px 8px;border-bottom:1px solid var(--border)">Assignee</th>'+
    COL_STATUSES.map(function(c){ return '<th style="text-align:center;font-size:10px;font-weight:600;color:var(--text3);padding:6px 4px;border-bottom:1px solid var(--border);white-space:nowrap">'+c+'</th>'; }).join('')+
  '</tr>';

  var tbody = assignees.map(function(name) {
    var cells = COL_STATUSES.map(function(col) {
      var count;
      if (col === 'Delayed') {
        count = data.filter(function(d) {
          var an = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
          var m = (d['Project Monitoring Status']||'').toLowerCase();
          return an === name && (m.includes('delayed') || m.includes('at risk'));
        }).length;
      } else {
        count = data.filter(function(d) {
          var an = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
          return an === name && d.Status === col;
        }).length;
      }
      return '<td style="text-align:center;padding:6px 4px;font-size:12px;border-radius:4px;'+cellStyle(col, count)+'">'+(count||'—')+'</td>';
    }).join('');
    return '<tr><td style="font-size:11px;color:var(--text2);padding:6px 8px;white-space:nowrap">'+_firstName(name)+'</td>'+cells+'</tr>';
  }).join('');

  var table = '<table style="width:100%;border-collapse:collapse"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table>';

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Health matrix</div><div class="panel-sub">Assignee × status</div></div></div>'+
    '<div class="panel-body"><div class="tbl-scroll">'+table+'</div></div>';
}

/* ── Section 3A: ROI Scatter (inline SVG) ── */
function _buildScatter(data) {
  var el = document.getElementById('dash-scatter'); if (!el) return;
  var pts = data.filter(function(d){ return d.Status !== 'Parking Lot'; }).map(function(d) {
    return {
      key:    d.Key,
      effort: parseInt(d['Effort Estimation']) || 1,
      score:  _finalScore(d),
      ri:     _rawImpact(d),
      mon:    d['Project Monitoring Status'] || '',
      name:   d.Summary
    };
  }).filter(function(p){ return p.score > 0; });

  var W = 460, H = 260, PL = 48, PR = 20, PT = 20, PB = 44;
  var maxScore = pts.reduce(function(m,p){ return Math.max(m, p.score); }, 0) || 1;

  function xPx(effort) { return PL + (effort - 1) / 4 * (W - PL - PR); }
  function yPx(score)  { return PT + (1 - score / maxScore) * (H - PT - PB); }

  /* quadrant fills */
  var qMidX = xPx(2.5), qMidY = yPx(maxScore * 0.5);
  var quads = [
    { x:PL,    y:PT,     w:qMidX-PL,        h:qMidY-PT,        fill:'rgba(74,158,92,0.07)',  label:'Quick wins',  lx:PL+4,       ly:PT+12 },
    { x:qMidX, y:PT,     w:W-PR-qMidX,      h:qMidY-PT,        fill:'rgba(176,136,224,0.07)',label:'Big bets',    lx:qMidX+4,    ly:PT+12 },
    { x:PL,    y:qMidY,  w:qMidX-PL,        h:H-PB-qMidY,      fill:'rgba(64,184,168,0.04)', label:'',            lx:0,          ly:0 },
    { x:qMidX, y:qMidY,  w:W-PR-qMidX,      h:H-PB-qMidY,      fill:'rgba(224,96,80,0.06)', label:'Reconsider',  lx:qMidX+4,    ly:H-PB-16 }
  ];
  var quadSvg = quads.map(function(q) {
    return '<rect x="'+q.x+'" y="'+q.y+'" width="'+q.w+'" height="'+q.h+'" fill="'+q.fill+'"/>'+
      (q.label ? '<text x="'+q.lx+'" y="'+q.ly+'" font-size="8" fill="var(--text3)" opacity="0.8">'+q.label+'</text>' : '');
  }).join('');

  /* axis lines */
  var axes = '<line x1="'+PL+'" y1="'+PT+'" x2="'+PL+'" y2="'+(H-PB)+'" stroke="var(--border)" stroke-width="1"/>'+
    '<line x1="'+PL+'" y1="'+(H-PB)+'" x2="'+(W-PR)+'" y2="'+(H-PB)+'" stroke="var(--border)" stroke-width="1"/>'+
    '<line x1="'+qMidX+'" y1="'+PT+'" x2="'+qMidX+'" y2="'+(H-PB)+'" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.5"/>'+
    '<line x1="'+PL+'" y1="'+qMidY+'" x2="'+(W-PR)+'" y2="'+qMidY+'" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.5"/>';

  /* x ticks */
  var xTicks = [1,2,3,4,5].map(function(v) {
    var x = xPx(v);
    return '<line x1="'+x+'" y1="'+(H-PB)+'" x2="'+x+'" y2="'+(H-PB+4)+'" stroke="var(--border)" stroke-width="1"/>'+
      '<text x="'+x+'" y="'+(H-PB+14)+'" text-anchor="middle" font-size="9" fill="var(--text3)">'+v+'</text>';
  }).join('');

  /* y ticks */
  var ySteps = 4;
  var yTicks = '';
  for (var i = 0; i <= ySteps; i++) {
    var sv = maxScore * i / ySteps;
    var y = yPx(sv);
    yTicks += '<line x1="'+(PL-4)+'" y1="'+y+'" x2="'+PL+'" y2="'+y+'" stroke="var(--border)" stroke-width="1"/>'+
      '<text x="'+(PL-6)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="var(--text3)">'+Math.round(sv)+'</text>';
  }

  /* axis labels */
  var axisLabels = '<text x="'+(PL+(W-PL-PR)/2)+'" y="'+(H-2)+'" text-anchor="middle" font-size="9" fill="var(--text2)">Effort (1–5 pts)</text>'+
    '<text x="12" y="'+(PT+(H-PT-PB)/2)+'" text-anchor="middle" font-size="9" fill="var(--text2)" transform="rotate(-90,12,'+(PT+(H-PT-PB)/2)+')">Final Score</text>';

  /* bubbles */
  var bubbles = pts.map(function(p) {
    var cx = xPx(p.effort), cy = yPx(p.score);
    var r  = 5 + p.ri / 12;
    var col = _monColor(p.mon);
    var showLabel = r > 10;
    return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" opacity="0.75" stroke="var(--surface)" stroke-width="1">'+
      '<title>'+p.key+': '+p.name+'\nScore: '+p.score.toFixed(1)+' | Effort: '+p.effort+'</title></circle>'+
      (showLabel ? '<text x="'+cx+'" y="'+(cy+3.5)+'" text-anchor="middle" font-size="7" fill="var(--bg)" font-weight="700" pointer-events="none">'+p.key.replace('PPP-','')+'</text>' : '');
  }).join('');

  /* legend */
  var legend = '<div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">'+
    '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:8px;height:8px;border-radius:50%;background:var(--up);display:inline-block"></span>On track</span>'+
    '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:8px;height:8px;border-radius:50%;background:var(--down);display:inline-block"></span>Delayed / At risk</span>'+
    '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block"></span>In progress</span>'+
  '</div>';

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Final score × effort</div><div class="panel-sub">Impact × Confidence ÷ Effort — higher = better ROI</div></div></div>'+
    '<div class="panel-body">'+
      '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;overflow:visible">'+quadSvg+axes+xTicks+yTicks+axisLabels+bubbles+'</svg>'+
      legend+
    '</div>';
}

/* ── Section 3B: Confidence × Status Heatmap ── */
function _buildConfHeatmap(data) {
  var el = document.getElementById('dash-conf-heatmap'); if (!el) return;
  var CONF_BANDS = [
    { label: 'High (4–5)',   fn: function(d){ var c=parseInt(d['Confident'])||0; return c>=4; } },
    { label: 'Medium (2–3)', fn: function(d){ var c=parseInt(d['Confident'])||0; return c>=2 && c<=3; } },
    { label: 'Not set (0–1)',fn: function(d){ var c=parseInt(d['Confident'])||0; return c<=1; } }
  ];
  var COL_STATUSES = ['Delivery','Discovery','Ready for Delivery','Delayed'];

  function cellBg(col, count, confBand) {
    if (!count) return 'background:var(--surface2);color:var(--text3)';
    if (col === 'Delayed') return 'background:rgba(224,96,80,0.25);color:var(--down);font-weight:700';
    if (col === 'Delivery' && confBand === 0) return 'background:rgba(74,158,92,0.25);color:var(--up);font-weight:700';
    if (confBand === 1) return 'background:rgba(212,160,64,0.2);color:var(--amber);font-weight:700';
    return 'background:rgba(64,184,168,0.15);color:var(--teal);font-weight:700';
  }

  var thead = '<tr><th style="text-align:left;font-size:10px;font-weight:600;color:var(--text3);padding:6px 8px;border-bottom:1px solid var(--border)">Confidence</th>'+
    COL_STATUSES.map(function(c){ return '<th style="text-align:center;font-size:10px;font-weight:600;color:var(--text3);padding:6px 4px;border-bottom:1px solid var(--border);white-space:nowrap">'+c+'</th>'; }).join('')+
  '</tr>';

  var tbody = CONF_BANDS.map(function(band, bi) {
    var cells = COL_STATUSES.map(function(col) {
      var count;
      if (col === 'Delayed') {
        count = data.filter(function(d){ var m=(d['Project Monitoring Status']||'').toLowerCase(); return band.fn(d) && (m.includes('delayed')||m.includes('at risk')); }).length;
      } else {
        count = data.filter(function(d){ return band.fn(d) && d.Status === col; }).length;
      }
      return '<td style="text-align:center;padding:8px 4px;font-size:13px;border-radius:3px;'+cellBg(col,count,bi)+'">'+(count||'—')+'</td>';
    }).join('');
    return '<tr><td style="font-size:10px;color:var(--text2);padding:6px 8px;white-space:nowrap">'+band.label+'</td>'+cells+'</tr>';
  }).join('');

  /* Avg confidence per status bar */
  var ACTIVE_STATUSES = ['Delivery','Discovery','Ready for Delivery'];
  var bars = ACTIVE_STATUSES.map(function(st) {
    var items = data.filter(function(d){ return d.Status === st; });
    var avg = items.length ? items.reduce(function(s,d){ return s+(parseInt(d['Confident'])||0); },0)/items.length : 0;
    var pct = avg / 5 * 100;
    return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">'+
      '<div style="font-size:10px;color:var(--text2);width:120px;flex-shrink:0;white-space:nowrap">'+st+'</div>'+
      '<div style="flex:1;height:8px;background:var(--surface2);border-radius:3px;overflow:hidden">'+
        '<div style="width:'+pct+'%;height:100%;background:var(--accent);border-radius:3px"></div>'+
      '</div>'+
      '<div style="font-size:10px;color:var(--text2);width:26px;text-align:right">'+avg.toFixed(1)+'</div>'+
    '</div>';
  }).join('');

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Confidence × status</div><div class="panel-sub">Team confidence level per delivery stage</div></div></div>'+
    '<div class="panel-body">'+
      '<div class="tbl-scroll"><table style="width:100%;border-collapse:collapse"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table></div>'+
      '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">'+
        '<div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Avg confidence by status</div>'+
        bars+
      '</div>'+
    '</div>';
}

/* ── Section 4A: Business Impact Coverage ── */
function _buildImpactCoverage(data) {
  var el = document.getElementById('dash-impact'); if (!el) return;
  var active = data.filter(function(d){ return d.Status !== 'Parking Lot'; });
  if (!active.length) { el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Business impact (score) coverage</div></div></div><div class="panel-body"><div style="color:var(--text3);font-size:12px;padding:20px">No data</div></div>'; return; }

  var bars = GOAL_FIELDS.map(function(goal) {
    var contributors = active.filter(function(d){ return (parseFloat(d[goal])||0) > 0; });
    var pct = Math.round(contributors.length / active.length * 100);
    var avg = contributors.length ? contributors.reduce(function(s,d){ return s+(parseFloat(d[goal])||0); },0)/contributors.length : 0;
    var col = GOAL_COLORS[goal] || 'var(--accent)';
    return '<div style="margin-bottom:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'+
        '<div style="font-size:11px;color:var(--text);font-weight:500;line-height:1.3">'+goal+'</div>'+
        '<div style="font-size:10px;color:var(--text2);white-space:nowrap;margin-left:8px">'+pct+'% <span style="color:var(--text3)">('+contributors.length+'/'+active.length+')</span> <span style="color:var(--text3);margin-left:4px">avg '+avg.toFixed(0)+'%</span></div>'+
      '</div>'+
      '<div style="height:10px;background:var(--surface2);border-radius:3px;overflow:hidden">'+
        '<div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:3px;transition:width .4s"></div>'+
      '</div>'+
    '</div>';
  }).join('');

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Business impact (score) coverage</div><div class="panel-sub">% of active initiatives contributing to each goal</div></div></div>'+
    '<div class="panel-body" style="padding-top:10px">'+bars+'</div>';
}

/* ── Section 4B: BAU vs Strategic ── */
function _buildBauStrategic(data) {
  var el = document.getElementById('dash-bau'); if (!el) return;
  var active = data.filter(function(d){ return d.Status !== 'Parking Lot'; });
  var bau  = active.filter(function(d){ return d['Project Type'] === 'BAU'; }).length;
  var strat = active.filter(function(d){ return d['Project Type'] === 'Strategic'; }).length;
  var total = active.length || 1;

  /* Inline SVG donut */
  var CX = 70, CY = 70, R = 50, r = 28;
  var bauPct  = bau  / total;
  var strPct  = strat / total;
  function arc(startAngle, endAngle, color) {
    if (endAngle - startAngle < 0.001) return '';
    var x1 = CX + R * Math.cos(startAngle), y1 = CY + R * Math.sin(startAngle);
    var x2 = CX + R * Math.cos(endAngle),   y2 = CY + R * Math.sin(endAngle);
    var xi1= CX + r * Math.cos(endAngle),   yi1= CY + r * Math.sin(endAngle);
    var xi2= CX + r * Math.cos(startAngle), yi2= CY + r * Math.sin(startAngle);
    var lg = (endAngle - startAngle > Math.PI) ? 1 : 0;
    return '<path d="M '+x1+' '+y1+' A '+R+' '+R+' 0 '+lg+' 1 '+x2+' '+y2+
           ' L '+xi1+' '+yi1+' A '+r+' '+r+' 0 '+lg+' 0 '+xi2+' '+yi2+' Z" fill="'+color+'"/>';
  }
  var a0 = -Math.PI/2;
  var aBau  = a0 + 2*Math.PI*bauPct;
  var aStr  = aBau + 2*Math.PI*strPct;
  var dominant = bau >= strat ? 'BAU' : 'Strategic';
  var domPct = Math.round((bau >= strat ? bauPct : strPct) * 100);
  var donut = '<svg viewBox="0 0 140 140" style="width:140px;height:140px;flex-shrink:0">'+
    arc(a0, aBau, 'var(--teal)') + arc(aBau, aStr, 'var(--purple)') +
    (bau === 0 && strat === 0 ? '<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="var(--surface2)"/>' : '')+
    '<circle cx="'+CX+'" cy="'+CY+'" r="'+r+'" fill="var(--surface)"/>'+
    '<text x="'+CX+'" y="'+(CY-6)+'" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">'+domPct+'%</text>'+
    '<text x="'+CX+'" y="'+(CY+8)+'" text-anchor="middle" font-size="9" fill="var(--text2)">'+dominant+'</text>'+
  '</svg>';

  /* Status breakdown table */
  var STATUSES2 = ['Delivery','Discovery','Done','Parking Lot'];
  var tHead = '<tr><th style="text-align:left;font-size:10px;color:var(--text3);padding:4px 8px;border-bottom:1px solid var(--border)">Type</th>'+
    STATUSES2.map(function(s){ return '<th style="text-align:center;font-size:10px;color:var(--text3);padding:4px;border-bottom:1px solid var(--border);white-space:nowrap">'+s+'</th>'; }).join('')+'</tr>';
  var tBody = ['BAU','Strategic'].map(function(type) {
    return '<tr><td style="font-size:11px;color:var(--text2);padding:5px 8px;font-weight:600">'+type+'</td>'+
      STATUSES2.map(function(st) {
        var n = data.filter(function(d){ return d['Project Type']===type && d.Status===st; }).length;
        return '<td style="text-align:center;font-size:12px;padding:5px 4px;color:'+(n?'var(--text)':'var(--text3)')+'">'+( n||'—')+'</td>';
      }).join('')+'</tr>';
  }).join('');

  var legend = '<div style="display:flex;flex-direction:column;gap:6px;margin-left:12px">'+
    '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2)"><span style="width:10px;height:10px;border-radius:2px;background:var(--teal);display:inline-block"></span>BAU — '+bau+'</div>'+
    '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2)"><span style="width:10px;height:10px;border-radius:2px;background:var(--purple);display:inline-block"></span>Strategic — '+strat+'</div>'+
  '</div>';

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">BAU vs strategic</div><div class="panel-sub">Portfolio composition</div></div></div>'+
    '<div class="panel-body">'+
      '<div style="display:flex;align-items:center;margin-bottom:14px">'+donut+legend+'</div>'+
      '<table style="width:100%;border-collapse:collapse"><thead>'+tHead+'</thead><tbody>'+tBody+'</tbody></table>'+
    '</div>';
}

/* ── Section 5: Assignee lollipop chart ── */
function _buildAssigneeCompact(data) {
  var el = document.getElementById('dash-assignee');
  if (!el) return;

  var prim = {}, sec = {};
  data.forEach(function(d) {
    var n1 = ((d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '').trim();
    var n2 = ((d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '').trim();
    if (n1) { var f1 = _firstName(n1); prim[f1] = (prim[f1] || 0) + 1; }
    if (n2) { var f2 = _firstName(n2); sec[f2] = (sec[f2] || 0) + 1; }
  });

  var names = [];
  var seen = {};
  Object.keys(prim).concat(Object.keys(sec)).forEach(function(n) {
    if (!seen[n]) { seen[n] = true; names.push(n); }
  });
  names.sort(function(a, b) {
    return ((prim[b] || 0) + (sec[b] || 0)) - ((prim[a] || 0) + (sec[a] || 0));
  });

  var maxVal = 0;
  names.forEach(function(n) { var t = (prim[n] || 0) + (sec[n] || 0); if (t > maxVal) maxVal = t; });
  if (!maxVal) { el.innerHTML = ''; return; }

  var rows = names.map(function(n) {
    var p = prim[n] || 0, s = sec[n] || 0;
    var total = p + s;
    var totalPct = Math.round((total / maxVal) * 100);
    var primPct = Math.round((p / total) * 100);
    var secPct = 100 - primPct;
    var bar = '<div style="width:'+totalPct+'%;height:100%;border-radius:3px;overflow:hidden;display:flex">'+
      (p > 0 ? '<div style="width:'+primPct+'%;background:var(--accent)" title="Primary: '+p+'"></div>' : '')+
      (s > 0 ? '<div style="width:'+secPct+'%;background:var(--teal)" title="2nd: '+s+'"></div>' : '')+
    '</div>';
    var label = '<span style="font-size:10px;color:var(--text2);font-weight:600">'+total+'</span>'+
      '<span style="font-size:10px;color:var(--text3);margin-left:4px">(P:'+p+' 2:'+s+')</span>';
    return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0">'+
      '<div style="width:68px;flex-shrink:0;font-size:11px;color:var(--text2);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+n+'</div>'+
      '<div style="flex:1;height:10px;background:var(--surface2);border-radius:3px">'+bar+'</div>'+
      '<div style="width:90px;flex-shrink:0;white-space:nowrap">'+label+'</div>'+
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="panel-head"><div>'+
      '<div class="panel-title">Assignee involvement</div>'+
      '<div class="panel-sub">Primary · 2nd — initiatives per person</div>'+
    '</div></div>'+
    '<div class="panel-body">'+
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">'+
        '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)">'+
          '<span style="width:10px;height:6px;border-radius:2px;background:var(--accent);display:inline-block"></span>Primary'+
        '</span>'+
        '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)">'+
          '<span style="width:10px;height:6px;border-radius:2px;background:var(--teal);display:inline-block"></span>2nd assignee'+
        '</span>'+
      '</div>'+
      rows+
    '</div>';
}

/* Render initiatives */
function renderInitiatives(){
  var filtered=showNoYear?filterNoYear(allData):filterYear(allData,initYearFilter);
  renderYF('yf-init',initYearFilter,function(btn,val){initYearFilter=toggleYF(initYearFilter,val);showNoYear=false;document.getElementById('btn-no-year').classList.remove('active');renderInitiatives();});
  buildDashboard(filtered);
}

/* CSV parser — handles normal row-per-record format */

function renderList(){
  /* Year filter */
  renderYF('yf-list',listYearFilter,function(btn,val){
    listYearFilter=toggleYF(listYearFilter,val);
    renderList();
  });

  /* Assignee dropdown — collect unique names (primary + 2nd) */
  var allAssignees=new Set();
  allData.forEach(function(d){
    var a1=(d['Assignee.displayName']||'').trim().split(' ')[0];
    var a2=(d['Assignee (2nd).displayName']||'').trim().split(' ')[0];
    if(a1&&a1.length>1&&a1!=='[no')allAssignees.add(a1);
    if(a2&&a2.length>1&&a2!=='[no')allAssignees.add(a2);
  });
  var sel=document.getElementById('af-list-select');
  if(sel){
    var curVal=sel.value||'all';
    sel.innerHTML='<option value="all">All assignees</option>'+
      Array.from(allAssignees).sort().map(function(a){return'<option value="'+a+'" '+(curVal===a?'selected':'')+'>'+a+'</option>';}).join('');
    sel.value=listAssigneeFilter;
  }

  /* Component dropdown */
  _buildCompSelect('comp-list-select', allData, listComponentFilter);

  /* Roadmap status dropdown checkboxes */
  var rsCheckList=document.getElementById('rs-checkbox-list');
  if(rsCheckList){
    var rsVals=[];
    allData.forEach(function(d){ var v=d['Roadmap Status']||''; if(v&&rsVals.indexOf(v)<0)rsVals.push(v); });
    rsVals.sort();
    rsCheckList.innerHTML=rsVals.map(function(v){
      var checked=listRoadmapFilter.indexOf(v)>=0;
      var dot=RC[v]?'<span style="width:8px;height:8px;border-radius:50%;background:'+RC[v]+';display:inline-block;flex-shrink:0"></span>':'';
      return '<label style="display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:12px;color:var(--text);transition:background 0.1s" '+
        'onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'">'+
        '<input type="checkbox" '+(checked?'checked':'')+' onchange="onListRoadmapToggle(\''+v+'\')" style="accent-color:var(--accent);width:13px;height:13px;flex-shrink:0">'+
        dot+
        '<span>'+v+'</span>'+
      '</label>';
    }).join('');
  }
  /* Update button label */
  var rsBtnLabel=document.getElementById('rs-btn-label');
  if(rsBtnLabel){
    rsBtnLabel.textContent=listRoadmapFilter.length===0
      ?'All statuses'
      :listRoadmapFilter.length===1
        ?listRoadmapFilter[0]
        :listRoadmapFilter.length+' selected';
    var rsBtn=document.getElementById('rs-dropdown-btn');
    if(rsBtn) rsBtn.style.borderColor=listRoadmapFilter.length>0?'var(--accent)':'var(--border)';
  }

  /* Sync search box value */
  var searchEl=document.getElementById('list-search');
  if(searchEl&&searchEl.value!==listSearchQuery)searchEl.value=listSearchQuery;

  /* Filter data */
  var filtered=filterYear(allData,listYearFilter);
  if(listAssigneeFilter!=='all'){
    filtered=filtered.filter(function(d){
      var a1=(d['Assignee.displayName']||'').trim().split(' ')[0];
      var a2=(d['Assignee (2nd).displayName']||'').trim().split(' ')[0];
      return a1===listAssigneeFilter||a2===listAssigneeFilter;
    });
  }
  filtered=_filterComp(filtered, listComponentFilter);
  /* Roadmap status filter */
  if(listRoadmapFilter.length>0){
    filtered=filtered.filter(function(d){ return listRoadmapFilter.indexOf(d['Roadmap Status']||'')>=0; });
  }
  /* Summary search */
  if(listSearchQuery.trim()){
    var q=listSearchQuery.trim().toLowerCase();
    filtered=filtered.filter(function(d){ return (d.Summary||'').toLowerCase().indexOf(q)>=0; });
  }

  /* Sort by Key asc: PPP-1, PPP-2, ... */
  filtered=filtered.slice().sort(function(a,b){
    var na=parseInt((a.Key||'').replace('PPP-',''))||0;
    var nb=parseInt((b.Key||'').replace('PPP-',''))||0;
    return na-nb;
  });

  var listCountEl=document.getElementById('list-count');
  if(listCountEl)listCountEl.textContent='Showing '+filtered.length+' of '+allData.length+' initiatives';

  /* Render rows */
  var _MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(raw){
    var p=raw?(function(){try{return JSON.parse(raw)}catch(e){return null}})():null;
    var d=p?p.start:(raw&&/\d{4}-\d{2}-\d{2}/.test(raw)?raw.match(/(\d{4}-\d{2}-\d{2})/)[1]:null);
    if(!d)return '—';
    var parts=d.split('-');return _MONTHS[+parts[1]-1]+' '+parts[0];
  }

  var listBody=document.getElementById('list-body');
  if(!listBody)return;
  listBody.innerHTML=filtered.length
    ?filtered.map(function(d){
        var mon=d['Project Monitoring Status']||'';
        var isD=mon.toLowerCase().includes('delay');
        var isR=mon.toLowerCase().includes('risk');
        var isT=mon.toLowerCase().includes('track');
        var monHtml=mon
          ?(isD?'<span class="pill p-delayed">🆘 Delayed</span>'
            :isR?'<span class="pill p-atrisk">⚠️ At risk</span>'
            :isT?'<span class="pill p-ontrack">✅ On track</span>':mon)
          :'<span style="color:var(--text3)">—</span>';
        var stMap={'Parking Lot':'parking','Budget Approval':'budget','Discovery':'discovery','Ready for Delivery':'rfd','Delivery':'delivery','Done':'done'};
        var stCls=stMap[d.Status]||'';
        var tpCls=d['Project Type']==='Strategic'?'strategic':d['Project Type']==='BAU'?'bau':'';
        var a1=(d['Assignee.displayName']||'').split(' ')[0]||'—';
        var a2=(d['Assignee (2nd).displayName']||'').split(' ')[0]||'—';
        return '<tr>'+
          '<td>'+jiraLink(d.Key)+'</td>'+
          '<td style="font-weight:600;color:var(--text);max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+d.Summary+'">'+d.Summary+'</td>'+
          '<td>'+(stCls?'<span class="pill p-'+stCls+'">'+d.Status+'</span>':d.Status)+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+(d['Roadmap Status']||'—')+'</td>'+
          '<td style="font-size:11px;color:var(--text2);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+(d['Project Goal']||'')+'">'+(d['Project Goal']||'—')+'</td>'+
          '<td>'+(tpCls?'<span class="pill p-'+tpCls+'">'+d['Project Type']+'</span>':d['Project Type']||'—')+'</td>'+
          '<td style="font-size:11px">'+a1+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+a2+'</td>'+
          '<td>'+monHtml+'</td>'+
          '<td style="font-size:11px">'+fd(d['Target Project Start'])+'</td>'+
          '<td style="font-size:11px">'+fd(d['Target Project End'])+'</td>'+
        '</tr>';
      }).join('')
    :'<tr><td colspan="11" style="text-align:center;color:var(--text3);padding:24px">No initiatives match this filter.</td></tr>';
}

function onAssigneeChange(val){ listAssigneeFilter=(val!==undefined&&val!==null)?val:'all'; renderList(); }
function onListComponentChange(val){ listComponentFilter=val||'all'; renderList(); }
function onListSearchChange(val){ listSearchQuery=val||''; renderList(); }
function onListRoadmapToggle(val){
  var idx=listRoadmapFilter.indexOf(val);
  if(idx>=0)listRoadmapFilter.splice(idx,1); else listRoadmapFilter.push(val);
  renderList();
  /* keep panel open after toggling */
  var panel=document.getElementById('rs-dropdown-panel');
  if(panel) panel.style.display='block';
}
