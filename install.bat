@echo off
echo ========================================
echo   CONTROL DE INVENTARIO AZ - SETUP
echo ========================================
echo.

echo Instalando dependencias del backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias del backend
    pause
    exit /b 1
)
cd ..

echo.
echo Instalando dependencias del frontend...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias del frontend
    pause
    exit /b 1
)
cd ..

echo.
echo Instalando dependencias raiz...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias raiz
    pause
    exit /b 1
)

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo Para iniciar en desarrollo ejecuta: start_dev.bat
echo Para compilar el instalador ejecuta: build.bat
echo.
pause
