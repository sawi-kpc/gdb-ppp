/* ══════════════════════════════════════════════
   RENDERING — UI, charts, timeline, filters
   Depends on: config.js  (must load first)
══════════════════════════════════════════════ */

var charts={};
var sumYearFilter=['ROADMAP_2026'],initYearFilter=['ROADMAP_2026'],sumStageFilter=[],hideNoDate=false,sumSearchQuery='';
var sumRoadmapFilter=[];
var listYearFilter=['ROADMAP_2026'];
var listAssigneeFilter=[];
var listSearchQuery='';
var listRoadmapFilter=[];
var listStatusFilter=[];
var sumComponentFilter=[];
var sumDepFilter=[];
var sumPMRoleFilter=[];
var listComponentFilter=[];
var listDepFilter=[];
var listPMRoleFilter=[];
var _listPage=1, _listPageSize=20, _lastListFiltered=[], listHideWontDo=false;
var _listSortCol='Start', _listSortAsc=true;
var doneComponentFilter=[];
var donePMRoleFilter=[];

/* ── Timeline focus range state ──────────────────────────── */
var _tlStart='', _tlEnd='';
function _initTlRange(){
  if(_tlStart&&_tlEnd)return;
  var yr=new Date().getFullYear(),defS=yr+'-01',defE=yr+'-12';
  var opts=CONFIG.TIMELINE_RANGE_OPTIONS.map(function(o){return o.val;});
  if(!_tlStart) _tlStart=opts.indexOf(defS)>=0?defS:(opts.find(function(v){return v>=defS;})||opts[0]);
  if(!_tlEnd){var eM=opts.filter(function(v){return v<=defE;});_tlEnd=eM.length?eM[eM.length-1]:opts[opts.length-1];}
}
function onTlRangeChange(which,val){
  if(which==='start')_tlStart=val; else _tlEnd=val;
  renderSummary();
}
function _tlOptHtml(sel){
  return CONFIG.TIMELINE_RANGE_OPTIONS.map(function(o){
    return'<option value="'+o.val+'"'+(o.val===sel?' selected':'')+'>'+o.label+'</option>';
  }).join('');
}

/* ── Filter state persistence (localStorage) ─────────────── */
var _filtersLoadedList=false, _filtersLoadedSum=false, _filtersLoadedInit=false;

function _saveListFilters(){
  GDB.saveFilters('gdb_filter_initiative_list',{
    listYearFilter:listYearFilter, listStatusFilter:listStatusFilter,
    listRoadmapFilter:listRoadmapFilter, listComponentFilter:listComponentFilter,
    listDepFilter:listDepFilter, listPMRoleFilter:listPMRoleFilter,
    listAssigneeFilter:listAssigneeFilter, listSearchQuery:listSearchQuery,
    _listSortCol:_listSortCol, _listSortAsc:_listSortAsc, _listPage:_listPage,
    listHideWontDo:listHideWontDo
  });
}
function _loadListFilters(){
  if(_filtersLoadedList)return; _filtersLoadedList=true;
  var f=GDB.loadFilters('gdb_filter_initiative_list'); if(!f)return;
  if(Array.isArray(f.listYearFilter)&&f.listYearFilter.length) listYearFilter=f.listYearFilter;
  if(Array.isArray(f.listStatusFilter))    listStatusFilter=f.listStatusFilter;
  if(Array.isArray(f.listRoadmapFilter))   listRoadmapFilter=f.listRoadmapFilter;
  if(Array.isArray(f.listComponentFilter)) listComponentFilter=f.listComponentFilter;
  if(Array.isArray(f.listDepFilter))       listDepFilter=f.listDepFilter;
  if(Array.isArray(f.listPMRoleFilter))    listPMRoleFilter=f.listPMRoleFilter;
  if(Array.isArray(f.listAssigneeFilter))   listAssigneeFilter=f.listAssigneeFilter;
  if(f.listSearchQuery)                    listSearchQuery=f.listSearchQuery;
  if(f._listSortCol)                       _listSortCol=f._listSortCol;
  if(typeof f._listSortAsc==='boolean')       _listSortAsc=f._listSortAsc;
  if(f._listPage>0)                           _listPage=f._listPage;
  if(typeof f.listHideWontDo==='boolean')     listHideWontDo=f.listHideWontDo;
}
function _saveSumFilters(){
  GDB.saveFilters('gdb_filter_initiative_timeline',{
    sumYearFilter:sumYearFilter, sumStageFilter:sumStageFilter,
    sumRoadmapFilter:sumRoadmapFilter, sumComponentFilter:sumComponentFilter,
    sumDepFilter:sumDepFilter, sumPMRoleFilter:sumPMRoleFilter,
    sumSearchQuery:sumSearchQuery, hideNoDate:hideNoDate,
    _tlStart:_tlStart, _tlEnd:_tlEnd
  });
}
function _loadSumFilters(){
  if(_filtersLoadedSum)return; _filtersLoadedSum=true;
  var f=GDB.loadFilters('gdb_filter_initiative_timeline'); if(!f)return;
  if(Array.isArray(f.sumYearFilter)&&f.sumYearFilter.length) sumYearFilter=f.sumYearFilter;
  if(Array.isArray(f.sumStageFilter))     sumStageFilter=f.sumStageFilter;
  if(Array.isArray(f.sumRoadmapFilter))   sumRoadmapFilter=f.sumRoadmapFilter;
  if(Array.isArray(f.sumComponentFilter)) sumComponentFilter=f.sumComponentFilter;
  if(Array.isArray(f.sumDepFilter))       sumDepFilter=f.sumDepFilter;
  if(Array.isArray(f.sumPMRoleFilter))    sumPMRoleFilter=f.sumPMRoleFilter;
  if(f.sumSearchQuery)                    sumSearchQuery=f.sumSearchQuery;
  if(typeof f.hideNoDate==='boolean')     hideNoDate=f.hideNoDate;
  if(f._tlStart)                          _tlStart=f._tlStart;
  if(f._tlEnd)                            _tlEnd=f._tlEnd;
}

function _saveInitFilters(){
  GDB.saveFilters('gdb_filter_initiative_dash',{initYearFilter:initYearFilter});
}
function _loadInitFilters(){
  if(_filtersLoadedInit)return; _filtersLoadedInit=true;
  var f=GDB.loadFilters('gdb_filter_initiative_dash'); if(!f)return;
  if(Array.isArray(f.initYearFilter)&&f.initYearFilter.length) initYearFilter=f.initYearFilter;
}

var STAGES=['Parking Lot','Budget Approval','Discovery','Ready for Delivery','Delivery','Done'];
var SC={'Parking Lot':'#9E9890','Budget Approval':'#E07878','Discovery':'#D4A850','Ready for Delivery':'#9B8FE0','Delivery':'#6BAED4','Done':'#6DBF9A'};
var RC={'New':'#6BAED4','Next':'#D4A850','Now':'#82B8D8','Later':'#C8A84A',"Won't do":'#9E9E9E','Completed':'#88C470','Completed With':'#6DBF9A'};
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
  if(isNaN(dt.getTime())){var p=d.split('-');return p.length>=3?parseInt(p[2])+' '+GDB.FULL_MONTHS[+p[1]-1]+' '+p[0]:'—';}
  return dt.getDate()+' '+GDB.FULL_MONTHS[dt.getMonth()]+' '+dt.getFullYear();
}
/* fmtFullDate: "22 June 2026" — for go-live label */
function fmtFullDate(d){
  if(!d)return'—';
  var dt=new Date(d);
  if(isNaN(dt.getTime()))return'—';
  return dt.getDate()+' '+GDB.FULL_MONTHS[dt.getMonth()]+' '+dt.getFullYear();
}

/* fmtMonYear: short format "Oct 2025" — for timeline target/actual dates */
function fmtMonYear(d){
  if(!d)return'—';
  if(d.startsWith('{'))try{var o=JSON.parse(d);d=o.start||d;}catch(e){}
  var dt=new Date(d);
  if(isNaN(dt.getTime())){var p=d.split('-');return p.length>=2?GDB.MONTHS[+p[1]-1]+' '+p[0]:'—';}
  return GDB.MONTHS[dt.getMonth()]+' '+dt.getFullYear();
}
function cl(v){return String(v||'').replace(/^"|"$/g,'').trim()}
function jiraLink(k){ return GDB.jiraLink(k, CONFIG.JIRA_BASE); }
function monBadge(v){if(!v)return'<span style="color:var(--text3);font-size:10px">—</span>';var d=v.toLowerCase();if(d.includes('track'))return'<span class="mon-badge mon-ontrack">✅ On track</span>';if(d.includes('risk'))return'<span class="mon-badge mon-atrisk">⚠️ At risk</span>';if(d.includes('delay'))return'<span class="mon-badge mon-delayed">🆘 Delayed</span>';return'<span style="font-size:10px;color:var(--text2)">'+v+'</span>';}
function monEmoji(v){if(!v)return'';var d=v.toLowerCase();if(d.includes('delay'))return'🆘 ';if(d.includes('risk'))return'⚠️ ';if(d.includes('track'))return'✅ ';return'';}
function sPill(v){var m={'Parking Lot':'parking','Budget Approval':'budget','Discovery':'discovery','Ready for Delivery':'rfd','Delivery':'delivery','Done':'done'};var c=m[v]||'';return c?'<span class="pill p-'+c+'">'+v+'</span>':'<span style="font-size:10px;color:var(--text2)">'+(v||'—')+'</span>';}
function countBy(arr,key){return arr.reduce(function(a,d){var v=d[key]||'(none)';a[v]=(a[v]||0)+1;return a},{});}

/* Year filter */
function getYears(){var s=new Set();allData.forEach(function(d){(d['Roadmap Year Plan']||'').split(';').forEach(function(y){if(y.trim())s.add(y.trim());});});return['all'].concat(Array.from(s).sort());}
function renderYF(id,arr,cb){var _el=document.getElementById(id);if(!_el)return;_el.innerHTML=getYears().map(function(y){return'<button class="fb-btn '+(arr.includes(y)?'active':'')+'" onclick="('+cb.toString()+')(this,\''+y+'\')">'+( y==='all'?'All years':y.replace('ROADMAP_',''))+'</button>';}).join('');}
function toggleYF(arr,val){
  if(val==='all')return['all'];
  var w=arr.filter(function(x){return x!=='all';});
  var i=w.indexOf(val);
  if(i>=0){w.splice(i,1);return w.length===0?['all']:w;}
  return w.concat([val]);
}
function filterYear(data,arr){
  if(arr.includes('all'))return data;
  return data.filter(function(d){
    var ys=(d['Roadmap Year Plan']||'').split(';').map(function(x){return x.trim();}).filter(Boolean);
    if(arr.includes('NO_YEAR')&&ys.length===0)return true;
    return arr.some(function(y){return y!=='NO_YEAR'&&ys.includes(y);});
  });
}
function _syncNoYearBtn(id,arr){var b=document.getElementById(id);if(b)b.classList.toggle('active',arr.includes('NO_YEAR'));}
function toggleNoYear(btn){initYearFilter=toggleYF(initYearFilter,'NO_YEAR');_syncNoYearBtn('btn-no-year',initYearFilter);renderInitiatives();}
function toggleNoYearTl(btn){sumYearFilter=toggleYF(sumYearFilter,'NO_YEAR');_syncNoYearBtn('btn-no-year-tl',sumYearFilter);renderSummary();}
function toggleNoYearList(btn){listYearFilter=toggleYF(listYearFilter,'NO_YEAR');_syncNoYearBtn('btn-no-year-list',listYearFilter);renderList();}
function toggleHideNoDate(){hideNoDate=!hideNoDate;renderSummary();}

/* Metrics */
function _monBreakdown(deliveryItems){
  var mon=function(kw){return deliveryItems.filter(function(d){return(d['Project Monitoring Status']||'').toLowerCase().includes(kw);}).length;};
  var onTrack=mon('track'), atRisk=mon('risk'), delayed=mon('delay');
  return '<span style="display:flex;flex-direction:column;gap:1px;font-size:9px;font-weight:700;line-height:1.5;text-align:left;margin-left:6px">'
    +'<span style="color:var(--up)">● '+onTrack+'</span>'
    +'<span style="color:var(--amber)">● '+atRisk+'</span>'
    +'<span style="color:var(--down)">● '+delayed+'</span>'
    +'</span>';
}
function buildMetrics(data,id){
  var el=document.getElementById(id); if(!el)return;
  var s=function(st){return data.filter(function(d){return d.Status===st;}).length;};
  var dlItems=data.filter(function(d){return d.Status==='Delivery';});
  var dlBrk=_monBreakdown(dlItems);
  el.innerHTML=[
    {l:'Total',             v:data.length,              s:'All initiatives',       c:'var(--accent)',  extra:''},
    {l:'Parking Lot',       v:s('Parking Lot'),          s:'Backlog / not planned', c:'var(--text3)',   extra:''},
    {l:'Budget Approval',   v:s('Budget Approval'),      s:'Awaiting decision',     c:'var(--amber)',   extra:''},
    {l:'Discovery',         v:s('Discovery'),            s:'Preparing, Solution',   c:'var(--purple)',  extra:''},
    {l:'Ready for Delivery',v:s('Ready for Delivery'),   s:'Requirement is ready',  c:'var(--teal)',    extra:''},
    {l:'Delivery',          v:s('Delivery'),             s:'In development',        c:'var(--accent)',  extra:dlBrk},
    {l:'Done',              v:s('Done'),                 s:'Done this cycle',       c:'var(--up)',      extra:''},
  ].map(function(m){
    var inner=m.extra
      ?'<div style="display:flex;align-items:center;justify-content:center"><div class="m-value" style="color:'+m.c+'">'+m.v+'</div>'+m.extra+'</div>'
      :'<div class="m-value" style="color:'+m.c+'">'+m.v+'</div>';
    return'<div class="m-card"><div class="m-label">'+m.l+'</div>'+inner+'<div class="m-sub">'+m.s+'</div></div>';
  }).join('');
}

/* Timeline render */
function renderTimeline(data){
  _initTlRange();
  var ss=_tlStart,se=_tlEnd;
  var syArr=ss.split('-').map(Number),eyArr=se.split('-').map(Number);
  var sy=syArr[0],sm=syArr[1],ey=eyArr[0],em=eyArr[1];
  var START=new Date(sy,sm-1,1),END=new Date(ey,em,0,23,59,59),totalMs=END-START,today=new Date();
  var tlData=hideNoDate?data.filter(function(d){return getStart(d['Target Project Start']||'')||getStart(d['Actual Project Start']||'');}):data;
  tlData=tlData.slice().sort(function(a,b){var as=getStart(a['Target Project Start']||''),bs=getStart(b['Target Project Start']||'');if(!as&&!bs)return 0;if(!as)return 1;if(!bs)return-1;return new Date(as)-new Date(bs);});
  var mCols=[];var cy=sy,cm=sm-1;
  while(new Date(cy,cm,1)<=END){mCols.push({year:cy,month:cm});cm++;if(cm>11){cm=0;cy++;}}
  function _localDate(ds){var p=ds.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
  function pct(ds){if(!ds)return null;var d=_localDate(ds);if(d<START)return 0;if(d>END)return 100;return((d-START)/totalMs*100);}
  function wPct(s,e){var ds=_localDate(s),de=new Date(_localDate(e).getTime()+86400000),cs=Math.max(ds,START),ce=Math.min(de,END);if(ce<=cs)return 0.8;return((ce-cs)/totalMs*100);}
  /* Time-based widths so bars align with month columns */
  function mW(mc){
    var ms=new Date(mc.year,mc.month,1),me=new Date(mc.year,mc.month+1,1);
    return((Math.min(me,END)-Math.max(ms,START))/totalMs*100).toFixed(3)+'%';
  }
  var todayP=pct(today.toISOString().slice(0,10));
  var _tb=document.getElementById('today-badge');
  if(_tb)_tb.textContent='Today: '+today.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var todayMStart=new Date(today.getFullYear(),today.getMonth(),1);
  var todayMEnd=new Date(today.getFullYear(),today.getMonth()+1,1);
  var _bgL=Math.max(0,(todayMStart-START)/totalMs*100);
  var _bgW=(Math.min(todayMEnd,END)-Math.max(todayMStart,START))/totalMs*100;
  var todayColBg=_bgW>0?'<div class="tl-col-bg" style="left:'+_bgL.toFixed(3)+'%;width:'+_bgW.toFixed(3)+'%"></div>':'';
  /* Quarter headers — accumulate time-based spans */
  var qtrs=[];var cur=null;
  mCols.forEach(function(mc){
    var ql='Q'+(Math.floor(mc.month/3)+1)+' '+mc.year;
    var ms=new Date(mc.year,mc.month,1),me=new Date(mc.year,mc.month+1,1);
    if(!cur||cur.label!==ql){if(cur)qtrs.push(cur);cur={label:ql,start:ms,end:me};}
    else cur.end=me;
  });
  if(cur)qtrs.push(cur);
  var qtrHtml=qtrs.map(function(q){
    var w=((Math.min(q.end,END)-Math.max(q.start,START))/totalMs*100).toFixed(3);
    return'<div class="tl-qtr" style="width:'+w+'%;flex:none">'+q.label+'</div>';
  }).join('');
  var monHtml=mCols.map(function(mc){return'<div class="tl-month-cell'+(today.getFullYear()===mc.year&&today.getMonth()===mc.month?' cur-month':'')+'" style="width:'+mW(mc)+';flex:none">'+GDB.MONTHS[mc.month]+'</div>';}).join('');
  var rowsHtml=tlData.map(function(d){
    var mon=d['Project Monitoring Status']||'';
    var isDone=d.Status==='Done';
    var isD=mon.toLowerCase().includes('delay'),isR=mon.toLowerCase().includes('risk'),isT=mon.toLowerCase().includes('track');
    var rowCls=isDone?'row-done':isD?'row-delayed':isR?'row-atrisk':isT?'row-ontrack':'';
    var tS=getStart(d['Target Project Start']||''),tE=getEnd(d['Target Project End']||'');
    var aS=getStart(d['Actual Project Start']||''),aE=getEnd(d['Actual Project End']||'');
    var glDate=getStart(d['Go-live Date']||'');
    var hasPlan=tS&&tE,hasActual=!!aS;
    var planBar=hasPlan?'<div class="tl-bar tl-bar-plan" style="left:'+pct(tS).toFixed(2)+'%;width:'+wPct(tS,tE).toFixed(2)+'%"></div>':'';
    var actBar=hasActual?'<div class="tl-bar '+(isD?'tl-bar-actual-del':'tl-bar-actual-ok')+'" style="left:'+pct(aS).toFixed(2)+'%;width:'+(aE?wPct(aS,aE).toFixed(2):Math.max(.5,((Math.min(today,END)-_localDate(aS))/totalMs*100)).toFixed(2))+'%"></div>':'';
    var glP=glDate?pct(glDate):null;
    var glMarker=(glP!==null&&glP>=0&&glP<=100)?'<div class="tl-golive-v" style="left:'+glP.toFixed(2)+'%"><div class="tl-golive-diamond"></div></div>':'';
    var tLine=(tS||tE)?'<span><span style="color:var(--accent);font-weight:600;min-width:40px;display:inline-block">Target</span>'+fmtMonYear(tS)+' → '+fmtMonYear(tE)+'</span>':'';
    var aLine=(aS||aE)?'<span><span style="color:'+(isD?'#E24B4A':'#1D9E75')+';font-weight:600;min-width:40px;display:inline-block">Actual</span>'+fmtMonYear(aS)+' → '+(aE?fmtMonYear(aE):'In progress')+'</span>':'';
    var dLine=(tLine||aLine)?'<div class="tl-date-line">'+[tLine,aLine].filter(Boolean).join('<br>')+'</div>':'';
    var doneTag=isDone?'<span style="font-size:9px;font-weight:700;color:#fff;background:#1a56db;border-radius:3px;padding:1px 5px;margin-left:6px;letter-spacing:.04em;vertical-align:middle">DONE</span>':'';
    var emoji=mon?(isD?'🆘 ':isR?'⚠️ ':isT?'✅ ':''):'';
    var glLabel=(glDate?'<span style="font-size:9px;color:var(--purple);font-weight:600;margin-left:6px">◆ Go-live: '+fmtFullDate(glDate)+'</span>':'')+doneTag;
    var docUrl=String(d['Document']||'').replace(/^"|"$/g,'').trim();
    var docLink=docUrl?'<a href="'+docUrl+'" target="_blank" class="doc-icon-link" title="Confluence document"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></a>':'';
    return'<div class="tl-row '+rowCls+'"><div class="tl-label"><div class="tl-key-line">'+jiraLink(d.Key)+glLabel+'</div><div class="tl-name" title="'+d.Summary+'">'+emoji+d.Summary+'</div>'+dLine+'</div><div class="tl-track">'+todayColBg+(todayP!==null?'<div class="tl-today-v" style="left:'+todayP.toFixed(2)+'%"></div>':'')+glMarker+' '+(hasPlan||hasActual?planBar+actBar:'<div class="tl-no-date">No date set</div>')+'</div><div class="tl-status-col" style="flex-direction:column;align-items:center;justify-content:center;gap:4px">'+docLink+(mon?monBadge(mon):sPill(d.Status))+'</div></div>';
  }).join('');
  var tlInner=document.getElementById('tl-inner');
  var focusHtml='<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:4px 10px 4px 0;gap:4px">'+
    '<div style="display:flex;align-items:center;gap:5px">'+
      '<span style="font-size:10px;color:var(--text2);font-weight:600;white-space:nowrap">Focus:</span>'+
      '<select style="font-size:10.5px;padding:2px 5px;border:1px solid var(--border);border-radius:4px;background:var(--surface2);color:var(--text);cursor:pointer;outline:none" onchange="onTlRangeChange(\'start\',this.value)">'+_tlOptHtml(ss)+'</select>'+
      '<span style="font-size:10px;color:var(--text3)">to</span>'+
      '<select style="font-size:10.5px;padding:2px 5px;border:1px solid var(--border);border-radius:4px;background:var(--surface2);color:var(--text);cursor:pointer;outline:none" onchange="onTlRangeChange(\'end\',this.value)">'+_tlOptHtml(se)+'</select>'+
    '</div>'+
  '</div>';
  var _togTrack='position:relative;width:26px;height:14px;border-radius:7px;transition:background .2s;flex-shrink:0;background:'+(hideNoDate?'var(--accent)':'var(--border)');
  var _togThumb='position:absolute;top:2px;width:10px;height:10px;border-radius:50%;transition:transform .2s,background .2s;background:'+(hideNoDate?'#fff':'var(--text3)')+(hideNoDate?';left:2px;transform:translateX(12px)':';left:2px');
  var _togLabel='font-size:10.5px;font-weight:'+(hideNoDate?'600':'500')+';color:'+(hideNoDate?'var(--accent)':'var(--text2)')+';white-space:nowrap;transition:color .2s';
  var noDateBtnHtml='<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:0 8px">'+
    '<button onclick="toggleHideNoDate()" style="display:inline-flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;padding:0;flex-shrink:0">'+
      '<span style="'+_togTrack+'"><span style="'+_togThumb+'"></span></span>'+
      '<span style="'+_togLabel+'">No-date</span>'+
    '</button>'+
  '</div>';
  var tlHeadInner=document.getElementById('tl-head-inner');
  var headerHtml='<div class="tl-header"><div class="tl-label-head">'+focusHtml+'</div><div class="tl-grid-head"><div class="tl-qtr-row">'+qtrHtml+'</div><div class="tl-month-row">'+monHtml+'</div></div><div class="tl-status-head">'+noDateBtnHtml+'</div></div>';
  if(tlHeadInner) tlHeadInner.innerHTML=headerHtml;
  if(tlInner) tlInner.innerHTML=rowsHtml;
  /* Sync horizontal scroll between tl-container and sticky header */
  var tlCont=document.getElementById('tl-container');
  if(tlCont && tlHeadInner){
    tlCont.onscroll=function(){ tlHeadInner.style.transform='translateX(-'+this.scrollLeft+'px)'; };
  }
}

/* Charts */
function _chartTextColor(){ return GDB.cssVar('--text2') || '#8b949e'; }
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
  data.forEach(function(d){var raw=(d['Assignee (2nd)']&&d['Assignee (2nd)'].displayName||d['Assignee (2nd).displayName']||'').trim();raw.split(';').forEach(function(p){var n=p.trim().split(' ')[0];if(n&&n!=='[no'&&n.length>1)a2[n]=(a2[n]||0)+1;});});
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

/* ── Platform order + component sort helper ────────────────── */
var _PLT_ORDER = [
  'kingpower-commerce-th','kingpower-commerce-cn','taihaitao-commerce-cn',
  'jd-phamacy-marketplace-cn','kingpower-douyin-social-commerce',
  'firster-commerce','firster-tiktok-social-commerce',
  'new-or-undefined','manual-operations'
];
function _sortCompVals(vals) {
  var ordered = _PLT_ORDER.filter(function(p){ return vals.indexOf(p) >= 0; });
  var rest = vals.filter(function(v){ return _PLT_ORDER.indexOf(v) < 0; }).sort();
  return ordered.concat(rest).concat(['(missing component)']);
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

function renderSummary(){
  _loadSumFilters();
  _saveSumFilters();
  /* hideNoDate button is rendered inline in tl-status-head — no separate sync needed */
  var filtered=filterYear(allData,sumYearFilter).filter(function(d){return(d['Roadmap Status']||'')!=="Won't do";});
  renderYF('yf-sum',sumYearFilter,function(btn,val){sumYearFilter=toggleYF(sumYearFilter,val);_syncNoYearBtn('btn-no-year-tl',sumYearFilter);renderSummary();});
  _syncNoYearBtn('btn-no-year-tl',sumYearFilter);

  /* Stage dropdown */
  GDB.buildCheckDropdown({wrapperId:'stage-dropdown-wrap', btnLabelId:'stage-btn-label', listId:'stage-checkbox-list', values:STAGES, activeArr:sumStageFilter, colorMap:SC, toggleFn:'onSumStageToggle'});

  /* Roadmap Status dropdown */
  var RS_COLORS={'New':'var(--text2)','Next':'var(--teal)','Now':'var(--accent)','Later':'var(--amber)',"Won't do":'var(--text3)','Completed':'var(--up)'};
  var RS_ORDER=['New','Next','Now','Later',"Won't do",'Completed'];
  GDB.buildCheckDropdown({wrapperId:'rs-tl-dropdown-wrap', btnLabelId:'rs-tl-btn-label', listId:'rs-tl-checkbox-list', values:RS_ORDER, activeArr:sumRoadmapFilter, colorMap:RS_COLORS, toggleFn:'onSumRoadmapToggle'});

  /* Component dropdown */
  var compVals=[];
  allData.forEach(function(d){
    (d['Components']||'').split(';').forEach(function(c){ var t=c.trim(); if(t&&compVals.indexOf(t)<0)compVals.push(t); });
  });
  GDB.buildCheckDropdown({wrapperId:'comp-dropdown-wrap', btnLabelId:'comp-btn-label', listId:'comp-checkbox-list', values:_sortCompVals(compVals), activeArr:sumComponentFilter, colorMap:null, toggleFn:'onSumCompToggle'});

  /* Dependency System dropdown */
  var sumDepVals=[];
  allData.forEach(function(d){
    (d['Dependency Systems']||'').split(';').forEach(function(v){ var t=v.trim(); if(t&&sumDepVals.indexOf(t)<0)sumDepVals.push(t); });
  });
  sumDepVals.sort();
  GDB.buildCheckDropdown({wrapperId:'dep-dropdown-wrap', btnLabelId:'dep-btn-label', listId:'dep-checkbox-list', values:sumDepVals, activeArr:sumDepFilter, colorMap:null, toggleFn:'onSumDepToggle'});

  /* PM Role dropdown */
  var sumPMVals=[];
  allData.forEach(function(d){ var v=(d['PM Role']||'').trim(); if(v&&sumPMVals.indexOf(v)<0)sumPMVals.push(v); });
  sumPMVals.sort();
  GDB.buildCheckDropdown({wrapperId:'sum-pm-dropdown-wrap', btnLabelId:'sum-pm-btn-label', listId:'sum-pm-checkbox-list', values:sumPMVals, activeArr:sumPMRoleFilter, colorMap:null, toggleFn:'onSumPMToggle'});

  /* Sync search box */
  var sumSearchEl=document.getElementById('sum-search');
  if(sumSearchEl&&sumSearchEl.value!==sumSearchQuery)sumSearchEl.value=sumSearchQuery;

  /* Apply filters */
  if(sumStageFilter.length>0) filtered=filtered.filter(function(d){return sumStageFilter.indexOf(d.Status)>=0;});
  if(sumRoadmapFilter.length>0) filtered=filtered.filter(function(d){return sumRoadmapFilter.indexOf(d['Roadmap Status']||'')>=0;});
  if(sumComponentFilter.length>0){
    filtered=filtered.filter(function(d){
      var comps=(d['Components']||'').split(';').map(function(c){return c.trim();}).filter(Boolean);
      var hasMissing=sumComponentFilter.indexOf('(missing component)')>=0;
      var regular=sumComponentFilter.filter(function(f){return f!=='(missing component)';});
      return (hasMissing&&comps.length===0)||(regular.some(function(f){return comps.indexOf(f)>=0;}));
    });
  }
  if(sumDepFilter.length>0){
    filtered=filtered.filter(function(d){
      var deps=(d['Dependency Systems']||'').split(';').map(function(v){return v.trim();}).filter(Boolean);
      return sumDepFilter.some(function(f){return deps.indexOf(f)>=0;});
    });
  }
  if(sumPMRoleFilter.length>0){
    filtered=filtered.filter(function(d){ return sumPMRoleFilter.indexOf((d['PM Role']||'').trim())>=0; });
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

function onSumRoadmapToggle(val){
  var idx=sumRoadmapFilter.indexOf(val);
  if(idx>=0)sumRoadmapFilter.splice(idx,1); else sumRoadmapFilter.push(val);
  renderSummary();
  var panel=document.getElementById('rs-tl-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearSumRoadmapFilter(){ sumRoadmapFilter=[]; document.getElementById('rs-tl-dropdown-panel').style.display='none'; renderSummary(); }

function onSumCompToggle(val){
  var idx=sumComponentFilter.indexOf(val);
  if(idx>=0)sumComponentFilter.splice(idx,1); else sumComponentFilter.push(val);
  renderSummary();
  var panel=document.getElementById('comp-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearSumCompFilter(){ sumComponentFilter=[]; document.getElementById('comp-dropdown-panel').style.display='none'; renderSummary(); }

function onSumDepToggle(val){
  var idx=sumDepFilter.indexOf(val);
  if(idx>=0)sumDepFilter.splice(idx,1); else sumDepFilter.push(val);
  renderSummary();
  var panel=document.getElementById('dep-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearSumDepFilter(){ sumDepFilter=[]; document.getElementById('dep-dropdown-panel').style.display='none'; renderSummary(); }

function onSumPMToggle(val){
  var idx=sumPMRoleFilter.indexOf(val);
  if(idx>=0)sumPMRoleFilter.splice(idx,1); else sumPMRoleFilter.push(val);
  renderSummary();
  var panel=document.getElementById('sum-pm-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearSumPMFilter(){ sumPMRoleFilter=[]; document.getElementById('sum-pm-dropdown-panel').style.display='none'; renderSummary(); }

/* ── Done initiatives list ────────────────── */
var doneYearFilter=['all'];
var doneBUFilter=[];
var doneSearchQuery='';

function renderCompleted(){
  /* Year filter */
  renderYF('yf-done',doneYearFilter,function(btn,val){
    doneYearFilter=toggleYF(doneYearFilter,val);
    renderCompleted();
  });

  /* BU Owner dropdown */
  var buOwnerVals=[];
  allData.filter(function(d){return d.Status==='Done';}).forEach(function(d){
    var bu=(d['BU Owner']||'').replace(/@.+/,'').trim();
    if(bu&&buOwnerVals.indexOf(bu)<0)buOwnerVals.push(bu);
  });
  buOwnerVals.sort();
  GDB.buildCheckDropdown({wrapperId:'done-bu-wrap', btnLabelId:'done-bu-label', listId:'done-bu-list', values:buOwnerVals, activeArr:doneBUFilter, colorMap:null, toggleFn:'onDoneBUToggle'});

  /* Component dropdown */
  var doneCompVals=[];
  allData.forEach(function(d){
    (d['Components']||'').split(';').forEach(function(c){ var t=c.trim(); if(t&&doneCompVals.indexOf(t)<0)doneCompVals.push(t); });
  });
  GDB.buildCheckDropdown({wrapperId:'done-comp-wrap', btnLabelId:'done-comp-label', listId:'done-comp-list', values:_sortCompVals(doneCompVals), activeArr:doneComponentFilter, colorMap:null, toggleFn:'onDoneCompToggle'});

  /* PM Role dropdown */
  var donePMVals=[];
  allData.forEach(function(d){ var v=(d['PM Role']||'').trim(); if(v&&donePMVals.indexOf(v)<0)donePMVals.push(v); });
  donePMVals.sort();
  GDB.buildCheckDropdown({wrapperId:'done-pm-wrap', btnLabelId:'done-pm-label', listId:'done-pm-list', values:donePMVals, activeArr:donePMRoleFilter, colorMap:null, toggleFn:'onDonePMToggle'});

  /* Sync search */
  var doneSearchEl=document.getElementById('done-search');
  if(doneSearchEl&&doneSearchEl.value!==doneSearchQuery)doneSearchEl.value=doneSearchQuery;

  /* Filter */
  var filtered=filterYear(allData,doneYearFilter);
  var done=filtered.filter(function(d){return d.Status==='Done';});
  if(doneBUFilter.length>0){
    done=done.filter(function(d){
      return doneBUFilter.indexOf((d['BU Owner']||'').replace(/@.+/,'').trim())>=0;
    });
  }
  if(doneComponentFilter.length>0){
    done=done.filter(function(d){
      var comps=(d['Components']||'').split(';').map(function(c){return c.trim();}).filter(Boolean);
      var hasMissing=doneComponentFilter.indexOf('(missing component)')>=0;
      var regular=doneComponentFilter.filter(function(f){return f!=='(missing component)';});
      return (hasMissing&&comps.length===0)||(regular.some(function(f){return comps.indexOf(f)>=0;}));
    });
  }
  if(donePMRoleFilter.length>0){
    done=done.filter(function(d){ return donePMRoleFilter.indexOf((d['PM Role']||'').trim())>=0; });
  }
  if(doneSearchQuery.trim()){
    var q=doneSearchQuery.trim().toLowerCase();
    done=done.filter(function(d){return(d.Summary||'').toLowerCase().indexOf(q)>=0;});
  }

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

function onDoneBUToggle(val){ var i=doneBUFilter.indexOf(val); if(i>=0)doneBUFilter.splice(i,1); else doneBUFilter.push(val); renderCompleted(); var p=document.getElementById('done-bu-panel'); if(p)p.style.display='block'; }
function clearDoneBUFilter(){ doneBUFilter=[]; document.getElementById('done-bu-panel').style.display='none'; renderCompleted(); }
function onDoneCompToggle(val){ var i=doneComponentFilter.indexOf(val); if(i>=0)doneComponentFilter.splice(i,1); else doneComponentFilter.push(val); renderCompleted(); var p=document.getElementById('done-comp-panel'); if(p)p.style.display='block'; }
function clearDoneCompFilter(){ doneComponentFilter=[]; document.getElementById('done-comp-panel').style.display='none'; renderCompleted(); }
function onDonePMToggle(val){ var i=donePMRoleFilter.indexOf(val); if(i>=0)donePMRoleFilter.splice(i,1); else donePMRoleFilter.push(val); renderCompleted(); var p=document.getElementById('done-pm-panel'); if(p)p.style.display='block'; }
function clearDonePMFilter(){ donePMRoleFilter=[]; document.getElementById('done-pm-panel').style.display='none'; renderCompleted(); }
function onDoneSearchChange(val){ doneSearchQuery=val||''; renderCompleted(); }

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
  var m = mon.toLowerCase();
  if (m.includes('delay')) return 'var(--down)';
  if (m.includes('risk'))  return 'var(--amber)';
  if (m.includes('track')) return 'var(--up)';
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

/* ── Panel collapse helpers ── */
var _dashCollapseKey = 'gdb_dash_collapse';
function _getDashCollapse() {
  try { return JSON.parse(localStorage.getItem(_dashCollapseKey)) || {}; } catch(e) { return {}; }
}
function _saveDashCollapse(s) {
  try { localStorage.setItem(_dashCollapseKey, JSON.stringify(s)); } catch(e) {}
}
function _makePanelCollapsible(panelId, defaultCollapsed) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var head = panel.querySelector('.panel-head');
  if (!head) return;
  if (!head.querySelector('.panel-chevron')) {
    var chev = document.createElement('span');
    chev.className = 'panel-chevron';
    chev.innerHTML = '&#9660;';
    head.appendChild(chev);
  }
  head.classList.add('collapsible');
  head.onclick = function() {
    var cur = panel.classList.contains('collapsed');
    var s = _getDashCollapse();
    s[panelId] = !cur;
    _saveDashCollapse(s);
    panel.classList.toggle('collapsed', !cur);
  };
  var s = _getDashCollapse();
  var collapsed = typeof s[panelId] === 'boolean' ? s[panelId] : !!defaultCollapsed;
  panel.classList.toggle('collapsed', collapsed);
}

function buildDashboard(filtered) {
  _buildKPI(filtered);
  _buildPlatformMatrix(filtered);
  _buildPipeline(filtered);
  _buildHealthMatrix(filtered);
  _buildScatter(filtered);
  _buildConfHeatmap(filtered);
  _buildImpactCoverage(filtered);
  _buildBauStrategic(filtered);
  _buildAssigneeCompact(filtered);
  buildStatusChart(filtered);
  _makePanelCollapsible('dash-status-chart');
}

/* ── Section 1: KPI Strip ── */
function _buildKPI(data) {
  var el = document.getElementById('dash-kpi'); if (!el) return;
  var s = function(st){ return data.filter(function(d){ return d.Status===st; }).length; };
  var dlItems = data.filter(function(d){ return d.Status==='Delivery'; });
  var dlBrk = _monBreakdown(dlItems);
  function mc(label, val, sub, color, extra) {
    var inner = extra
      ? '<div style="display:flex;align-items:center;justify-content:center"><div class="m-value" style="color:'+(color||'var(--accent)')+'">'+val+'</div>'+extra+'</div>'
      : '<div class="m-value" style="color:'+(color||'var(--accent)')+'">'+val+'</div>';
    return '<div class="m-card"><div class="m-label">'+label+'</div>'+inner+'<div class="m-sub">'+sub+'</div></div>';
  }
  el.innerHTML =
    mc('Total',               data.length,               'All initiatives',       'var(--accent)') +
    mc('Parking Lot',         s('Parking Lot'),           'Backlog / not planned', 'var(--text3)') +
    mc('Budget Approval',     s('Budget Approval'),       'Awaiting decision',     'var(--amber)') +
    mc('Discovery',           s('Discovery'),             'Preparing, Solution',   'var(--purple)') +
    mc('Ready for Delivery',  s('Ready for Delivery'),    'Requirement is ready',  'var(--teal)') +
    mc('Delivery',            s('Delivery'),              'In development',        'var(--accent)', dlBrk) +
    mc('Done',                s('Done'),                  'Done this cycle',       'var(--up)');
}

/* ── Platform × Status Matrix ── */
function _buildPlatformMatrix(data) {
  var el = document.getElementById('dash-platform-matrix'); if (!el) return;

  var STATUS_COLS = ['Parking Lot','Budget Approval','Discovery','Ready for Delivery','Delivery','Done'];
  var ST_COLOR = {
    'Parking Lot':        'var(--text3)',
    'Budget Approval':    'var(--amber)',
    'Discovery':          'var(--purple)',
    'Ready for Delivery': 'var(--teal)',
    'Delivery':           'var(--accent)',
    'Done':               'var(--up)'
  };
  var ST_BG = {
    'Parking Lot':        'rgba(158,152,144,.15)',
    'Budget Approval':    'rgba(212,168,80,.15)',
    'Discovery':          'rgba(155,143,224,.15)',
    'Ready for Delivery': 'rgba(34,211,164,.15)',
    'Delivery':           'rgba(88,166,255,.15)',
    'Done':               'rgba(63,185,80,.15)'
  };
  var SHORT = {};

  /* Collect platforms */
  var platSet = {};
  data.forEach(function(d) {
    (d['Components']||'').split(';').forEach(function(c) {
      c = c.trim();
      if (c) platSet[c] = true;
    });
  });
  var platforms = Object.keys(platSet);
  if (!platforms.length) { el.innerHTML = ''; return; }

  /* Count matrix: platform → status → count */
  var mx = {};
  platforms.forEach(function(p) { mx[p] = {}; });
  data.forEach(function(d) {
    if (STATUS_COLS.indexOf(d.Status) < 0) return;
    (d['Components']||'').split(';').forEach(function(c) {
      c = c.trim();
      if (c && mx[c]) mx[c][d.Status] = (mx[c][d.Status]||0) + 1;
    });
  });

  /* Sort platforms by predefined order */
  var PLT_ORDER = [
    'kingpower-commerce-th',
    'kingpower-commerce-cn',
    'taihaitao-commerce-cn',
    'jd-phamacy-marketplace-cn',
    'kingpower-douyin-social-commerce',
    'firster-commerce',
    'firster-tiktok-social-commerce',
    'new-or-undefined',
    'manual-operations'
  ];
  platforms.sort(function(a, b) {
    var ia = PLT_ORDER.indexOf(a);
    var ib = PLT_ORDER.indexOf(b);
    if (ia < 0) ia = PLT_ORDER.length;
    if (ib < 0) ib = PLT_ORDER.length;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });

  /* Missing component row data (computed early for global max) */
  var missingMx = {};
  data.forEach(function(d) {
    if (STATUS_COLS.indexOf(d.Status) < 0) return;
    var comps = (d['Components']||'').split(';').map(function(c){ return c.trim(); }).filter(Boolean);
    if (comps.length === 0) missingMx[d.Status] = (missingMx[d.Status]||0) + 1;
  });
  var missingTotal = STATUS_COLS.reduce(function(s,st){ return s+(missingMx[st]||0); }, 0);

  /* Global max across all cells for single-color heatmap */
  var globalMax = 0;
  platforms.forEach(function(p) {
    STATUS_COLS.forEach(function(st) { if ((mx[p][st]||0) > globalMax) globalMax = mx[p][st]||0; });
  });
  STATUS_COLS.forEach(function(st) { if ((missingMx[st]||0) > globalMax) globalMax = missingMx[st]||0; });

  var HEAT_RGB = '124,92,30'; /* single warm-brown heatmap color */

  var vBorder = 'border-left:1px solid var(--border)';
  var thS = 'text-align:center;font-size:10px;font-weight:600;padding:6px 12px;border-bottom:1px solid var(--border);white-space:nowrap';
  var colgroup = '<colgroup><col style="min-width:180px"><col style="width:64px">'+
    STATUS_COLS.map(function(){ return '<col style="width:140px">'; }).join('')+
    '</colgroup>';
  var thead = '<tr>'+
    '<th style="text-align:left;font-size:10px;font-weight:600;color:var(--text3);padding:6px 12px;border-bottom:1px solid var(--border)">Platform</th>'+
    '<th style="'+thS+';'+vBorder+';color:var(--text2)">Total</th>'+
    STATUS_COLS.map(function(s){ return '<th style="'+thS+';'+vBorder+';color:'+ST_COLOR[s]+'">'+s+'</th>'; }).join('')+
    '</tr>';

  function makeRow(label, countMap, labelStyle) {
    var total = STATUS_COLS.reduce(function(s,st){ return s+(countMap[st]||0); }, 0);
    var cells = STATUS_COLS.map(function(st) {
      var v = countMap[st]||0;
      var cellStyle = vBorder+';text-align:center;padding:6px 12px;font-size:12px;';
      if (v && globalMax > 0) {
        var opacity = 0.08 + 0.65 * (v / globalMax);
        cellStyle += 'font-weight:600;color:var(--text);background:rgba('+HEAT_RGB+','+opacity.toFixed(2)+')';
      } else {
        cellStyle += 'color:var(--text3)';
      }
      return '<td style="'+cellStyle+'">'+(v||'—')+'</td>';
    }).join('');
    return '<tr style="border-bottom:1px solid var(--border)">'+
      '<td style="font-size:11px;font-weight:500;padding:6px 12px;white-space:nowrap;'+(labelStyle||'color:var(--text2)')+'">'+label+'</td>'+
      '<td style="text-align:center;padding:6px 12px;font-size:12px;font-weight:700;color:var(--text);'+vBorder+'">'+total+'</td>'+
      cells+
      '</tr>';
  }

  var tbody = platforms.map(function(p) { return makeRow(p, mx[p]); }).join('');

  if (missingTotal > 0) {
    tbody += '<tr><td colspan="'+(STATUS_COLS.length+2)+'" style="padding:0;border-top:2px solid var(--border)"></td></tr>';
    tbody += makeRow('Missing component', missingMx, 'color:var(--amber);font-style:italic');
  }

  el.innerHTML =
    '<div class="panel-head"><div>'+
      '<div class="panel-title">Health matrix by platform</div>'+
      '<div class="panel-sub">Initiative count per platform × lifecycle status</div>'+
    '</div></div>'+
    '<div class="panel-body"><div class="tbl-scroll">'+
      '<table style="width:100%;border-collapse:collapse;table-layout:fixed">'+
        colgroup+'<thead>'+thead+'</thead><tbody>'+tbody+'</tbody>'+
      '</table>'+
    '</div></div>';
  _makePanelCollapsible('dash-platform-matrix');
}

/* ── Section 2A: Unified Delivery & Action panel ── */
function _buildPipeline(data) {
  var el = document.getElementById('dash-delivery'); if (!el) return;

  /* Helper: component missing (empty only) */
  function _missingComp(d) {
    var NEED_COMP = ['Ready for Delivery', 'Delivery', 'Done'];
    if (NEED_COMP.indexOf(d.Status) < 0) return false;
    var comps = (d['Components'] || '').split(';').map(function(c) { return c.trim(); }).filter(function(c) { return c; });
    return comps.length === 0;
  }

  /* Items to show:
     - Delivery + Budget Approval + Ready for Delivery (active pipeline)
     - Done / Ready / Delivery items missing component (data quality)
     - Exclude Roadmap Status = "Won't do" */
  var items = data.filter(function(d) {
    if ((d['Roadmap Status'] || '') === "Won't do") return false;
    var isActive = d.Status === 'Delivery' || d.Status === 'Budget Approval' || d.Status === 'Ready for Delivery';
    return isActive || _missingComp(d);
  });

  /* Build action map per key */
  function _actionFor(d) {
    if (_missingComp(d)) return { label: 'Specify component (related platform)', color: 'var(--amber)' };
    var mon = (d['Project Monitoring Status'] || '').toLowerCase();
    if (mon.includes('delay')) return { label: 'Provide revised plan & mitigation', color: 'var(--down)' };
    if (mon.includes('risk'))  return { label: 'Identify blockers', color: 'var(--amber)' };
    if (d.Status === 'Budget Approval')     return { label: 'Pending budget approval', color: 'var(--accent)' };
    if (d.Status === 'Ready for Delivery')  return { label: 'Confirm sprint kick-off', color: 'var(--teal)' };
    return null;
  }

  /* Sort: budget approval → delivery delayed → delivery at risk → delivery on track → ready for delivery */
  function _sortOrder(d) {
    if (d.Status === 'Budget Approval') return 0;
    var mon = (d['Project Monitoring Status'] || '').toLowerCase();
    if (d.Status === 'Delivery' && mon.includes('delay')) return 1;
    if (d.Status === 'Delivery' && mon.includes('risk'))  return 2;
    if (d.Status === 'Delivery') return 3;
    if (d.Status === 'Ready for Delivery') return 4;
    return 5;
  }
  items = items.slice().sort(function(a, b) { return _sortOrder(a) - _sortOrder(b); });

  /* Avatar color map */
  var AVATAR_COLORS = ['#40b8a8','#b088e0','#d4a040','#4a9e5c','#e06050','#5bb8d4','#e07080'];
  var colorMap = {};
  var colorIdx = 0;
  data.forEach(function(d) {
    var n1 = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
    var n2raw = (d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '';
    if (n1 && !colorMap[n1]) colorMap[n1] = AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length];
    n2raw.split(';').forEach(function(n2){ n2=n2.trim(); if(n2 && !colorMap[n2]) colorMap[n2]=AVATAR_COLORS[colorIdx++%AVATAR_COLORS.length]; });
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
    var a2s = ((d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '').split(';').map(function(n){return n.trim();}).filter(Boolean);
    var actionChip = action
      ? '<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:'+action.color+'22;color:'+action.color+';white-space:nowrap;flex-shrink:0">'+action.label+'</span>'
      : '';
    return '<div style="display:flex;align-items:center;gap:7px;padding:7px 0;border-bottom:1px solid var(--border);min-width:0">'+
      '<span style="width:7px;height:7px;border-radius:50%;background:'+monCol+';flex-shrink:0"></span>'+
      '<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:'+monCol+'22;color:'+monCol+';white-space:nowrap;flex-shrink:0;min-width:54px;text-align:center">'+monTxt+'</span>'+
      '<a href="'+CONFIG.JIRA_BASE+d.Key+'" target="_blank" style="font-size:10px;font-weight:700;color:var(--accent);text-decoration:none;white-space:nowrap;flex-shrink:0">'+d.Key+' ↗</a>'+
      '<span style="font-size:11px;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+d.Summary+'">'+d.Summary+'</span>'+
      actionChip+
      a2s.map(_avatar).join('')+
      _avatar(a1)+
    '</div>';
  }).join('');

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Delivery & action required</div><div class="panel-sub">Active delivery · budget · pipeline — sorted by urgency</div></div></div>'+
    '<div class="panel-body">'+(rows||'<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">No active items</div>')+'</div>';
  _makePanelCollapsible('dash-delivery');
}

/* ── Section 2B: Health Matrix ── */
function _buildHealthMatrix(data) {
  var el = document.getElementById('dash-health'); if (!el) return;
  function _names(d) {
    var a1 = (d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '';
    var a2 = ((d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '');
    var all = a2.split(';').map(function(n){ return n.trim(); }).filter(Boolean);
    if (a1) all.unshift(a1);
    return all.filter(function(n, i, arr){ return arr.indexOf(n) === i; });
  }

  var assignees = [];
  data.forEach(function(d) {
    _names(d).forEach(function(name) {
      if (assignees.indexOf(name) < 0) assignees.push(name);
    });
  });
  assignees.sort();

  /* Build count matrix for heatmap global max */
  var mx = {};
  assignees.forEach(function(name) {
    mx[name] = {};
    STAGES.forEach(function(col) {
      mx[name][col] = data.filter(function(d) {
        return d.Status === col && _names(d).indexOf(name) >= 0;
      }).length;
    });
  });

  var globalMax = 0;
  assignees.forEach(function(name) {
    STAGES.forEach(function(col) { if (mx[name][col] > globalMax) globalMax = mx[name][col]; });
  });

  var HEAT_RGB = '124,92,30';
  var vBorder = 'border-left:1px solid var(--border)';
  var thStyle = 'text-align:center;font-size:10px;font-weight:600;color:var(--text3);padding:6px 10px;border-bottom:1px solid var(--border);white-space:nowrap';
  var thead = '<tr>'+
    '<th style="text-align:left;font-size:10px;font-weight:600;color:var(--text3);padding:6px 10px;border-bottom:1px solid var(--border)">Assignee</th>'+
    STAGES.map(function(c){ return '<th style="'+thStyle+';'+vBorder+'">'+c+'</th>'; }).join('')+
    '</tr>';

  var tbody = assignees.map(function(name) {
    var cells = STAGES.map(function(col) {
      var v = mx[name][col];
      var cellStyle = vBorder+';text-align:center;padding:6px 10px;font-size:12px;';
      if (v && globalMax > 0) {
        var opacity = 0.08 + 0.65 * (v / globalMax);
        cellStyle += 'font-weight:600;color:var(--text);background:rgba('+HEAT_RGB+','+opacity.toFixed(2)+')';
      } else {
        cellStyle += 'color:var(--text3)';
      }
      return '<td style="'+cellStyle+'">'+(v||'—')+'</td>';
    }).join('');
    return '<tr style="border-bottom:1px solid var(--border)">'+
      '<td style="font-size:11px;color:var(--text2);padding:6px 10px;white-space:nowrap">'+_firstName(name)+'</td>'+
      cells+'</tr>';
  }).join('');

  var table = '<table style="width:100%;border-collapse:collapse"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table>';

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Health matrix by assignee</div><div class="panel-sub">Assignee × lifecycle status</div></div></div>'+
    '<div class="panel-body"><div class="tbl-scroll">'+table+'</div></div>';
  _makePanelCollapsible('dash-health');
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
  _makePanelCollapsible('dash-scatter', true);
}

/* ── Section 3B: Roadmap Year Plan × Status ── */
function _buildConfHeatmap(data) {
  var el = document.getElementById('dash-conf-heatmap'); if (!el) return;

  /* Collect distinct years from Roadmap Year Plan field */
  var yearSet = {};
  data.forEach(function(d) {
    (d['Roadmap Year Plan'] || '').split(';').forEach(function(v) {
      var m = v.trim().match(/^ROADMAP_(\d{4})$/);
      if (m) yearSet[m[1]] = true;
    });
  });
  var years = Object.keys(yearSet).sort();

  function _cellStyle(col, count) {
    if (!count) return 'background:var(--surface2);color:var(--text3)';
    var map = {
      'Parking Lot':        'background:rgba(158,152,144,.18);color:#9E9890;font-weight:700',
      'Budget Approval':    'background:rgba(224,120,120,.2);color:var(--down);font-weight:700',
      'Discovery':          'background:rgba(212,168,80,.2);color:var(--amber);font-weight:700',
      'Ready for Delivery': 'background:rgba(155,143,224,.2);color:var(--purple);font-weight:700',
      'Delivery':           'background:rgba(107,174,212,.2);color:var(--teal);font-weight:700',
      'Done':               'background:rgba(109,191,154,.2);color:var(--up);font-weight:700'
    };
    return map[col] || 'background:rgba(88,166,255,.12);color:var(--accent);font-weight:700';
  }

  var thStyle = 'text-align:center;font-size:10px;font-weight:600;color:var(--text3);padding:6px 4px;border-bottom:1px solid var(--border);white-space:nowrap';
  var thead = '<tr><th style="text-align:left;font-size:10px;font-weight:600;color:var(--text3);padding:6px 8px;border-bottom:1px solid var(--border)">Year Plan</th>'+
    STAGES.map(function(c){ return '<th style="'+thStyle+'">'+c+'</th>'; }).join('')+'</tr>';

  var tbody = (years.length ? years : ['—']).map(function(yr) {
    var key = 'ROADMAP_' + yr;
    var cells = STAGES.map(function(col) {
      var count = data.filter(function(d) {
        var ys = (d['Roadmap Year Plan'] || '').split(';').map(function(v){ return v.trim(); });
        return ys.indexOf(key) >= 0 && d.Status === col;
      }).length;
      return '<td style="text-align:center;padding:7px 4px;font-size:12px;border-radius:3px;'+_cellStyle(col,count)+'">'+(count||'—')+'</td>';
    }).join('');
    return '<tr><td style="font-size:11px;color:var(--text2);padding:6px 8px;white-space:nowrap;font-weight:600">'+yr+'</td>'+cells+'</tr>';
  }).join('');

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Roadmap Year Plan × status</div><div class="panel-sub">Initiatives per year plan × lifecycle stage</div></div></div>'+
    '<div class="panel-body"><div class="tbl-scroll"><table style="width:100%;border-collapse:collapse"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table></div></div>';
  _makePanelCollapsible('dash-conf-heatmap');
}

/* ── Section 4A: Project Goal Distribution ── */
function _buildImpactCoverage(data) {
  var el = document.getElementById('dash-impact'); if (!el) return;
  if (!data.length) { el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Project Goal distribution</div></div></div><div class="panel-body"><div style="color:var(--text3);font-size:12px;padding:20px">No data</div></div>'; _makePanelCollapsible('dash-impact'); return; }

  /* Count by Project Goal field */
  var counts = {};
  data.forEach(function(d) {
    var g = (d['Project Goal'] || '').trim();
    if (!g) g = '(not set)';
    counts[g] = (counts[g] || 0) + 1;
  });
  var goals = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
  var maxCount = counts[goals[0]] || 1;
  var total = data.length;

  var bars = goals.map(function(goal, i) {
    var count = counts[goal];
    var pct = Math.round(count / total * 100);
    var barPct = Math.round(count / maxCount * 100);
    var col = GOAL_COLORS[goal] || ['var(--accent)','var(--teal)','var(--purple)','var(--up)','var(--amber)'][i % 5];
    return '<div style="margin-bottom:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'+
        '<div style="font-size:11px;color:var(--text);font-weight:500;line-height:1.3">'+goal+'</div>'+
        '<div style="font-size:10px;color:var(--text2);white-space:nowrap;margin-left:8px">'+count+' <span style="color:var(--text3)">('+pct+'%)</span></div>'+
      '</div>'+
      '<div style="height:10px;background:var(--surface2);border-radius:3px;overflow:hidden">'+
        '<div style="width:'+barPct+'%;height:100%;background:'+col+';border-radius:3px;transition:width .4s"></div>'+
      '</div>'+
    '</div>';
  }).join('');

  el.innerHTML = '<div class="panel-head"><div><div class="panel-title">Project Goal distribution</div><div class="panel-sub">Initiatives count per project goal</div></div></div>'+
    '<div class="panel-body" style="padding-top:10px">'+bars+'</div>';
  _makePanelCollapsible('dash-impact');
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
  var STATUSES2 = STAGES;
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
  _makePanelCollapsible('dash-bau');
}

/* ── Section 5: Assignee lollipop chart ── */
function _buildAssigneeCompact(data) {
  var el = document.getElementById('dash-assignee');
  if (!el) return;

  var prim = {}, sec = {};
  data.forEach(function(d) {
    var n1 = ((d['Assignee'] && d['Assignee'].displayName) || d['Assignee.displayName'] || '').trim();
    var n2raw = ((d['Assignee (2nd)'] && d['Assignee (2nd)'].displayName) || d['Assignee (2nd).displayName'] || '').trim();
    if (n1) { var f1 = _firstName(n1); prim[f1] = (prim[f1] || 0) + 1; }
    if (n2raw) { n2raw.split(';').forEach(function(p){ var f2=_firstName(p.trim()); if(f2&&f2!=='—') sec[f2]=(sec[f2]||0)+1; }); }
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
  _makePanelCollapsible('dash-assignee');
}

/* Render initiatives */
function renderInitiatives(){
  _loadInitFilters();
  _saveInitFilters();
  var filtered=filterYear(allData,initYearFilter).filter(function(d){return(d['Roadmap Status']||'')!=="Won't do";});
  renderYF('yf-init',initYearFilter,function(btn,val){initYearFilter=toggleYF(initYearFilter,val);_syncNoYearBtn('btn-no-year',initYearFilter);renderInitiatives();});
  _syncNoYearBtn('btn-no-year',initYearFilter);
  buildDashboard(filtered);
}

/* CSV parser — handles normal row-per-record format */

function renderList(){
  _loadListFilters();
  _saveListFilters();
  /* Year filter */
  renderYF('yf-list',listYearFilter,function(btn,val){
    listYearFilter=toggleYF(listYearFilter,val);
    _syncNoYearBtn('btn-no-year-list',listYearFilter);
    renderList();
  });
  _syncNoYearBtn('btn-no-year-list',listYearFilter);

  /* Assignee dropdown — collect unique names (primary + 2nd) */
  var allAssignees=new Set();
  allData.forEach(function(d){
    var a1=(d['Assignee.displayName']||'').trim().split(' ')[0];
    if(a1&&a1.length>1&&a1!=='[no')allAssignees.add(a1);
    (d['Assignee (2nd).displayName']||'').split(';').forEach(function(n){
      var fn=n.trim().split(' ')[0]; if(fn&&fn.length>1&&fn!=='[no')allAssignees.add(fn);
    });
  });
  GDB.buildCheckDropdown({wrapperId:'ini-assignee-dropdown-wrap', btnLabelId:'ini-assignee-btn-label',
    listId:'ini-assignee-checkbox-list', values:Array.from(allAssignees).sort(),
    activeArr:listAssigneeFilter, colorMap:null, toggleFn:'onIniAssigneeToggle'});

  /* Status dropdown — fixed order matching lifecycle stages */
  var LIST_STATUS_COLORS={'Parking Lot':'var(--text3)','Budget Approval':'var(--amber)','Discovery':'var(--purple)','Ready for Delivery':'var(--teal)','Delivery':'var(--accent)','Done':'var(--up)'};
  GDB.buildCheckDropdown({wrapperId:'list-status-dropdown-wrap', btnLabelId:'list-status-btn-label', listId:'list-status-checkbox-list', values:STAGES, activeArr:listStatusFilter, colorMap:LIST_STATUS_COLORS, toggleFn:'onListStatusToggle'});

  /* Component dropdown */
  var listCompVals=[];
  allData.forEach(function(d){
    (d['Components']||'').split(';').forEach(function(c){ var t=c.trim(); if(t&&listCompVals.indexOf(t)<0)listCompVals.push(t); });
  });
  GDB.buildCheckDropdown({wrapperId:'comp-list-dropdown-wrap', btnLabelId:'comp-list-btn-label', listId:'comp-list-checkbox-list', values:_sortCompVals(listCompVals), activeArr:listComponentFilter, colorMap:null, toggleFn:'onListCompToggle'});

  /* Dependency System dropdown */
  var listDepVals=[];
  allData.forEach(function(d){
    (d['Dependency Systems']||'').split(';').forEach(function(v){ var t=v.trim(); if(t&&listDepVals.indexOf(t)<0)listDepVals.push(t); });
  });
  listDepVals.sort();
  GDB.buildCheckDropdown({wrapperId:'dep-list-dropdown-wrap', btnLabelId:'dep-list-btn-label', listId:'dep-list-checkbox-list', values:listDepVals, activeArr:listDepFilter, colorMap:null, toggleFn:'onListDepToggle'});

  /* PM Role dropdown */
  var listPMVals=[];
  allData.forEach(function(d){ var v=(d['PM Role']||'').trim(); if(v&&listPMVals.indexOf(v)<0)listPMVals.push(v); });
  listPMVals.sort();
  GDB.buildCheckDropdown({wrapperId:'list-pm-dropdown-wrap', btnLabelId:'list-pm-btn-label', listId:'list-pm-checkbox-list', values:listPMVals, activeArr:listPMRoleFilter, colorMap:null, toggleFn:'onListPMToggle'});

  /* Roadmap status dropdown checkboxes */
  var rsVals=[];
  allData.forEach(function(d){ var v=d['Roadmap Status']||''; if(v&&rsVals.indexOf(v)<0)rsVals.push(v); });
  rsVals.sort();
  GDB.buildCheckDropdown({wrapperId:'rs-dropdown-wrap', btnLabelId:'rs-btn-label', listId:'rs-checkbox-list', values:rsVals, activeArr:listRoadmapFilter, colorMap:RC, toggleFn:'onListRoadmapToggle'});

  /* Sync search box value */
  var searchEl=document.getElementById('list-search');
  if(searchEl&&searchEl.value!==listSearchQuery)searchEl.value=listSearchQuery;

  /* Filter data */
  var filtered=filterYear(allData,listYearFilter);
  if(listStatusFilter.length>0){
    filtered=filtered.filter(function(d){ return listStatusFilter.indexOf(d.Status||'')>=0; });
  }
  if(listAssigneeFilter.length>0){
    filtered=filtered.filter(function(d){
      var a1=(d['Assignee.displayName']||'').trim().split(' ')[0];
      if(listAssigneeFilter.indexOf(a1)>=0) return true;
      return (d['Assignee (2nd).displayName']||'').split(';').some(function(n){
        return listAssigneeFilter.indexOf(n.trim().split(' ')[0])>=0;
      });
    });
  }
  if(listComponentFilter.length>0){
    filtered=filtered.filter(function(d){
      var comps=(d['Components']||'').split(';').map(function(c){return c.trim();}).filter(Boolean);
      var hasMissing=listComponentFilter.indexOf('(missing component)')>=0;
      var regular=listComponentFilter.filter(function(f){return f!=='(missing component)';});
      return (hasMissing&&comps.length===0)||(regular.some(function(f){return comps.indexOf(f)>=0;}));
    });
  }
  if(listDepFilter.length>0){
    filtered=filtered.filter(function(d){
      var deps=(d['Dependency Systems']||'').split(';').map(function(v){return v.trim();}).filter(Boolean);
      return listDepFilter.some(function(f){return deps.indexOf(f)>=0;});
    });
  }
  if(listPMRoleFilter.length>0){
    filtered=filtered.filter(function(d){ return listPMRoleFilter.indexOf((d['PM Role']||'').trim())>=0; });
  }
  /* Roadmap status filter */
  if(listRoadmapFilter.length>0){
    filtered=filtered.filter(function(d){ return listRoadmapFilter.indexOf(d['Roadmap Status']||'')>=0; });
  }
  /* Hide Won't do toggle */
  if(listHideWontDo){
    filtered=filtered.filter(function(d){ return(d['Roadmap Status']||'')!=="Won't do"; });
  }
  /* Sync toggle button state */
  var _wdBtn=document.getElementById('btn-list-hide-wontdo');
  if(_wdBtn){ _wdBtn.classList.toggle('active',listHideWontDo); }
  /* Summary search */
  if(listSearchQuery.trim()){
    var q=listSearchQuery.trim().toLowerCase();
    filtered=filtered.filter(function(d){ return (d.Summary||'').toLowerCase().indexOf(q)>=0; });
  }

  /* Dynamic sort */
  filtered=filtered.slice().sort(function(a,b){
    var col=_listSortCol, asc=_listSortAsc;
    var va, vb;
    if(col==='Key'){
      va=parseInt((a.Key||'').replace(/[^0-9]/g,''))||0;
      vb=parseInt((b.Key||'').replace(/[^0-9]/g,''))||0;
    } else if(col==='Start'||col==='End'){
      var fk=col==='Start'?'Target Project Start':'Target Project End';
      va=new Date((function(r){try{var p=JSON.parse(r);return p&&p.start?p.start:r;}catch(e){return r;}})( a[fk]||'')).getTime()||0;
      vb=new Date((function(r){try{var p=JSON.parse(r);return p&&p.start?p.start:r;}catch(e){return r;}})( b[fk]||'')).getTime()||0;
    } else {
      var map={'Summary':'Summary','Status':'Status','Roadmap':'Roadmap Status','Goal':'Project Goal','Type':'Project Type','Assignee':'Assignee.displayName','Assignee2':'Assignee (2nd).displayName','Monitor':'Project Monitoring Status'};
      var fld=map[col]||col;
      va=(a[fld]||'').toLowerCase();
      vb=(b[fld]||'').toLowerCase();
    }
    if(va<vb) return asc?-1:1;
    if(va>vb) return asc?1:-1;
    return 0;
  });

  /* Store filtered and reset to page 1, then render */
  _lastListFiltered = filtered;
  _listPage = 1;
  _renderListPage();
}

function _listPgHtml() {
  var total = _lastListFiltered.length;
  var totalPages = Math.max(1, Math.ceil(total / _listPageSize));
  var out = '<span style="font-size:11px;color:var(--text3);margin-right:8px">'+total+' initiatives</span>';
  if (totalPages > 1) {
    var p = _listPage;
    out += '<button class="pg-btn" onclick="_goListPage(1)" '+(p<=1?'disabled':'')+'>«</button>';
    out += '<button class="pg-btn" onclick="_goListPage('+(p-1)+')" '+(p<=1?'disabled':'')+'>‹</button>';
    var from=Math.max(1,p-2), to=Math.min(totalPages,from+4);
    from=Math.max(1,to-4);
    for(var i=from;i<=to;i++){
      out += '<button class="pg-btn'+(i===p?' active':'')+'" onclick="_goListPage('+i+')">'+i+'</button>';
    }
    out += '<button class="pg-btn" onclick="_goListPage('+(p+1)+')" '+(p>=totalPages?'disabled':'')+'>›</button>';
    out += '<button class="pg-btn" onclick="_goListPage('+totalPages+')" '+(p>=totalPages?'disabled':'')+'>»</button>';
  }
  return out;
}

function _goListPage(n) {
  var totalPages = Math.max(1, Math.ceil(_lastListFiltered.length / _listPageSize));
  _listPage = Math.max(1, Math.min(n, totalPages));
  _renderListPage();
}

function _renderListPage() {
  var data = _lastListFiltered;
  var totalPages = Math.max(1, Math.ceil(data.length / _listPageSize));
  _listPage = Math.max(1, Math.min(_listPage, totalPages));
  var pageData = data.slice((_listPage-1)*_listPageSize, _listPage*_listPageSize);

  var pgHtml = _listPgHtml();
  var top = document.getElementById('list-pg-top');
  var bot = document.getElementById('list-pg-bot');
  if (top) top.innerHTML = pgHtml;
  if (bot) bot.innerHTML = pgHtml;

  function fd(raw){
    var p=raw?(function(){try{return JSON.parse(raw)}catch(e){return null}})():null;
    var d=p?p.start:(raw&&/\d{4}-\d{2}-\d{2}/.test(raw)?raw.match(/(\d{4}-\d{2}-\d{2})/)[1]:null);
    if(!d)return '—';
    var parts=d.split('-');return GDB.MONTHS[+parts[1]-1]+' '+parts[0];
  }

  var listBody=document.getElementById('list-body');
  if(!listBody)return;
  listBody.innerHTML=pageData.length
    ?pageData.map(function(d){
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
        var a2=(d['Assignee (2nd).displayName']||'').split(';').map(function(n){return n.trim().split(' ')[0];}).filter(Boolean).join(', ')||'—';
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
          '<td style="text-align:center">'+
            (String(d['Document']||'').replace(/^"|"$/g,'').trim()
              ? '<a href="'+String(d['Document']||'').replace(/^"|"$/g,'').trim()+'" target="_blank" class="doc-icon-link" title="Confluence document"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></a>'
              : '<span style="color:var(--text3)">—</span>')+
          '</td>'+
        '</tr>';
      }).join('')
    :'<tr><td colspan="12" style="text-align:center;color:var(--text3);padding:24px">No initiatives match this filter.</td></tr>';
}

function listSortBy(col){
  if(_listSortCol===col){ _listSortAsc=!_listSortAsc; } else { _listSortCol=col; _listSortAsc=true; }
  _listPage=1;
  renderList();
  GDB.highlightSortCol('list-thead', _listSortCol);
}
function onListStatusToggle(val){
  var idx=listStatusFilter.indexOf(val);
  if(idx>=0)listStatusFilter.splice(idx,1); else listStatusFilter.push(val);
  renderList();
  var panel=document.getElementById('list-status-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearListStatusFilter(){ listStatusFilter=[]; document.getElementById('list-status-dropdown-panel').style.display='none'; renderList(); }
function onIniAssigneeToggle(v){
  var i=listAssigneeFilter.indexOf(v); if(i>=0)listAssigneeFilter.splice(i,1); else listAssigneeFilter.push(v);
  renderList();
  var p=document.getElementById('ini-assignee-dropdown-panel'); if(p) p.style.display='block';
}
function onListCompToggle(val){
  var idx=listComponentFilter.indexOf(val);
  if(idx>=0)listComponentFilter.splice(idx,1); else listComponentFilter.push(val);
  renderList();
  var panel=document.getElementById('comp-list-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearListCompFilter(){ listComponentFilter=[]; document.getElementById('comp-list-dropdown-panel').style.display='none'; renderList(); }

function onListDepToggle(val){
  var idx=listDepFilter.indexOf(val);
  if(idx>=0)listDepFilter.splice(idx,1); else listDepFilter.push(val);
  renderList();
  var panel=document.getElementById('dep-list-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearListDepFilter(){ listDepFilter=[]; document.getElementById('dep-list-dropdown-panel').style.display='none'; renderList(); }

function onListPMToggle(val){
  var idx=listPMRoleFilter.indexOf(val);
  if(idx>=0)listPMRoleFilter.splice(idx,1); else listPMRoleFilter.push(val);
  renderList();
  var panel=document.getElementById('list-pm-dropdown-panel'); if(panel)panel.style.display='block';
}
function clearListPMFilter(){ listPMRoleFilter=[]; document.getElementById('list-pm-dropdown-panel').style.display='none'; renderList(); }
function onListSearchChange(val){ listSearchQuery=val||''; renderList(); }
function toggleListHideWontDo(){ listHideWontDo=!listHideWontDo; renderList(); }
function onListRoadmapToggle(val){
  var idx=listRoadmapFilter.indexOf(val);
  if(idx>=0)listRoadmapFilter.splice(idx,1); else listRoadmapFilter.push(val);
  renderList();
  /* keep panel open after toggling */
  var panel=document.getElementById('rs-dropdown-panel');
  if(panel) panel.style.display='block';
}

/* ══════════════════════════════════════════════════════════════
   ROADMAP VIEW — group by Project Goal, Q1–Q4 columns
══════════════════════════════════════════════════════════════ */

var rmYearFilter=2026;
var rmComponentFilter=[];
var rmDepFilter=[];
var rmPMRoleFilter=[];
var rmStatusFilter=[];
var rmSearchQuery='';
var rmHideNoDate=false;
var _filtersLoadedRm=false;

function _saveRmFilters(){
  GDB.saveFilters('gdb_filter_initiative_roadmap',{
    rmYearFilter:rmYearFilter, rmComponentFilter:rmComponentFilter,
    rmDepFilter:rmDepFilter, rmPMRoleFilter:rmPMRoleFilter, rmStatusFilter:rmStatusFilter,
    rmSearchQuery:rmSearchQuery, rmHideNoDate:rmHideNoDate
  });
}
function _loadRmFilters(){
  if(_filtersLoadedRm)return; _filtersLoadedRm=true;
  var f=GDB.loadFilters('gdb_filter_initiative_roadmap'); if(!f)return;
  if(f.rmYearFilter)             rmYearFilter=f.rmYearFilter;
  if(Array.isArray(f.rmComponentFilter)) rmComponentFilter=f.rmComponentFilter;
  if(Array.isArray(f.rmDepFilter))       rmDepFilter=f.rmDepFilter;
  if(Array.isArray(f.rmPMRoleFilter))    rmPMRoleFilter=f.rmPMRoleFilter;
  if(Array.isArray(f.rmStatusFilter))    rmStatusFilter=f.rmStatusFilter;
  if(f.rmSearchQuery)            rmSearchQuery=f.rmSearchQuery;
  if(f.rmHideNoDate!=null)       rmHideNoDate=!!f.rmHideNoDate;
}

function _rmParseDate(fieldVal){
  if(!fieldVal)return null;
  try{var o=JSON.parse(fieldVal);return o.start||null;}catch(e){return null;}
}
function _rmDateToQ(dateStr){
  if(!dateStr)return null;
  var m=parseInt((dateStr.split('-')[1]||'0'),10);
  if(m>=1&&m<=3)return 1; if(m>=4&&m<=6)return 2; if(m>=7&&m<=9)return 3; return 4;
}
function _rmDateYear(dateStr){
  if(!dateStr)return null;
  return parseInt((dateStr.split('-')[0]||'0'),10)||null;
}
function _rmStartQ(dateStr,filterYear){
  if(!dateStr)return null;
  var y=_rmDateYear(dateStr);
  if(!y)return null;
  if(y<filterYear)return 1;           /* started before this year — ongoing from Q1 */
  if(y===filterYear)return _rmDateToQ(dateStr);
  return null;                         /* starts after filter year — treat as unscheduled */
}
function _rmEndQ(dateStr,filterYear){
  if(!dateStr)return null;
  var y=_rmDateYear(dateStr);
  if(!y)return null;
  if(y>filterYear)return 4;            /* ends after this year — show through Q4 */
  if(y===filterYear)return _rmDateToQ(dateStr);
  return null;                         /* ended before filter year */
}
function _rmEsc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _rmStatusCls(status){
  var s=(status||'').toLowerCase();
  if(s==='delivery')return 'rm-delivery';
  if(s==='ready for delivery')return 'rm-rfd';
  if(s==='discovery')return 'rm-discovery';
  if(s==='done')return 'rm-done';
  if(s==='budget approval')return 'rm-budget';
  return 'rm-parking';
}
function _rmFmtOwner(email){
  if(!email)return '';
  var local=(email.split('@')[0]||'').trim();
  if(!local)return '';
  return local.split('.').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(' ');
}
var _RM_MON_COLOR={'On track':'#6DBF9A','Delayed':'#f85149','At risk':'#f85149','Off track':'#f85149'};
function _rmBadge(label,color){
  if(!label)return '';
  var bg=color+'22'; // ~13% opacity hex
  return '<span class="rm-badge" style="color:'+color+';background:'+bg+';border:1px solid '+color+'44">'+_rmEsc(label)+'</span>';
}
function _rmChip(d){
  var status=(d['Status']||'').trim();
  var cls=_rmStatusCls(status);
  var summary=(d['Summary']||'').trim();
  var key=(d['Key']||'').trim();
  var roadmapStatus=(d['Roadmap Status']||'').trim();
  var monStatus=(d['Project Monitoring Status']||'').trim();
  var href=CONFIG.JIRA_BASE+key;
  var tStart=fmtMonYear(d['Target Project Start']||'');
  var tEnd  =fmtMonYear(d['Target Project End']||'');
  var timeline=(tStart!=='—'||tEnd!=='—') ? tStart+' → '+tEnd : 'No target date set';
  var badges='';
  if(status)       badges+=_rmBadge(status,       SC[status]||'#8b949e');
  if(roadmapStatus)badges+=_rmBadge(roadmapStatus, RC[roadmapStatus]||'#8b949e');
  if(monStatus)    badges+=_rmBadge(monStatus,     _RM_MON_COLOR[monStatus]||'#8b949e');
  return '<a class="rm-chip '+cls+'" href="'+href+'" target="_blank" title="'+_rmEsc(key+' · '+summary)+'">' +
    '<span class="rm-chip-key">'+_rmEsc(key)+' ↗</span>' +
    '<span class="rm-chip-name">'+_rmEsc(summary)+'</span>' +
    (timeline==='No target date set'
      ?'<span class="rm-chip-owner" style="color:#f85149;font-style:italic">'+timeline+'</span>'
      :'<span class="rm-chip-owner">'+_rmEsc(timeline)+'</span>') +
    (badges?'<span class="rm-chip-badges">'+badges+'</span>':'') +
    '</a>';
}

function renderRoadmap(){
  _loadRmFilters();
  var container=document.getElementById('rm-table-container'); if(!container)return;

  /* year buttons */
  var allYears=[];
  allData.forEach(function(d){
    (d['Roadmap Year Plan']||'').split(';').forEach(function(v){
      var m=v.trim().match(/^ROADMAP_(\d{4})$/);
      if(m){var y=parseInt(m[1]);if(allYears.indexOf(y)<0)allYears.push(y);}
    });
  });
  allYears.sort();
  var yrEl=document.getElementById('rm-year-btns');
  if(yrEl) yrEl.innerHTML=allYears.map(function(y){
    return '<button class="fb-btn'+(y===rmYearFilter?' active':'')+'" onclick="onRmYearChange('+y+')">'+y+'</button>';
  }).join('');

  /* filter data */
  var yearKey='ROADMAP_'+rmYearFilter;
  var filtered=allData.filter(function(d){
    if((d['Roadmap Status']||'').trim()==="Won't do") return false;
    return (d['Roadmap Year Plan']||'').split(';').some(function(v){return v.trim()===yearKey;});
  });
  if(rmComponentFilter.length>0){
    filtered=filtered.filter(function(d){
      var cs=(d['Components']||'').split(';').map(function(c){return c.trim();}).filter(Boolean);
      var hasMissing=rmComponentFilter.indexOf('(missing component)')>=0;
      var regular=rmComponentFilter.filter(function(f){return f!=='(missing component)';});
      return (hasMissing&&cs.length===0)||(regular.some(function(f){return cs.indexOf(f)>=0;}));
    });
  }
  if(rmDepFilter.length>0){
    filtered=filtered.filter(function(d){
      var deps=(d['Dependency Systems']||'').split(';').map(function(v){return v.trim();}).filter(Boolean);
      return rmDepFilter.some(function(f){return deps.indexOf(f)>=0;});
    });
  }
  if(rmPMRoleFilter.length>0){
    filtered=filtered.filter(function(d){return rmPMRoleFilter.indexOf((d['PM Role']||'').trim())>=0;});
  }
  if(rmStatusFilter.length>0){
    filtered=filtered.filter(function(d){return rmStatusFilter.indexOf((d['Status']||'').trim())>=0;});
  }
  if(rmSearchQuery){
    var q=rmSearchQuery.toLowerCase();
    filtered=filtered.filter(function(d){
      return (d['Summary']||'').toLowerCase().indexOf(q)>=0||(d['Key']||'').toLowerCase().indexOf(q)>=0;
    });
  }
  if(rmHideNoDate){
    filtered=filtered.filter(function(d){return !!_rmDateToQ(_rmParseDate(d['Target Project Start']));});
  }

  /* build dropdowns */
  var compVals=[];
  allData.forEach(function(d){(d['Components']||'').split(';').forEach(function(c){c=c.trim();if(c&&compVals.indexOf(c)<0)compVals.push(c);});});
  GDB.buildCheckDropdown({wrapperId:'rm-comp-wrap',btnLabelId:'rm-comp-lbl',listId:'rm-comp-list',values:_sortCompVals(compVals),activeArr:rmComponentFilter,colorMap:null,toggleFn:'onRmCompToggle'});

  var rmDepVals=[];
  allData.forEach(function(d){(d['Dependency Systems']||'').split(';').forEach(function(v){v=v.trim();if(v&&rmDepVals.indexOf(v)<0)rmDepVals.push(v);});});
  rmDepVals.sort();
  GDB.buildCheckDropdown({wrapperId:'rm-dep-wrap',btnLabelId:'rm-dep-lbl',listId:'rm-dep-list',values:rmDepVals,activeArr:rmDepFilter,colorMap:null,toggleFn:'onRmDepToggle'});

  var pmVals=[];
  allData.forEach(function(d){var v=(d['PM Role']||'').trim();if(v&&pmVals.indexOf(v)<0)pmVals.push(v);});
  pmVals.sort();
  GDB.buildCheckDropdown({wrapperId:'rm-pm-wrap',btnLabelId:'rm-pm-lbl',listId:'rm-pm-list',values:pmVals,activeArr:rmPMRoleFilter,colorMap:null,toggleFn:'onRmPMToggle'});

  GDB.buildCheckDropdown({wrapperId:'rm-status-wrap',btnLabelId:'rm-status-lbl',listId:'rm-status-list',values:STAGES,activeArr:rmStatusFilter,colorMap:SC,toggleFn:'onRmStatusToggle'});

  /* sync hide-no-date toggle button */
  var ndBtn=document.getElementById('rm-hide-nodate');
  if(ndBtn) ndBtn.classList.toggle('active',rmHideNoDate);

  var countEl=document.getElementById('rm-count');
  if(countEl) countEl.textContent=filtered.length+' initiatives · '+rmYearFilter;

  /* group by goal → sorted item list with start/end Q */
  var GOAL_ORDER=['Increase Revenue','Improve Customer Experience','Improve Customer Engagement','Improve Internal Operation','Strategic Direction'];
  var goalItems={};
  GOAL_ORDER.forEach(function(g){goalItems[g]=[];});
  var currentQ=Math.ceil((new Date().getMonth()+1)/3);

  filtered.forEach(function(d){
    var goal=(d['Project Goal']||'').trim();
    if(!goalItems[goal])return;
    var startQ=_rmStartQ(_rmParseDate(d['Target Project Start']),rmYearFilter);
    var endQ  =_rmEndQ  (_rmParseDate(d['Target Project End']),  rmYearFilter);
    if(startQ&&endQ&&endQ<startQ)endQ=startQ;
    goalItems[goal].push({d:d,startQ:startQ,endQ:endQ||startQ});
  });
  GOAL_ORDER.forEach(function(g){
    goalItems[g].sort(function(a,b){
      if(!a.startQ&&!b.startQ)return 0;
      if(!a.startQ)return 1; if(!b.startQ)return -1;
      return a.startQ!==b.startQ?a.startQ-b.startQ:(a.endQ||0)-(b.endQ||0);
    });
  });

  /* render table — one <tr> per initiative, goal cell uses rowspan */
  var html='<table class="rm-table"><thead><tr>';
  html+='<th class="rm-goal-hd">Project Goal</th>';
  [{q:1,label:'Q1',sub:'Jan – Mar'},{q:2,label:'Q2',sub:'Apr – Jun'},{q:3,label:'Q3',sub:'Jul – Sep'},{q:4,label:'Q4',sub:'Oct – Dec'}].forEach(function(col){
    var isNow=col.q===currentQ;
    html+='<th class="rm-q-hd rm-q'+col.q+(isNow?' rm-qnow':'')+'">'+col.label+' <span class="rm-q-sub">'+col.sub+' '+rmYearFilter+'</span>'+(isNow?' <span class="rm-now-tag">now</span>':'')+'</th>';
  });
  html+='</tr></thead><tbody>';

  GOAL_ORDER.forEach(function(goal){
    var items=goalItems[goal];
    if(!items.length)return;
    var color=GC[goal]||'#666';
    var unscheduled=items.filter(function(it){return!it.startQ;}).length;

    items.forEach(function(item,idx){
      html+='<tr class="rm-row">';
      /* Goal label — only on first row with rowspan covering all items */
      if(idx===0){
        html+='<td class="rm-goal-lbl" rowspan="'+items.length+'" style="border-left:3px solid '+color+'">' +
          '<div class="rm-goal-name"><span class="rm-dot" style="background:'+color+'"></span>'+_rmEsc(goal)+'</div>' +
          '<div class="rm-goal-count">'+items.length+' initiative'+(items.length!==1?'s':'') +
            (unscheduled?' · <span class="rm-nodate-badge">'+unscheduled+' unscheduled</span>':'') +
          '</div></td>';
      }
      var sq=item.startQ, eq=item.endQ||item.startQ;
      if(!sq){
        /* unscheduled — span all 4 Q with visual indicator */
        html+='<td class="rm-qcell rm-qcell-nodate" colspan="4">'+_rmChip(item.d)+'</td>';
      } else {
        /* empty cells before startQ */
        for(var qi=1;qi<sq;qi++) html+='<td class="rm-qcell'+(qi===currentQ?' rm-qcell-now':'')+'"></td>';
        /* chip cell spanning startQ → endQ */
        var span=eq-sq+1;
        var nowInSpan=(sq<=currentQ&&currentQ<=eq)?' rm-qcell-now':'';
        html+='<td class="rm-qcell'+nowInSpan+'" colspan="'+span+'">'+_rmChip(item.d)+'</td>';
        /* empty cells after endQ */
        for(var qi=eq+1;qi<=4;qi++) html+='<td class="rm-qcell'+(qi===currentQ?' rm-qcell-now':'')+'"></td>';
      }
      html+='</tr>';
    });
  });

  html+='</tbody></table>';
  container.innerHTML=html;
  _saveRmFilters();
}

function onRmYearChange(yr){rmYearFilter=yr;renderRoadmap();}
function onRmCompToggle(v){var i=rmComponentFilter.indexOf(v);if(i>=0)rmComponentFilter.splice(i,1);else rmComponentFilter.push(v);renderRoadmap();var p=document.getElementById('rm-comp-panel');if(p)p.style.display='block';}
function clearRmCompFilter(){rmComponentFilter=[];var p=document.getElementById('rm-comp-panel');if(p)p.style.display='none';renderRoadmap();}
function onRmDepToggle(v){var i=rmDepFilter.indexOf(v);if(i>=0)rmDepFilter.splice(i,1);else rmDepFilter.push(v);renderRoadmap();var p=document.getElementById('rm-dep-panel');if(p)p.style.display='block';}
function clearRmDepFilter(){rmDepFilter=[];var p=document.getElementById('rm-dep-panel');if(p)p.style.display='none';renderRoadmap();}
function onRmPMToggle(v){var i=rmPMRoleFilter.indexOf(v);if(i>=0)rmPMRoleFilter.splice(i,1);else rmPMRoleFilter.push(v);renderRoadmap();var p=document.getElementById('rm-pm-panel');if(p)p.style.display='block';}
function clearRmPMFilter(){rmPMRoleFilter=[];var p=document.getElementById('rm-pm-panel');if(p)p.style.display='none';renderRoadmap();}
function onRmStatusToggle(v){var i=rmStatusFilter.indexOf(v);if(i>=0)rmStatusFilter.splice(i,1);else rmStatusFilter.push(v);renderRoadmap();var p=document.getElementById('rm-status-panel');if(p)p.style.display='block';}
function clearRmStatusFilter(){rmStatusFilter=[];var p=document.getElementById('rm-status-panel');if(p)p.style.display='none';renderRoadmap();}
function onRmSearchChange(v){rmSearchQuery=v||'';renderRoadmap();}
function onRmHideNoDate(){rmHideNoDate=!rmHideNoDate;renderRoadmap();}
