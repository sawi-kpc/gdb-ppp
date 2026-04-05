/* ══════════════════════════════════════════════
   DATA — fetch, parse, load
   Depends on: config.js, render.js
══════════════════════════════════════════════ */

function parseCSV(text){
  const rows=[];const lines=text.split('\n');
  for(const line of lines){
    if(!line.trim())continue;
    const row=[];let inQ=false,cur='';
    for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){inQ=!inQ;}else if(c===','&&!inQ){row.push(cur.trim());cur='';}else{cur+=c;}}
    row.push(cur.trim());rows.push(row);
  }
  return rows;
}

function parseSheetRows(text,embeddedData){
  const rows=parseCSV(text);
  if(!rows||rows.length<2)return embeddedData||[];
  const c=v=>String(v||'').replace(/^"|"$/g,'').trim();
  const r0=rows[0].map(c);

  /* Detect normal format: row 0 first cell = "Key" (header row) */
  if(r0[0]==='Key'){
    const headers=r0;
    return rows.slice(1)
      .filter(r=>c(r[0]).startsWith('PPP'))
      .map(r=>{const o={};headers.forEach((h,i)=>{o[h]=c(r[i])});return o;});
  }

  /* Fallback: return embedded data if format unrecognised */
  console.warn('[GDB] Unrecognised CSV format, using embedded data');
  return embeddedData||[];
}

/* Data load — 3-tier: Apps Script → CSV direct → embedded */
async function loadData(){
  (function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='Fetching\u2026';})();
  let fetched=false;
  const ts=()=>new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(!fetched&&CONFIG.APPS_SCRIPT_URL){
    try{const r=await fetch(CONFIG.APPS_SCRIPT_URL);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j.data&&j.data.length>0){allData=j.data;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live via script)';})();}}catch(e){console.warn('[GDB] Apps Script:',e.message);}
  }
  if(!fetched){
    try{const r=await fetch(CONFIG.SHEET_URL,{mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live CSV)';})();}}catch(e){console.warn('[GDB] Direct CSV:',e.message);}
  }
  if(!fetched){
    try{const proxy='https://corsproxy.io/?'+encodeURIComponent(CONFIG.SHEET_URL);const r=await fetch(proxy);if(!r.ok)throw new Error();const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (via proxy)';})();}}catch(e){console.warn('[GDB] Proxy:',e.message);}
  }
  if(!fetched){allData=getEmbedded();const _now=new Date();(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='\uD83D\uDCE6 Embedded data · '+_now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '+_now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' — set APPS_SCRIPT_URL for live';})();}
  renderAll();
  if (typeof window.onDataReady === 'function') { window.onDataReady(allData); }
}


function parseCSV(text){
  const rows=[];const lines=text.split('\n');
  for(const line of lines){
    if(!line.trim())continue;
    const row=[];let inQ=false,cur='';
    for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){inQ=!inQ;}else if(c===','&&!inQ){row.push(cur.trim());cur='';}else{cur+=c;}}
    row.push(cur.trim());rows.push(row);
  }
  return rows;
}

function parseSheetRows(text,embeddedData){
  const rows=parseCSV(text);
  if(!rows||rows.length<2)return embeddedData||[];
  const c=v=>String(v||'').replace(/^"|"$/g,'').trim();
  const r0=rows[0].map(c);

  /* Detect normal format: row 0 first cell = "Key" (header row) */
  if(r0[0]==='Key'){
    const headers=r0;
    return rows.slice(1)
      .filter(r=>c(r[0]).startsWith('PPP'))
      .map(r=>{const o={};headers.forEach((h,i)=>{o[h]=c(r[i])});return o;});
  }

  /* Fallback: return embedded data if format unrecognised */
  console.warn('[GDB] Unrecognised CSV format, using embedded data');
  return embeddedData||[];
}

/* Data load — 3-tier: Apps Script → CSV direct → embedded */
async function loadData(){
  (function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='Fetching\u2026';})();
  let fetched=false;
  const ts=()=>new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(!fetched&&CONFIG.APPS_SCRIPT_URL){
    try{const r=await fetch(CONFIG.APPS_SCRIPT_URL);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j.data&&j.data.length>0){allData=j.data;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live via script)';})();}}catch(e){console.warn('[GDB] Apps Script:',e.message);}
  }
  if(!fetched){
    try{const r=await fetch(CONFIG.SHEET_URL,{mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live CSV)';})();}}catch(e){console.warn('[GDB] Direct CSV:',e.message);}
  }
  if(!fetched){
    try{const proxy='https://corsproxy.io/?'+encodeURIComponent(CONFIG.SHEET_URL);const r=await fetch(proxy);if(!r.ok)throw new Error();const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (via proxy)';})();}}catch(e){console.warn('[GDB] Proxy:',e.message);}
  }
  if(!fetched){allData=getEmbedded();const _now=new Date();(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='\uD83D\uDCE6 Embedded data · '+_now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '+_now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' — set APPS_SCRIPT_URL for live';})();}
  renderAll();
  if (typeof window.onDataReady === 'function') { window.onDataReady(allData); }
}

/* ── Initiatives List ────────────────────────────── */
function renderAll(){
  /* If onDataReady is defined, this is a standalone initiative page
     — skip renderAll, let onDataReady call the correct render fn */
  if (typeof window.onDataReady === 'function') return;
  /* Original PPP dashboard: call all render functions safely */
  [renderSummary, renderInitiatives, renderList, renderCompleted].forEach(function(fn){
    try { if(typeof fn==='function') fn(); } catch(e){ /* element not on this page */ }
  });
}

function tickClock(){const el=document.getElementById('current-dt');if(!el)return;const n=new Date();el.textContent=n.toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · '+n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}

function getEmbedded(){return[
{'Key':'PPP-36','Summary':'New POS','Issue Type':'Initiative','Project Type':'Strategic','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Strategic Direction','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'The Able'},
{'Key':'PPP-34','Summary':'King Power Airport Pick up Group Ordering','Issue Type':'Initiative','Project Type':'','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'tanet.arunthavornwong@kingpower.com'},
{'Key':'PPP-32','Summary':'China Commerce Performance Dashboard','Issue Type':'Initiative','Project Type':'BAU','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Natpapat Kwaopiwong','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'','Implementation Status':'To Do','Dependency Systems':'EDP','Target Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Target Project End':'{"start":"2026-04-01","end":"2026-04-30"}','Actual Project Start':'','Actual Project End':'','BU Owner':'veerakiet.settachatanan@kingpower.com'},
{'Key':'PPP-31','Summary':'FIRSTER Performance Dashboard​','Issue Type':'Initiative','Project Type':'BAU','Status':'Delivery','Roadmap Status':'Now','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Natpapat Kwaopiwong','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'On track','Implementation Status':'Doing','Dependency Systems':'EDP','Target Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Target Project End':'{"start":"2026-04-01","end":"2026-04-30"}','Actual Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Actual Project End':'','BU Owner':'veerakiet.settachatanan@kingpower.com'},
{'Key':'PPP-30','Summary':'Post-Sunset Operational Support','Issue Type':'Initiative','Project Type':'BAU','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Strategic Direction','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Petchpailin Tocharoen','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'','Implementation Status':'To Do','Dependency Systems':'','Target Project Start':'{"start":"2026-09-01","end":"2026-09-30"}','Target Project End':'{"start":"2026-09-01","end":"2026-09-30"}','Actual Project Start':'','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-28','Summary':'CN-Free Zone','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'pimsuda.sakolvipas@kingpower.com'},
{'Key':'PPP-27','Summary':'Downtown Showroom​','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-25','Summary':'Kingpower Commerce Performance Dashboard​','Issue Type':'Initiative','Project Type':'BAU','Status':'Delivery','Roadmap Status':'Now','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Natpapat Kwaopiwong','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'On track','Implementation Status':'Doing','Dependency Systems':'EDP','Target Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Target Project End':'{"start":"2026-04-01","end":"2026-04-30"}','Actual Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Actual Project End':'','BU Owner':'veerakiet.settachatanan@kingpower.com'},
{'Key':'PPP-24','Summary':'Customer Data Platform (CDP)','Issue Type':'Initiative','Project Type':'Strategic','Status':'Budget Approval','Roadmap Status':'New','Project Goal':'Improve Customer Engagement','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Sawitree Jakkrawannit','Assignee (2nd).displayName':'Chawanop Witthayaphirak','Project Monitoring Status':'','Implementation Status':'To Do','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-23','Summary':'LINE MAN, Grab','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-22','Summary':'LIVE','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'','Roadmap Year Plan':'','Assignee.displayName':'','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-21','Summary':'*3rd Party Marketplace​','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'Somrythi Pipat','Assignee (2nd).displayName':'Natpapat Kwaopiwong','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-20','Summary':'Marketplace (Dropship)','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-19','Summary':'Rent to Buy','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-18','Summary':'Unified LINE Official Account','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Improve Customer Experience','Roadmap Year Plan':'','Assignee.displayName':'Sawitree Jakkrawannit','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-17','Summary':'Chat-to-Shop Automation','Issue Type':'Initiative','Project Type':'Strategic','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'Sawitree Jakkrawannit','Assignee (2nd).displayName':'Somrythi Pipat','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'sarit.suriyasangpetch@kingpower.com'},
{'Key':'PPP-16','Summary':'Power Pass Integration in KP App','Issue Type':'Initiative','Project Type':'BAU','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Improve Customer Experience','Roadmap Year Plan':'','Assignee.displayName':'','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-15','Summary':'Cross-Entity Sales Optimization (KPD to KPC)','Issue Type':'Initiative','Project Type':'Strategic','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Improve Customer Experience','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'Sodsaran Lertsirisampan','Project Monitoring Status':'','Implementation Status':'To Do','Dependency Systems':'','Target Project Start':'{"start":"2026-08-01","end":"2026-08-31"}','Target Project End':'{"start":"2026-09-01","end":"2026-09-30"}','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-14','Summary':'Configurable Stock Location Middleware','Issue Type':'Initiative','Project Type':'Strategic','Status':'Delivery','Roadmap Status':'Now','Project Goal':'Improve Customer Experience','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'Petchpailin Tocharoen','Project Monitoring Status':'On track','Implementation Status':'Doing','Dependency Systems':'SAP','Target Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Target Project End':'{"start":"2026-08-01","end":"2026-08-31"}','Actual Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Actual Project End':'','BU Owner':''},
{'Key':'PPP-13','Summary':'China Platform Analytics Enhancement','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Improve Customer Experience','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'pimsuda.sakolvipas@kingpower.com'},
{'Key':'PPP-11','Summary':'AI-Driven Product Content & Visual Generation','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Increase Revenue','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-10','Summary':'Unified Product Information Management (PIM)','Issue Type':'Initiative','Project Type':'','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-9','Summary':'Single Commerce Platform','Issue Type':'Initiative','Project Type':'Strategic','Status':'Parking Lot','Roadmap Status':'New','Project Goal':'Strategic Direction','Roadmap Year Plan':'','Assignee.displayName':'Chawanop Witthayaphirak','Assignee (2nd).displayName':'Petchpailin Tocharoen;Sawitree Jakkrawannit','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'E-Revenue;EDP;OMS;SAP;K1/K2;GWL','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':''},
{'Key':'PPP-8','Summary':'FIRSTER Platform Sunset Execution','Issue Type':'Initiative','Project Type':'BAU','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Strategic Direction','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Petchpailin Tocharoen','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'','Implementation Status':'To Do','Dependency Systems':'EDP;OMS;SAP','Target Project Start':'{"start":"2026-04-01","end":"2026-04-30"}','Target Project End':'{"start":"2026-06-01","end":"2026-06-30"}','Actual Project Start':'','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-7','Summary':'Home Delivery Migration to Commerce Platform','Issue Type':'Initiative','Project Type':'Strategic','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Strategic Direction','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Petchpailin Tocharoen','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'','Implementation Status':'To Do','Dependency Systems':'OMS;SAP;K1/K2;GWL','Target Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Target Project End':'{"start":"2026-06-01","end":"2026-06-30"}','Actual Project Start':'','Actual Project End':'','BU Owner':'sarit.suriyasangpetch@kingpower.com'},
{'Key':'PPP-6','Summary':'Pick Up at Arrival Enablement on Commerce Platform','Issue Type':'Initiative','Project Type':'BAU','Status':'Delivery','Roadmap Status':'Now','Project Goal':'Increase Revenue','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Sawitree Jakkrawannit','Assignee (2nd).displayName':'','Project Monitoring Status':'On track','Implementation Status':'Doing','Dependency Systems':'OMS;SAP','Target Project Start':'{"start":"2026-02-01","end":"2026-02-28"}','Target Project End':'{"start":"2026-04-01","end":"2026-04-30"}','Actual Project Start':'{"start":"2026-02-01","end":"2026-02-28"}','Actual Project End':'','BU Owner':'sarit.suriyasangpetch@kingpower.com'},
{'Key':'PPP-5','Summary':'FIRSTER E-Tax Integration','Issue Type':'Initiative','Project Type':'Strategic','Status':'Delivery','Roadmap Status':'Now','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'ROADMAP_2025;ROADMAP_2026','Assignee.displayName':'Petchpailin Tocharoen','Assignee (2nd).displayName':'Sawitree Jakkrawannit','Project Monitoring Status':'Delayed','Implementation Status':'Doing','Dependency Systems':'E-Revenue;OMS','Target Project Start':'{"start":"2025-10-01","end":"2025-10-31"}','Target Project End':'{"start":"2025-12-01","end":"2025-12-31"}','Actual Project Start':'{"start":"2025-11-01","end":"2025-11-30"}','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-3','Summary':'K2 Order Cancellation Enhancement','Issue Type':'Initiative','Project Type':'BAU','Status':'Ready for Delivery','Roadmap Status':'Next','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Somrythi Pipat','Assignee (2nd).displayName':'','Project Monitoring Status':'Delayed','Implementation Status':'To Do','Dependency Systems':'K1/K2','Target Project Start':'{"start":"2026-03-01","end":"2026-03-31"}','Target Project End':'{"start":"2026-03-01","end":"2026-03-31"}','Actual Project Start':'','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-2','Summary':'FIRSTER TikTok Finance & Accounting Report','Issue Type':'Initiative','Project Type':'BAU','Status':'Discovery','Roadmap Status':'Next','Project Goal':'Improve Internal Operation','Roadmap Year Plan':'ROADMAP_2026','Assignee.displayName':'Natpapat Kwaopiwong','Assignee (2nd).displayName':'Petchpailin Tocharoen','Project Monitoring Status':'','Implementation Status':'','Dependency Systems':'EDP','Target Project Start':'','Target Project End':'','Actual Project Start':'','Actual Project End':'','BU Owner':'anon.kumnuchanart@kingpower.com'},
{'Key':'PPP-1','Summary':'FIRSTER TikTok Order Synchronization','Issue Type':'Initiative','Project Type':'BAU','Status':'Done','Roadmap Status':'Completed','Project Goal':'Increase Revenue','Roadmap Year Plan':'ROADMAP_2025','Assignee.displayName':'Petchpailin Tocharoen','Assignee (2nd).displayName':'','Project Monitoring Status':'On track','Implementation Status':'Done','Dependency Systems':'OMS','Target Project Start':'{"start":"2025-04-01","end":"2025-04-30"}','Target Project End':'{"start":"2025-06-01","end":"2025-06-30"}','Actual Project Start':'{"start":"2025-07-01","end":"2025-07-31"}','Actual Project End':'{"start":"2025-11-01","end":"2025-11-30"}','BU Owner':'anon.kumnuchanart@kingpower.com'}
];}

/* DOMContentLoaded: clock starts immediately, loadData called by auth.js after login */
/* Signal that data.js has parsed — set immediately */
window._appReady = true;

window.addEventListener('DOMContentLoaded',function(){
  tickClock();
  setInterval(tickClock,1000);
});
