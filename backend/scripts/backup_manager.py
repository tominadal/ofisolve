import os
import shutil
import zipfile
from datetime import datetime, timedelta
import glob

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [BACKUP] {msg}", flush=True)

def create_backup():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backup_dir = os.path.join(base_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = os.path.join(backup_dir, f"ofisolve_backup_{timestamp_str}.zip")
    
    db_path = os.path.join(base_dir, "ofisolve.db")
    uploads_dir = os.path.join(base_dir, "uploads")
    
    log(f"Iniciando backup diario: {zip_path}")
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            if os.path.exists(db_path):
                zipf.write(db_path, "ofisolve.db")
                
            if os.path.exists(uploads_dir):
                for root, _, files in os.walk(uploads_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, base_dir)
                        zipf.write(file_path, arcname)
                        
        log(f"Backup creado exitosamente: {zip_path}")
    except Exception as e:
        log(f"Error creando backup: {e}")

def clean_old_backups(days=30):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backup_dir = os.path.join(base_dir, "backups")
    if not os.path.exists(backup_dir):
        return
        
    cutoff_date = datetime.now() - timedelta(days=days)
    files = glob.glob(os.path.join(backup_dir, "ofisolve_backup_*.zip"))
    
    for f in files:
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(f))
            if mtime < cutoff_date:
                os.remove(f)
                log(f"Backup antiguo eliminado: {f}")
        except Exception as e:
            log(f"Error eliminando backup {f}: {e}")

def main():
    log("Gestor de Backups iniciado. Esperando la próxima rotación...")
    # Ejecutará el backup una vez al inicio, y luego cada 24 horas.
    while True:
        try:
            create_backup()
            clean_old_backups(days=30)
            
            # Dormir 24 horas
            import time
            time.sleep(86400)
        except KeyboardInterrupt:
            log("Gestor de backups detenido.")
            break
        except Exception as e:
            log(f"Error en el ciclo de backup: {e}")
            import time
            time.sleep(3600) # Reintentar en 1 hora

if __name__ == "__main__":
    main()
