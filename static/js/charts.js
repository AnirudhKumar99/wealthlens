/* ============================================================
   WealthLens — Chart.js Management & Currency Utilities
   ============================================================ */

'use strict';

// ── Chart instances (module-level singletons) ─────────────────
let wealthChart     = null;
let allocationChart = null;
let goalChart       = null;

// ── Colour palette ────────────────────────────────────────────
const C = {
  emerald:  '#10b981',
  amber:    '#f59e0b',
  red:      '#ef4444',
  blue:     '#3b82f6',
  cyan:     '#06b6d4',
  purple:   '#8b5cf6',
  orange:   '#f97316',
  pink:     '#ec4899',
  slate:    '#64748b',
};

const ASSET_COLORS = {
  equity:      C.emerald,
  debt:        C.blue,
  gold:        C.amber,
  real_estate: C.purple,
  liquid:      C.cyan,
  crypto:      C.pink,
  other:       C.slate,
};

// ── Chart.js global dark defaults ─────────────────────────────
Chart.defaults.color        = '#64748b';
Chart.defaults.borderColor  = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family  = 'Inter, sans-serif';
Chart.defaults.font.size    = 11;

// ── Shared tooltip style ──────────────────────────────────────
const TOOLTIP_BASE = {
  backgroundColor: 'rgba(10,22,40,0.96)',
  borderColor:     'rgba(255,255,255,0.10)',
  borderWidth:     1,
  padding:         12,
  titleColor:      '#f1f5f9',
  bodyColor:       '#94a3b8',
  cornerRadius:    8,
  displayColors:   true,
  boxPadding:      4,
};

// ════════════════════════════════════════════════════════════════
// Currency Formatter  (global, called from Alpine.js too)
// ════════════════════════════════════════════════════════════════
function formatCurrency(value, currency) {
  currency = currency || 'INR';
  var v   = parseFloat(value) || 0;
  var neg = v < 0 ? '-' : '';
  var abs = Math.abs(v);

  if (currency === 'INR') {
    if (abs >= 10000000) return neg + '₹' + (abs / 10000000).toFixed(2) + ' Cr';
    if (abs >= 100000)   return neg + '₹' + (abs / 100000).toFixed(2) + ' L';
    if (abs >= 1000)     return neg + '₹' + (abs / 1000).toFixed(1) + 'K';
    return neg + '₹' + abs.toLocaleString('en-IN');
  } else {
    if (abs >= 1000000) return neg + '$' + (abs / 1000000).toFixed(2) + 'M';
    if (abs >= 1000)    return neg + '$' + (abs / 1000).toFixed(1) + 'K';
    return neg + '$' + abs.toLocaleString('en-US');
  }
}

// ════════════════════════════════════════════════════════════════
// destroyCharts — safely destroy all existing Chart instances.
//   MUST be called before initCharts to avoid "Canvas is already
//   in use" errors that silently break all subsequent updates.
// ════════════════════════════════════════════════════════════════
function destroyCharts() {
  if (wealthChart)     { try { wealthChart.destroy();     } catch(e){} wealthChart     = null; }
  if (allocationChart) { try { allocationChart.destroy(); } catch(e){} allocationChart = null; }
  if (goalChart)       { try { goalChart.destroy();       } catch(e){} goalChart       = null; }
}

// ════════════════════════════════════════════════════════════════
// initCharts — create all three Chart.js instances.
//   Safe to call multiple times — destroys old instances first.
// ════════════════════════════════════════════════════════════════
function initCharts() {
  destroyCharts();  // idempotent: clears any existing instances

  // ── 1. Wealth Trajectory — Line/Area ─────────────────────
  var ctx1 = document.getElementById('wealthChart');
  if (!ctx1) { console.warn('WealthLens: #wealthChart canvas not found'); return; }

  wealthChart = new Chart(ctx1.getContext('2d'), {
    type: 'line',
    data: {
      labels:   [],
      datasets: [
        {
          label:           'Portfolio Value',
          data:            [],
          borderColor:     C.emerald,
          backgroundColor: 'rgba(16,185,129,0.09)',
          borderWidth:     2.5,
          fill:            true,
          tension:         0.4,
          pointRadius:     0,
          pointHoverRadius:5,
          order:           1,
        },
        {
          label:           'Cumulative Outflows',
          data:            [],
          borderColor:     C.amber,
          backgroundColor: 'rgba(245,158,11,0.06)',
          borderWidth:     1.5,
          fill:            true,
          tension:         0.4,
          pointRadius:     0,
          pointHoverRadius:5,
          borderDash:      [6, 3],
          order:           2,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      animation:           { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          display:  true,
          position: 'top',
          align:    'end',
          labels: {
            usePointStyle:   true,
            pointStyleWidth: 14,
            boxHeight:       6,
            padding:         20,
            color:           '#94a3b8',
            font:            { size: 11, weight: '500' },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10,22,40,0.96)',
          borderColor:     'rgba(255,255,255,0.10)',
          borderWidth:     1,
          padding:         12,
          titleColor:      '#f1f5f9',
          bodyColor:       '#94a3b8',
          cornerRadius:    8,
          displayColors:   true,
          boxPadding:      4,
          callbacks: {
            title: function(items) {
              var lbl = items[0] && items[0].label ? items[0].label : '';
              return lbl.replace('\n', '  ');
            },
            label: function(ctx) {
              return ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.raw);
            },
          },
        },
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color:         '#475569',
            font:          { size: 10 },
            maxRotation:   0,
            maxTicksLimit: 10,
            callback: function(val) {
              var label = this.getLabelForValue(val) || '';
              var parts = label.split('\n');
              var yr = parts[1] || parts[0] || '';
              return yr.replace('(', '').replace(')', '');
            },
          },
        },
        y: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color:         '#475569',
            font:          { size: 10 },
            callback:      function(v) { return formatCurrency(v); },
            maxTicksLimit: 7,
          },
        },
      },
    },
  });

  // ── 2. Portfolio Allocation — Doughnut ───────────────────
  var ctx2 = document.getElementById('allocationChart');
  if (!ctx2) { console.warn('WealthLens: #allocationChart canvas not found'); return; }

  allocationChart = new Chart(ctx2.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels:   [],
      datasets: [{
        data:            [],
        backgroundColor: [],
        borderWidth:     2,
        borderColor:     'rgba(5,13,30,0.8)',
        hoverOffset:     12,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '68%',
      animation:           { duration: 900, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding:       12,
            color:         '#94a3b8',
            font:          { size: 11 },
            boxHeight:     8,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10,22,40,0.96)',
          borderColor:     'rgba(255,255,255,0.10)',
          borderWidth:     1,
          padding:         12,
          titleColor:      '#f1f5f9',
          bodyColor:       '#94a3b8',
          cornerRadius:    8,
          displayColors:   true,
          boxPadding:      4,
          callbacks: {
            label: function(ctx) {
              var total = ctx.dataset.data.reduce(function(s, v) { return s + v; }, 0);
              var pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return ' ' + ctx.label + ': ' + formatCurrency(ctx.raw) + ' (' + pct + '%)';
            },
          },
        },
      },
    },
  });

  // ── 3. Goal Coverage — Horizontal Bar ────────────────────
  var ctx3 = document.getElementById('goalChart');
  if (!ctx3) { console.warn('WealthLens: #goalChart canvas not found'); return; }

  goalChart = new Chart(ctx3.getContext('2d'), {
    type: 'bar',
    data: {
      labels:   [],
      datasets: [
        {
          label:           'Portfolio Coverage',
          data:            [],
          backgroundColor: [],
          borderColor:     [],
          borderWidth:     1.5,
          borderRadius:    8,
          borderSkipped:   false,
          barThickness:    26,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'y',
      animation:           { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,22,40,0.96)',
          borderColor:     'rgba(255,255,255,0.10)',
          borderWidth:     1,
          padding:         12,
          titleColor:      '#f1f5f9',
          bodyColor:       '#94a3b8',
          cornerRadius:    8,
          displayColors:   true,
          boxPadding:      4,
          callbacks: {
            title: function(items) {
              return items[0] && items[0].label ? items[0].label : '';
            },
            label: function(ctx) {
              var pct    = ctx.raw || 0;
              var status = pct >= 100 ? '✓ Fully Funded' : pct >= 60 ? '⚠ At Risk' : '✗ Critical Gap';
              return ' Coverage: ' + (pct >= 120 ? '120%+' : pct.toFixed(1) + '%') + '  —  ' + status;
            },
            afterLabel: function(ctx) {
              var details = ctx.chart._goalDetails;
              if (!details) return [];
              var d = details[ctx.dataIndex];
              if (!d) return [];
              var surplus = d.portfolio_at_target - d.future_value;
              return [
                ' FV Required: ' + formatCurrency(d.future_value),
                ' Portfolio at Target: ' + formatCurrency(d.portfolio_at_target),
                d.gap > 0
                  ? ' Shortfall: ' + formatCurrency(d.gap)
                  : ' Surplus: '   + formatCurrency(surplus),
              ];
            },
          },
        },
      },
      scales: {
        x: {
          min:  0,
          max:  125,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color:         '#475569',
            font:          { size: 10 },
            callback:      function(v) { return v + '%'; },
            maxTicksLimit: 8,
          },
        },
        y: {
          grid:  { display: false },
          ticks: {
            color: '#94a3b8',
            font:  { size: 11, weight: '500' },
          },
        },
      },
    },
  });
}


// ════════════════════════════════════════════════════════════════
// updateCharts — push fresh simulation data into all three charts.
//   Each chart update is independently wrapped in try/catch so a
//   single chart error never silently prevents the others updating.
// ════════════════════════════════════════════════════════════════
function updateCharts(data, currency) {
  currency = currency || 'INR';
  if (!data) return;

  var yearly_data      = data.yearly_data;
  var goal_details     = data.goal_details;
  var asset_allocation = data.asset_allocation;

  function fmt(v) { return formatCurrency(v, currency); }

  // ── 1. Wealth Trajectory ─────────────────────────────────
  try {
    if (wealthChart && yearly_data && yearly_data.length) {
      wealthChart.data.labels = yearly_data.map(function(d) {
        return 'Age ' + d.age + '\n(' + d.year + ')';
      });
      wealthChart.data.datasets[0].data = yearly_data.map(function(d) { return d.portfolio_value; });
      wealthChart.data.datasets[1].data = yearly_data.map(function(d) { return d.cumulative_outflows; });

      wealthChart.options.plugins.tooltip.callbacks.label = function(ctx) {
        return ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw);
      };
      wealthChart.options.scales.y.ticks.callback = function(v) { return fmt(v); };

      // Colour line amber once retirement starts
      var retireIdx = -1;
      for (var i = 0; i < yearly_data.length; i++) {
        if (yearly_data[i].is_retirement) { retireIdx = i; break; }
      }
      if (retireIdx > 0) {
        (function(ri) {
          wealthChart.data.datasets[0].segment = {
            borderColor: function(ctx) {
              return ctx.p0DataIndex >= ri ? 'rgba(245,158,11,0.8)' : C.emerald;
            },
          };
        })(retireIdx);
      }

      wealthChart.update('active');
    }
  } catch(e) {
    console.error('WealthLens: wealthChart update failed:', e);
  }

  // ── 2. Allocation Donut ──────────────────────────────────
  try {
    if (allocationChart && asset_allocation && asset_allocation.length) {
      allocationChart.data.labels                      = asset_allocation.map(function(a) { return a.name; });
      allocationChart.data.datasets[0].data            = asset_allocation.map(function(a) { return a.value; });
      allocationChart.data.datasets[0].backgroundColor = asset_allocation.map(function(a) {
        return ASSET_COLORS[a.asset_class] || C.slate;
      });
      allocationChart.options.plugins.tooltip.callbacks.label = function(ctx) {
        var total = ctx.dataset.data.reduce(function(s, v) { return s + v; }, 0);
        var pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
        return ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + pct + '%)';
      };
      allocationChart.update('active');
    }
  } catch(e) {
    console.error('WealthLens: allocationChart update failed:', e);
  }

  // ── 3. Goal Coverage % Bar ───────────────────────────────
  try {
    if (goalChart && goal_details && goal_details.length) {
      goalChart._goalDetails = goal_details;

      goalChart.data.labels = goal_details.map(function(g) {
        return g.name + '  (' + g.target_year + ')';
      });
      goalChart.data.datasets[0].data = goal_details.map(function(g) {
        if (g.future_value <= 0) return 0;
        return Math.min(120, parseFloat(((g.portfolio_at_target / g.future_value) * 100).toFixed(1)));
      });
      goalChart.data.datasets[0].backgroundColor = goal_details.map(function(g) {
        return g.status === 'funded'  ? 'rgba(16,185,129,0.70)' :
               g.status === 'at_risk' ? 'rgba(245,158,11,0.70)' :
                                        'rgba(239,68,68,0.70)';
      });
      goalChart.data.datasets[0].borderColor = goal_details.map(function(g) {
        return g.status === 'funded' ? C.emerald : g.status === 'at_risk' ? C.amber : C.red;
      });
      goalChart.update('active');
    }
  } catch(e) {
    console.error('WealthLens: goalChart update failed:', e);
  }
}
