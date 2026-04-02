@echo off
echo ========================================
echo   COMPILANDO INSTALADOR
echo ========================================
echo.

echo Compilando frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Error al compilar frontend
    pause
    exit /b 1
)
cd ..

echo.
echo Empaquetando aplicacion con Electron...
call npm run package

echo.
echo ========================================
echo   COMPILACION COMPLETADA
echo ========================================
echo.
echo El instalador se encuentra en la carpeta: dist/
echo.
pause
