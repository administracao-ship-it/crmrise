@echo off
title CRM Rise In - Iniciador
echo ==========================================
echo       INICIANDO CRM RISE IN
echo ==========================================
echo.

echo [1/2] Iniciando Backend (Node.js/Prisma)...
start "Backend - Rise In" cmd /k "cd backend && npm run dev"

echo [2/2] Iniciando Frontend (Next.js)...
start "Frontend - Rise In" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo   Tudo pronto! Requisitos para rodar:
echo   - Node.js instalado
echo   - Dependencias instaladas (npm install)
echo.
echo   Frontend disponivel em: http://localhost:3000
echo ==========================================
echo.
pause
