@echo off
echo Starting Bridge Components...

echo.
echo [1/3] Adding Cargo to PATH...
set "PATH=%PATH%;%USERPROFILE%\.cargo\bin"

echo.
echo [2/3] Starting Sidecar WebSocket Server...
cd packages\sidecar
start "Sidecar" cmd /k "cargo run"

echo.
echo [3/3] Starting React Development Server...
cd ..\app-tauri
timeout /t 3 /nobreak > nul
start "React App" cmd /k "pnpm dev"

echo.
echo ✅ All components starting...
echo.
echo 📝 Next steps:
echo    1. Load browser extension from: packages\ext-plasmo\build\chrome-mv3-dev\
echo    2. Open multiple browser tabs
echo    3. Test window focusing functionality
echo.
echo Press any key to exit...
pause > nul