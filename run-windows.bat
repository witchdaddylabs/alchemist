@echo off
REM Alchemist - Windows quick-start launcher (double-clickable)
REM Runs run-windows.ps1 with execution policy bypass so no setup is required.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-windows.ps1"
pause
