@echo off
echo ===================================================
echo   ResumeAI Screener - Setting Up Python ML Backend  
echo ===================================================
echo.

:: Check for python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to your system PATH.
    echo Please install Python 3.8+ and try again.
    pause
    exit /b
)

:: Check if virtual environment exists, if not create it
if not exist .venv (
    echo [INFO] Creating Python virtual environment in .venv...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
)

echo [INFO] Activating virtual environment...
call .venv\Scripts\activate

echo [INFO] Installing requirements (FastAPI, Sentence-Transformers, spaCy, scikit-learn)...
pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install requirements.
    pause
    exit /b
)

echo [INFO] Verifying spaCy NLP models...
python -m spacy download en_core_web_sm

echo.
echo ===================================================
echo   Starting FastAPI Server on http://127.0.0.1:8000
echo ===================================================
echo.

:: Navigate to backend and start uvicorn
cd backend
uvicorn main:app --port 8000 --reload

pause
