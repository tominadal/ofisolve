import os
import zipfile
import subprocess
import socket
from datetime import datetime
import json
import urllib.request
import urllib.error

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def check_ollama():
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
        with urllib.request.urlopen(req, timeout=3) as response:
            return response.status == 200
    except urllib.error.URLError:
        return False

def generate_report():
    print("Iniciando Herramienta de Diagnostico de OfiSolve...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report = {
        "timestamp": timestamp,
        "ports": {
            "backend_8000": check_port(8000),
            "frontend_3000": check_port(3000),
            "ollama_11434": check_port(11434)
        },
        "services": {
            "ollama_responding": check_ollama()
        }
    }
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    diag_dir = os.path.join(base_dir, "diagnostics")
    os.makedirs(diag_dir, exist_ok=True)
    
    zip_path = os.path.join(diag_dir, f"support_ticket_{timestamp}.zip")
    
    print("Recopilando logs y generando archivo ZIP...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Save JSON report
        zipf.writestr("diagnostic_report.json", json.dumps(report, indent=4))
        
        # Add Logs
        logs_dir = os.path.join(base_dir, "backend", "logs")
        if os.path.exists(logs_dir):
            for root, _, files in os.walk(logs_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.join("logs", os.path.relpath(file_path, logs_dir))
                    zipf.write(file_path, arcname)
                    
    print(f"\n¡Diagnóstico Completado!")
    print(f"Por favor envie este archivo a soporte técnico: \n{zip_path}")
    print("\nPresione ENTER para salir.")
    input()

if __name__ == "__main__":
    generate_report()
