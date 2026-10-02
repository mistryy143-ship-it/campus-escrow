@echo off
cd /d %~dp0blockchain
if not exist node_modules call npm install
start "Hardhat Node" cmd /k npx hardhat node
