# 🚀 Guía de Despliegue en Vercel - OfiSolve

He configurado tu proyecto para que sea **100% funcional** en Vercel, solucionando el almacenamiento con **Vercel Postgres** y **IA persistente**.

## 1. Preparación del Repositorio
Asegúrate de que tus cambios locales estén en tu repositorio de GitHub:
```bash
git add .
git commit -m "Preparar despliegue en Vercel con Postgres y pgvector"
git push origin main
```

## 2. Crear Proyecto en Vercel
1. Ve al panel de [Vercel](https://vercel.com) e importa tu repositorio.
2. En **Framework Preset**, selecciona `Next.js`.
3. En **Root Directory**, déjalo en la raíz (donde está el archivo `vercel.json`).

## 3. Configurar Almacenamiento (Base de Datos)
> [!IMPORTANT]
> Vercel no usa SQLite. Debes activar Postgres para que la app funcione.
1. Una vez creado el proyecto en Vercel, ve a la pestaña **Storage**.
2. Haz clic en **Create Database** -> **Postgres** -> **Continue**.
3. Sigue los pasos para conectarla a tu proyecto. Esto inyectará automáticamente la variable `POSTGRES_URL` que el código ya sabe leer.

## 4. Variables de Entorno
Ve a **Settings** -> **Environment Variables** y añade las siguientes:

| Variable | Valor Recomendado | Descripción |
| :--- | :--- | :--- |
| `GOOGLE_API_KEY` | `Tu clave de AI Studio` | Necesaria para Gemini y los vectores. |
| `NEXT_PUBLIC_API_URL` | `/api` | Para que el frontend sepa dónde está la API. |
| `APP_ENV` | `production` | Modo producción. |
| `SECRET_KEY` | `Una cadena larga al azar` | Para seguridad de las sesiones. |

---

## 5. ¡Listo! 🚀
Vercel detectará el archivo `vercel.json` y:
- Desplegará el **Frontend** con Next.js.
- Desplegará el **Backend** como una función Serverless en `/api`.
- Usará la base de datos de **Postgres** tanto para tus datos como para la "memoria" de la IA.

> [!TIP]
> La primera vez que entres a la app, el sistema detectará que la base de datos está vacía e iniciará el **Seed** automático para crearte el Workspace y los clientes de prueba (como en local).
