import traceback
try:
    import app.api.routes_documentos
    print("OK")
except Exception:
    traceback.print_exc()
