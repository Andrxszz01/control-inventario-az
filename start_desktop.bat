@echo off
echo ========================================
echo   CONTROL INVENTARIO AZ - ESCRITORIO
echo ========================================
echo.

REM Ensure Electron runs as a GUI app, not as plain Node.js
SET ELECTRON_RUN_AS_NODE=

echo Compilando interfaz local...
call npm run build:frontend
if %errorlevel% neq 0 (
  echo Error al compilar el frontend.
  pause
  exit /b 1
)
echo.
echo Iniciando aplicacion de escritorio (Electron)...
call npm run electron:dev
