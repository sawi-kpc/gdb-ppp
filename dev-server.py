#!/usr/bin/env python3
"""Local dev server that mocks Cloudflare Access + Firestore endpoints."""
import http.server, json, os, sys, re

MOCK_EMAIL = sys.argv[1] if len(sys.argv) > 1 else "sawitree.jakkrawannit@gmail.com"
PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

MOCK_FIRESTORE_APP = {
    "fields": {"maintenance": {"booleanValue": False}}
}

def _mock_member(email):
    return {
        "fields": {
            "active": {"booleanValue": True},
            "roles": {"arrayValue": {"values": [{"stringValue": "admin"}]}},
            "email": {"stringValue": email},
        }
    }

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def _json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = self.path
        if p == '/cdn-cgi/access/get-identity':
            self._json({"email": MOCK_EMAIL, "name": MOCK_EMAIL.split('@')[0]})
        elif '/firestore.googleapis.com/' in p and '/gdb-ppp_config/app_localhost' in p:
            self._json(MOCK_FIRESTORE_APP)
        elif '/firestore.googleapis.com/' in p and '/team_members/' in p:
            self._json(_mock_member(MOCK_EMAIL))
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        path = str(args[0]) if args else ''
        if '/cdn-cgi/' in path:
            print(f'  [mock-CF]  {path} -> {MOCK_EMAIL}')
        elif 'app_localhost' in path:
            print(f'  [mock-FS]  {path} -> maintenance=false')
        elif 'team_members' in path:
            print(f'  [mock-FS]  {path} -> roles=[admin]')
        else:
            super().log_message(fmt, *args)

print(f'  GDB-PPP Dev Server')
print(f'  http://localhost:{PORT}/')
print(f'  Mock email : {MOCK_EMAIL}')
print(f'  Override   : python3 dev-server.py other@email.com')
print()
http.server.HTTPServer(('', PORT), Handler).serve_forever()
