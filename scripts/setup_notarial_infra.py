import os
import shutil
import sqlite3
import datetime
from pathlib import Path

# Configuración de rutas
BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / "backend" / "ofisolve.db"
UPLOADS_DIR = BASE_DIR / "backend" / "uploads" / "clientes"

# Datos sintéticos para la infraestructura notarial robusta
CLIENTES = [
    {
        "id": 1,
        "nombre": "Roberto Goldi",
        "dni": "12.345.678",
        "tramites": [
            {
                "id": 1,
                "nombre": "Compraventa Inmueble - Av. Santa Fe",
                "docs": ["DNI_Roberto.pdf", "Titulo_Propiedad.pdf", "Impuesto_Inmobiliario.txt"]
            },
            {
                "id": 2,
                "nombre": "Poder Amplio de Administración",
                "docs": ["Minuta_Poder.txt", "Antecedentes_Legales.pdf"]
            }
        ]
    },
    {
        "id": 2,
        "nombre": "Maria Elena Walsh",
        "dni": "5.555.555",
        "tramites": [
            {
                "id": 3,
                "nombre": "Sucesión Abintestato",
                "docs": ["Acta_Defuncion.pdf", "Partida_Nacimiento.pdf", "Listado_Bienes.txt"]
            }
        ]
    },
    {
        "id": 3,
        "nombre": "Constructora Horizonte S.A.",
        "dni": "30-71234567-9",
        "tramites": [
            {
                "id": 4,
                "nombre": "Escritura de Reglamento de Copropiedad",
                "docs": ["Plano_Mensura.pdf", "Estatuto_Social.pdf", "Acta_Directorio.txt"]
            }
        ]
    }
]

def setup():
    print("Iniciando recalibracion de infraestructura notarial...")
    
    # 1. Limpiar y recrear estructura de carpetas
    if UPLOADS_DIR.exists():
        shutil.rmtree(UPLOADS_DIR)
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    # 2. Conectar a la base de datos
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Asegurar que la tabla existe (por si acaso)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documentos_libreria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER,
            cliente_id INTEGER,
            tramite_id INTEGER,
            nombre TEXT,
            tipo TEXT,
            path TEXT,
            fecha_subida DATETIME
        )
    """)
    
    # Limpiar tabla de documentos para sincronización total
    cursor.execute("DELETE FROM documentos_libreria")
    
    # 3. Generar carpetas y archivos
    for cliente in CLIENTES:
        cliente_id_str = str(cliente["id"])
        cliente_path = UPLOADS_DIR / cliente_id_str
        os.makedirs(cliente_path, exist_ok=True)
        
        for tramite in cliente["tramites"]:
            tramite_id_str = str(tramite["id"])
            tramite_path = cliente_path / tramite_id_str
            os.makedirs(tramite_path, exist_ok=True)
            
            for doc_name in tramite["docs"]:
                file_path = tramite_path / doc_name
                tipo = doc_name.split(".")[-1]
                
                # Crear el archivo físico con contenido descriptivo
                with open(file_path, "w", encoding="utf-8") as f:
                    content = f"CONTENIDO NOTARIAL PROFESIONAL\nDocumento: {doc_name}\nCliente: {cliente['nombre']}\nTrámite: {tramite['nombre']}\nFecha: {datetime.datetime.now()}\n\n-- CONFIDENCIAL --"
                    f.write(content)
                
                # Registrar en la base de datos
                cursor.execute("""
                    INSERT INTO documentos_libreria (workspace_id, cliente_id, tramite_id, nombre, tipo, path, fecha_subida)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    1, # Workspace por defecto
                    cliente["id"],
                    tramite["id"],
                    doc_name,
                    tipo,
                    str(file_path.relative_to(BASE_DIR)),
                    datetime.datetime.now()
                ))
                
    conn.commit()
    conn.close()
    print("Infraestructura sincronizada. Carpetas fisicas y DB estan alineadas.")

if __name__ == "__main__":
    setup()
