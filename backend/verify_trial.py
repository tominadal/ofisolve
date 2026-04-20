import httpx
import asyncio

async def verify():
    print("--- OfiSolve Trial Verification ---")
    url = "http://localhost:8000/api/v1"
    
    # 1. Login
    print("1. Probando Login...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{url}/auth/login",
                data={"username": "martin.rodriguez@escribania.com.ar", "password": "admin123"}
            )
            if resp.status_code == 200:
                token = resp.json()["access_token"]
                print(f"SUCCESS: Login Exitoso. Token: {token[:20]}...")
            else:
                print(f"ERROR en Login: {resp.status_code} - {resp.text}")
                return

            # 2. Get Workspaces
            print("\n2. Recuperando Workspaces...")
            resp = await client.get(
                f"{url}/workspaces/",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code == 200:
                workspaces = resp.json()
                print(f"SUCCESS: Se encontraron {len(workspaces)} workspaces:")
                for ws in workspaces:
                    print(f"   - {ws['nombre']} (ID: {ws['id']})")
            else:
                print(f"ERROR en Workspaces: {resp.status_code} - {resp.text}")

        except Exception as e:
            print(f"CONNECTION ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify())
