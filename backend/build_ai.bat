@echo off
echo ========================================================
echo   OfiSolve - Construyendo Modelo IA Notarial Soberano
echo ========================================================
echo.
echo Asegurate de tener Ollama instalado y corriendo (ollama serve).
echo.
echo 1. Verificando si existe el modelo base (llama3)...
ollama pull llama3

echo.
echo 2. Compilando el modelo ofisolve-notarial usando el Modelfile...
ollama create ofisolve-notarial -f Modelfile

echo.
echo ========================================================
echo   ¡Modelo Creado Exitosamente!
echo ========================================================
echo Puedes probarlo en la terminal ejecutando: ollama run ofisolve-notarial
pause
