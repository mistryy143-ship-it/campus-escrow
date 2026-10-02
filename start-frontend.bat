@echo off
cd /d %~dp0frontend
if not exist node_modules call npm install
start "CampusEscrow UI" cmd /k npm run dev
