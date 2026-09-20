@echo off
cd /d %~dp0backend
start "CampusEscrow Listener" cmd /k npm run listener
