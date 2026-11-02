@echo off
cd /d "%~dp0"
start "" http://localhost:8080/adn/
node server.js
pause
