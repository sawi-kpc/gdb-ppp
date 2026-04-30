/* Override buildPatterns — replaced by heatmap, keep as no-op to prevent crash */
function buildPatterns(data) { /* replaced by buildHeatmapAC */ }

/* ── Support Render Patch ──────────────────────────────────────────────
   Override buildGroupChart (bar→pie) + add buildHeatmapAC
   Hook into init() after it runs via MutationObserver on #support-content
────────────────────────────────────────────────────────────────────── */

/* 1. Override buildGroupChart — pie chart (soft colors, thin stroke) */
function buildGroupChart(data) {
  var el = document.getElementById('group-chart');
  if (!el) return;
  var counts = {};
  data.forEach(function(d) {
    var g = (d.Group && d.Group.trim()) ? d.Group.trim() : 'other';
    counts[g] = (counts[g] || 0) + 1;
  });
  var entries = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });
  var total = entries.reduce(function(s, e) { return s + e[1]; }, 0) || 1;

  /* soft muted palette */
  var COLORS = ['#6BA8D4','#7DBF8A','#E8B86D','#D97E7E','#8B7EC8','#5BADA0'];
  var W = Math.max(el.offsetWidth || 0, 200);
  var R = Math.min(W * 0.36, 68);
  var cx = W / 2, cy = R + 14;
  var H = R * 2 + 28 + Math.ceil(entries.length / 2) * 16;
  var svg = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
  var startAngle = -Math.PI / 2;

  entries.forEach(function(e, i) {
    var sweep = e[1] / total * Math.PI * 2;
    var x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
    var x2 = cx + R * Math.cos(startAngle + sweep), y2 = cy + R * Math.sin(startAngle + sweep);
    var large = sweep > Math.PI ? 1 : 0;
    var col = COLORS[i % COLORS.length];
    svg += '<path d="M' + cx + ' ' + cy + ' L' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
           ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z"' +
           ' fill="' + col + '" stroke="rgba(255,255,255,0.15)" stroke-width="0.5">' +
           '<title>' + e[0] + ': ' + e[1] + ' (' + Math.round(e[1] / total * 100) + '%)</title></path>';
    if (sweep > 0.2) {
      var mx = cx + R * 0.62 * Math.cos(startAngle + sweep / 2);
      var my = cy + R * 0.62 * Math.sin(startAngle + sweep / 2);
      svg += '<text x="' + mx.toFixed(1) + '" y="' + my.toFixed(1) + '"' +
             ' text-anchor="middle" dominant-baseline="middle"' +
             ' font-size="10" font-weight="500" fill="rgba(255,255,255,0.9)">' +
             Math.round(e[1] / total * 100) + '%</text>';
    }
    startAngle += sweep;
  });

  /* legend */
  var legY = R * 2 + 24;
  entries.forEach(function(e, i) {
    var row = Math.floor(i / 2), col = i % 2;
    var lx = 6 + col * (W / 2), ly = legY + row * 16;
    var label = e[0].length > 22 ? e[0].substring(0, 21) + '\u2026' : e[0];
    svg += '<rect x="' + lx + '" y="' + ly + '" width="8" height="8" rx="2" fill="' + COLORS[i % COLORS.length] + '"/>';
    svg += '<text x="' + (lx + 11) + '" y="' + (ly + 7) + '" font-size="9.5" fill="var(--text2)">' + label + ' (' + e[1] + ')</text>';
  });

  svg += '</svg>';
  el.innerHTML = svg;
}

/* 2. buildHeatmapAC — Volume (A) + Avg effort (C) */
function buildHeatmapAC(data) {
  var MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function sg(g) {
    return (g || '').replace('marketing_automation', 'mktg_auto')
      .replace('firster_tiktok_report', 'f1_tiktok_rpt')
      .replace('firster_tiktok_update_stock', 'f1_stk')
      .replace('firster_report', 'f1_rpt')
      .replace('Unknown', 'unknown');
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
      h += '<th style="color:var(--text3);padding:2px 3px;font-size:9px;white-space:nowrap">' + sg(g) + '</th>';
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
