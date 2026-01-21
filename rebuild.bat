@echo off
chcp 65001 >nul
echo ========================================
echo   Bead Pattern Generator - Docker Rebuild Script
echo ========================================
echo.

echo [1/5] Stopping container...
docker stop bead-app 2>nul
docker rm bead-app 2>nul

echo [2/5] Rebuilding image...
docker build -t bead-pattern-generator:latest .

echo [3/5] Starting container...
docker run -d -p 8080:80 --name bead-app bead-pattern-generator:latest

echo [4/5] Exporting image to ./image folder...
if not exist "image" mkdir image
docker save -o ./image/bead-pattern-generator.tar bead-pattern-generator:latest

echo [5/5] Checking status...
docker ps --filter "name=bead-app"

echo.
echo ========================================
echo   Done! Visit: http://localhost:8080
echo ========================================
pause
