@echo off
cd /d %~dp0blockchain
call npm install
npx hardhat run scripts/deploy.js --network localhost
pause
