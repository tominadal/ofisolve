# 🚀 Guía de Despliegue OfiSolve (Estrategia Zero Cost)

Esta guía te permite llevar OfiSolve a producción de forma profesional sin gastar un solo dólar, utilizando los niveles gratuitos más generosos de la industria.

---

## 1. Infraestructura de Datos (Neon.tech)
Para el RAG (IA) y el ERP necesitaremos PostgreSQL con `pgvector`. 
1. Ve a [Neon.tech](https://neon.tech) y crea un proyecto gratuito.
2. Copia la **Connection String** (Asegúrate de que sea la `postgresql://...` normal).
3. En el panel de Neon, verás que es 100% compatible con vectores de forma nativa.

## 2. Servidor de IA (Render.com)
Aquí vivirá el **Backend** (FastAPI).
1. Crea una cuenta en [Render.com](https://render.com).
2. Haz clic en **New** -> **Web Service**.
3. Conecta tu repositorio de GitHub.
4. **Configuración**:
   - **Runtime**: `Python 3`.
   - **Build Command**: `pip install -r backend/requirements.txt`.
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
   - **Root Directory**: `backend`.
5. **Variables de Entorno** (Environment):
   - `DATABASE_URL`: (La que copiaste de Neon).
   - `POSTGRES_URL`: (La misma de Neon).
   - `GOOGLE_API_KEY`: Tu clave de Gemini.
   - `APP_ENV`: `production`.

## 3. Inicialización del Cerebro IA
Una vez el backend esté en línea en Render:
1. Copia la URL que te da Render (ej: `ofisolve-api.onrender.com`).
2. Desde tu terminal local, cambia la URL en tu `.env` y corre:
   ```bash
   python scripts/init_rag.py --reset
   ```
   (Esto cargará la Ley 404 en la base de datos de Neon desde tu PC).

## 4. Frontend Estilo "Notebook" (Vercel)
1. Importa tu repo en [Vercel](https://vercel.com).
2. **Root Directory**: `frontend/ui`.
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: (La URL que te dio Render).
4. Haz clic en **Deploy**.

---

## 🏁 ¡Misión Cumplida!
- **Frontend**: Vercel (Gratis).
- **Backend**: Render (Gratis - se apaga si no hay uso).
- **Base de Datos**: Neon (Gratis - la más generosa para vectores).

Total de Inversión: **$0**.
Valor de Mercado: **ERP Notarial con IA de Alta Gama**.
