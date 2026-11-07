@echo off
rem ---------------------------------------------------------------
rem  Task 6 — WebGL build (Unity 6, batchmode)
rem  Требуется: активированная лицензия Unity (Unity Hub -> Sign in,
rem  Personal license) и установленный модуль WebGL Build Support.
rem  Запуск: build.bat  (из папки Task6)
rem ---------------------------------------------------------------
setlocal
set "UNITY=C:\Program Files\Unity\Hub\Editor\6000.6.7f1\Editor\Unity.exe"

if not exist "%UNITY%" (
  echo Unity editor not found: %UNITY%
  echo Update the UNITY path in build.bat.
  pause
  exit /b 1
)

echo Building WebGL...
"%UNITY%" -batchmode -quit -projectPath "%~dp0." ^
  -executeMethod Task6.EditorTools.Task6Builder.BuildWebGL ^
  -logFile "%~dp0build.log"

if errorlevel 1 (
  echo.
  echo BUILD FAILED. Exit code: %ERRORLEVEL%
  echo See build.log. Common cause: Unity license is not activated
  echo ^(open Unity Hub, sign in, get the free Personal license^).
  pause
  exit /b 1
)

echo.
echo BUILD OK. Output: %~dp0Build\WebGL
if exist "%~dp0Build\WebGL\build-report.txt" type "%~dp0Build\WebGL\build-report.txt"
pause