from app.core.config import get_settings
try:
    settings = get_settings()
    print("Settings loaded successfully!")
    print(f"APP_ENV: {settings.app_env}")
except Exception as e:
    print(f"Failed to load settings: {e}")
    import traceback
    traceback.print_exc()
