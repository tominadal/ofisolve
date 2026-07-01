import subprocess
import time
import sys
import os
from datetime import datetime

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [WATCHDOG] {msg}", flush=True)

def start_process(cmd, cwd):
    log(f"Iniciando proceso en {cwd}: {cmd}")
    return subprocess.Popen(
        cmd,
        shell=True,
        cwd=cwd
    )

def main():
    log("Iniciando Watchdog de Producción OfiSolve...")
    
    # Rutas
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend", "ui")
    
    # Comandos de producción
    # NOTA: En windows, uvicorn con --workers > 1 requiere que se ejecute correctamente la importación, 
    # pero a veces es complicado si el VENV no está del todo bien. Lo dejaremos sin --workers y dejaremos
    # que la concurrencia async maneje las peticiones.
    backend_cmd = r".venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
    frontend_cmd = "npm start"
    backup_cmd = r".venv\Scripts\python.exe scripts\backup_manager.py"
    
    # Iniciar procesos
    backend_proc = start_process(backend_cmd, backend_dir)
    frontend_proc = start_process(frontend_cmd, frontend_dir)
    backup_proc = start_process(backup_cmd, backend_dir)
    
    try:
        while True:
            time.sleep(5)
            
            # Revisar backend
            if backend_proc.poll() is not None:
                log("¡ALERTA! El backend se cerró inesperadamente. Reiniciando...")
                backend_proc = start_process(backend_cmd, backend_dir)
                
            # Revisar frontend
            if frontend_proc.poll() is not None:
                log("¡ALERTA! El frontend se cerró inesperadamente. Reiniciando...")
                frontend_proc = start_process(frontend_cmd, frontend_dir)
                
            # Revisar backup manager
            if backup_proc.poll() is not None:
                log("¡ALERTA! El gestor de backups se cerró inesperadamente. Reiniciando...")
                backup_proc = start_process(backup_cmd, backend_dir)

    except KeyboardInterrupt:
        log("Apagando Watchdog y cerrando servicios...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backup_proc.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
