@echo off
REM Avvia Conex in locale (serve Python installato).
cd /d "%~dp0dist"
start "" http://localhost:4173/
python -m http.server 4173
