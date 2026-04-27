/* ══════════════════════════════════════════════════════════════
   GDB Apps Script — Final Unified v2
   Spreadsheet: PPP_Jira-Product-Discovery
   ID: 1dEBSAcmkT5tQmzaQDQEieex3WMCyPBi1JjQdOpVH8Nc
   Routes:
     (no param)              → initiatives { data:[...], count, updated }
     ?sheet=issues&callback= → issues JSONP { issues:[...], _meta }
     ?sheet=supports&callback→ supports JSONP{ supports:[...], _meta }
══════════════════════════════════════════════════════════════ */

var SPREADSHEET_ID = '1dEBSAcmkT5tQmzaQDQEieex3WMCyPBi1JjQdOpVH8Nc';
var GID_PPP      = 660147076;  /* initiatives — original GID */
var GID_ISSUES   = 894050881;  /* issues sheet */
var GID_SUPPORTS = 791347021;  /* supports sheet */

/* ── DEBUG ───────────────────────────────────────────────── */
function getDebugInfo() {
  var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets().map(function(sh) {
    return { name: sh.getName(), gid: sh.getSheetId(), rows: sh.getLastRow() };
  });
  return { debug: true, sheets: sheets };
}

function doGet(e) {
  var params   = e.parameter || {};
  var sheet    = (params.sheet || 'initiatives').toLowerCase();
  var callback = params.callback || null;
  try {
    var result = sheet === 'issues'   ? getIssues()   :
                 sheet === 'supports' ? getSupports() :
                 sheet === 'debug'    ? getDebugInfo():
                                        getInitiatives();
    return _respond(result, callback);
  } catch(err) {
    return _respond({ error: err.message }, callback);
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
function _respond(payload, cb) {
  var json = JSON.stringify(payload);
  if (cb) return ContentService.createTextOutput(cb + '(' + json + ')')
                               .setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function _sheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

function _s(v) {
  return (v !== undefined && v !== null) ? String(v).trim() : '';
}

function _get(raw, aliases) {
  /* 1. Exact match */
  for (var i = 0; i < aliases.length; i++) {
    if (raw[aliases[i]] !== undefined && String(raw[aliases[i]]).trim() !== '') {
      return String(raw[aliases[i]]).trim();
    }
  }
  /* 2. Case-insensitive + trim match */
  var keys = Object.keys(raw);
  for (var i = 0; i < aliases.length; i++) {
    var al = aliases[i].toLowerCase().trim();
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].toLowerCase().trim() === al) {
        var v = String(raw[keys[j]]).trim();
        if (v) return v;
      }
    }
  }
  return '';
}

function _parseSec(raw) {
  if (!raw && raw !== 0) return 0;
  var n = typeof raw === 'number' ? raw : parseInt(String(raw).replace(/[^0-9]/g,''), 10);
  return isNaN(n) ? 0 : n;
}

/* ── INITIATIVES (unchanged) ─────────────────────────────── */
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
      headers.forEach(function(h, i) { obj[h] = (r[i] != null) ? String(r[i]) : ''; });
      return obj;
    });
  return { data: rows, count: rows.length, updated: new Date().toISOString() };
}

/* ── ISSUES ──────────────────────────────────────────────── */
function getIssues() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('issues') || ss.getSheetByName('Issues') || _sheetByGid(ss, GID_ISSUES);
  if (!sheet) {
    var allSheets = ss.getSheets().map(function(s) {
      return s.getName() + ' (GID:' + s.getSheetId() + ')';
    }).join(', ');
    throw new Error('Issues sheet not found. Available sheets: ' + allSheets);
  }
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return _s(h); });
  var rows    = data.slice(1);

  var issues = rows
    .filter(function(r) { return _s(r[0]) !== ''; })
    .map(function(r) {
      var raw = {};
      headers.forEach(function(h, i) { raw[h] = _s(r[i]); });
      return {
        Key:               _get(raw, ['Key', 'Issue key']),
        IssueType:         _get(raw, ['Issue Type', 'Issue type']),
        Summary:           _get(raw, ['Summary']),
        Status:            _get(raw, ['Status']),
        Components:        _get(raw, ['Components', 'Component/s']),
        /* ── Group of Issue/Support Case — all possible column name variants ── */
        Group:             _get(raw, [
                             'Group of Issue/Support Case',
                             'Group of Issue/Support case',
                             'Group of issue/Support Case',
                             'Group of Issue/S',
                             'Group of Issue/s',
                             'Group',
                           ]),
        Labels:            _get(raw, ['Labels']),
        Due:               _get(raw, ['Due date', 'Due']),
        Assignee:          _get(raw, ['Assignee.displayName', 'Assignee.display', 'Assignee']),
        Priority:          _get(raw, ['Priority']),
        Severity:          _get(raw, ['Severity Level', 'Severity']),
        RootCause:         _get(raw, ['Root cause', 'Root Cause']),
        FailureOccurs:     _get(raw, ['Failure occurs',     'Custom field (Failure occurs)']),
        CorrectionBegins:  _get(raw, ['Failure correction begins', 'Failure correction',
                                      'Custom field (Failure correction begins)']),
        FailureResolved:   _get(raw, ['Failure resolved',   'Custom field (Failure resolved)']),
      };
    });

  return {
    issues: issues,
    _meta:  { generated: new Date().toISOString(), count: issues.length, sheet: 'issues' }
  };
}

/* ── SUPPORTS ────────────────────────────────────────────── */
function getSupports() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('supports') || ss.getSheetByName('Supports') ||
              ss.getSheetByName('Support')  || _sheetByGid(ss, GID_SUPPORTS);
  if (!sheet) {
    var allSheets = ss.getSheets().map(function(s) {
      return s.getName() + ' (GID:' + s.getSheetId() + ')';
    }).join(', ');
    throw new Error('Supports sheet not found. Available sheets: ' + allSheets);
  }
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return _s(h); });
  var rows    = data.slice(1);

  var supports = rows
    .filter(function(r) { return _s(r[0]) !== ''; })
    .filter(function(r) { var k = _s(r[0]); return k.startsWith('GIT') || !k.startsWith('PPP'); })
    .map(function(r) {
      var raw = {};
      headers.forEach(function(h, i) { raw[h] = r[i]; });

      var tRaw = raw['Σ Time Spent'] !== undefined ? raw['Σ Time Spent'] :
                 raw['Time Spent']   !== undefined ? raw['Time Spent']   :
                 (r[9] !== undefined ? r[9] : 0);

      var assignee = _s(_get(raw, ['Assignee.displayName', 'Assignee.display', 'Assignee', 'assignee'])) ||
                     _s(r[8]);

      return {
        Key:         _s(_get(raw, ['Key', 'Issue key'])) || _s(r[0]),
        Summary:     _s(_get(raw, ['Summary']))           || _s(r[2]),
        Status:      _s(_get(raw, ['Status']))            || _s(r[3]),
        Components:  _s(_get(raw, ['Components', 'Component/s'])) || _s(r[4]),
        Group:       _s(_get(raw, [
                       'Group of Issue/Support Case',
                       'Group of Issue/Support case',
                       'Group of Issue/S',
                       'Group of Issue/s',
                       'Group',
                     ])) || _s(r[5]),
        Labels:      _s(_get(raw, ['Labels']))            || _s(r[6]),
        Due:         _s(_get(raw, ['Due date', 'Due']))   || _s(r[7]),
        Assignee:    assignee,
        Priority:    _s(_get(raw, ['Priority']))          || _s(r[10]),
        TimeSpentSec: _parseSec(tRaw),
      };
    });

  return {
    supports: supports,
    _meta: {
      generated: new Date().toISOString(),
      count:     supports.length,
      sheet:     'supports',
      headers:   headers,
    }
  };

}
