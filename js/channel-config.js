/* ══════════════════════════════════════════════
   CHANNEL CONFIG — King Power KPI Dashboards
   One entry per channel — edit here to update
   all channel-specific labels/colors/keys.
══════════════════════════════════════════════ */

var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbNqmbHMy-H3fuAtWhICUATfQX5zgkXCzwJklhZP22UHR06Y_EO_P63Nrl8Q53XTFC_5A/exec';

var CHANNEL_REGISTRY = {

  KP1: {
    key:          'KP1',
    brand:        'KP.com Performance',
    brandSub:     'E-Commerce \u00b7 KPI Live Dashboard',
    badge:        'KP.com Channel',
    logoText:     'KP',
    logoBg:       'linear-gradient(135deg,#1a3a6c,#2563eb)',
    accent:       '#3b82f6',
    accent2:      '#22d3a4',
    sessionField: 'Session',
    hasY24:       true,
    ovSub:        '2024 & 2025 Monthly \u00b7 2026 YTD \u00b7 Live from Google Sheets',
  },

  F1: {
    key:          'F1',
    brand:        'Firster Performance',
    brandSub:     'E-Commerce \u00b7 KPI Live Dashboard',
    badge:        'Firster Channel',
    logoText:     'F',
    logoBg:       'linear-gradient(135deg,#7c3aed,#c026d3)',
    accent:       '#a855f7',
    accent2:      '#22d3a4',
    sessionField: 'Session_SP',
    hasY24:       true,
    ovSub:        '2024 & 2025 Monthly \u00b7 2026 YTD \u00b7 Live from Google Sheets',
  },

  KPCN: {
    key:          'KPCN',
    brand:        'KP.CN Performance',
    brandSub:     'China Market \u00b7 KPI Live Dashboard',
    badge:        'KP-CN Channel',
    logoText:     '\u4e2d',
    logoBg:       'linear-gradient(135deg,#c0392b,#f0900d)',
    accent:       '#f0900d',
    accent2:      '#58a6ff',
    sessionField: 'Session',
    hasY24:       false,
    ovSub:        '2025 Monthly \u00b7 2026 YTD \u00b7 Live from Google Sheets',
  },

  THT: {
    key:          'THT',
    brand:        'THT Performance',
    brandSub:     'Travel \u00b7 KPI Live Dashboard',
    badge:        'THT Channel',
    logoText:     'T',
    logoBg:       'linear-gradient(135deg,#065f46,#10b981)',
    accent:       '#10b981',
    accent2:      '#60a5fa',
    sessionField: 'Session',
    hasY24:       false,
    ovSub:        '2025 Monthly \u00b7 2026 YTD \u00b7 Live from Google Sheets',
  },

  DMALL: {
    key:          'DMALL',
    brand:        'Dmall Performance',
    brandSub:     'China Platform \u00b7 KPI Live Dashboard',
    badge:        'Dmall Channel',
    logoText:     'D',
    logoBg:       'linear-gradient(135deg,#b45309,#f59e0b)',
    accent:       '#f59e0b',
    accent2:      '#60a5fa',
    sessionField: 'Session',
    hasY24:       false,
    ovSub:        '2025 Monthly \u00b7 2026 YTD \u00b7 Live from Google Sheets',
  },

  JD: {
    key:          'JD',
    brand:        'JD Performance',
    brandSub:     'China Platform \u00b7 KPI Live Dashboard',
    badge:        'JD Channel',
    logoText:     'JD',
    logoBg:       'linear-gradient(135deg,#9f1239,#e11d48)',
    accent:       '#f43f5e',
    accent2:      '#60a5fa',
    sessionField: 'Session',
    hasY24:       false,
    ovSub:        '2025 Monthly \u00b7 2026 YTD \u00b7 Live from Google Sheets',
  },

};
