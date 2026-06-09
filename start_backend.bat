@echo off
echo ===================================================
echo   ResumeAI Screener - Python ML Backend Setup
echo ===================================================
echo.

:: Always work from the script's own directory (fixes path issues)
cd /d "%~dp0"
echo [INFO] Working directory: %CD%
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Download it from https://python.org/downloads/
    echo         Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo [OK] Python found:
python --version
echo.

:: Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo [INFO] Creating virtual environment (.venv)...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)
echo.

:: Activate virtual environment
echo [INFO] Activating virtual environment...
call ".venv\Scripts\activate.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Could not activate virtual environment.
    pause
    exit /b 1
)
echo [OK] Virtual environment active.
echo.

:: Install dependencies
echo [INFO] Installing Python packages (this may take a few minutes on first run)...
pip install -r backend\requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERROR] Package installation failed.
    pause
    exit /b 1
)
echo [OK] All packages installed.
echo.

:: Download spaCy model
echo [INFO] Checking spaCy model (en_core_web_sm)...
python -m spacy download en_core_web_sm --quiet
echo [OK] spaCy model ready.
echo.

:: Start FastAPI server
echo ===================================================
echo   Backend ready!  http://127.0.0.1:8000
echo   Press Ctrl+C to stop the server.
echo ===================================================
echo.

cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
