/**
 * ============================================================
 *  KPI Master Dashboard — Universal Google Apps Script
 *  Version: 2.0  (added CORS support for GitHub Pages)
 *  Covers: KP.com, Firster, KP-CN, THT, Dmall, JD
 * ============================================================
 *
 *  HOW TO DEPLOY:
 *  1. Open Google Sheet (KPI_Master_Table)
 *  2. Extensions → Apps Script
 *  3. Paste this entire file (replace existing code)
 *  4. Save (Ctrl+S)
 *  5. Deploy → New deployment  (หรือ Manage deployments → edit)
 *       Type: Web App
 *       Execute as: Me
 *       Who has access: Anyone   ← ต้องเป็น Anyone (ไม่ใช่ Anyone with Google account)
 *  6. Click Deploy → Copy the Web App URL
 *  7. วาง URL ใน js/channel-config.js บรรทัด APPS_SCRIPT_URL
 *
 *  USAGE:
 *  GET  <url>?channel=KP1   → KP.com data
 *  GET  <url>?channel=F1    → Firster data
 *  GET  <url>?channel=KPCN  → KP-CN data
 *  GET  <url>?channel=THT   → THT data
 *  GET  <url>?channel=DMALL → Dmall data
 *  GET  <url>?channel=JD    → JD data
 * ============================================================
 */


// ── SHEET CONFIGURATION ──────────────────────────────────────

var CHANNELS = {

  KP1: {
    sheetName: 'KPI Master_KP1',
    displayName: 'KP.com',
    layout: 'KP1',
    kpiRows: {
      CPC:             3,
      CPM:             4,
      CTR:             5,
      Session:         6,
      Organic_Session: 7,
      Paid_Session:    8,
      Cost_per_Session:9,
      ROAS:            12,
      User:            13,
      New_User:        14,
      Customer:        15,
      Product_ATC:     16,
      ATC_Rate:        17,
      Checkout_Rate:   18,
      Abandonment:     19,
      Web_Txn:         20,
      App_Txn:         21,
      Gross_Sales:     22,
      Net_Sales:       23,
      Qty_Sales:       24,
      Orders:          25,
      CR:              26,
      AOV:             27,
      ARPU:            28,
      Discount:        29,
      Discount_pct:    30,
      Cancel:          31,
      CPO:             32,
      CAC:             33,
      Mkt_to_Sale:     34,
      New_Customer:    42,
      ATC_Session:     43,
      Begin_Checkout:  44,
      Media_Expense:   45,
      Amount_Spent:    46,
      Impressions:     47,
      Clicks:          48,
    }
  },

  F1: {
    sheetName: 'KPI Master_F1',
    displayName: 'Firster',
    layout: 'F1',
    kpiRows: {
      CPC:              3,
      CPM:              4,
      CTR:              5,
      Session_SP:       6,
      Session_GA:       7,
      Organic_Session:  8,
      Paid_Session:     9,
      CPS:              10,
      ROAS:             13,
      User:             14,
      New_User:         15,
      Customer:         16,
      Product_ATC:      17,
      ATC_Rate:         18,
      Checkout_Rate:    19,
      Abandonment:      20,
      Web_Txn:          21,
      App_Txn:          22,
      Gross_Sales:      23,
      Net_Sales:        24,
      Qty_Sales:        25,
      Orders:           26,
      CR:               27,
      AOV:              28,
      ARPU:             29,
      Discount:         30,
      Discount_pct:     31,
      Cancel:           32,
      CPO:              33,
      CAC:              34,
      Mkt_to_Sale:      35,
      Total_Mkt_Cost:   36,
      New_Customer:     46,
      Begin_Checkout:   48,
      ATC_Session:      49,
      New_Customer_Rate:50,
    }
  },

  KPCN: {
    sheetName: 'KPI Master_KP-CN',
    displayName: 'KP-CN',
    layout: 'SHORT',
    kpiRows: {
      CPC:             3,
      CPM:             4,
      CTR:             5,
      Session:         6,
      Organic_Session: 10,
      Paid_Session:    11,
      Cost_per_Session:12,
      ROAS:            13,
      User:            14,
      New_User:        15,
      Customer:        16,
      Member:          17,
      Product_ATC:     18,
      ATC_Rate:        19,
      Checkout_Rate:   20,
      Abandonment:     21,
      Web_Txn:         22,
      Mini_Program:    23,
      App_Txn:         24,
      Downloaded_App:  25,
      Gross_Sales:     26,
      Net_Sales:       27,
      Qty_Sales:       28,
      Orders:          29,
      CR:              30,
      AOV:             31,
      ARPU:            32,
      Discount:        33,
      Discount_pct:    34,
      Cancel:          35,
      CPO:             36,
      CAC:             37,
      Mkt_to_Sale:     38,
      Search:          46,
      New_SKU:         48,
    }
  },

  THT: {
    sheetName: 'KPI Master_THT',
    displayName: 'THT',
    layout: 'SHORT',
    kpiRows: {
      CPC:             3,
      CPM:             4,
      CTR:             5,
      Session:         6,
      Organic_Session: 7,
      Paid_Session:    8,
      Cost_per_Session:9,
      ROAS:            10,
      User:            11,
      New_User:        12,
      Customer:        13,
      Member:          14,
      Product_ATC:     15,
      ATC_Rate:        16,
      Checkout_Rate:   17,
      Abandonment:     18,
      Web_Txn:         19,
      Mini_Program:    20,
      App_Txn:         21,
      Downloaded_App:  22,
      Gross_Sales:     23,
      Net_Sales:       24,
      Qty_Sales:       25,
      Orders:          26,
      CR:              27,
      AOV:             28,
      ARPU:            29,
      Discount:        30,
      Discount_pct:    31,
      Cancel:          32,
      CPO:             33,
      CAC:             34,
      Mkt_to_Sale:     35,
      Search:          43,
      New_SKU:         45,
    }
  },

  DMALL: {
    sheetName: 'KPI Master_DMALL',
    displayName: 'Dmall',
    layout: 'SHORT',
    kpiRows: {
      CPC:                  3,
      CPM:                  4,
      CTR:                  5,
      Session:              6,
      Organic_Session:      7,
      Paid_Session:         8,
      Cost_per_Session:     9,
      ROAS:                 10,
      User:                 11,
      New_User:             12,
      Customer:             13,
      Member:               14,
      Product_ATC:          15,
      ATC_Rate:             16,
      Checkout_Rate:        17,
      Abandonment:          18,
      Web_Txn:              19,
      Mini_Program:         20,
      App_Txn:              21,
      Downloaded_App:       22,
      Gross_Sales:          23,
      Net_Sales:            24,
      Qty_Sales:            25,
      Orders:               26,
      CR:                   27,
      AOV:                  28,
      ARPU:                 29,
      Discount:             30,
      Discount_pct:         31,
      Cancel:               32,
      CPO:                  33,
      CAC:                  34,
      Mkt_to_Sale:          35,
      Search:               43,
      New_Customer:         45,
      Sales_Product_Card:   46,
      Sales_Livestream:     47,
      Sales_Short_Video:    48,
      Sales_Picture:        49,
      Sales_Others:         50,
      Sales_KP_Livestream:  51,
      Sales_KOL_Livestream: 52,
    }
  },

  JD: {
    sheetName: 'KPI Master_JD',
    displayName: 'JD',
    layout: 'SHORT',
    kpiRows: {
      CPC:             3,
      CPM:             4,
      CTR:             5,
      Session:         6,
      Organic_Session: 7,
      Paid_Session:    8,
      Cost_per_Session:9,
      ROAS:            10,
      User:            11,
      New_User:        12,
      Customer:        13,
      Member:          14,
      Product_ATC:     15,
      ATC_Rate:        16,
      Checkout_Rate:   17,
      Abandonment:     18,
      Web_Txn:         19,
      Mini_Program:    20,
      App_Txn:         21,
      Downloaded_App:  22,
      Gross_Sales:     23,
      Net_Sales:       24,
      Qty_Sales:       25,
      Orders:          26,
      CR:              27,
      AOV:             28,
      ARPU:            29,
      Discount:        30,
      Discount_pct:    31,
      Cancel:          32,
      CPO:             33,
      CAC:             34,
      Mkt_to_Sale:     35,
      Search:          43,
      New_Customer:    45,
    }
  }

};


// ── CORS HEADERS ──────────────────────────────────────────────
// จำเป็นสำหรับ fetch() จาก GitHub Pages

function setCorsHeaders(output) {
  // Apps Script ไม่ support set custom headers บน ContentService
  // แต่ Google Apps Script Web App ที่ deploy เป็น "Anyone"
  // จะ auto-allow CORS สำหรับ GET requests
  // ถ้ายัง CORS error ให้ใช้ JSONP mode แทน (ดู doGet)
  return output;
}

// ── MAIN HANDLER ─────────────────────────────────────────────

function doGet(e) {
  try {
    var params   = e ? e.parameter : {};
    var channelFilter = params.channel ? params.channel.toUpperCase() : null;
    var callback = params.callback || null;  // JSONP fallback

    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var result = {};

    var channelsToProcess = (channelFilter && CHANNELS[channelFilter])
      ? [channelFilter]
      : Object.keys(CHANNELS);

    for (var i = 0; i < channelsToProcess.length; i++) {
      var key    = channelsToProcess[i];
      var config = CHANNELS[key];
      try {
        result[key] = extractChannelData(ss, config);
        result[key].displayName = config.displayName;
      } catch (channelErr) {
        result[key] = { error: channelErr.message, displayName: config.displayName };
      }
    }

    result._meta = {
      generated: new Date().toISOString(),
      channels:  channelsToProcess,
      source:    'KPI Master Dashboard API v2.0'
    };

    var json = JSON.stringify(result);

    // JSONP mode — fallback เผื่อ CORS ยังไม่ผ่าน
    // เรียกใช้: fetch('<url>?channel=F1&callback=cb')
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// doOptions — handle CORS preflight (OPTIONS request)
// Apps Script จะ call function นี้เมื่อ browser ส่ง preflight
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}


// ── DATA EXTRACTION ───────────────────────────────────────────

function extractChannelData(ss, config) {
  var sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + config.sheetName);

  var data    = sheet.getDataRange().getValues();
  var layout  = config.layout;
  var kpiRows = config.kpiRows;
  var channelData = {};

  for (var kpiKey in kpiRows) {
    var rowNum = kpiRows[kpiKey];
    var rowIdx = rowNum - 1;
    if (rowIdx >= data.length) { channelData[kpiKey] = null; continue; }
    channelData[kpiKey] = parseRowByLayout(data[rowIdx], layout);
  }

  return channelData;
}


// ── COLUMN PARSERS ────────────────────────────────────────────

function parseRowByLayout(row, layout) {

  if (layout === 'KP1') {
    // col[2]=B2024, col[3-14]=Jan-Dec 2024
    // col[15]=B2025, col[16]=Target%
    // col[17-28]=Jan-Dec 2025
    // col[29]=B2026, col[30-41]=Jan-Dec 2026
    return {
      b24: pv(row[2]),
      y24: sliceRow(row, 3, 15),
      b25: pv(row[15]),
      y25: sliceRow(row, 17, 29),
      b26: pv(row[29]),
      y26: sliceRow(row, 30, 42),
    };
  }

  if (layout === 'F1') {
    // col[2-13]=Jan-Dec 2024, col[14]=B2024, col[15]=Target%
    // col[16-27]=Jan-Dec 2025, col[28]=B2025
    // col[29-40]=Jan-Dec 2026
    return {
      y24: sliceRow(row, 2, 14),
      b24: pv(row[14]),
      y25: sliceRow(row, 16, 28),
      b25: pv(row[28]),
      y26: sliceRow(row, 29, 41),
    };
  }

  if (layout === 'SHORT') {
    // col[2]=B2024
    // col[3-14]=Jan-Dec 2025, col[15]=B2025
    // col[16]=Jan2026, col[17]=Feb2026
    return {
      b24: pv(row[2]),
      y25: sliceRow(row, 3, 15),
      b25: pv(row[15]),
      y26: [pv(row[16]), pv(row[17])],
    };
  }

  return null;
}

function sliceRow(row, startCol, endCol) {
  var result = [];
  for (var i = startCol; i < endCol && i < row.length; i++) {
    result.push(pv(row[i]));
  }
  while (result.length < (endCol - startCol)) result.push(null);
  return result;
}

function pv(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'string') {
    v = v.trim();
    if (v === '' || v === 'NIL' || v === 'N/A' || v === '#DIV/0!' || v === '-') return null;
    v = v.replace(/,/g, '');
  }
  if (v instanceof Date) return null;
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}


// ── TEST FUNCTIONS ────────────────────────────────────────────

function testAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CHANNELS).forEach(function(key) {
    try {
      var d = extractChannelData(ss, CHANNELS[key]);
      Logger.log('[' + key + '] Gross B2025: ' + (d.Gross_Sales ? d.Gross_Sales.b25 : 'N/A'));
    } catch (e) {
      Logger.log('[' + key + '] ERROR: ' + e.message);
    }
  });
}

function testF1() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var d  = extractChannelData(ss, CHANNELS.F1);
  Logger.log('F1 Gross B2024: ' + d.Gross_Sales.b24);
  Logger.log('F1 Gross B2025: ' + d.Gross_Sales.b25);
  Logger.log('F1 Gross y26 Jan-Feb: ' + JSON.stringify(d.Gross_Sales.y26));
}

function testEndpoint() {
  var fakeEvent = { parameter: { channel: 'F1' } };
  var response  = doGet(fakeEvent);
  var parsed    = JSON.parse(response.getContent());
  Logger.log('F1 Gross B2025: '  + parsed.F1.Gross_Sales.b25);
  Logger.log('F1 Orders B2025: ' + parsed.F1.Orders.b25);
  Logger.log('Meta: '            + JSON.stringify(parsed._meta));
}
