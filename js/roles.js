/* ── GDB Role System ─────────────────────────────────────────────────────────
   Roles stored in Firestore: team_members/{sanitized_email}
   Fields: email, name, roles[], perfName (for perf_staff), active

   Roles:
     super_admin      — full access to everything
     viewer           — initiative, issue, support only
     perf_supervisor  — viewer + performance summary + all personal views
     perf_staff       — viewer + performance personal (own only)
─────────────────────────────────────────────────────────────────────────── */

var GDB_FIREBASE_CONFIG = {
  apiKey:    'AIzaSyCaS5kLNbm5lSLRHd1rdr0sXRCS5lB_Rgc',
  projectId: 'gdb-dashboard-prod'
};

/* ── Fetch roles from Firestore REST API (no SDK needed) ── */
function gdbFetchAndStoreRoles(email) {
  if (!email) {
    window._gdbRoles = [];
    window._gdbNamePrefix = null;
    return Promise.resolve([]);
  }
  /* localhost dev: grant super_admin so all pages are accessible */
  if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && email === 'dev@localhost') {
    var _devRoles = ['super_admin'];
    window._gdbRoles = _devRoles;
    window._gdbNamePrefix = 'Dev';
    try { sessionStorage.setItem('gdb_roles', JSON.stringify(_devRoles)); } catch(e) {}
    try { sessionStorage.setItem('gdb_perf_name', 'Dev'); } catch(e) {}
    return Promise.resolve(_devRoles);
  }
  var docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  var url = 'https://firestore.googleapis.com/v1/projects/' + GDB_FIREBASE_CONFIG.projectId +
            '/databases/(default)/documents/team_members/' + docId +
            '?key=' + GDB_FIREBASE_CONFIG.apiKey;

  return fetch(url)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(doc) {
      var roles = [];
      var perfName = null;
      if (doc && doc.fields) {
        var activeField = doc.fields.active;
        if (!activeField || activeField.booleanValue !== false) {
          var rf = doc.fields.roles;
          if (rf && rf.arrayValue && rf.arrayValue.values) {
            roles = rf.arrayValue.values.map(function(v) { return v.stringValue; }).filter(Boolean);
          }
          var pf = doc.fields.perfName;
          if (pf && pf.stringValue) perfName = pf.stringValue;
          else if (!perfName && doc.fields.name && doc.fields.name.stringValue)
            perfName = doc.fields.name.stringValue.split(' ')[0];
        }
      }
      window._gdbRoles = roles;
      window._gdbNamePrefix = perfName;
      try { sessionStorage.setItem('gdb_roles', JSON.stringify(roles)); } catch(e) {}
      try { sessionStorage.setItem('gdb_perf_name', perfName || ''); } catch(e) {}
      return roles;
    })
    .catch(function() {
      window._gdbRoles = [];
      window._gdbNamePrefix = null;
      return [];
    });
}

/* ── Check if current user has a role ── */
function gdbHasRole(role) {
  if (window._gdbRoles) return window._gdbRoles.indexOf(role) >= 0;
  try {
    var stored = JSON.parse(sessionStorage.getItem('gdb_roles') || '[]');
    return stored.indexOf(role) >= 0;
  } catch(e) { return false; }
}

/* ── For perf_staff: return stored perfName (which person's data to show) ── */
function gdbPerfViewerName() {
  if (typeof window._gdbNamePrefix !== 'undefined') return window._gdbNamePrefix || null;
  try { return sessionStorage.getItem('gdb_perf_name') || null; } catch(e) { return null; }
}

/* ── Legacy shim: gdbStoreRoles(email) — now a no-op, use gdbFetchAndStoreRoles ── */
function gdbStoreRoles() {}
