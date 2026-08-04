@echo off
title Krypt LARP - phone server
rem UTF-8 so the QR code's block characters render instead of turning to mojibake.
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed ^(or not on PATH^).
  echo   Get it from https://nodejs.org  then run this again.
  echo.
  pause
  exit /b 1
)

node "tools\serve.js"

echo.
echo   Server stopped.
pause
