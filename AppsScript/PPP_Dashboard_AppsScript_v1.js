/* ══════════════════════════════════════════════════════════════
   GDB Apps Script — Final Unified  (Initiatives + Issues + Supports)
   Spreadsheet: PPP_Jira-Product-Discovery
   ID: 1dEBSAcmkT5tQmzaQDQEieex3WMCyPBi1JjQdOpVH8Nc

   ── Routes ──────────────────────────────────────────────────
   No param / ?sheet=initiatives   → Initiatives (original behaviour)
                                     Response: { data:[...], count, updated }
                                     Used by: js/initiative/data.js (fetch + j.data)

   ?sheet=issues&callback=fn       → Issues (JSONP)
                                     Response: fn({ issues:[...], _meta:{...} })
                                     Used by: js/issue/data.js

   ?sheet=supports&callback=fn     → Support tasks (JSONP)
                                     Response: fn({ supports:[...], _meta:{...} })
                                     Used by: js/support/data.js

   ── Deploy ──────────────────────────────────────────────────
   Extensions → Apps Script → paste → Save
   Deploy → New deployment → Web app
     Execute as: Me
     Who has access: Anyone
   Copy Web app URL → paste into:
     js/initiative/config.js  → CONFIG.APPS_SCRIPT_URL   (existing)
     js/issue/config.js       → ISSUE_APPS_SCRIPT_URL    (new)
     js/support/config.js     → SUPPORT_APPS_SCRIPT_URL  (new)
   (All three can use the same URL — routing is by ?sheet= param)

   ── Sheet GIDs ──────────────────────────────────────────────
   Initiatives : GID_PPP      — original GID (660147076 from original script)
   Issues      : GID_ISSUES   = 791347021
   Supports    : GID_SUPPORTS = 660147076 ← ** confirm this is correct **
   Note: if supports and PPP initiatives share the same GID,
         differentiate by row content (PPP-xxx vs GIT-xxx prefix)
══════════════════════════════════════════════════════════════ */

var SPREADSHEET_ID  = '1dEBSAcmkT5tQmzaQDQEieex3WMCyPBi1JjQdOpVH8Nc';
var GID_PPP         = 660147076;   /* PPP initiatives — original */
var GID_ISSUES      = 791347021;   /* issues sheet               */
var GID_SUPPORTS    = 660147076;   /* supports sheet — verify    */

/* ══════════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════════ */
function doGet(e) {
  var params   = e.parameter || {};
  var sheet    = (params.sheet    || 'initiatives').toLowerCase();
  var callback = params.callback  || null;   /* JSONP callback name */

  try {
    var result;
    if      (sheet === 'issues')   result = getIssues();
    else if (sheet === 'supports') result = getSupports();
    else                           result = getInitiatives();   /* default */

    return _respond(result, callback);

  } catch (err) {
    return _respond({ error: err.message }, callback);
  }
}

/* ── Response helpers ───────────────────────────────────────── */

/** Return JSON (initiatives) or JSONP (issues/supports) */
function _respond(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) {
    /* JSONP — browser <script> tag can load cross-origin */
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  /* Plain JSON — used by initiative fetch() */
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/** Find a sheet by its GID (survives tab renames) */
function _sheetByGid(ss, gid) {
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getSheetId() === gid) return all[i];
  }
  return null;
}

/** Stringify a cell value */
function _s(v) {
  return (v !== undefined && v !== null) ? String(v).trim() : '';
}

/** Lookup a value from a raw row-object using multiple possible column names */
function _get(raw, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    if (raw[aliases[i]] !== undefined && raw[aliases[i]] !== '') {
      return raw[aliases[i]];
    }
  }
  return '';
}

/** Parse time-spent: Jira exports seconds as integer or numeric string */
function _parseSec(raw) {
  if (!raw && raw !== 0) return 0;
  var n = typeof raw === 'number' ? raw : parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/* ══════════════════════════════════════════════════════════════
   INITIATIVES  (original behaviour — unchanged)
   Response: { data: [...rows], count, updated }
══════════════════════════════════════════════════════════════ */
function getInitiatives() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = _sheetByGid(ss, GID_PPP);
  if (!sheet) throw new Error('PPP sheet (GID ' + GID_PPP + ') not found');

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return _s(h); });
  var rows    = data.slice(1)
    .filter(function(r) { return _s(r[0]).startsWith('PPP'); })
    .map(function(r) {
      var obj = {};
      headers.forEach(function(h, i) {
        obj[h] = (r[i] !== undefined && r[i] !== null) ? String(r[i]) : '';
      });
      return obj;
    });

  return {
    data:    rows,
    count:   rows.length,
    updated: new Date().toISOString(),   /* keep original field name */
  };
}

/* ══════════════════════════════════════════════════════════════
   ISSUES
   Response (JSONP): { issues: [...], _meta: { generated, count, sheet } }
══════════════════════════════════════════════════════════════ */
function getIssues() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = _sheetByGid(ss, GID_ISSUES);
  if (!sheet) throw new Error('Issues sheet (GID ' + GID_ISSUES + ') not found');

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return _s(h); });
  var rows    = data.slice(1);

  var issues = rows
    .filter(function(r) { return _s(r[0]) !== ''; })
    .map(function(r) {
      var raw = {};
      headers.forEach(function(h, i) { raw[h] = _s(r[i]); });
      return {
        Key:              _get(raw, ['Issue key', 'Key']),
        Summary:          _get(raw, ['Summary']),
        Status:           _get(raw, ['Status']),
        Components:       _get(raw, ['Component/s', 'Components']),
        Labels:           _get(raw, ['Labels']),
        Due:              _get(raw, ['Due date', 'Due']),
        Assignee:         _get(raw, ['Assignee']),
        Priority:         _get(raw, ['Priority']),
        RootCause:        _get(raw, ['Root Cause', 'Root cause']),
        FailureOccurs:    _get(raw, ['Failure occurs',
                                     'Custom field (Failure occurs)']),
        CorrectionBegins: _get(raw, ['Failure correction begins',
                                     'Custom field (Failure correction begins)']),
        FailureResolved:  _get(raw, ['Failure resolved',
                                     'Custom field (Failure resolved)']),
      };
    });

  return {
    issues: issues,
    _meta: {
      generated: new Date().toISOString(),
      count:     issues.length,
      sheet:     'issues',
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   SUPPORTS
   Response (JSONP): { supports: [...], _meta: { generated, count, sheet } }
══════════════════════════════════════════════════════════════ */
function getSupports() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = _sheetByGid(ss, GID_SUPPORTS);
  if (!sheet) throw new Error('Supports sheet (GID ' + GID_SUPPORTS + ') not found');

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return _s(h); });
  var rows    = data.slice(1);

  var supports = rows
    .filter(function(r) { return _s(r[0]) !== ''; })
    /* If PPP and supports share the same GID, only take GIT-xxx rows */
    .filter(function(r) {
      var key = _s(r[0]);
      return key.startsWith('GIT') || !key.startsWith('PPP');
    })
    .map(function(r) {
      var raw = {};
      headers.forEach(function(h, i) {
        raw[h] = r[i];          /* keep raw (number) for time-spent */
      });
      var timeRaw = raw['Σ Time Spent'] !== undefined ? raw['Σ Time Spent']
                  : raw['Time Spent']   !== undefined ? raw['Time Spent'] : 0;
      return {
        Key:          _s(_get(raw, ['Issue key', 'Key'])),
        Summary:      _s(_get(raw, ['Summary'])),
        Status:       _s(_get(raw, ['Status'])),
        Components:   _s(_get(raw, ['Component/s', 'Components'])),
        Group:        _s(_get(raw, ['Fix versions', 'Fix Versions', 'Group'])),
        Labels:       _s(_get(raw, ['Labels'])),
        Due:          _s(_get(raw, ['Due date', 'Due'])),
        Assignee:     _s(_get(raw, ['Assignee'])),
        Priority:     _s(_get(raw, ['Priority'])),
        TimeSpentSec: _parseSec(timeRaw),
      };
    });

  return {
    supports: supports,
    _meta: {
      generated: new Date().toISOString(),
      count:     supports.length,
      sheet:     'supports',
    },
  };
}
