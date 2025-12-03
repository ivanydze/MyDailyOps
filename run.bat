@echo off
REM MyDailyOps Launcher
REM Automatically activates venv and runs the application

echo Starting MyDailyOps...
cd /d "%~dp0"
call venv\Scripts\activate.bat
python main.py
pause

