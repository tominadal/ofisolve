# OfiSolve - Script de Inicio Rápido (Soberanía Local)

$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      OfiSolve - Iniciando Sistema        " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verificar Ollama
Write-Host "[1/4] Verificando Ollama..." -ForegroundColor Yellow
try {
    $ollamaStatus = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction SilentlyContinue
    Write-Host "✅ Ollama está activo." -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Ollama no parece estar corriendo. Por favor, inícialo antes de continuar." -ForegroundColor Red
    exit
}

# 2. Activar Entorno Virtual
Write-Host "[2/4] Preparando entorno Python..." -ForegroundColor Yellow
if (Test-Path "backend/.venv/Scripts/Activate.ps1") {
    & "backend/.venv/Scripts/Activate.ps1"
    Write-Host "✅ Entorno Virtual activo." -ForegroundColor Green
} else {
    Write-Host "⚠️ Advertencia: No se encontró .venv en backend/.venv. Intentando sin entorno..." -ForegroundColor Gray
}

# 3. Sincronizar Base de Datos (Seed)
Write-Host "[3/4] Sincronizando base de datos local..." -ForegroundColor Yellow
try {
    cd backend
    python seed_db.py
    cd ..
    Write-Host "✅ Datos de prueba cargados correctamente." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Hubo un detalle al sembrar la DB (quizás ya existe). Continuando..." -ForegroundColor Gray
    cd ..
}

# 4. Iniciar Backend
Write-Host "[4/4] Lanzando Backend de OfiSolve..." -ForegroundColor Yellow
Write-Host "------------------------------------------" -ForegroundColor Gray
Write-Host "La API estará disponible en: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Si usas Vercel, asegúrate de que esté configurado para este puerto." -ForegroundColor Gray
Write-Host "Presiona Ctrl+C para detener el servidor." -ForegroundColor Gray
Write-Host "------------------------------------------" -ForegroundColor Gray

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
