@echo off
chcp 65001 >nul
title 行銷營運中心

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 找不到 Node.js，請先安裝：https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo 首次執行，安裝中（約 2-3 分鐘）...
    call npm install
    if %errorlevel% neq 0 ( echo 安裝失敗，請檢查網路 & pause & exit /b 1 )
)

echo 啟動中... 5 秒後自動開啟瀏覽器
start "" powershell -WindowStyle Hidden -Command "Start-Sleep 5; Start-Process 'http://localhost:3030'"
call npm run dev
pause
