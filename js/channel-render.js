/* ══════════════════════════════════════════════
   CHANNEL RENDER — charts, cards, tables
   Depends on: channel-config.js, channel-data.js
══════════════════════════════════════════════ */

/* ── Format helpers ──────────────────────── */
function fmt(v, t) {
  if (v == null || isNaN(v)) return '\u2014';
  if (t === 'thb')  return '\u0e3f' + (v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v.toFixed(0));
  if (t === 'thbf') return '\u0e3f' + v.toLocaleString('en', {maximumFractionDigits: 0});
  if (t === 'pct')  return (v * 100).toFixed(1) + '%';
  if (t === 'pct2') return (v * 100).toFixed(2) + '%';
  if (t === 'num')  return v >= 1e6 ? (v/1e6).toFixed(2)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v).toLocaleString();
  if (t === 'x')    return v.toFixed(1) + 'x';
  if (t === 'dec')  return v.toFixed(2);
  return String(v);
}

function pctChg(a, b) {
  if (!a || !b || a === 0) return null;
  return (b - a) / Math.abs(a);
}

function sumA(a) {
  if (!a) return 0;
  return a.reduce(function(s, v) { return s + (v || 0); }, 0);
}

function lastVal(a) {
  if (!a) return null;
  for (var i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i];
  return null;
}

/* ── KPI card HTML ───────────────────────── */
function kCard(label, val, vs, ft, col, lowerGood) {
  var c    = pctChg(vs, val);
  var good = (c == null) ? null : (lowerGood ? c <= 0 : c >= 0);
  var cls  = good == null ? '' : (good ? 'up' : 'dn');
  var icon = cls === 'up' ? '\u25b2' : cls === 'dn' ? '\u25bc' : '';
  var chgH = c != null ? '<span class="kchg ' + cls + '">' + icon + ' ' + (Math.abs(c * 100).toFixed(1)) + '%</span>' : '';
  var vsH  = vs != null ? '<span class="kvs">vs ' + fmt(vs, ft) + '</span>' : '';
  return '<div class="kcard ' + col + '"><div class="klabel">' + label + '</div>'
       + '<div class="kval">' + fmt(val, ft) + '</div>'
       + '<div class="kmeta">' + chgH + vsH + '</div></div>';
}

/* ── Chart defaults ──────────────────────── */
var TIP = {
  backgroundColor: '#0d1117',
  borderColor: '#58a6ff',
  borderWidth: 1,
  titleColor: '#8b949e',
  bodyColor: '#e6edf3',
  padding: 12,
  boxPadding: 4,
  usePointStyle: true,
};

function chartDefaults() {
  Chart.defaults.color       = '#8b949e';
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
  Chart.defaults.font.size   = 11;
  Chart.defaults.plugins.legend.display = true;
}

function mkLine(id, datasets, labels, yFn, y2Fn) {
  var ctx = document.getElementById(id); if (!ctx) return null;
  var scales = {
    x: {
      grid: {color: 'rgba(48,54,61,0.6)', drawBorder: false},
      ticks: {color: '#8b949e', maxRotation: 0, autoSkipPadding: 12}
    },
    y: {
      grid: {color: 'rgba(48,54,61,0.6)', drawBorder: false},
      ticks: {color: '#8b949e', callback: yFn || function(v) { return v; }},
      beginAtZero: false
    }
  };
  if (y2Fn) scales.y2 = {
    position: 'right',
    grid: {display: false},
    ticks: {color: '#8b949e', callback: y2Fn}
  };
  return new Chart(ctx, {
    type: 'line',
    data: {labels: labels, datasets: datasets},
    options: {
      responsive: true,
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {
          labels: {
            usePointStyle: true, pointStyle: 'circle',
            boxWidth: 8, padding: 16, color: '#c9d1d9'
          }
        },
        tooltip: TIP
      },
      scales: scales
    }
  });
}

function mkBar(id, datasets, labels, yFn, stacked) {
  var ctx = document.getElementById(id); if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: {labels: labels, datasets: datasets},
    options: {
      responsive: true,
      plugins: {
        legend: {labels: {usePointStyle: true, boxWidth: 8, padding: 16, color: '#c9d1d9'}},
        tooltip: TIP
      },
      scales: {
        x: {
          stacked: !!stacked,
          grid: {color: 'rgba(48,54,61,0.4)', drawBorder: false},
          ticks: {color: '#8b949e', maxRotation: 0}
        },
        y: {
          stacked: !!stacked,
          grid: {color: 'rgba(48,54,61,0.4)', drawBorder: false},
          ticks: {color: '#8b949e', callback: yFn || function(v) { return v; }}
        }
      }
    }
  });
}

function lds(label, data, color, opts) {
  opts = opts || {};
  return {
    label: label, data: data, borderColor: color,
    backgroundColor: opts.fill ? color + '33' : (opts.dashed ? 'transparent' : color + '15'),
    fill: opts.fill ? true : (!opts.dashed && !opts.nd ? 'origin' : false),
    borderWidth: opts.dashed ? 1.5 : 2.5,
    pointRadius: opts.nd ? 0 : 4,
    pointHoverRadius: 7,
    pointBackgroundColor: color,
    pointBorderColor: '#161b22',
    pointBorderWidth: 1.5,
    tension: 0.4,
    yAxisID: opts.y2 ? 'y2' : 'y',
    borderDash: opts.dashed ? [6, 4] : undefined
  };
}

function ldsBar(label, data, color) {
  return {
    label: label, data: data,
    backgroundColor: color + 'cc',
    borderColor: color,
    borderWidth: 0,
    borderRadius: 4,
    hoverBackgroundColor: color
  };
}

/* ── Build page (called after data loads) ── */
function buildPage() {
  /* Safety: always destroy existing charts before rebuilding */
  destroyCharts();
  chartDefaults();
  var cfg = CHANNEL_CFG;

  /* Update overview subtitle */
  var ovSub = document.querySelector('#ov .sec-sub');
  if (ovSub) ovSub.textContent = cfg.ovSub;

  var SES = cfg.sessionField;   /* 'Session' or 'Session_SP' */

  /* Labels */
  var lbl25   = MONTHS.map(function(m) { return m + ' 25'; });
  var lbl2526 = lbl25.concat(['Jan 26', 'Feb 26']);
  var revLbl, n;

  if (cfg.hasY24) {
    revLbl = MONTHS.map(function(m) { return m + ' 24'; })
             .concat(MONTHS.map(function(m) { return m + ' 25'; }))
             .concat(['Jan 26', 'Feb 26']);
    n = 26;
  } else {
    revLbl = lbl2526;
    n = 14;
  }

  buildBstrip(SES);
  buildOvCards(currentYear, SES);

  /* Revenue chart */
  var revData, netData, baseData;
  if (cfg.hasY24) {
    revData  = D.Gross_Sales.y24.concat(D.Gross_Sales.y25).concat(D.Gross_Sales.y26.slice(0, 2));
    netData  = D.Net_Sales.y24.concat(D.Net_Sales.y25).concat(D.Net_Sales.y26.slice(0, 2));
    baseData = Array(n).fill(sumA(D.Gross_Sales.y24) / 12);
  } else {
    revData  = D.Gross_Sales.y25.concat(D.Gross_Sales.y26);
    netData  = D.Net_Sales.y25.concat(D.Net_Sales.y26);
    baseData = Array(n).fill(D.Gross_Sales.b24 / 12);
  }

  CHARTS.rev = mkLine('rev-chart', [
    lds('Gross Sales', revData,  'var(--accent)',  cfg.hasY24 ? {} : {fill: true}),
    lds('Net Sales',   netData,  'var(--accent2)'),
    lds('B2024 avg/mo', baseData, '#484f58', {dashed: true, nd: true}),
  ], revLbl, function(v) { return '\u0e3f' + (v >= 1e6 ? (v/1e6).toFixed(0)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : '0'); });

  /* Orders chart */
  var ordData, cusData;
  if (cfg.hasY24) {
    ordData = D.Orders.y24.concat(D.Orders.y25).concat(D.Orders.y26.slice(0, 2));
    cusData = D.Customer.y24.concat(D.Customer.y25).concat(D.Customer.y26.slice(0, 2));
  } else {
    ordData = D.Orders.y25.concat(D.Orders.y26);
    cusData = D.Customer.y25.concat(D.Customer.y26);
  }

  CHARTS.ord = mkLine('ord-chart', [
    lds('Orders',    ordData, 'var(--accent)'),
    lds('Customers', cusData, 'var(--accent2)'),
  ], revLbl, function(v) { return v >= 1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v).toString(); });

  CHARTS.eff = mkLine('eff-chart', [
    lds('Discount %',    D.Discount_pct.y25.map(function(v) { return v != null ? v*100 : null; }), 'var(--accent)'),
    lds('Mkt-to-Sale %', D.Mkt_to_Sale.y25.map(function(v)  { return v != null ? v*100 : null; }), 'var(--accent2)'),
  ], lbl25, function(v) { return v.toFixed(0) + '%'; });

  /* Build sections for current active tab */
  var activeId = (document.querySelector('.tab-panel.active') || {}).id;
  if (activeId === 'tr') buildTrSection(lbl25, lbl2526);
  if (activeId === 'rv') buildRvSection(lbl25, lbl2526);
}

/* ── Benchmark strip ─────────────────────── */
function buildBstrip(SES) {
  var items = [
    {l: 'Gross Sales', b24: D.Gross_Sales.b24, b25: D.Gross_Sales.b25, ft: 'thb'},
    {l: 'Net Sales',   b24: D.Net_Sales.b24,   b25: D.Net_Sales.b25,   ft: 'thb'},
    {l: 'Orders',      b24: D.Orders.b24,       b25: D.Orders.b25,       ft: 'num'},
    {l: 'Sessions',    b24: D[SES].b24,          b25: D[SES].b25,          ft: 'num'},
  ];
  var h = '';
  items.forEach(function(it) {
    var c = pctChg(it.b24, it.b25), dir = c != null && c >= 0 ? 'up' : 'dn';
    h += '<div class="bcard"><div class="blabel">' + it.l + '</div><div class="bvals">'
       + '<div class="bval">' + fmt(it.b25, it.ft) + '</div>'
       + '<div class="bsub">B2024: ' + fmt(it.b24, it.ft) + '</div>'
       + (c != null ? '<div class="bchg ' + dir + '">' + (dir === 'up' ? '\u25b2' : '\u25bc') + ' ' + (Math.abs(c*100).toFixed(1)) + '% YoY</div>' : '')
       + '</div></div>';
  });
  document.getElementById('bstrip').innerHTML = h;
}

/* ── Overview KPI cards ──────────────────── */
function buildOvCards(yr, SES) {
  SES = SES || (CHANNEL_CFG && CHANNEL_CFG.sessionField) || 'Session';
  var h = '';
  if (yr === '2025') {
    h += kCard('Gross Sales 2025', D.Gross_Sales.b25, D.Gross_Sales.b24, 'thb', 'o');
    h += kCard('Net Sales 2025',   D.Net_Sales.b25,   D.Net_Sales.b24,   'thb', 'b');
    h += kCard('Orders 2025',      D.Orders.b25,       D.Orders.b24,       'num', 'g');
    h += kCard('Sessions 2025',    D[SES].b25,          D[SES].b24,          'num', 'p');
    h += kCard('Customers 2025',   D.Customer.b25,     D.Customer.b24,     'num', 'o');
    h += kCard('CR 2025',          D.CR.b25,            D.CR.b24,            'pct2','b');
    h += kCard('AOV 2025',         D.AOV.b25,           D.AOV.b24,           'thb', 'g');
    h += kCard('Discount% 2025',   D.Discount_pct.b25, D.Discount_pct.b24, 'pct', 'p', true);
  } else {
    h += kCard('Gross Jan-Feb 26',    sumA(D.Gross_Sales.y26),  D.Gross_Sales.y25[0]+D.Gross_Sales.y25[1],   'thb', 'o');
    h += kCard('Net Jan-Feb 26',      sumA(D.Net_Sales.y26),    D.Net_Sales.y25[0]+D.Net_Sales.y25[1],       'thb', 'b');
    h += kCard('Orders Jan-Feb 26',   sumA(D.Orders.y26),        D.Orders.y25[0]+D.Orders.y25[1],             'num', 'g');
    h += kCard('Sessions Jan-Feb 26', sumA(D[SES].y26),           D[SES].y25[0]+D[SES].y25[1],                'num', 'p');
    h += kCard('AOV Jan 26',          D.AOV.y26[0],               D.AOV.y25[0],                                'thb', 'o');
    h += kCard('AOV Feb 26',          D.AOV.y26[1],               D.AOV.y25[1],                                'thb', 'b');
    h += kCard('Disc% Jan 26',        D.Discount_pct.y26[0],     D.Discount_pct.y25[0],                      'pct', 'g', true);
    h += kCard('Disc% Feb 26',        D.Discount_pct.y26[1],     D.Discount_pct.y25[1],                      'pct', 'p', true);
  }
  document.getElementById('ov-cards').innerHTML = h;
}

/* ── Traffic tab ─────────────────────────── */
function buildTrSection(lbl25, lbl2526) {
  var SES = CHANNEL_CFG.sessionField;
  var h = '';
  h += kCard('Sessions 2025',   D[SES].b25,     D[SES].b24,     'num', 'o');
  h += kCard('New Users 2025',  D.New_User.b25,  D.New_User.b24,  'num', 'b');
  h += kCard('Customers 2025',  D.Customer.b25,  D.Customer.b24,  'num', 'p');
  h += kCard('Sessions Jan 26', D[SES].y26[0],   D[SES].y25[0],   'num', 'o');
  h += kCard('Sessions Feb 26', D[SES].y26[1],   D[SES].y25[1],   'num', 'b');
  var roas_b25 = D.ROAS ? D.ROAS.b25 : null;
  var roas_b24 = D.ROAS ? D.ROAS.b24 : null;
  h += kCard('ROAS 2025', roas_b25, roas_b24, 'x', 'g');
  document.getElementById('tr-cards').innerHTML = h;

  if (CHARTS.ses) { CHARTS.ses.destroy(); CHARTS.ses = null; }
  if (CHARTS.cr)  { CHARTS.cr.destroy();  CHARTS.cr  = null; }
  if (CHARTS.aovt){ CHARTS.aovt.destroy();CHARTS.aovt= null; }

  CHARTS.ses = mkBar('ses-chart', [
    ldsBar('Sessions', D[SES].y25.concat(D[SES].y26), 'var(--accent)'),
  ], lbl2526, function(v) { return v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : Math.round(v).toString(); });

  CHARTS.cr = mkLine('cr-chart', [
    lds('CR %',   D.CR.y25.concat(D.CR.y26).map(function(v) { return v != null ? v*100 : null; }), 'var(--accent2)'),
    lds('B2024',  Array(14).fill(D.CR.b24 * 100), '#484f58', {dashed: true, nd: true}),
  ], lbl2526, function(v) { return v.toFixed(2) + '%'; });

  CHARTS.aovt = mkLine('aovtr-chart', [
    lds('AOV',       D.AOV.y25.concat(D.AOV.y26), 'var(--accent)'),
    lds('B2024 avg', Array(14).fill(D.AOV.b24),    '#484f58', {dashed: true, nd: true}),
  ], lbl2526, function(v) { return '\u0e3f' + (v/1e3).toFixed(1) + 'K'; });
}

/* ── Revenue tab ─────────────────────────── */
function buildRvSection(lbl25, lbl2526) {
  var h = '';
  h += kCard('AOV 2025',          D.AOV.b25,          D.AOV.b24,          'thb', 'o');
  h += kCard('AOV Jan 26',        D.AOV.y26[0],        D.AOV.y25[0],        'thb', 'b');
  h += kCard('Mkt-to-Sale 2025',  D.Mkt_to_Sale.b25,  D.Mkt_to_Sale.b24,  'pct', 'g', true);
  h += kCard('Cancel 2025',       D.Cancel.b25,        D.Cancel.b24,        'num', 'p', true);
  h += kCard('Disc% 2025',        D.Discount_pct.b25, D.Discount_pct.b24, 'pct', 'o', true);
  h += kCard('CR 2025',           D.CR.b25,            D.CR.b24,            'pct2','b');
  document.getElementById('rv-cards').innerHTML = h;

  var rows = [], M2 = MONTHS;
  for (var i = 0; i < 12; i++) rows.push({
    m: M2[i] + ' 25', gs: D.Gross_Sales.y25[i], ns: D.Net_Sales.y25[i],
    ord: D.Orders.y25[i], aov: D.AOV.y25[i], cr: D.CR.y25[i],
    disc: D.Discount_pct.y25[i], mts: D.Mkt_to_Sale.y25[i],
    cancel: D.Cancel.y25[i], cls: ''
  });
  [0, 1].forEach(function(i) {
    rows.push({
      m: (i === 0 ? 'Jan' : 'Feb') + ' 26',
      gs: D.Gross_Sales.y26[i], ns: D.Net_Sales.y26[i], ord: D.Orders.y26[i],
      aov: D.AOV.y26[i], cr: D.CR.y26[i], disc: D.Discount_pct.y26[i],
      mts: D.Mkt_to_Sale.y26[i], cancel: D.Cancel.y26[i], cls: 'yr26'
    });
  });

  var tb = '';
  rows.forEach(function(r) {
    tb += '<tr class="' + r.cls + '"><td>' + r.m + '</td>'
        + '<td>' + fmt(r.gs, 'thb') + '</td><td>' + fmt(r.ns, 'thb') + '</td>'
        + '<td>' + fmt(r.ord, 'num') + '</td><td>' + fmt(r.aov, 'thb') + '</td>'
        + '<td>' + fmt(r.cr, 'pct2') + '</td><td>' + fmt(r.disc, 'pct') + '</td>'
        + '<td>' + fmt(r.mts, 'pct') + '</td><td>' + fmt(r.cancel, 'num') + '</td></tr>';
  });
  document.getElementById('rv-tbl').innerHTML = tb;
}
