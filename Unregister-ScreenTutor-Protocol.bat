@echo off
rem Removes the screentutor:// link created by Register-ScreenTutor-Protocol.bat.
if not defined ST_KEY set "ST_KEY=HKCU\Software\Classes\screentutor"
reg delete "%ST_KEY%" /f >nul 2>&1
echo Removed.
pause
