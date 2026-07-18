#!/usr/bin/env bash
set -e

echo "======================================================"
echo "   Starting Holistic Wealth Dashboard Application"
echo "======================================================"

# Check if python3 or python is available
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
else
    echo "[ERROR] Python is not installed or not in PATH."
    echo "[ERROR] Please install Python 3.10+ from https://www.python.org/downloads/ or via your package manager."
    exit 1
fi

echo "[INFO] Detected Python command: $PYTHON_CMD"

# Check if virtual environment directory exists
if [ ! -f "venv/bin/python" ]; then
    echo "[INFO] Virtual environment 'venv' not found. Creating one using $PYTHON_CMD..."
    $PYTHON_CMD -m venv venv
fi

echo "[INFO] Activating virtual environment..."
source venv/bin/activate

echo "[INFO] Verifying and installing required libraries from requirements.txt..."
venv/bin/python -m pip install --upgrade pip >/dev/null 2>&1 || true
venv/bin/python -m pip install -r requirements.txt

# Function to open browser after server starts
open_browser() {
    sleep 2
    if command -v open &>/dev/null; then
        # macOS
        open "http://localhost:8000" &>/dev/null || true
    elif command -v xdg-open &>/dev/null; then
        # Linux
        xdg-open "http://localhost:8000" &>/dev/null || true
    fi
}

open_browser &

echo ""
echo "[INFO] All libraries installed! Launching your web browser at http://localhost:8000 ..."
echo "[INFO] Starting FastAPI Uvicorn server..."
echo "[INFO] Press Ctrl+C to stop the server."
echo "======================================================"
venv/bin/python -m uvicorn main:app --reload --port 8000
