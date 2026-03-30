/* ══════════════════════════════════════════════
   RENDERING — UI, charts, timeline, filters
   Depends on: config.js  (must load first)
══════════════════════════════════════════════ */

let charts={};
let sumYearFilter=['ROADMAP_2026'],initYearFilter=['all'],showNoYear=false,sumStage='all',hideNoDate=false;
let listYearFilter=['ROADMAP_2026'];
let listAssigneeFilter='all';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STAGES=['Parking Lot','Budget Approval','Discovery','Ready for Delivery','Delivery','Done'];
const SC={'Parking Lot':'#B4B2A9','Budget Approval':'#F09595','Discovery':'#EF9F27','Ready for Delivery':'#AFA9EC','Delivery':'#85B7EB','Done':'#5DCAA5'};
const RC={'New':'#B5D4F4','Next':'#EF9F27','Now':'#85B7EB','Completed':'#9FE1CB','Completed With':'#5DCAA5'};
const GC={'Increase Revenue':'#97C459','Improve Internal Operation':'#85B7EB','Improve Customer Experience':'#AFA9EC','Improve Customer Engagement':'#F4C0D1','Strategic Direction':'#FAC775'};
const TC={'Strategic':'#AFA9EC','BAU':'#85B7EB'};
const AC=['#85B7EB','#5DCAA5','#EF9F27','#AFA9EC','#F09595','#97C459','#F4C0D1','#FAC775','#B4B2A9'];
let allData=[];

function switchTab(i){
  /* tab-btn order: 0=Summary, 1=Initiatives(wrap), 2=Issues, 3=Support */
  /* i: 0=Summary, 1=Initiatives, 2=List(sub), 3=Issues, 4=Support */
  const mainIdx=i===0?0:i===1||i===2?1:i-1;
  document.querySelectorAll('.tab-btn').forEach((b,j)=>b.classList.toggle('active',j===mainIdx));
  /* dropdown sub-items */
  document.querySelectorAll('.tab-dropdown-menu button').forEach((b,j)=>b.classList.toggle('active',i===2&&j===0));
  document.querySelectorAll('.tab-content').forEach((t,j)=>t.classList.toggle('active',j===i));
  if(i===2)renderList();
}
function getJ(r){try{return JSON.parse(r)}catch(e){return null}}
function getStart(r){const p=getJ(r);return p?(p.start||null):(r&&/\d{4}-\d{2}-\d{2}/.test(r)?r.match(/(\d{4}-\d{2}-\d{2})/)[1]:null)}
function getEnd(r){const p=getJ(r);return p?(p.end||null):(r&&/\d{4}-\d{2}-\d{2}/.test(r)?r.match(/(\d{4}-\d{2}-\d{2})/)[1]:null)}
function fmtDate(d){if(!d)return'—';const[y,m]=d.split('-');return MONTHS[+m-1]+' '+y}
function cl(v){return String(v||'').replace(/^"|"$/g,'').trim()}
function jiraLink(k){return`<a class="jira-link" href="${CONFIG.JIRA_BASE}${k}" target="_blank">${k}</a>`}
function monBadge(v){if(!v)return'<span style="color:#ccc;font-size:10px">—</span>';const d=v.toLowerCase();if(d.includes('track'))return`<span class="mon-badge mon-ontrack">✅ On track</span>`;if(d.includes('risk'))return`<span class="mon-badge mon-atrisk">⚠️ At risk</span>`;if(d.includes('delay'))return`<span class="mon-badge mon-delayed">🆘 Delayed</span>`;return`<span style="font-size:10px;color:#888">${v}</span>`;}
function monEmoji(v){if(!v)return'';const d=v.toLowerCase();if(d.includes('delay'))return'🆘 ';if(d.includes('risk'))return'⚠️ ';if(d.includes('track'))return'✅ ';return'';}
function sPill(v){const m={'Parking Lot':'parking','Budget Approval':'budget','Discovery':'discovery','Ready for Delivery':'rfd','Delivery':'delivery','Done':'done'};const c=m[v]||'';return c?`<span class="pill p-${c}">${v}</span>`:`<span style="font-size:10px;color:#888">${v||'—'}</span>`;}
function countBy(arr,key){return arr.reduce((a,d)=>{const v=d[key]||'(none)';a[v]=(a[v]||0)+1;return a},{});}

/* Year filter */
function getYears(){const s=new Set();allData.forEach(d=>(d['Roadmap Year Plan']||'').split(';').forEach(y=>{if(y.trim())s.add(y.trim())}));return['all',...Array.from(s).sort()];}
function renderYF(id,arr,cb){document.getElementById(id).innerHTML=getYears().map(y=>`<button class="fb-btn ${arr.includes(y)?'active':''}" onclick="(${cb.toString()})(this,'${y}')">${y==='all'?'All years':y.replace('ROADMAP_','')}</button>`).join('');}
function toggleYF(arr,val){if(val==='all')return['all'];const w=arr.filter(x=>x!=='all');const i=w.indexOf(val);if(i>=0){w.splice(i,1);return w.length===0?['all']:w;}return[...w,val];}
function filterYear(data,arr){if(arr.includes('all'))return data;return data.filter(d=>{const ys=(d['Roadmap Year Plan']||'').split(';').map(x=>x.trim());return arr.some(y=>ys.includes(y));});}
function filterNoYear(data){return data.filter(d=>!(d['Roadmap Year Plan']||'').trim());}
function toggleNoYear(btn){showNoYear=!showNoYear;btn.classList.toggle('active',showNoYear);renderInitiatives();}
function toggleHideNoDate(btn){hideNoDate=!hideNoDate;btn.classList.toggle('active',hideNoDate);renderSummary();}

/* Metrics */
function buildMetrics(data,id){
  const dv=data.filter(d=>d.Status==='Delivery').length;
  const dl=data.filter(d=>(d['Project Monitoring Status']||'').toLowerCase().includes('delay')).length;
  const ar=data.filter(d=>(d['Project Monitoring Status']||'').toLowerCase().includes('risk')).length;
  const pl=data.filter(d=>d.Status==='Discovery'||d.Status==='Ready for Delivery').length;
  const bg=data.filter(d=>d.Status==='Budget Approval').length;
  const dn=data.filter(d=>d.Status==='Done').length;
  const pk=data.filter(d=>d.Status==='Parking Lot').length;
  document.getElementById(id).innerHTML=[
    {l:'Total',v:data.length,s:'All initiatives',cls:'m-total'},
    {l:'Active delivery',v:dv,s:'In delivery now',cls:'m-info'},
    {l:'Needs attention',v:dl+ar,s:'Delayed or at risk',cls:'m-danger'},
    {l:'In pipeline',v:pl,s:'Discovery / RFD',cls:'m-purple'},
    {l:'Budget approval',v:bg,s:'Awaiting decision',cls:'m-danger'},
    {l:'Completed',v:dn,s:'Done this cycle',cls:'m-green'},
    {l:'Parking lot',v:pk,s:'Backlog / not planned',cls:'m-gray'},
  ].map(m=>`<div class="m-card ${m.cls}"><div class="m-label">${m.l}</div><div class="m-value">${m.v}</div><div class="m-sub">${m.s}</div></div>`).join('');
}

/* Timeline selects */
function populateRangeSelects(){
  const ss=document.getElementById('tl-start'),se=document.getElementById('tl-end');
  if(ss.options.length>0)return;
  CONFIG.TIMELINE_RANGE_OPTIONS.forEach(o=>{
    ss.appendChild(Object.assign(document.createElement('option'),{value:o.val,textContent:o.label}));
    se.appendChild(Object.assign(document.createElement('option'),{value:o.val,textContent:o.label}));
  });
  const yr=new Date().getFullYear(),defS=yr+'-01',defE=yr+'-12';
  const sOpts=Array.from(ss.options).map(o=>o.value);
  ss.value=sOpts.includes(defS)?defS:(sOpts.find(v=>v>=defS)||sOpts[0]);
  const eOpts=Array.from(se.options).map(o=>o.value);
  const eM=eOpts.filter(v=>v<=defE);
  se.value=eM.length?eM[eM.length-1]:eOpts[eOpts.length-1];
}

/* Timeline render */
function renderTimeline(data){
  populateRangeSelects();
  const ss=document.getElementById('tl-start').value,se=document.getElementById('tl-end').value;
  const[sy,sm]=ss.split('-').map(Number),[ey,em]=se.split('-').map(Number);
  const START=new Date(sy,sm-1,1),END=new Date(ey,em,0,23,59,59),totalMs=END-START,today=new Date();
  let tlData=hideNoDate?data.filter(d=>getStart(d['Target Project Start']||'')||getStart(d['Actual Project Start']||'')):data;
  tlData=[...tlData].sort((a,b)=>{const as=getStart(a['Target Project Start']||''),bs=getStart(b['Target Project Start']||'');if(!as&&!bs)return 0;if(!as)return 1;if(!bs)return-1;return new Date(as)-new Date(bs);});
  const mCols=[];let cy=sy,cm=sm-1;
  while(new Date(cy,cm,1)<=END){mCols.push({year:cy,month:cm});cm++;if(cm>11){cm=0;cy++;}}
  const nM=mCols.length;
  const qtrs=[];let cur=null;
  mCols.forEach(mc=>{const ql=`Q${Math.floor(mc.month/3)+1} ${mc.year}`;if(!cur||cur.label!==ql){if(cur)qtrs.push(cur);cur={label:ql,count:1};}else cur.count++;});
  if(cur)qtrs.push(cur);
  function pct(ds){if(!ds)return null;const d=new Date(ds);if(d<START)return 0;if(d>END)return 100;return((d-START)/totalMs*100);}
  function wPct(s,e){const ds=new Date(s),de=new Date(e),cs=Math.max(ds,START),ce=Math.min(de,END);if(ce<=cs)return 0.8;return((ce-cs)/totalMs*100);}
  const todayP=pct(today.toISOString().slice(0,10));
  document.getElementById('today-badge').textContent='Today: '+today.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const todayMonIdx=mCols.findIndex(mc=>mc.year===today.getFullYear()&&mc.month===today.getMonth());
  const todayColBg=todayMonIdx>=0?`<div class="tl-col-bg" style="left:${(todayMonIdx/nM*100).toFixed(2)}%;width:${(100/nM).toFixed(2)}%"></div>`:'';
  const qtrHtml=qtrs.map(q=>`<div class="tl-qtr" style="flex:${q.count}">${q.label}</div>`).join('');
  const monHtml=mCols.map(mc=>`<div class="tl-month-cell${today.getFullYear()===mc.year&&today.getMonth()===mc.month?' cur-month':''}">${MONTHS[mc.month]}</div>`).join('');
  const rowsHtml=tlData.map(d=>{
    const mon=d['Project Monitoring Status']||'';
    const isD=mon.toLowerCase().includes('delay'),isR=mon.toLowerCase().includes('risk'),isT=mon.toLowerCase().includes('track');
    const rowCls=isD?'row-delayed':isR?'row-atrisk':isT?'row-ontrack':'';
    const tS=getStart(d['Target Project Start']||''),tE=getEnd(d['Target Project End']||'');
    const aS=getStart(d['Actual Project Start']||''),aE=getEnd(d['Actual Project End']||'');
    const hasPlan=tS&&tE,hasActual=!!aS;
    const planBar=hasPlan?`<div class="tl-bar tl-bar-plan" style="left:${pct(tS).toFixed(2)}%;width:${wPct(tS,tE).toFixed(2)}%"></div>`:'';
    const actBar=hasActual?`<div class="tl-bar ${isD?'tl-bar-actual-del':'tl-bar-actual-ok'}" style="left:${pct(aS).toFixed(2)}%;width:${aE?wPct(aS,aE).toFixed(2):Math.max(.5,((Math.min(today,END)-new Date(aS))/totalMs*100)).toFixed(2)}%"></div>`:'';
    const tLine=(tS||tE)?`<span><span style="color:#378ADD;font-weight:600;min-width:40px;display:inline-block">Target</span>${fmtDate(tS)} \u2192 ${fmtDate(tE)}</span>`:'';
    const aLine=(aS||aE)?`<span><span style="color:${isD?'#E24B4A':'#1D9E75'};font-weight:600;min-width:40px;display:inline-block">Actual</span>${fmtDate(aS)} \u2192 ${aE?fmtDate(aE):'In progress'}</span>`:'';
    const dLine=(tLine||aLine)?`<div class="tl-date-line">${[tLine,aLine].filter(Boolean).join('<br>')}</div>`:'';
    const emoji=mon?(isD?'🆘 ':isR?'⚠️ ':isT?'✅ ':''):'';
    return`<div class="tl-row ${rowCls}"><div class="tl-label"><div class="tl-key-line">${jiraLink(d.Key)}</div><div class="tl-name" title="${d.Summary}">${emoji}${d.Summary}</div>${dLine}</div><div class="tl-track">${todayColBg}${todayP!==null?`<div class="tl-today-v" style="left:${todayP.toFixed(2)}%"><div class="tl-today-dot-v"></div></div>`:''} ${hasPlan||hasActual?planBar+actBar:`<div class="tl-no-date">No date set</div>`}</div><div class="tl-status-col">${mon?monBadge(mon):sPill(d.Status)}</div></div>`;
  }).join('');
  document.getElementById('tl-inner').innerHTML=`<div class="tl-header"><div class="tl-label-head"></div><div class="tl-grid-head"><div class="tl-qtr-row">${qtrHtml}</div><div class="tl-month-row">${monHtml}</div></div><div class="tl-status-head"></div></div>${rowsHtml}`;
}

/* Charts */
function mkVBar(id,labels,data,colors){
  if(charts[id])charts[id].destroy();
  const ctx=document.getElementById(id);if(!ctx)return;
  const total=data.reduce((a,b)=>a+b,0);
  charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{grid:{display:false},ticks:{font:{size:10},autoSkip:false,maxRotation:35}},y:{display:false,beginAtZero:true}},
      animation:{onComplete:function(){const ch=this,c2=ch.ctx;c2.font='bold 10px Arial';c2.textAlign='center';c2.textBaseline='bottom';
        ch.data.datasets.forEach((ds,di)=>{ds.data.forEach((v,bi)=>{const bar=ch.getDatasetMeta(di).data[bi];const pct=total>0?Math.round(v/total*100):0;c2.fillStyle='#555';c2.fillText(`${v} (${pct}%)`,bar.x,bar.y-3);});});}}}});
}
function mkHBar(id,wrapId,labels,data,colors){
  if(charts[id])charts[id].destroy();
  const ctx=document.getElementById(id);if(!ctx)return;
  const wrap=document.getElementById(wrapId)||ctx.parentElement;
  wrap.style.height=Math.max(100,labels.length*30+50)+'px';
  const total=data.reduce((a,b)=>a+b,0);
  charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:65}},
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{display:false,beginAtZero:true},y:{grid:{display:false},ticks:{font:{size:10}}}},
      animation:{onComplete:function(){const ch=this,c2=ch.ctx;c2.font='bold 10px Arial';c2.textAlign='left';c2.textBaseline='middle';
        ch.data.datasets.forEach((ds,di)=>{ds.data.forEach((v,bi)=>{const bar=ch.getDatasetMeta(di).data[bi];const pct=total>0?Math.round(v/total*100):0;c2.fillStyle='#555';c2.fillText(`${v} (${pct}%)`,bar.x+5,bar.y);});});}}}});
}
function mkDoughnut(id,labels,data,colors){
  if(charts[id])charts[id].destroy();
  const ctx=document.getElementById(id);if(!ctx)return;
  const total=data.reduce((a,b)=>a+b,0);
  charts[id]=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,position:'bottom',labels:{font:{size:10},padding:8,generateLabels:(ch)=>ch.data.labels.map((l,i)=>({text:`${l} (${ch.data.datasets[0].data[i]}, ${total>0?Math.round(ch.data.datasets[0].data[i]/total*100):0}%)`,fillStyle:ch.data.datasets[0].backgroundColor[i],strokeStyle:'#fff',lineWidth:1,hidden:false,index:i}))}},
      tooltip:{callbacks:{label:c=>{const pct=total>0?Math.round(c.parsed/total*100):0;return` ${c.label}: ${c.parsed} (${pct}%)`;}}}}}}); 
}

/* Render summary */
function renderSummary(){
  const filtered=filterYear(allData,sumYearFilter);
  renderYF('yf-sum',sumYearFilter,function(btn,val){sumYearFilter=toggleYF(sumYearFilter,val);renderSummary();});
  buildMetrics(filtered,'sum-metrics');
  document.getElementById('sum-stage-filter').innerHTML=['all',...STAGES].map(s=>`<button class="fb-btn ${sumStage===s?'active':''}" onclick="sumStage='${s}';renderSummary()">${s==='all'?'All stages':s}</button>`).join('');
  const tlData=sumStage==='all'?filtered:filtered.filter(d=>d.Status===sumStage);
  renderTimeline(tlData);
  renderDoneList(filtered);
}

/* ── Done initiatives list ────────────────── */
function renderDoneList(data){
  const done=data.filter(d=>d.Status==='Done')
    .sort((a,b)=>{
      const na=parseInt((a.Key||'').replace('PPP-',''))||0;
      const nb=parseInt((b.Key||'').replace('PPP-',''))||0;
      return na-nb;
    });
  const sec=document.getElementById('sum-done-section');
  if(!sec)return;
  if(!done.length){sec.style.display='none';return;}
  sec.style.display='block';
  document.getElementById('sum-done-list').innerHTML=done.map(function(d){
    var tE=getEnd(d['Target Project End']||'');
    var aE=getEnd(d['Actual Project End']||'');
    var goLive=getStart(d['Go-live Date']||'');
    var assignee=(d['Assignee.displayName']||'').split(' ')[0];
    var goal=d['Project Goal']||'';
    var impact=d['Business Impact']||'';
    var kpi=d['KPI vs Target']||'';

    var metaParts=[];
    if(goal)metaParts.push(goal);
    if(goLive)metaParts.push('Go-live: '+fmtDate(goLive));
    else if(aE)metaParts.push('Completed: '+fmtDate(aE));
    else if(tE)metaParts.push('Target: '+fmtDate(tE));
    if(assignee)metaParts.push(assignee);
    var meta=metaParts.join(' · ');

    var html='<div class="done-item">';
    html+='<div class="done-key">'+jiraLink(d.Key)+'</div>';
    html+='<div class="done-body">';
    html+='<div class="done-name">'+d.Summary+'</div>';
    if(meta)html+='<div class="done-meta">'+meta+'</div>';
    if(impact)html+='<div class="done-impact">'+impact+'</div>';
    if(kpi)html+='<div class="done-meta" style="margin-top:2px;color:#378ADD">'+kpi+'</div>';
    html+='</div></div>';
    return html;
  }).join('');
}

/* Render initiatives */
function renderInitiatives(){
  const filtered=showNoYear?filterNoYear(allData):filterYear(allData,initYearFilter);
  renderYF('yf-init',initYearFilter,function(btn,val){initYearFilter=toggleYF(initYearFilter,val);showNoYear=false;document.getElementById('btn-no-year').classList.remove('active');renderInitiatives();});
  buildMetrics(filtered,'init-metrics');
  /* charts */
  const sL=STAGES.filter(s=>filtered.some(d=>d.Status===s));
  mkVBar('c-status',sL,sL.map(s=>filtered.filter(d=>d.Status===s).length),sL.map(s=>SC[s]));
  const gl=countBy(filtered.filter(d=>d['Project Goal']),'Project Goal');
  const glK=Object.keys(gl).sort((a,b)=>gl[b]-gl[a]);
  mkHBar('c-goal','c-goal-wrap',glK,glK.map(k=>gl[k]),glK.map(k=>GC[k]||'#ccc'));
  const rm=countBy(filtered,'Roadmap Status');
  const rmK=Object.keys(rm).sort((a,b)=>rm[b]-rm[a]);
  mkDoughnut('c-roadmap',rmK,rmK.map(k=>rm[k]),rmK.map(k=>RC[k]||'#ccc'));
  const tp=countBy(filtered.filter(d=>d['Project Type']),'Project Type');
  const tpK=Object.keys(tp).sort((a,b)=>tp[b]-tp[a]);
  mkDoughnut('c-type',tpK,tpK.map(k=>tp[k]),tpK.map(k=>TC[k]||'#ccc'));
  /* primary assignee */
  const a1={};
  filtered.forEach(d=>{const n=(d['Assignee.displayName']||'').trim().split(' ')[0];if(n&&n!=='[no'&&n.length>1)a1[n]=(a1[n]||0)+1;});
  const a1K=Object.keys(a1).sort((a,b)=>a1[b]-a1[a]);
  mkHBar('c-a1','c-a1-wrap',a1K,a1K.map(k=>a1[k]),a1K.map((_,i)=>AC[i%AC.length]));
  /* 2nd assignee */
  const a2={};
  filtered.forEach(d=>{const n=(d['Assignee (2nd).displayName']||'').trim().split(' ')[0];if(n&&n!=='[no'&&n.length>1)a2[n]=(a2[n]||0)+1;});
  const a2K=Object.keys(a2).sort((a,b)=>a2[b]-a2[a]);
  mkHBar('c-a2','c-a2-wrap',a2K,a2K.map(k=>a2[k]),a2K.map((_,i)=>AC[i%AC.length]));
  /* alerts */
  const dl=filtered.filter(d=>(d['Project Monitoring Status']||'').toLowerCase().includes('delay'));
  const ar=filtered.filter(d=>(d['Project Monitoring Status']||'').toLowerCase().includes('risk'));
  const bg=filtered.filter(d=>d.Status==='Budget Approval');
  const rd=filtered.filter(d=>d.Status==='Ready for Delivery');
  const alerts=[...dl.map(d=>({t:'danger',key:d.Key,txt:`<strong>${d.Summary}</strong> — Delayed. Provide revised plan &amp; mitigation.`})),...ar.map(d=>({t:'warn',key:d.Key,txt:`<strong>${d.Summary}</strong> — At risk. Identify blockers.`})),...bg.map(d=>({t:'info',key:d.Key,txt:`<strong>${d.Summary}</strong> — Pending budget approval.`})),...rd.map(d=>({t:'info',key:d.Key,txt:`<strong>${d.Summary}</strong> — Ready for Delivery. Confirm sprint kick-off.`}))];
  document.getElementById('init-alerts').innerHTML=alerts.length?alerts.map(a=>`<div class="alert-item ${a.t}"><span style="font-weight:700;font-size:10px;color:${a.t==='danger'?'#A32D2D':a.t==='warn'?'#633806':'#0C447C'};min-width:48px">${jiraLink(a.key)}</span><span style="font-size:11.5px;color:#333">${a.txt}</span></div>`).join(''):'<div style="color:#bbb;font-size:12px;padding:4px 0">No items requiring attention.</div>';
  /* delivery */
  document.getElementById('init-delivery').innerHTML=filtered.filter(d=>d.Status==='Delivery').map(d=>`<tr><td>${jiraLink(d.Key)}</td><td style="font-weight:600;color:#1a3a5c">${d.Summary}</td><td>${monBadge(d['Project Monitoring Status'])}</td><td style="color:#555">${d['Implementation Status']||'—'}</td></tr>`).join('')||'<tr><td colspan="4" style="color:#bbb;text-align:center;padding:14px">None</td></tr>';
  /* pipeline */
  document.getElementById('init-pipeline').innerHTML=filtered.filter(d=>d.Status==='Discovery'||d.Status==='Ready for Delivery').map(d=>`<tr><td>${jiraLink(d.Key)}</td><td style="font-weight:600;color:#1a3a5c">${d.Summary}</td><td>${sPill(d.Status)}</td><td>${(d['Assignee.displayName']||'').split(' ')[0]||'—'}</td><td>${fmtDate(getStart(d['Target Project Start']||''))}</td></tr>`).join('')||'<tr><td colspan="5" style="color:#bbb;text-align:center;padding:14px">None</td></tr>';
}

/* CSV parser — handles normal row-per-record format */

function renderList(){
  /* Year filter */
  renderYF('yf-list',listYearFilter,function(btn,val){
    listYearFilter=toggleYF(listYearFilter,val);
    renderList();
  });

  /* Assignee dropdown — collect unique names (primary + 2nd) */
  const allAssignees=new Set();
  allData.forEach(d=>{
    const a1=(d['Assignee.displayName']||'').trim().split(' ')[0];
    const a2=(d['Assignee (2nd).displayName']||'').trim().split(' ')[0];
    if(a1&&a1.length>1&&a1!=='[no')allAssignees.add(a1);
    if(a2&&a2.length>1&&a2!=='[no')allAssignees.add(a2);
  });
  const sel=document.getElementById('af-list-select');
  const curVal=sel.value||'all';
  sel.innerHTML='<option value="all">All assignees</option>'+
    Array.from(allAssignees).sort().map(a=>`<option value="${a}" ${curVal===a?'selected':''}>${a}</option>`).join('');
  sel.value=listAssigneeFilter;

  /* Filter data */
  let filtered=filterYear(allData,listYearFilter);
  if(listAssigneeFilter!=='all'){
    filtered=filtered.filter(d=>{
      const a1=(d['Assignee.displayName']||'').trim().split(' ')[0];
      const a2=(d['Assignee (2nd).displayName']||'').trim().split(' ')[0];
      return a1===listAssigneeFilter||a2===listAssigneeFilter;
    });
  }

  /* Sort by Key asc: PPP-1, PPP-2, ... */
  filtered=[...filtered].sort((a,b)=>{
    const na=parseInt((a.Key||'').replace('PPP-',''))||0;
    const nb=parseInt((b.Key||'').replace('PPP-',''))||0;
    return na-nb;
  });

  document.getElementById('list-count').textContent=
    `Showing ${filtered.length} of ${allData.length} initiatives`;

  /* Render rows */
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(raw){
    const p=raw?(()=>{try{return JSON.parse(raw)}catch(e){return null}})():null;
    const d=p?p.start:(raw&&/\d{4}-\d{2}-\d{2}/.test(raw)?raw.match(/(\d{4}-\d{2}-\d{2})/)[1]:null);
    if(!d)return '—';
    const[y,m]=d.split('-');return MONTHS[+m-1]+' '+y;
  }

  document.getElementById('list-body').innerHTML=filtered.length
    ?filtered.map(d=>{
        const mon=d['Project Monitoring Status']||'';
        const isD=mon.toLowerCase().includes('delay');
        const isR=mon.toLowerCase().includes('risk');
        const isT=mon.toLowerCase().includes('track');
        const monHtml=mon
          ?(isD?`<span class="pill p-delayed">🆘 Delayed</span>`
            :isR?`<span class="pill p-atrisk">⚠️ At risk</span>`
            :isT?`<span class="pill p-ontrack">✅ On track</span>`:mon)
          :'<span style="color:#ddd">—</span>';
        const stMap={'Parking Lot':'parking','Budget Approval':'budget','Discovery':'discovery','Ready for Delivery':'rfd','Delivery':'delivery','Done':'done'};
        const stCls=stMap[d.Status]||'';
        const tpCls=d['Project Type']==='Strategic'?'strategic':d['Project Type']==='BAU'?'bau':'';
        const a1=(d['Assignee.displayName']||'').split(' ')[0]||'—';
        const a2=(d['Assignee (2nd).displayName']||'').split(' ')[0]||'—';
        return `<tr>
          <td>${jiraLink(d.Key)}</td>
          <td style="font-weight:600;color:#1a3a5c;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${d.Summary}">${d.Summary}</td>
          <td>${stCls?`<span class="pill p-${stCls}">${d.Status}</span>`:d.Status}</td>
          <td style="font-size:11px;color:#666">${d['Roadmap Status']||'—'}</td>
          <td style="font-size:11px;color:#666;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${d['Project Goal']||''}">${d['Project Goal']||'—'}</td>
          <td>${tpCls?`<span class="pill p-${tpCls}">${d['Project Type']}</span>`:d['Project Type']||'—'}</td>
          <td style="font-size:11px">${a1}</td>
          <td style="font-size:11px;color:#888">${a2}</td>
          <td>${monHtml}</td>
          <td style="font-size:11px">${fd(d['Target Project Start'])}</td>
          <td style="font-size:11px">${fd(d['Target Project End'])}</td>
        </tr>`;
      }).join('')
    :'<tr><td colspan="11" style="text-align:center;color:#bbb;padding:24px">No initiatives match this filter.</td></tr>';
}

function onAssigneeChange(val){
  listAssigneeFilter=val;
  renderList();
}
