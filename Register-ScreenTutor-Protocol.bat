@echo off
rem Lets the "Open desktop panel" button on the ScreenTutor website start the desktop app.
rem Run it once; it only writes keys under HKEY_CURRENT_USER (no administrator rights).
rem Undo it with Unregister-ScreenTutor-Protocol.bat. Move this folder? Run it again.
cd /d "%~dp0"
set "EXE=%~dp0node_modules\electron\dist\electron.exe"
if not exist "%EXE%" (
  echo Electron is not installed here. Run "npm install" in this folder first.
  pause
  exit /b 1
)
if not defined ST_KEY set "ST_KEY=HKCU\Software\Classes\screentutor"
reg add "%ST_KEY%" /ve /d "URL:ScreenTutor" /f >nul
reg add "%ST_KEY%" /v "URL Protocol" /d "" /f >nul
reg add "%ST_KEY%\shell\open\command" /ve /d "\"%EXE%\" \"%~dp0.\" \"%%1\"" /f >nul
if errorlevel 1 (
  echo Could not register screentutor://
  pause
  exit /b 1
)
echo Registered. The "Open desktop panel" button on the website now starts ScreenTutor.
pause
