import sys
from pathlib import Path

# Añadir el directorio raíz del backend al path para que las importaciones funcionen
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from main import app

# Vercel busca una variable llamada 'app' en el archivo apuntado por vercel.json
# Exportamos la instancia de FastAPI
handler = app
