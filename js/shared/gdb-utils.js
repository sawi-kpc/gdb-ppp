/* ═══════════════════════════════════════════════════════════════════
   GDB Shared Utils — v2.0
   js/shared/gdb-utils.js
   Load AFTER firebase-auth and BEFORE any page render.js
   Exposes: window.GDB namespace with all shared utilities
═══════════════════════════════════════════════════════════════════ */
(function(global) {
  'use strict';

  var GDB = global.GDB || {};

  /* ── Date helpers ──────────────────────────────────────────────── */
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  GDB.parseDate = function(raw) {
    if (!raw) return null;
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  GDB.fmtDate = function(raw) {
    if (!raw) return '';
    var d = GDB.parseDate(raw);
    if (!d) return '';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };

  GDB.fmtHours = function(h) {
    if (h === null || h === undefined) return '—';
    if (h < 1)  return Math.round(h * 60) + 'm';
    if (h < 24) return h.toFixed(1) + 'h';
    return (h / 24).toFixed(1) + 'd';
  };

  GDB.secToHours = function(sec) {
    return sec ? sec / 3600 : 0;
  };

  GDB.monthKey = function(date) {
    var d = GDB.parseDate(date);
    if (!d) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  GDB.weekKey = function(date) {
    var d = GDB.parseDate(date);
    if (!d) return null;
    var jan1 = new Date(d.getFullYear(), 0, 1);
    var wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return "W" + String(wk).padStart(2, '0') + " '" + String(d.getFullYear()).slice(2);
  };

  /* ── Status / overdue helpers ──────────────────────────────────── */
  GDB.isOverdue = function(due, status) {
    if (!due) return false;
    var done = ['Done','Resolved','Closed'];
    if (done.indexOf(status) >= 0) return false;
    var d = GDB.parseDate(due);
    return d ? d < new Date() : false;
  };

  GDB.isStale = function(failureOccurs, status, days) {
    days = days || 7;
    if (!failureOccurs) return false;
    var open = ['Open','Re-open','Reopened','Investigating'];
    if (open.indexOf(status) < 0) return false;
    var d = GDB.parseDate(failureOccurs);
    if (!d) return false;
    return (new Date() - d) / 86400000 > days;
  };

  /* ── Badge HTML builders ───────────────────────────────────────── */
  var STATUS_CLASS = {
    'Open':'badge-open','Investigating':'badge-investigating',
    'In Progress':'badge-inprogress','Re-open':'badge-open',
    'Resolved':'badge-resolved','Done':'badge-done',
    'To do':'badge-todo','In progress':'badge-inprogress',
  };
  var PRI_CLASS = {
    'Highest':'badge-highest','High':'badge-high',
    'Medium':'badge-medium','Low':'badge-low','Lowest':'badge-lowest',
  };
  var SEV_CLASS = {
    'Critical':'badge-critical','Moderate':'badge-moderate',
    'Low':'badge-low','Lowest':'badge-lowest',
  };

  GDB.statusBadge = function(status) {
    if (!status) return '';
    var cls = STATUS_CLASS[status] || 'badge-todo';
    return '<span class="badge ' + cls + '">' + status + '</span>';
  };

  GDB.priorityBadge = function(priority) {
    if (!priority) return '';
    var cls = PRI_CLASS[priority] || 'badge-medium';
    return '<span class="badge ' + cls + '">' + priority + '</span>';
  };

  GDB.severityBadge = function(severity) {
    if (!severity) return '';
    var cls = SEV_CLASS[severity] || 'badge-moderate';
    return '<span class="badge ' + cls + '">' + severity + '</span>';
  };

  GDB.jiraLink = function(key, base) {
    var href = (base || 'https://kingpowerclick.atlassian.net/browse/') + key;
    return '<a class="jira-link" href="' + href + '" target="_blank">' + key + ' ↗</a>';
  };

  /* ── KPI strip builder ─────────────────────────────────────────── */
  GDB.buildKPI = function(containerId, cards) {
    /* cards: [{label, value, sub, color}]
       color: 'blue'|'green'|'amber'|'red'|'purple'|'teal' */
    var el = document.getElementById(containerId);
    if (!el) return;
    var COLOR_VAR = {
      blue:'var(--accent)',green:'var(--up)',amber:'var(--amber)',
      red:'var(--down)',purple:'var(--purple)',teal:'var(--teal)',
    };
    el.innerHTML = cards.map(function(c) {
      var col = COLOR_VAR[c.color] || 'var(--text)';
      return '<div class="kpi-card">' +
        '<div class="kpi-label">' + c.label + '</div>' +
        '<div class="kpi-value" style="color:' + col + '">' + c.value + '</div>' +
        (c.sub ? '<div style="font-size:11px;color:var(--text2)">' + c.sub + '</div>' : '') +
        '</div>';
    }).join('');
  };

  /* ── Table renderer ────────────────────────────────────────────── */
  /* Usage: GDB.buildTable(options)
     options: {
       containerId, columns, rows,
       onSort: fn(key, asc),
       sortKey, sortAsc,
       emptyMsg
     }
     columns: [{key, label, width, align, render: fn(row) → html}]
     rows: array of data objects
  */
  GDB.buildTable = function(opts) {
    var el = document.getElementById(opts.containerId);
    if (!el) return;
    var cols = opts.columns || [];
    var rows = opts.rows || [];
    var thead = '<thead><tr>' + cols.map(function(c) {
      var sorted = opts.sortKey === c.key ? ' sorted' : '';
      var arrow  = opts.sortKey === c.key ? (opts.sortAsc ? ' ↑' : ' ↓') : ' ↕';
      var style  = c.width ? ' style="width:' + c.width + '"' : '';
      var click  = opts.onSort ? ' onclick="' + opts.onSort + '(\'' + c.key + '\')"' : '';
      return '<th class="' + sorted + '"' + style + click + '>' + c.label + (opts.onSort ? arrow : '') + '</th>';
    }).join('') + '</tr></thead>';
    var tbody;
    if (!rows.length) {
      tbody = '<tbody><tr><td colspan="' + cols.length + '" class="empty">' + (opts.emptyMsg || 'No data') + '</td></tr></tbody>';
    } else {
      tbody = '<tbody>' + rows.map(function(row) {
        return '<tr>' + cols.map(function(c) {
          var align = c.align === 'right' ? ' style="text-align:right"' : '';
          var content = c.render ? c.render(row) : (row[c.key] || '—');
          return '<td' + align + '>' + content + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
    }
    el.innerHTML = '<div class="tbl-scroll"><table class="gdb-table">' + thead + tbody + '</table></div>';
  };

  /* ── Pagination ────────────────────────────────────────────────── */
  /* Usage: GDB.Pagination(options)
     options: { containerId, total, perPage, onPage: fn(page) }
     Returns: { page, go: fn(n), render: fn() }
  */
  GDB.Pagination = function(opts) {
    var state = { page: 1, perPage: opts.perPage || 20 };

    function totalPages() { return Math.max(1, Math.ceil(opts.total / state.perPage)); }

    function render() {
      var el = document.getElementById(opts.containerId);
      if (!el) return;
      var tp = totalPages();
      if (tp <= 1) { el.innerHTML = ''; return; }
      var p = state.page;
      var html = '';
      html += '<span class="pg-info">Page ' + p + ' / ' + tp + '</span>';
      html += '<button class="pg-btn"' + (p <= 1 ? ' disabled' : '') + ' onclick="' + opts.onPageFn + '(' + (p-1) + ')">‹</button>';
      // window of pages
      var from = Math.max(1, p - 2), to = Math.min(tp, from + 4);
      from = Math.max(1, to - 4);
      for (var i = from; i <= to; i++) {
        html += '<button class="pg-btn' + (i === p ? ' active' : '') + '" onclick="' + opts.onPageFn + '(' + i + ')">' + i + '</button>';
      }
      html += '<button class="pg-btn"' + (p >= tp ? ' disabled' : '') + ' onclick="' + opts.onPageFn + '(' + (p+1) + ')">›</button>';
      el.innerHTML = html;
    }

    state.go = function(n) {
      var tp = totalPages();
      state.page = Math.max(1, Math.min(tp, n));
      render();
      if (opts.onPage) opts.onPage(state.page);
    };
    state.render = render;
    state.reset  = function() { state.go(1); };
    state.setTotal = function(n) { opts.total = n; state.go(1); };
    return state;
  };

  /* ── Heatmap builder ───────────────────────────────────────────── */
  /* GDB.buildHeatmap(options)
     options: {
       containerId, rows, cols,
       cellValue: fn(rowKey, colKey) → number|null,
       cellFormat: fn(value, max) → {bg, fg, text},
       rowLabel: fn(rowKey) → string,
       colLabel: fn(colKey) → string,
       title, desc, showScale, scaleLow, scaleHigh
     }
  */
  GDB.buildHeatmap = function(opts) {
    var el = document.getElementById(opts.containerId);
    if (!el) return;
    var rows = opts.rows || [], cols = opts.cols || [];

    // compute max for default color scale
    var max = 0;
    rows.forEach(function(r) { cols.forEach(function(c) {
      var v = opts.cellValue(r, c);
      if (v && v > max) max = v;
    }); });

    var thead = '<thead><tr><th class="hm-th hm-th-corner">' + (opts.cornerLabel || '') + '</th>' +
      cols.map(function(c) {
        return '<th class="hm-th">' + (opts.colLabel ? opts.colLabel(c) : c) + '</th>';
      }).join('') + '</tr></thead>';

    var tbody = '<tbody>' + rows.map(function(r) {
      return '<tr><td class="hm-comp">' + (opts.rowLabel ? opts.rowLabel(r) : r) + '</td>' +
        cols.map(function(c) {
          var v = opts.cellValue(r, c);
          var fmt = opts.cellFormat ? opts.cellFormat(v, max) : GDB.heatGreen(v, max);
          return '<td class="hm-cell" style="background:' + fmt.bg + ';color:' + fmt.fg + '"' +
            ' title="' + (opts.rowLabel ? opts.rowLabel(r) : r) + ' × ' + (opts.colLabel ? opts.colLabel(c) : c) + ': ' + fmt.text + '">' +
            fmt.text + '</td>';
        }).join('') + '</tr>';
    }).join('') + '</tbody>';

    var scaleHtml = opts.showScale !== false ? (
      '<div class="hm-scale"><span class="hm-scale-lbl">' + (opts.scaleLow || 'Low') + '</span>' +
      '<div class="hm-scale-bar"></div>' +
      '<span class="hm-scale-lbl">' + (opts.scaleHigh || 'High') + '</span></div>'
    ) : '';

    var titleHtml = opts.title
      ? '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px">' + opts.title + '</div>' +
        (opts.desc ? '<div style="font-size:11px;color:var(--text2);margin-bottom:8px">' + opts.desc + '</div>' : '')
      : '';

    el.innerHTML = titleHtml +
      '<div class="hm-wrap"><table class="hm-table"><thead>' + thead + '</thead>' + tbody + '</table></div>' +
      scaleHtml;
  };

  /* ── Heatmap color scales ──────────────────────────────────────── */
  GDB.heatGreen = function(v, max) {
    if (v === null || v === undefined) return { bg:'transparent', fg:'var(--text3)', text:'—' };
    var p = Math.min(v / (max||1), 1);
    if (p < 0.3)  return { bg:'#EAF3DE', fg:'#3B6D11', text: v };
    if (p < 0.65) return { bg:'#97C459', fg:'#27500A', text: v };
    return { bg:'#3B6D11', fg:'#EAF3DE', text: v };
  };

  GDB.heatRedAmber = function(v, max) {
    if (v === null || v === undefined) return { bg:'transparent', fg:'var(--text3)', text:'—' };
    var t = typeof v === 'number' ? (v < 2 ? v.toFixed(1)+'h' : v.toFixed(0)+'h') : v;
    var p = Math.min(v / (max||1), 1);
    if (p < 0.15) return { bg:'#EAF3DE', fg:'#3B6D11', text: t };
    if (p < 0.4)  return { bg:'#FAEEDA', fg:'#633806', text: t };
    if (p < 0.7)  return { bg:'#EF9F27', fg:'#412402', text: t };
    return { bg:'#E24B4A', fg:'#FCEBEB', text: t };
  };

  GDB.heatBlue = function(v, max) {
    if (v === null || v === undefined) return { bg:'transparent', fg:'var(--text3)', text:'—' };
    var t = v.toFixed ? v.toFixed(0)+'h' : String(v);
    var p = Math.min(v / (max||1), 1);
    if (p < 0.15) return { bg:'#E6F1FB', fg:'#0C447C', text: t };
    if (p < 0.45) return { bg:'#85B7EB', fg:'#042C53', text: t };
    return { bg:'#0C447C', fg:'#E6F1FB', text: t };
  };

  /* ── Filter state manager ──────────────────────────────────────── */
  /* GDB.FilterState(defaults) → { get, set, reset, onChange }
     defaults: { status: 'all', priority: 'all', ... }
  */
  GDB.FilterState = function(defaults) {
    var state = Object.assign({}, defaults);
    var listeners = [];
    return {
      get: function(key) { return state[key]; },
      set: function(key, val) { state[key] = val; listeners.forEach(function(fn){ fn(state); }); },
      reset: function() { state = Object.assign({}, defaults); listeners.forEach(function(fn){ fn(state); }); },
      all: function() { return Object.assign({}, state); },
      onChange: function(fn) { listeners.push(fn); },
    };
  };

  /* ── Sort state helper ─────────────────────────────────────────── */
  GDB.SortState = function(defaultKey, defaultAsc) {
    var key = defaultKey, asc = defaultAsc !== false;
    return {
      toggle: function(k) { if (key === k) asc = !asc; else { key = k; asc = true; } },
      key: function() { return key; },
      asc: function() { return asc; },
      sort: function(arr, getValue) {
        return arr.slice().sort(function(a, b) {
          var va = getValue ? getValue(a, key) : (a[key] || '');
          var vb = getValue ? getValue(b, key) : (b[key] || '');
          if (va < vb) return asc ? -1 : 1;
          if (va > vb) return asc ? 1 : -1;
          return 0;
        });
      },
    };
  };

  /* ── Loading / error state helpers ────────────────────────────── */
  GDB.showLoading = function(loadingId, contentId) {
    var l = document.getElementById(loadingId);
    var c = document.getElementById(contentId);
    if (l) l.style.display = 'flex';
    if (c) c.style.display = 'none';
  };

  GDB.showContent = function(loadingId, contentId) {
    var l = document.getElementById(loadingId);
    var c = document.getElementById(contentId);
    if (l) l.style.display = 'none';
    if (c) c.style.display = 'block';
  };

  GDB.showError = function(errorId, loadingId, message) {
    var e = document.getElementById(errorId);
    var l = document.getElementById(loadingId);
    if (l) l.style.display = 'none';
    if (e) {
      e.style.display = 'flex';
      var msg = e.querySelector('.gdb-error-msg');
      if (msg) msg.textContent = message || 'An error occurred';
    }
  };

  /* ── Count label helper ────────────────────────────────────────── */
  GDB.countLabel = function(filtered, total) {
    if (filtered === total) return 'Showing ' + total + ' items';
    return 'Showing ' + filtered + ' of ' + total + ' items';
  };

  /* ── Shared doughnut/pie chart (Chart.js) ─────────────────────────
     GDB.doughnutChart(opts)
     opts: { id, labels, data, colors, chartStore?, legendPos? }
     Destroys previous chart in chartStore[id] if present.
     Returns the Chart instance.
  ────────────────────────────────────────────────────────────────── */
  GDB.doughnutChart = function(opts) {
    var ctx = document.getElementById(opts.id);
    if (!ctx) return null;
    if (opts.chartStore && opts.chartStore[opts.id]) {
      opts.chartStore[opts.id].destroy();
    }
    var total = (opts.data || []).reduce(function(a, b) { return a + b; }, 0);
    var textColor = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#8b949e';
    var chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: opts.labels,
        datasets: [{
          data: opts.data,
          backgroundColor: opts.colors,
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.25)'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: opts.legendPos || 'bottom',
            labels: {
              color: textColor,
              font: { size: 10 }, padding: 8,
              generateLabels: function(ch) {
                return ch.data.labels.map(function(l, i) {
                  var v = ch.data.datasets[0].data[i];
                  var pct = total > 0 ? Math.round(v / total * 100) : 0;
                  return {
                    text: l + ' (' + v + ', ' + pct + '%)',
                    fillStyle: ch.data.datasets[0].backgroundColor[i],
                    strokeStyle: 'rgba(0,0,0,0.2)',
                    fontColor: textColor,
                    lineWidth: 1, hidden: false, index: i
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(c) {
                var pct = total > 0 ? Math.round(c.parsed / total * 100) : 0;
                return ' ' + c.label + ': ' + c.parsed + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });
    if (opts.chartStore) opts.chartStore[opts.id] = chart;
    return chart;
  };

  global.GDB = GDB;
})(window);
