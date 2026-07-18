@echo off
setlocal
echo ======================================================
echo    Starting Holistic Wealth Dashboard Application
echo ======================================================

:: 1. Detect Python command on Windows (python or py)
set PYTHON_CMD=
python --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=python
) else (
    py --version >nul 2>&1
    if not errorlevel 1 (
        set PYTHON_CMD=py
    )
)

if "%PYTHON_CMD%"=="" (
    echo.
    echo [ERROR] Python was not found on your Windows system!
    echo [ERROR] Please download and install Python from: https://www.python.org/downloads/
    echo [IMPORTANT] During installation, make sure to check the box: "Add python.exe to PATH"
    echo.
    pause
    exit /b 1
)

echo [INFO] Detected Python command: %PYTHON_CMD%

:: 2. Check if virtual environment 'venv' exists, create if missing
if not exist "venv\Scripts\python.exe" (
    echo [INFO] Virtual environment 'venv' not found. Creating one now...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment. Ensure your Python installation is valid.
        pause
        exit /b 1
    )
)

:: 3. Activate the virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

:: 4. Ensure pip is updated and required packages are installed inside the venv
echo [INFO] Verifying and installing required libraries from requirements.txt...
venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install required Python libraries. Check your internet connection or requirements.txt.
    pause
    exit /b 1
)

echo [INFO] All libraries are successfully installed and ready!
echo.
echo [INFO] Launching your web browser at http://localhost:8000 ...
start http://localhost:8000

:: 5. Start the FastAPI application server using the venv's Python
echo [INFO] Starting FastAPI Uvicorn server...
echo [INFO] Press Ctrl+C to stop the server at any time.
echo ======================================================
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

pause
endlocal
