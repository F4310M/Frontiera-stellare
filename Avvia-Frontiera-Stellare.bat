@echo off
setlocal
title Frontiera Stellare

cd /d "%~dp0"
set "GAME_URL=http://127.0.0.1:4173"

rem Se il server e' gia attivo, apre direttamente il gioco.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%GAME_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto :open_game

where python >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=python"
    goto :start_server
)

where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=py"
    goto :start_server
)

echo.
echo ERRORE: Python non e' installato o non e' disponibile nel PATH.
echo Installa Python e riprova.
echo.
pause
exit /b 1

:start_server
echo Avvio Frontiera Stellare...
powershell -NoProfile -Command "Start-Process -FilePath '%PYTHON_EXE%' -ArgumentList '-m','http.server','4173','--directory','dist' -WorkingDirectory '%CD%' -WindowStyle Hidden"
powershell -NoProfile -Command "Start-Sleep -Seconds 2"

:open_game
start "" "%GAME_URL%"
exit /b 0
