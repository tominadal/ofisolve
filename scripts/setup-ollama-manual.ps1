# OfiSolve - Script de Puesta a Punto (Ollama Manual)
# Este script asume que ya descargaste y extrajiste los binarios en bin\ollama

$ErrorActionPreference = "Stop"
$OLLAMA_EXE = Join-Path $PSScriptRoot "..\bin\ollama\ollama.exe"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   OfiSolve - Configuración de Motor IA   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verificar Binarios
if (-not (Test-Path $OLLAMA_EXE)) {
    Write-Host "❌ Error: No se encontró ollama.exe en $OLLAMA_EXE" -ForegroundColor Red
    Write-Host "Por favor, descarga y extrae los binarios allí antes de continuar." -ForegroundColor Yellow
    exit
}

# 2. Iniciar Servidor (si no está corriendo)
Write-Host "[1/4] Iniciando Servidor Ollama..." -ForegroundColor Yellow
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $ollamaProcess) {
    Start-Process $OLLAMA_EXE -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    Write-Host "✅ Servidor iniciado." -ForegroundColor Green
} else {
    Write-Host "✅ Servidor ya estaba corriendo." -ForegroundColor Green
}

# 3. Descargar Modelos (PROGRESS VISIBLE)
Write-Host "[2/4] Descargando Cerebro (Llama 3.1:8b)..." -ForegroundColor Yellow
& $OLLAMA_EXE pull llama3.1:8b

Write-Host "[3/4] Descargando Memoria (Nomic Embed)..." -ForegroundColor Yellow
& $OLLAMA_EXE pull nomic-embed-text

# 4. Configurar Backend
Write-Host "[4/4] Configurando Backend para Soberanía Local..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\backend\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath
    $newContent = $content | ForEach-Object {
        if ($_ -match "^AI_PROVIDER=") { "AI_PROVIDER=ollama" }
        else { $_ }
    }
    # Si AI_PROVIDER no existía, agregarlo
    if (-not ($content -match "^AI_PROVIDER=")) {
        $newContent += "AI_PROVIDER=ollama"
    }
    $newContent | Set-Content $envPath
    Write-Host "✅ Configuración de .env actualizada." -ForegroundColor Green
} else {
    Write-Host "⚠️ Advertencia: No se encontró backend\.env. Asegúrate de configurarlo manualmente." -ForegroundColor Gray
}

Write-Host "------------------------------------------" -ForegroundColor Gray
Write-Host "🚀 ¡MOTOR LISTO! Ahora puedes iniciar OfiSolve." -ForegroundColor Cyan
Write-Host "Usa el script ./start-local.ps1 desde la raíz." -ForegroundColor White
Write-Host "------------------------------------------" -ForegroundColor Gray
