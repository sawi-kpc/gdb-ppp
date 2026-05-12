/* Override buildPatterns — replaced by heatmap, keep as no-op to prevent crash */
function buildPatterns(data) { /* replaced by buildHeatmapAC */ }

/* ── Support Render Patch ──────────────────────────────────────────────
   Override buildGroupChart (bar→pie) + add buildHeatmapAC
   Hook into init() after it runs via MutationObserver on #support-content
────────────────────────────────────────────────────────────────────── */

/* 1. Override buildGroupChart — doughnut chart via GDB.doughnutChart */
function buildGroupChart(data) {
  var el = document.getElementById('group-chart');
  if (!el) return;

  var counts = {};
  data.forEach(function(d) {
    var g = (d.Group && d.Group.trim()) ? d.Group.trim() : 'other';
    counts[g] = (counts[g] || 0) + 1;
  });
  var entries = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });
  if (!entries.length) { el.innerHTML = ''; return; }

  var COLORS = ['#6BAED4','#6DBF9A','#D4A850','#E07878','#9B8FE0','#5BADA0','#D4B85A','#88C470'];
  var labels = entries.map(function(e) { return e[0].replace(/_/g, ' '); });
  var values = entries.map(function(e) { return e[1]; });
  var colors = entries.map(function(_, i) { return COLORS[i % COLORS.length]; });

  var canvasId = 'c-support-group';
  if (!document.getElementById(canvasId)) {
    el.innerHTML = '<canvas id="' + canvasId + '"></canvas>';
  }
  el.style.cssText = 'height:200px;position:relative';

  GDB.doughnutChart({ id: canvasId, labels: labels, data: values, colors: colors, legendPos: 'right' });
}

/* 2. buildHeatmapAC — Volume (A) + Avg effort (C) */
function buildHeatmapAC(data) {
  var MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function sg(g) {
    return g || '';
  }

  var vol = {}, eff = {};
  data.forEach(function(d) {
    var lbl = (d.Labels || '').split(',').find(function(l) {
      return /GDB_SUPPORT_\d{6}/.test(l.trim());
    });
    if (!lbl) return;
    var ym = lbl.trim().replace('GDB_SUPPORT_', '');
    var mo = ym.slice(0, 4) + '-' + ym.slice(4);
    var g = d.Group || 'unknown';
    if (!vol[mo]) vol[mo] = {};
    vol[mo][g] = (vol[mo][g] || 0) + 1;
    if (d.TimeSpentSec > 0) {
      if (!eff[mo]) eff[mo] = {};
      if (!eff[mo][g]) eff[mo][g] = { t: 0, n: 0 };
      eff[mo][g].t += d.TimeSpentSec / 3600;
      eff[mo][g].n++;
    }
  });

  var months = Object.keys(vol).sort();
  var groups = [];
  data.forEach(function(d) {
    var g = d.Group || 'unknown';
    if (g && groups.indexOf(g) < 0) groups.push(g);
  });
  groups.sort();

  var maxV = 0;
  months.forEach(function(mo) {
    groups.forEach(function(g) {
      if (vol[mo] && vol[mo][g] && vol[mo][g] > maxV) maxV = vol[mo][g];
    });
  });
  maxV = maxV || 1;

  function gc(v) {
    if (!v) return { b: 'transparent', f: 'var(--text3)', t: '\u2014' };
    var p = v / maxV;
    if (p < 0.3)  return { b: '#EAF3DE', f: '#3B6D11', t: v };
    if (p < 0.65) return { b: '#97C459', f: '#27500A', t: v };
    return { b: '#3B6D11', f: '#EAF3DE', t: v };
  }

  function hc(v) {
    if (v === null || v === undefined) return { b: 'transparent', f: 'var(--text3)', t: '\u2014' };
    var t = v < 2 ? v.toFixed(1) + 'h' : v.toFixed(0) + 'h';
    var p = v / 31;
    if (p < 0.15) return { b: '#EAF3DE', f: '#3B6D11', t: t };
    if (p < 0.4)  return { b: '#FAEEDA', f: '#633806', t: t };
    if (p < 0.7)  return { b: '#EF9F27', f: '#412402', t: t };
    return { b: '#E24B4A', f: '#FCEBEB', t: t };
  }

  function buildTable(elId, cfn, obj) {
    var el = document.getElementById(elId);
    if (!el) return;
    var h = '<table style="border-collapse:separate;border-spacing:2px;width:100%;font-size:10px">' +
            '<thead><tr><th style="text-align:left;color:var(--text3);padding:2px 4px 2px 0;font-size:9px;white-space:nowrap">Month</th>';
    groups.forEach(function(g) {
      h += '<th style="color:var(--text3);padding:2px 3px;font-size:9px;white-space:nowrap;text-transform:none;letter-spacing:0">' + sg(g) + '</th>';
    });
    h += '</tr></thead><tbody>';
    months.forEach(function(mo) {
      var p = mo.split('-');
      var ml = MS[parseInt(p[1]) - 1] + ' ' + p[0].slice(2);
      h += '<tr><td style="color:var(--text2);padding:3px 4px 3px 0;white-space:nowrap;font-size:9.5px">' + ml + '</td>';
      groups.forEach(function(g) {
        var v = (obj[mo] && obj[mo][g] !== undefined) ? obj[mo][g] : null;
        var c = cfn(v);
        h += '<td style="text-align:center;padding:6px 3px;border-radius:4px;font-weight:500;font-size:10px;' +
             'background:' + c.b + ';color:' + c.f + '" title="' + ml + ' \u00d7 ' + g + ': ' + c.t + '">' + c.t + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  }

  buildTable('heatmap-vol', gc, vol);

  /* avg effort per task */
  var ea = {};
  months.forEach(function(mo) {
    groups.forEach(function(g) {
      if (!ea[mo]) ea[mo] = {};
      ea[mo][g] = (eff[mo] && eff[mo][g] && eff[mo][g].n)
        ? eff[mo][g].t / eff[mo][g].n : null;
    });
  });
  buildTable('heatmap-effort', hc, ea);
}

/* 3. Hook: call buildHeatmapAC after init() runs ──────────────────── */
(function() {
  var origInit = window.init;
  if (typeof origInit === 'function') {
    window.init = function() {
      origInit.apply(this, arguments);
      if (window.supportData) buildHeatmapAC(window.supportData);
    };
  } else {
    /* init not yet defined — wait for it */
    var t = setInterval(function() {
      if (typeof window.init === 'function') {
        clearInterval(t);
        var origInit2 = window.init;
        window.init = function() {
          origInit2.apply(this, arguments);
          if (window.supportData) buildHeatmapAC(window.supportData);
        };
      }
    }, 50);
  }
})();
