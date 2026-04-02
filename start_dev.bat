@echo off
echo ========================================
echo   INICIANDO CONTROL DE INVENTARIO AZ
echo ========================================
echo.

echo Iniciando Backend...
start "Backend API" cmd /k "cd backend && npm run dev"

timeout /t 3

echo Iniciando Frontend...
start "Frontend React" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   SERVIDORES INICIADOS
echo ========================================
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Presiona Ctrl+C en cada ventana para detener
pause
