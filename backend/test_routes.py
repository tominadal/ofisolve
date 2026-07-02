import main
for route in main.app.routes:
    print(route.path, getattr(route, "methods", []))
