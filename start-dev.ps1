# Script de inicialización ligera para OfiSolve
# Este script levanta los servicios mínimos necesarios para el desarrollo.

Write-Host ">>> Iniciando OfiSolve (Modo Ligero) <<<" -ForegroundColor Cyan

# 1. Levantar servicios básicos en Docker (si no están corriendo)
Write-Host "`n[1/3] Verificando contenedores de Docker (Postgres, Chroma, Redis)..." -ForegroundColor Yellow
docker compose up -d

# 2. Iniciar Backend (FastAPI)
Write-Host "`n[2/3] Iniciando Backend en puerto 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py" -WindowStyle Normal

# 3. Iniciar Frontend (Next.js con webpack — sin Turbopack para menor uso de RAM)
Write-Host "`n[3/3] Iniciando Frontend en puerto 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend/ui; pnpm dev" -WindowStyle Normal

Write-Host "`n¡Todo en marcha! 🚀" -ForegroundColor Green
Write-Host "- Backend: http://localhost:8000/docs"
Write-Host "- Frontend: http://localhost:3000"
Write-Host "`nSe han abierto dos ventanas de terminal adicionales para los logs." -ForegroundColor Gray
