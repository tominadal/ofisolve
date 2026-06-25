# OfiSolve - Arranque Silencioso Maestro
# Inicia Backend (FastAPI) y Frontend (Next.js) en segundo plano

Write-Host "Iniciando OfiSolve (Backend y Frontend)..." -ForegroundColor Cyan

Write-Host "Verificando modelos locales (Qwen 2.5 y BGE-M3)..." -ForegroundColor Cyan
ollama pull qwen2.5:7b
ollama pull bge-m3

# 1. Iniciar Backend
$BackendCmd = "Set-Location -Path backend; . .venv/Scripts/Activate.ps1; python -m uvicorn main:app --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "$BackendCmd" -WindowStyle Hidden
Write-Host "Backend solicitado en Puerto 8000" -ForegroundColor Green

# 2. Iniciar Frontend
$FrontendCmd = "Set-Location -Path frontend/ui; pnpm dev"
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "$FrontendCmd" -WindowStyle Hidden
Write-Host "Frontend solicitado en Puerto 3000" -ForegroundColor Green

Write-Host "OfiSolve se esta ejecutando. Acceda a http://localhost:3000" -ForegroundColor Yellow
