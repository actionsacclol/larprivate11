@echo off
setlocal
rem ============================================================
rem  Opens the phone-server port inbound so your phone can reach it.
rem  Needs admin — it will ask for elevation.
rem
rem  Usage:  allow-firewall.cmd [port]
rem          allow-firewall.cmd remove [port]
rem
rem  Only run this if the Wi-Fi you are on is one you trust:
rem  it lets any device on that network open the gallery.
rem ============================================================

set "ACTION=%~1"
set "PORT=%~2"

rem Called as `allow-firewall.cmd 4173` — first arg is the port, not an action.
if /i not "%ACTION%"=="remove" (
  set "PORT=%ACTION%"
  set "ACTION="
)
if "%PORT%"=="" set "PORT=4173"

set "RULE=Krypt LARP (%PORT%)"

net session >nul 2>nul
if not errorlevel 1 goto :elevated

echo Requesting administrator access...
rem Re-launch elevated. PowerShell rejects an empty -ArgumentList, so the two
rem cases have to be spelled out separately rather than interpolating a
rem possibly-blank argument.
if "%ACTION%"=="" (
  powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0' -ArgumentList '%PORT%'"
) else (
  powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0' -ArgumentList '%ACTION%','%PORT%'"
)
exit /b

:elevated
if /i "%ACTION%"=="remove" (
  netsh advfirewall firewall delete rule name="%RULE%"
  echo.
  echo   Rule removed.
  pause
  exit /b
)

netsh advfirewall firewall delete rule name="%RULE%" >nul 2>nul
netsh advfirewall firewall add rule name="%RULE%" dir=in action=allow protocol=TCP localport=%PORT% profile=private,public

if errorlevel 1 (
  echo.
  echo   Could not add the rule. Is this really running as administrator?
) else (
  echo.
  echo   Port %PORT% is now open for incoming connections.
  echo   Scan the QR code in Krypt LARP with your phone.
)
echo.
pause
