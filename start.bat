@echo off
title CoreInventory — Starting...
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       CoreInventory Launcher             ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check if first-time setup is needed
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo [0/3] Installing backend dependencies...
    call npm install
    echo.
)

cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [0/3] Installing frontend dependencies...
    call npm install
    echo.
)

:: Run seed if database doesn't exist
cd /d "%~dp0backend"
if not exist "..\coreinventory.db" (
    echo [1/3] Setting up database + sample data...
    node seed.js
    echo.
) else (
    echo [1/3] Database already exists, skipping setup.
    echo.
)

:: Start Backend
echo [2/3] Starting Backend Server (port 5000)...
cd /d "%~dp0backend"
start "CoreInventory Backend" cmd /k "title CoreInventory Backend && color 0B && node server.js"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [3/3] Starting Frontend Dev Server (port 5173)...
cd /d "%~dp0frontend"
start "CoreInventory Frontend" cmd /k "title CoreInventory Frontend && color 0D && npx vite"

:: Wait for frontend to be ready
timeout /t 5 /nobreak >nul

:: Open browser
echo.
echo  ============================================
echo    READY! Opening browser...
echo.
echo    URL:   http://localhost:5173
echo    Admin: admin@coreinventory.com / admin123
echo    Staff: staff@coreinventory.com / staff123
echo  ============================================
echo.
start http://localhost:5173

echo  Both servers are running in separate windows.
echo  Close this window anytime.
echo.
pause
