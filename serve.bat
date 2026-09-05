@echo off
rem Local HTTP server for the model-viewer page (PowerShell, no dependencies).
rem Usage: serve.bat [port]  (default 8080)
setlocal
set PORT=8080
if not "%~1"=="" set PORT=%~1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT%
pause
