#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  WealthLens 2.0 — Launch Script
#  Starts the FastAPI backend (port 8000) and Vite frontend (port 5173)
# ─────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/WealthLensBackend"
FRONTEND_DIR="$SCRIPT_DIR/WealthLensFrontend"

# ── Colours ──────────────────────────────────────────────────────
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}💰 WealthLens 2.0${NC}"
echo -e "${CYAN}   Starting backend + frontend…${NC}"
echo ""

# ── Verify directories ────────────────────────────────────────────
if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${YELLOW}⚠️  Backend directory not found: $BACKEND_DIR${NC}"
  exit 1
fi
if [ ! -d "$FRONTEND_DIR" ]; then
  echo -e "${YELLOW}⚠️  Frontend directory not found: $FRONTEND_DIR${NC}"
  exit 1
fi

# ── Setup Python venv if needed ───────────────────────────────────
if [ ! -d "$BACKEND_DIR/venv" ]; then
  echo -e "${CYAN}📦 Creating Python virtual environment…${NC}"
  python3 -m venv "$BACKEND_DIR/venv"
  "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt" --quiet
  echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi

# ── Setup npm deps if needed ──────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${CYAN}📦 Installing frontend dependencies…${NC}"
  cd "$FRONTEND_DIR"
  npm install --silent
  echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

# ── Kill any lingering servers ────────────────────────────────────
echo -e "${CYAN}🧹 Clearing ports 8000 and 5173…${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 0.5

# ── Start Backend ─────────────────────────────────────────────────
echo -e "${GREEN}🚀 Starting FastAPI backend on http://localhost:8000${NC}"
cd "$BACKEND_DIR"
"$BACKEND_DIR/venv/bin/uvicorn" main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to be ready
echo -n "   Waiting for backend"
for i in {1..20}; do
  if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${NC}"
    break
  fi
  echo -n "."
  sleep 0.5
done

# ── Start Frontend ────────────────────────────────────────────────
echo -e "${PURPLE}⚡ Starting Vite frontend on http://localhost:5173${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  💰 WealthLens is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🌐 Frontend:  ${CYAN}http://localhost:5173${NC}"
echo -e "  🔌 Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "  📚 API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both servers"
echo ""

# ── Cleanup on exit ───────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Stopping WealthLens servers…${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✅ Stopped. Goodbye!${NC}"
}
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
