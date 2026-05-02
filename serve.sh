#!/bin/bash
# Local dev server — serves the project at http://localhost:8080
# Usage: ./serve.sh [port]

PORT=${1:-8080}
# Serve from parent folder so /gdb-ppp/ path matches GitHub Pages
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "──────────────────────────────────────────"
echo "  GDB-PPP Local Dev Server"
echo "  http://localhost:$PORT/gdb-ppp/"
echo "  Ctrl+C to stop"
echo "──────────────────────────────────────────"

cd "$ROOT"
python3 -m http.server "$PORT"
