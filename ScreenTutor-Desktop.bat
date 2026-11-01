@echo off
rem Opens the ScreenTutor desktop app: an answer panel on the right edge of the screen that reads every
rem Win+Shift+S crop by itself. Builds the app on the first run; run "ScreenTutor-Desktop.bat rebuild" after updates.
cd /d "%~dp0"
if /I "%~1"=="rebuild" if exist dist rmdir /s /q dist
if not exist "dist\index.html" (
  call npm run build:release
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
)
start "" "node_modules\electron\dist\electron.exe" .
