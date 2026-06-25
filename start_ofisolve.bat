@echo off
TITLE OfiSolve - Entorno Local
echo Iniciando OfiSolve Local...

REM Iniciar Backend en nueva ventana minimizada
start /MIN "OfiSolve Backend" cmd /c "cd backend && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"

REM Esperar 3 segundos para que levante el backend
timeout /t 3 /nobreak > NUL

REM Iniciar Frontend en nueva ventana minimizada
start /MIN "OfiSolve Frontend" cmd /c "cd frontend\ui && npm run dev"

REM Esperar 3 segundos para que levante el frontend
timeout /t 3 /nobreak > NUL

REM Abrir en el navegador predeterminado
start http://localhost:3000

echo OfiSolve esta corriendo!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
echo Presione cualquier tecla para cerrar todas las ventanas y apagar los servidores...
pause > NUL

REM Matar los procesos de node y python al cerrar (precaución: mata todos)
taskkill /F /IM node.exe > NUL 2>&1
taskkill /F /IM uvicorn.exe > NUL 2>&1
exit
