@echo off
title EasyLife
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte zuerst von https://nodejs.org installieren ^(LTS^), dann diese Datei erneut starten.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Erste Einrichtung, das dauert ein paar Minuten...
  call npm install
  if errorlevel 1 (
    echo Installation fehlgeschlagen.
    pause
    exit /b 1
  )
)
echo.
echo EasyLife startet. PC: http://localhost:3000
echo Handy: die "Network"-Adresse unten in den Handy-Browser eingeben.
echo Zum Beenden dieses Fenster schliessen.
echo.
start "" /b cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run dev
pause
