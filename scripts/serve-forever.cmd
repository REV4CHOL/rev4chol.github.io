@echo off
rem REVACHOL site — keep the local server alive forever.
rem Runs the dev server (serves live content from public\ — drop files,
rem refresh, done) and restarts it if it ever crashes or wedges.
rem Started hidden at Windows login via the Startup folder shortcut.
cd /d "D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\SITE"
:loop
call npm run dev
rem crashed or exited — breathe, then resurrect
timeout /t 5 /nobreak >nul
goto loop
