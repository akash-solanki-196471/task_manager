@echo off
title Task Manager - Server Launcher
color 0A
cls
echo =====================================================================
echo           TASK MANAGER - CONCURRENT SERVER LAUNCHER
echo =====================================================================
echo.
echo  [1/3] Checking MongoDB connection status...
echo  (Make sure your MongoDB Local Service is running on port 27017)
echo.

:: Check if MongoDB is running by trying to ping port 27017
powershell -Command "Test-NetConnection -Port 27017 -ComputerName 127.0.0.1" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [WARNING] MongoDB does not seem to be listening on port 27017.
    echo Please make sure the MongoDB Windows Service is running!
    echo you can start it by running PowerShell as Administrator and typing:
    echo   Start-Service MongoDB
    echo.
    echo Press any key to attempt launching the servers anyway...
    pause >nul
    color 0A
) else (
    echo  [OK] MongoDB is running and reachable on port 27017!
    echo.
)

echo  [2/3] Launching BACKEND Server in a new window...
:: Use cmd.exe /c to launch backend with npm run dev in a new named window
start "Task Manager - Backend Server" cmd /k "cd backend && title Backend Server - Port 5001 && npm run dev"

echo  [3/3] Launching FRONTEND Server in a new window...
:: Use cmd.exe /c to launch frontend with npm start in a new named window
start "Task Manager - Frontend Angular" cmd /k "cd frontend && title Frontend Server - Port 4200 && npm start"

echo.
echo =====================================================================
echo  SUCCESS: Both servers have been launched in separate terminal windows!
echo =====================================================================
echo.
echo  - Backend API:  http://localhost:5001/api/health
echo  - Frontend App: http://localhost:4200/
echo.
echo  Note: This launcher uses standard cmd.exe which bypasses any
echo  restricted PowerShell execution policies on your computer.
echo.
echo  Keep the opened server windows running while you use the application.
echo =====================================================================
echo.
pause
