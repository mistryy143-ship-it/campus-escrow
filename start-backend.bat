@echo off
cd /d %~dp0backend
if not exist node_modules call npm install
if not exist .env copy .env.example .env
echo.
echo  EDIT backend\.env NOW if you have not: set your postgres password (port 1429)
echo  and ensure database "campus_escrow" exists.
echo.
pause
start "CampusEscrow API" cmd /k npm start
