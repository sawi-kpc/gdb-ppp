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

/* ══════════════════════════════════════════════════════════════
   CACHE — localStorage, TTL driven by CACHE_CONFIG in config.js
   Key:  gdb_ini_allData
   JSON: { ts: <epoch ms>, data: <allData array> }
══════════════════════════════════════════════════════════════ */

function _iniCacheGet() {
  if (!CACHE_CONFIG.enabled) return null;
  try {
    var raw = localStorage.getItem(CACHE_CONFIG.prefix + 'allData');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    var ageMin = (Date.now() - obj.ts) / 60000;
    if (ageMin > CACHE_CONFIG.ttlMinutes) return null;  /* stale */
    return obj;
  } catch(e) { return null; }
}

function _iniCacheSet(data) {
  if (!CACHE_CONFIG.enabled) return;
  try {
    localStorage.setItem(CACHE_CONFIG.prefix + 'allData', JSON.stringify({
      ts:   Date.now(),
      data: data,
    }));
  } catch(e) {}
}

function clearAllCache() {
  try {
    Object.keys(localStorage)
      .filter(function(k) { return k.startsWith(CACHE_CONFIG.prefix); })
      .forEach(function(k) { localStorage.removeItem(k); });
  } catch(e) {}
}

function getIniCacheAge() {
  try {
    var raw = localStorage.getItem(CACHE_CONFIG.prefix + 'allData');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    var ageMin = (Date.now() - obj.ts) / 60000;
    if (ageMin > CACHE_CONFIG.ttlMinutes) return null;
    var label = ageMin < 1 ? 'just now'
      : ageMin < 60  ? Math.floor(ageMin) + 'm ago'
      : Math.floor(ageMin / 60) + 'h ago';
    return { ageMin: ageMin, label: label };
  } catch(e) { return null; }
}

async function loadData(){
  /* ── Initiative cache check ──────────────────────────── */
  var _iniCached = _iniCacheGet();
  if (_iniCached) {
    allData = _iniCached.data;
    var _age = getIniCacheAge();
    if (typeof gdbSetCacheBadge === 'function')
      gdbSetCacheBadge('cached', _age ? '⚡ Cached · ' + _age.label : '⚡ Cached');
    renderAll();
    if (typeof window.onDataReady === 'function') window.onDataReady(allData);
    return;
  }

  (function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='Fetching\u2026';})();
  if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('loading', 'Loading…');
  let fetched=false;
  const ts=()=>new Date().toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(!fetched&&CONFIG.APPS_SCRIPT_URL){
    try{const r=await fetch(CONFIG.APPS_SCRIPT_URL);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j.data&&j.data.length>0){allData=j.data;
    _iniCacheSet(allData);
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live via script)';})();}}catch(e){console.warn('[GDB] Apps Script:',e.message);}
  }
  if(!fetched){
    try{const r=await fetch(CONFIG.SHEET_URL,{mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live CSV)';})();}}catch(e){console.warn('[GDB] Direct CSV:',e.message);}
  }
  if(!fetched){
    try{const proxy='https://corsproxy.io/?'+encodeURIComponent(CONFIG.SHEET_URL);const r=await fetch(proxy);if(!r.ok)throw new Error();const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (via proxy)';})();}}catch(e){console.warn('[GDB] Proxy:',e.message);}
  }
  if(!fetched){allData=getEmbedded();
  _iniCacheSet(allData);
  if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');;const _now=new Date();(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='\uD83D\uDCE6 Embedded data · '+_now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '+_now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' — set APPS_SCRIPT_URL for live';})();}
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
  /* ── Initiative cache check ──────────────────────────── */
  var _iniCached = _iniCacheGet();
  if (_iniCached) {
    allData = _iniCached.data;
    var _age = getIniCacheAge();
    if (typeof gdbSetCacheBadge === 'function')
      gdbSetCacheBadge('cached', _age ? '⚡ Cached · ' + _age.label : '⚡ Cached');
    renderAll();
    if (typeof window.onDataReady === 'function') window.onDataReady(allData);
    return;
  }

  (function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='Fetching\u2026';})();
  if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('loading', 'Loading…');
  let fetched=false;
  const ts=()=>new Date().toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  if(!fetched&&CONFIG.APPS_SCRIPT_URL){
    try{const r=await fetch(CONFIG.APPS_SCRIPT_URL);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j.data&&j.data.length>0){allData=j.data;
    _iniCacheSet(allData);
    if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live via script)';})();}}catch(e){console.warn('[GDB] Apps Script:',e.message);}
  }
  if(!fetched){
    try{const r=await fetch(CONFIG.SHEET_URL,{mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (live CSV)';})();}}catch(e){console.warn('[GDB] Direct CSV:',e.message);}
  }
  if(!fetched){
    try{const proxy='https://corsproxy.io/?'+encodeURIComponent(CONFIG.SHEET_URL);const r=await fetch(proxy);if(!r.ok)throw new Error();const parsed=parseSheetRows(await r.text(),getEmbedded());if(parsed.length>0){allData=parsed;fetched=true;(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent=ts()+' (via proxy)';})();}}catch(e){console.warn('[GDB] Proxy:',e.message);}
  }
  if(!fetched){allData=getEmbedded();
  _iniCacheSet(allData);
  if (typeof gdbSetCacheBadge === 'function') gdbSetCacheBadge('live', '● Live data');;const _now=new Date();(function(){var _e=document.getElementById('refresh-time');if(_e)_e.textContent='\uD83D\uDCE6 Embedded data · '+_now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '+_now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' — set APPS_SCRIPT_URL for live';})();}
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

function tickClock(){const el=document.getElementById('current-dt');if(!el)return;const n=new Date();el.textContent=n.toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · '+n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}

function getEmbedded(){return[
{"Key":"PPP-1","Issue Type":"Initiative","Summary":"FIRSTER TikTok Order Synchronization","Project Goal":"Increase Revenue","Project Type":"BAU","Status":"Done","Roadmap Status":"Completed","Increase Revenue":"","Improve Internal Operation":"20","Improve Customer Experience":"10","Improve Customer Engagement":"40","Effort Estimation":"2","Confident":"4","Roadmap Year Plan":"ROADMAP_2025","Target Project Start":"{\"start\":\"2025-04-01\",\"end\":\"2025-04-30\"}","Target Project End":"{\"start\":\"2025-06-01\",\"end\":\"2025-06-30\"}","Delivery Team":"","Dependency Systems":"OMS","Implementation Status":"Done","Project Monitoring Status":"On track","Actual Project Start":"{\"start\":\"2025-07-01\",\"end\":\"2025-07-31\"}","Actual Project End":"{\"start\":\"2025-11-01\",\"end\":\"2025-11-30\"}","Go-live Date":"{\"start\":\"2025-11-03\",\"end\":\"2025-11-03\"}","Year of Delivery":"2025","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Petchpailin Tocharoen","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม order volume จาก TikTok channel โดยไม่ต้องทำ manual entry ภายใน 1 เดือนหลัง launch [target] orders","KPI vs Target":"⚪ TikTok orders/เดือน: 0 → [actual] orders","Components":"firster-tiktok-social-commerce"},
{"Key":"PPP-2","Issue Type":"Initiative","Summary":"FIRSTER TikTok Finance & Accounting Report","Project Goal":"Improve Internal Operation","Project Type":"BAU","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"10","Improve Customer Engagement":"0","Effort Estimation":"3","Confident":"4","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"EDP","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Natpapat Kwaopiwong","Assignee (2nd).displayName":"Sodsaran Lertsirisampan","Business Impact":"ลดเวลาจัดทำรายงานการเงิน TikTok จาก manual 3 วันเหลือ real-time ภายใน 1 เดือนหลัง go-live","KPI vs Target":"⚪ เวลาจัดทำรายงาน/เดือน: 3 วัน → <1 ชม.","Components":"firster-tiktok-social-commerce"},
{"Key":"PPP-3","Issue Type":"Initiative","Summary":"K2 Order Cancellation Enhancement","Project Goal":"Improve Internal Operation","Project Type":"BAU","Status":"Ready for Delivery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"30","Improve Customer Engagement":"10","Effort Estimation":"3","Confident":"5","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-04-01\",\"end\":\"2026-04-30\"}","Target Project End":"{\"start\":\"2026-04-01\",\"end\":\"2026-04-30\"}","Delivery Team":"","Dependency Systems":"K1/K2","Implementation Status":"To Do","Project Monitoring Status":"Delayed","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Somrythi Pipattanasirikul","Assignee (2nd).displayName":"Sodsaran Lertsirisampan","Business Impact":"ลดเวลา process cancellation ของ operations team ลง 70% ภายใน 2 สัปดาห์หลัง go-live","KPI vs Target":"⚪ เวลาเฉลี่ย/cancellation: [baseline] --> [target] minutes","Components":"firster-tiktok-social-commerce"},
{"Key":"PPP-5","Issue Type":"Initiative","Summary":"FIRSTER E-Tax Integration","Project Goal":"Improve Internal Operation","Project Type":"Strategic","Status":"Delivery","Roadmap Status":"Now","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"30","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"3","Roadmap Year Plan":"ROADMAP_2025;ROADMAP_2026","Target Project Start":"{\"start\":\"2025-10-01\",\"end\":\"2025-10-31\"}","Target Project End":"{\"start\":\"2025-12-01\",\"end\":\"2025-12-31\"}","Delivery Team":"","Dependency Systems":"E-Revenue;OMS","Implementation Status":"Doing","Project Monitoring Status":"Delayed","Actual Project Start":"{\"start\":\"2025-11-01\",\"end\":\"2025-11-30\"}","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Petchpailin Tocharoen","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"ลด CS ticket จาก manual tax invoice request ลง 80% ภายใน 1 เดือนหลัง launch","KPI vs Target":"⚪ Manual tickets/เดือน (e-tax): [baseline] → [actual] tickets","Components":"firster-commerce"},
{"Key":"PPP-6","Issue Type":"Initiative","Summary":"Pick Up at Arrival Enablement on KP-TH Commerce Platform","Project Goal":"Increase Revenue","Project Type":"BAU","Status":"Delivery","Roadmap Status":"Now","Increase Revenue":"","Improve Internal Operation":"0","Improve Customer Experience":"60","Improve Customer Engagement":"60","Effort Estimation":"3","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-02-01\",\"end\":\"2026-02-28\"}","Target Project End":"{\"start\":\"2026-04-01\",\"end\":\"2026-04-30\"}","Delivery Team":"","Dependency Systems":"OMS;SAP","Implementation Status":"Doing","Project Monitoring Status":"Delayed","Actual Project Start":"{\"start\":\"2026-02-01\",\"end\":\"2026-02-28\"}","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"sarit.suriyasangpetch@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Sawitree Jakkrawannit","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม order volume จากกลุ่ม last-minute traveler ที่สนามบิน x% ภายใน 3 เดือนหลัง launch","KPI vs Target":"⚪ จำนวน PUA orders / เดือน: [baseline] --> [actual]","Components":"kingpower-commerce-th"},
{"Key":"PPP-7","Issue Type":"Initiative","Summary":"Home Delivery Migration to Commerce Platform","Project Goal":"Strategic Direction","Project Type":"Strategic","Status":"Delivery","Roadmap Status":"Now","Increase Revenue":"","Improve Internal Operation":"70","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"5","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Target Project End":"{\"start\":\"2026-06-01\",\"end\":\"2026-06-30\"}","Delivery Team":"","Dependency Systems":"OMS;SAP;K1/K2;GWL","Implementation Status":"Doing","Project Monitoring Status":"On track","Actual Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"sarit.suriyasangpetch@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Petchpailin Tocharoen","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"ลด platform complexity โดย consolidate home delivery ไว้ใน 1 platform ภายใน 6 เดือน","KPI vs Target":"⚪ จำนวน platform ที่ดูแล: [baseline] → [actual] platforms","Components":"kingpower-commerce-th"},
{"Key":"PPP-8","Issue Type":"Initiative","Summary":"FIRSTER Platform Sunset Execution","Project Goal":"Strategic Direction","Project Type":"BAU","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"0","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-04-01\",\"end\":\"2026-04-30\"}","Target Project End":"{\"start\":\"2026-06-01\",\"end\":\"2026-06-30\"}","Delivery Team":"","Dependency Systems":"EDP;OMS;SAP","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Petchpailin Tocharoen","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"ปิด FIRSTER platform อย่างราบรื่น ไม่กระทบ customer ภายใน 4 เดือน","KPI vs Target":"⚪ % customer ที่ได้รับแจ้ง sunset plan: 0% → 100%","Components":"firster-commerce"},
{"Key":"PPP-9","Issue Type":"Initiative","Summary":"Single Commerce Platform","Project Goal":"Strategic Direction","Project Type":"Strategic","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"","Improve Customer Experience":"","Improve Customer Engagement":"","Effort Estimation":"","Confident":"","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"E-Revenue;EDP;OMS;SAP;K1/K2;GWL","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"Petchpailin Tocharoen;Sawitree Jakkrawannit","Business Impact":"","KPI vs Target":"","Components":""},
{"Key":"PPP-10","Issue Type":"Initiative","Summary":"Unified Product Information Management (PIM)","Project Goal":"Improve Internal Operation","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"5","Confident":"3","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"ลดเวลา onboard product ใหม่จาก 5 วันเหลือ 1 วัน ภายใน 3 เดือนหลัง go-live","KPI vs Target":"⚪ เวลา product onboarding: [baseline] → [actual] วัน","Components":""},
{"Key":"PPP-11","Issue Type":"Initiative","Summary":"AI-Driven Product Content & Visual Generation","Project Goal":"Increase Revenue","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"20","Improve Customer Engagement":"20","Effort Estimation":"3","Confident":"3","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"ลดต้นทุนและเวลาผลิต product content 60% ภายใน 2 เดือนหลัง launch","KPI vs Target":"⚪ เวลาสร้าง content/product: [baseline] วัน → [actual] ชม.","Components":""},
{"Key":"PPP-13","Issue Type":"Initiative","Summary":"China Platform Analytics Enhancement","Project Goal":"Improve Customer Experience","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"70","Improve Customer Experience":"40","Improve Customer Engagement":"20","Effort Estimation":"3","Confident":"2","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"pimsuda.sakolvipas@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม visibility ของ CN platform performance ให้ business team ดูได้ real-time ภายใน 3 เดือน","KPI vs Target":"⚪ เวลาจัดทำ CN performance report: [baseline] → [actual]","Components":""},
{"Key":"PPP-14","Issue Type":"Initiative","Summary":"Configurable Stock Location Middleware","Project Goal":"Improve Customer Experience","Project Type":"Strategic","Status":"Delivery","Roadmap Status":"Now","Increase Revenue":"","Improve Internal Operation":"60","Improve Customer Experience":"80","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Target Project End":"{\"start\":\"2026-08-01\",\"end\":\"2026-08-31\"}","Delivery Team":"","Dependency Systems":"SAP","Implementation Status":"Doing","Project Monitoring Status":"On track","Actual Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"Petchpailin Tocharoen","Business Impact":"ลด out-of-stock ของ online orders ลง 40% ภายใน 3 เดือนหลัง go-live","KPI vs Target":"⚪ % online orders ที่ stock พร้อม: [baseline]% → [actual]%","Components":"kingpower-commerce-th;kingpower-commerce-cn;taihaitao-commerce-cn"},
{"Key":"PPP-15","Issue Type":"Initiative","Summary":"Cross-Entity Sales Optimization (KPD to KPC)","Project Goal":"Improve Customer Experience","Project Type":"Strategic","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"50","Improve Customer Experience":"40","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-08-01\",\"end\":\"2026-08-31\"}","Target Project End":"{\"start\":\"2026-09-01\",\"end\":\"2026-09-30\"}","Delivery Team":"","Dependency Systems":"","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"Sodsaran Lertsirisampan","Business Impact":"ลด concession cost 20% และเพิ่ม inventory utilization ภายใน 6 เดือนหลัง go-live","KPI vs Target":"⚪ concession cost/เดือน: [baseline] → [actual]","Components":"kingpower-commerce-th"},
{"Key":"PPP-16","Issue Type":"Initiative","Summary":"Power Pass Integration in KP App","Project Goal":"Improve Customer Experience","Project Type":"BAU","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"20","Improve Customer Experience":"70","Improve Customer Engagement":"60","Effort Estimation":"3","Confident":"4","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม loyalty feature engagement ใน KP App 25% ภายใน 2 เดือนหลัง launch","KPI vs Target":"⚪ DAU ที่ใช้ loyalty feature: [baseline]% → [actual]% of app users","Components":"kingpower-commerce-th"},
{"Key":"PPP-17","Issue Type":"Initiative","Summary":"Chat-to-Shop Automation","Project Goal":"Increase Revenue","Project Type":"Strategic","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"60","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"2","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"sarit.suriyasangpetch@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Sawitree Jakkrawannit","Assignee (2nd).displayName":"Somrythi Pipattanasirikul","Business Impact":"ลด manual ops ของ LINE sales team 60% และเพิ่ม order throughput ภายใน 1 เดือนหลัง launch","KPI vs Target":"⚪ manual steps/order: [baseline] steps → [actual] steps","Components":""},
{"Key":"PPP-18","Issue Type":"Initiative","Summary":"Unified LINE Official Account","Project Goal":"Improve Customer Experience","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"40","Improve Customer Experience":"80","Improve Customer Engagement":"40","Effort Estimation":"3","Confident":"3","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Sawitree Jakkrawannit","Assignee (2nd).displayName":"","Business Impact":"ลดความสับสนของ customer จาก multiple LINE accounts ภายใน 3 เดือนหลัง consolidate","KPI vs Target":"⚪ จำนวน LINE OA ที่ customer ต้องจำ: [baseline] → [actual]","Components":""},
{"Key":"PPP-19","Issue Type":"Initiative","Summary":"Rent to Buy","Project Goal":"Increase Revenue","Project Type":"","Status":"Done","Roadmap Status":"Completed","Increase Revenue":"","Improve Internal Operation":"10","Improve Customer Experience":"30","Improve Customer Engagement":"20","Effort Estimation":"4","Confident":"2","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"Done","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"{\"start\":\"2026-05-05\",\"end\":\"2026-05-05\"}","Year of Delivery":"2026","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม revenue stream ใหม่จาก rental model 5% ของ total revenue ภายใน 6 เดือน","KPI vs Target":"⚪ rental revenue/เดือน: ฿0 → ฿[actual]","Components":""},
{"Key":"PPP-20","Issue Type":"Initiative","Summary":"Marketplace (Dropship)","Project Goal":"Increase Revenue","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"20","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"2","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม SKU ที่ขายได้โดยไม่ต้องถือ stock 200 SKU ภายใน 3 เดือนหลัง launch","KPI vs Target":"⚪ dropship SKU: 0 → [actual] SKUs","Components":""},
{"Key":"PPP-21","Issue Type":"Initiative","Summary":"*3rd Party Marketplace​","Project Goal":"Increase Revenue","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"20","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"3","Confident":"3","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Somrythi Pipattanasirikul","Assignee (2nd).displayName":"Natpapat Kwaopiwong","Business Impact":"เพิ่ม online reach โดย list สินค้าใน Shopee/Lazada และได้ 500 orders/เดือน ภายใน 3 เดือน","KPI vs Target":"⚪ marketplace orders/เดือน: 0 → [actual] orders","Components":""},
{"Key":"PPP-22","Issue Type":"Initiative","Summary":"LIVE","Project Goal":"","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"","Improve Customer Experience":"","Improve Customer Engagement":"","Effort Estimation":"","Confident":"","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"","Assignee (2nd).displayName":"","Business Impact":"","KPI vs Target":"","Components":""},
{"Key":"PPP-23","Issue Type":"Initiative","Summary":"LINE MAN, Grab","Project Goal":"Increase Revenue","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"10","Improve Customer Experience":"30","Improve Customer Engagement":"0","Effort Estimation":"3","Confident":"3","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม delivery order volume จาก 3rd party platform 300 orders/เดือน ภายใน 2 เดือนหลัง launch","KPI vs Target":"⚪ delivery orders/เดือน (3rd party): 0 → [actual] orders","Components":""},
{"Key":"PPP-24","Issue Type":"Initiative","Summary":"Customer Data Platform (CDP)","Project Goal":"Improve Customer Engagement","Project Type":"Strategic","Status":"Budget Approval","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"60","Improve Customer Experience":"40","Improve Customer Engagement":"90","Effort Estimation":"5","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Sawitree Jakkrawannit","Assignee (2nd).displayName":"Chawanop Witthayaphirak","Business Impact":"รวม customer profile ข้าม channel ให้ marketing ใช้ได้จาก single source ลด report time 90% ภายใน 4 เดือน","KPI vs Target":"⚪ เวลาจัดทำ unified customer report: [baseline] วัน → [actual] นาที","Components":""},
{"Key":"PPP-25","Issue Type":"Initiative","Summary":"Kingpower Commerce Performance Dashboard​","Project Goal":"Improve Internal Operation","Project Type":"BAU","Status":"Delivery","Roadmap Status":"Now","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"","Confident":"","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Target Project End":"{\"start\":\"2026-04-01\",\"end\":\"2026-04-30\"}","Delivery Team":"","Dependency Systems":"EDP","Implementation Status":"Doing","Project Monitoring Status":"Delayed","Actual Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"veerakiet.settachatanan@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Natpapat Kwaopiwong","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"ลดเวลาจัดทำ weekly performance report จาก 2 วันเหลือ real-time ภายใน 1 เดือนหลัง go-live","KPI vs Target":"⚪ เวลาจัดทำ report/สัปดาห์: [baseline] → [actual]","Components":"kingpower-commerce-th"},
{"Key":"PPP-27","Issue Type":"Initiative","Summary":"Downtown Showroom​","Project Goal":"","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"","Improve Customer Experience":"","Improve Customer Engagement":"","Effort Estimation":"","Confident":"","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"","KPI vs Target":"","Components":""},
{"Key":"PPP-28","Issue Type":"Initiative","Summary":"CN-Free Zone","Project Goal":"","Project Type":"","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"","Improve Customer Experience":"","Improve Customer Engagement":"","Effort Estimation":"","Confident":"","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"pimsuda.sakolvipas@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"","KPI vs Target":"","Components":""},
{"Key":"PPP-30","Issue Type":"Initiative","Summary":"FIRSTER Post-Sunset Operational Support","Project Goal":"Strategic Direction","Project Type":"BAU","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"20","Improve Customer Engagement":"0","Effort Estimation":"2","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-09-01\",\"end\":\"2026-09-30\"}","Target Project End":"{\"start\":\"2026-09-01\",\"end\":\"2026-09-30\"}","Delivery Team":"","Dependency Systems":"","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"anon.kumnuchanart@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Petchpailin Tocharoen","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"รองรับ operation home delivery บน Commerce Platform อย่างเสถียรหลัง FIRSTER sunset ภายใน 3 เดือน","KPI vs Target":"⚪ % home delivery uptime หลัง migration: 0% → [actual]%","Components":"firster-commerce"},
{"Key":"PPP-31","Issue Type":"Initiative","Summary":"FIRSTER Performance Dashboard​","Project Goal":"Improve Internal Operation","Project Type":"BAU","Status":"Delivery","Roadmap Status":"Now","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"0","Improve Customer Engagement":"0","Effort Estimation":"3","Confident":"4","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Target Project End":"{\"start\":\"2026-04-01\",\"end\":\"2026-04-30\"}","Delivery Team":"","Dependency Systems":"EDP","Implementation Status":"Doing","Project Monitoring Status":"Delayed","Actual Project Start":"{\"start\":\"2026-03-01\",\"end\":\"2026-03-31\"}","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"veerakiet.settachatanan@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Natpapat Kwaopiwong","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"ลดเวลา pull FIRSTER sales report จาก manual 3 วันเหลือ real-time ภายใน 1 เดือนหลัง go-live","KPI vs Target":"⚪ เวลาจัดทำ report/สัปดาห์: [baselint] → [actual]","Components":"firster-commerce"},
{"Key":"PPP-32","Issue Type":"Initiative","Summary":"China Commerce Performance Dashboard","Project Goal":"Improve Internal Operation","Project Type":"BAU","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"80","Improve Customer Experience":"0","Improve Customer Engagement":"0","Effort Estimation":"4","Confident":"2","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"{\"start\":\"2026-05-01\",\"end\":\"2026-05-31\"}","Target Project End":"{\"start\":\"2026-05-01\",\"end\":\"2026-05-31\"}","Delivery Team":"","Dependency Systems":"EDP","Implementation Status":"To Do","Project Monitoring Status":"On track","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"veerakiet.settachatanan@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Natpapat Kwaopiwong","Assignee (2nd).displayName":"Sawitree Jakkrawannit","Business Impact":"ลดเวลาจัดทำ CN performance report จาก manual 5 วันเหลือ real-time ภายใน 1 เดือนหลัง go-live","KPI vs Target":"⚪ เวลาจัดทำ CN report/เดือน: [baseline] → [actual]","Components":"kingpower-commerce-cn;taihaitao-commerce-cn;kingpower-douyin-social-commerce;jd-phamacy-marketplace-cn"},
{"Key":"PPP-34","Issue Type":"Initiative","Summary":"King Power Airport Pick up Group Ordering","Project Goal":"Increase Revenue","Project Type":"BAU","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"0","Improve Customer Experience":"40","Improve Customer Engagement":"30","Effort Estimation":"3","Confident":"4","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"tanet.arunthavornwong@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"Chalotorn Ketprach","Business Impact":"เพิ่ม AOV ของ airport pickup order 15% จากกลุ่ม family/group traveler ภายใน 3 เดือนหลัง launch","KPI vs Target":"⚪ average order value (airport pickup): ฿[baseline] → ฿[actual]","Components":"kingpower-commerce-th"},
{"Key":"PPP-36","Issue Type":"Initiative","Summary":"New POS","Project Goal":"Strategic Direction","Project Type":"Strategic","Status":"Parking Lot","Roadmap Status":"New","Increase Revenue":"","Improve Internal Operation":"60","Improve Customer Experience":"50","Improve Customer Engagement":"0","Effort Estimation":"5","Confident":"2","Roadmap Year Plan":"","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"","Implementation Status":"","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"The Able","Stakeholder Team":"","Assignee.displayName":"Chawanop Witthayaphirak","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม checkout speed และลด human error ที่ counter ลง 50% ภายใน 2 เดือนหลัง rollout","KPI vs Target":"⚪ checkout time/transaction: [baseline] นาที → [actual] นาที","Components":""},
{"Key":"PPP-37","Issue Type":"Initiative","Summary":"Pick Up at Arrival Enablement on KP-CN Commerce Platform","Project Goal":"Increase Revenue","Project Type":"BAU","Status":"Discovery","Roadmap Status":"Next","Increase Revenue":"","Improve Internal Operation":"0","Improve Customer Experience":"60","Improve Customer Engagement":"60","Effort Estimation":"3","Confident":"3","Roadmap Year Plan":"ROADMAP_2026","Target Project Start":"","Target Project End":"","Delivery Team":"","Dependency Systems":"OMS;SAP","Implementation Status":"To Do","Project Monitoring Status":"","Actual Project Start":"","Actual Project End":"","Go-live Date":"","Year of Delivery":"","BU Owner":"pimsuda.sakolvipas@kingpower.com","Stakeholder Team":"","Assignee.displayName":"Chalotorn Ketprach","Assignee (2nd).displayName":"","Business Impact":"เพิ่ม order volume จากกลุ่ม last-minute traveler ที่สนามบิน x% ภายใน 3 เดือนหลัง launch","KPI vs Target":"⚪ จำนวน PUA orders / เดือน: [baseline] --> [actual]","Components":"kingpower-commerce-cn"}
];}

/* DOMContentLoaded: clock starts immediately, loadData called by auth.js after login */
/* Signal that data.js has parsed — set immediately */
window._appReady = true;

window.addEventListener('DOMContentLoaded',function(){
  tickClock();
  setInterval(tickClock,1000);
});
