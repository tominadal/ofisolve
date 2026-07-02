import sys
import traceback

try:
    import app.main
except Exception:
    traceback.print_exc()
