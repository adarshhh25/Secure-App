@echo off
echo ==========================================
echo  🔐 Secure Chat Application Launcher
echo ==========================================
echo.

echo Starting services...
echo.

:: Start Flask Stego Service
echo [1/3] Starting Flask Stego Service (Port 5001)...
start "Stego-Service" cmd /k "cd /d %~dp0stego-service && python api.py"
timeout /t 3 /nobreak > nul

:: Start Node Server
echo [2/3] Starting Node Server (Port 5000)...
start "Node-Server" cmd /k "cd /d %~dp0server && npm start"
timeout /t 3 /nobreak > nul

:: Start React Client
echo [3/3] Starting React Client (Port 5173)...
start "React-Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ==========================================
echo  All services started!
echo.
echo  📡 Stego Service: http://localhost:5001
echo  🖥️  Node Server:   http://localhost:5000
echo  🌐 React Client:  http://localhost:5173
echo ==========================================
echo.
echo Press any key to exit this window...
pause > nul
