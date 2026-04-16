
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyD260xK8Gnf2whf71l6JROXQhXf0SEtDIaA3_ineTbilY5tmzd8thIWJ5mktlYd_jN/exec',
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1dEBSAcmkT5tQmzaQDQEieex3WMCyPBi1JjQdOpVH8Nc/gviz/tq?tqx=out:csv&gid=660147076',
  JIRA_BASE: 'https://kingpower.atlassian.net/browse/',
  TIMELINE_RANGE_OPTIONS: [
    {val:'2025-01',label:'Jan 2025'},{val:'2025-03',label:'Mar 2025'},
    {val:'2025-06',label:'Jun 2025'},{val:'2025-09',label:'Sep 2025'},
    {val:'2025-12',label:'Dec 2025'},{val:'2026-01',label:'Jan 2026'},
    {val:'2026-03',label:'Mar 2026'},{val:'2026-06',label:'Jun 2026'},
    {val:'2026-09',label:'Sep 2026'},{val:'2026-12',label:'Dec 2026'},
    {val:'2027-01',label:'Jan 2027'},{val:'2027-06',label:'Jun 2027'},
    {val:'2027-12',label:'Dec 2027'},
  ],
};

/* ── Cache configuration ─────────────────────────────────────
   Controls localStorage caching for initiative/PPP data.
   Separate prefix from channel cache to allow independent
   clearing.
────────────────────────────────────────────────────────────── */
var CACHE_CONFIG = {
  ttlMinutes:  120,         /* initiative data changes less often  */
  prefix:      'gdb_ini_',  /* localStorage key prefix             */
  enabled:     true,
};
