@echo off
echo ===================================================
echo   ResumeAI Screener - Starting Frontend Server
echo ===================================================
echo.

:: Always work from the script's own directory
cd /d "%~dp0"

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo [OK] Starting frontend on http://localhost:8080
echo.
echo  Open your browser and go to:
echo  http://localhost:8080
echo.
echo  Press Ctrl+C to stop.
echo ===================================================
echo.

python -m http.server 8080

pause
