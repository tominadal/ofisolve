@echo off
TITLE OfiSolve - Entorno Local
echo Iniciando OfiSolve Local y Motor de IA...

REM Iniciar Ollama en nueva ventana minimizada
start /MIN "OfiSolve Ollama" cmd /c "ollama serve"

REM Iniciar Backend en nueva ventana minimizada
start /MIN "OfiSolve Backend" cmd /c "cd backend && call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8080"

REM Esperar 3 segundos para que levante el backend
timeout /t 3 /nobreak > NUL

REM Iniciar Frontend en nueva ventana minimizada
start /MIN "OfiSolve Frontend" cmd /c "cd frontend\ui && npm run dev"

REM Esperar 3 segundos para que levante el frontend
timeout /t 3 /nobreak > NUL

REM Abrir en el navegador predeterminado
start http://localhost:3000

echo OfiSolve esta corriendo!
echo Motor IA (Ollama): Localhost 11434
echo Backend: http://127.0.0.1:8080
echo Frontend: http://localhost:3000
echo.
echo Presione cualquier tecla para cerrar todas las ventanas y apagar los servidores...
pause > NUL

REM Matar los procesos al cerrar
taskkill /F /IM node.exe > NUL 2>&1
taskkill /F /IM uvicorn.exe > NUL 2>&1
taskkill /F /IM ollama.exe > NUL 2>&1
exit
