/* ── GDB Role Config ────────────────────────────────────────────────────────
   Single source of truth for all role/permission definitions.
   To add a user or role: edit GDB_ROLE_CONFIG only.
─────────────────────────────────────────────────────────────────────────── */

var GDB_ROLE_CONFIG = {

  /* Full access to Performance summary + all personal views */
  perf_admin: {
    emails: [
      'sawitree.jakkrawannit@kingpower.com',
      'chawanop.witthayaphirak@kingpower.com',
      'petchpailin.tocharoen@kingpower.com',
      'somrythi.pipattanasirikul@kingpower.com'
    ]
  },

  /* Personal performance view only — matched by email local-part prefix */
  perf_viewer: {
    namePrefixes: ['chalotorn','chawanop','natpapat','petchpailin','sawitree','sodsaran','somrythi']
  }

};

/* ── Helpers ── */

/* Resolve all roles for an email — returns string[] */
function gdbResolveRoles(email) {
  var roles = [];
  var e = (email || '').toLowerCase();
  var local = e.split('@')[0];
  Object.keys(GDB_ROLE_CONFIG).forEach(function(role) {
    var cfg = GDB_ROLE_CONFIG[role];
    if (cfg.emails && cfg.emails.indexOf(e) >= 0) {
      roles.push(role);
    }
    if (cfg.namePrefixes && cfg.namePrefixes.some(function(n) { return local.startsWith(n.toLowerCase()); })) {
      if (roles.indexOf(role) < 0) roles.push(role);
    }
  });
  return roles;
}

/* Store resolved roles after login — called by gdbAuthGuard */
function gdbStoreRoles(email) {
  var roles = gdbResolveRoles(email);
  window._gdbRoles = roles;
  try { sessionStorage.setItem('gdb_roles', JSON.stringify(roles)); } catch(e) {}
  return roles;
}

/* Check if current user has a specific role */
function gdbHasRole(role) {
  if (window._gdbRoles) return window._gdbRoles.indexOf(role) >= 0;
  try {
    var stored = JSON.parse(sessionStorage.getItem('gdb_roles') || '[]');
    return stored.indexOf(role) >= 0;
  } catch(e) { return false; }
}

/* For perf_viewer: return the matched PERF_PEOPLE name, or null */
function gdbPerfViewerName(email) {
  var local = (email || '').toLowerCase().split('@')[0];
  var cfg = GDB_ROLE_CONFIG.perf_viewer;
  if (!cfg || !cfg.namePrefixes) return null;
  for (var i = 0; i < cfg.namePrefixes.length; i++) {
    if (local.startsWith(cfg.namePrefixes[i].toLowerCase())) return cfg.namePrefixes[i];
  }
  return null;
}
