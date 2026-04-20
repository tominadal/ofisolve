# Script de Configuración Local para OfiSolve
# Este script descarga los modelos necesarios en Ollama

Write-Host "-------------------------------------------" -ForegroundColor Cyan
Write-Host "   Configuración de IA Local (OfiSolve)    " -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

# Verificar si Ollama está instalado
if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Ollama no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    Write-Host "Por favor, descárgalo de https://ollama.com e instálalo antes de continuar."
    exit 1
}

# Modelos definidos en config.py
$LLM_MODEL = "llama3.1:8b"
$EMBED_MODEL = "nomic-embed-text"

Write-Host "Step 1/2: Descargando modelo de lenguaje ($LLM_MODEL)..." -ForegroundColor Yellow
ollama pull $LLM_MODEL

Write-Host "Step 2/2: Descargando modelo de embeddings ($EMBED_MODEL)..." -ForegroundColor Yellow
ollama pull $EMBED_MODEL

Write-Host "`n[EXITO] Todos los modelos han sido descargados." -ForegroundColor Green
Write-Host "Ya puedes iniciar el backend de OfiSolve en modo local." -ForegroundColor Green
Write-Host "-------------------------------------------"
