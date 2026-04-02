# Script para iniciar o CRM Rise In (Backend e Frontend)

# 1. Iniciar o Backend
Write-Host "Iniciando o Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# 2. Iniciar o Frontend
Write-Host "Iniciando o Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Servidores iniciados! O Frontend deve estar disponível em http://localhost:3000" -ForegroundColor Yellow
