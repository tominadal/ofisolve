# PANCHO.md — Documentación Definitiva del Proyecto OfiSolve

> **¿Quién sos vos, Pancho?** Sos el nuevo dev que se suma al proyecto. Este archivo es todo lo que necesitás saber para entender, correr y contribuir a OfiSolve. No hay otros READMEs. Este es el documento sagrado.

---

## Índice

1. [¿Qué es OfiSolve?](#1-qué-es-ofisolve)
2. [Contexto de Negocio](#2-contexto-de-negocio)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [El Motor de IA: El Grafo de Agentes](#5-el-motor-de-ia-el-grafo-de-agentes)
6. [Base de Datos y Modelos](#6-base-de-datos-y-modelos)
7. [El RAG: La Memoria Legal](#7-el-rag-la-memoria-legal)
8. [Frontend: La UI NotebookLM](#8-frontend-la-ui-notebooklm)
9. [Correr el Proyecto Localmente](#9-correr-el-proyecto-localmente)
10. [Cómo se Construyó (Historia del Proyecto)](#10-cómo-se-construyó-historia-del-proyecto)
11. [Estado del Deploy (MVP)](#11-estado-del-deploy-mvp)
12. [Lo que Falta (Próximos pasos)](#12-lo-que-falta-próximos-pasos)

---

## 1. ¿Qué es OfiSolve?

OfiSolve es un **ERP Notarial SaaS** impulsado por IA diseñado para **escribanías argentinas**. La premisa es simple: una escribanía CABA procesa docenas de actos jurídicos por día. Cada uno requiere redactar documentos con fraseología legal precisa, extraer datos de DNIs, validar normativa. Todo se hace a mano. OfiSolve automatiza eso.

La propuesta de valor tiene dos ejes:

1. **Automatización con IA (RAG + Agentes)**: El sistema conoce en profundidad el marco legal notarial de CABA (Ley 404, Resoluciones CECBA, Art. 470 CCyCN). No alucina, cita fuentes reales.
2. **ERP Multi-Tenant**: Cada escribanía tiene su propio workspace aislado con sus clientes, trámites y equipo.

El producto **no es un chatbot de propósito general**. Es una herramienta específica de mostrador notarial.

---

## 2. Contexto de Negocio

### Actos que soporta hoy (MVP)

| Tipo de Trámite | Estado |
|---|---|
| Certificación de Firma | ✅ Funcional |
| Certificación de Fotocopia | ✅ Funcional |
| Autorización de Viaje (Menores) | ✅ Funcional |
| Certificado de Supervivencia | ✅ Funcional |
| Chat Notarial RAG (libre) | ✅ Funcional (RAG desactualizado en prod) |

### Marco Legal Ingestado en el RAG

- **Ley 404 (Organización del Notariado CABA)**: Artículos clave sobre certificaciones, protocolo, etc.
- **Reglamento CECBA (Colegio de Escribanos de Buenos Aires)**
- **Art. 470 CCyCN**: Asentimiento conyugal en actos de disposición
- **Validación de Personas Jurídicas (IGJ)**: Representación societaria

---

## 3. Stack Tecnológico

```
FRONTEND                    BACKEND                     INFRA
──────────────────────      ──────────────────────      ──────────────────
Next.js 16 (App Router)     FastAPI (Python 3.11)       Vercel (frontend)
React 19                    SQLAlchemy 2.0 (async)      Render (backend)
Tailwind CSS v4             LangGraph 0.2.x             Neon (PostgreSQL)
shadcn/ui + Radix           LangChain 0.3.x             GitHub (CI/CD)
Lucide Icons                Gemini 2.0 Flash (LLM)
react-resizable-panels      Presidio (privacidad PII)
SSE (Streaming)             ChromaDB / PGVector (RAG)
                            Uvicorn + Loguru
                            SlowAPI (rate limiting)
```

---

## 4. Arquitectura del Sistema

```mermaid
graph TB
    subgraph "👤 Usuario (Escribano)"
        U[Browser / Next.js]
    end

    subgraph "🌐 Vercel (CDN Global)"
        FE["Frontend\nofisolve-front.vercel.app"]
    end

    subgraph "🟣 Render (Free Tier)"
        BE["Backend FastAPI\nofisolveofisolve-backend.onrender.com"]
        subgraph "Motor IA (LangGraph)"
            G1["🔒 Agente Privacy\n(Presidio + spaCy)"]
            G2["🗄️ Agente ERP\n(Extractor SQL)"]
            G3["📚 Agente RAG\n(ChromaDB/PGVector)"]
            G4["✍️ Agente Redactor\n(Gemini 2.0 Flash)"]
            G5["⚖️ Agente Validador\n(Anti-Alucinación)"]
            G6["🔓 Agente Desofuscar\n(Presidio Reverse)"]
        end
    end

    subgraph "🐘 Neon (PostgreSQL Serverless)"
        DB["PostgreSQL + pgvector\nep-winter-grass-a4fmytnf.us-east-1.aws.neon.tech"]
        subgraph "Tablas"
            T1[workspaces]
            T2[usuarios]
            T3[clientes]
            T4[tramites]
            T5[participaciones]
            T6[documentos_libreria]
            T7["langchain_pg_embedding\n(vectores RAG)"]
        end
    end

    subgraph "🤖 Google AI"
        LLM["Gemini 2.0 Flash\n(generación)"]
        EMB["text-embedding-004\n(vectorización)"]
    end

    U --> FE
    FE -- "NEXT_PUBLIC_API_URL" --> BE
    BE --> G1 --> G2 --> G3 --> G4 --> G5
    G5 -- "¿Aprobado?" --> G6
    G5 -- "No (max 3 reintentos)" --> G4
    G2 --> DB
    G3 --> DB
    G4 --> LLM
    G3 --> EMB
    DB --> T1 & T2 & T3 & T4 & T5 & T6 & T7
```

### Flujo de una Request típica (Chat Notarial)

```
Browser → POST /api/v1/tramites/chat
         → [SSE Stream]
         → node_ofuscar (Presidio anonimiza DNI, nombres)
         → node_extractor_erp (guarda cliente en Neon)
         → node_buscar_rag (busca chunks relevantes en ChromaDB/PGVector)
         → node_redactar (Gemini genera el borrador con contexto legal)
         → node_validar_legalidad (verifica "DOY FE", largo mínimo)
         → [loop si falla, máx 3 reintentos]
         → node_desofuscar (recompone el texto con datos reales)
         → SSE "finalizado" → Frontend
```

---

## 5. El Motor de IA: El Grafo de Agentes

OfiSolve tiene **dos grafos LangGraph** que conviven:

### Grafo 1: `certification_agent.py` (Endpoint Directo)
Usado por `/api/v1/generate/certificacion`. Es el flujo "1-click": recibe los datos del formulario, genera el DOCX y lo devuelve.

```
ofuscar_local → extraer_entidades → recuperar_rag_local → redactar_llm ⟷ validar_llm → desofuscar_local
```

### Grafo 2: `graph.py` (Chat Streaming SSE)
Usado por `/api/v1/tramites/chat`. Es el flujo conversacional con streaming en tiempo real.

```
ofuscar → extractor_erp → buscar_rag → redactar ⟷ validar_legalidad → desofuscar
```

### Descripción de cada Nodo/Agente

| Nodo | Qué hace | Tecnología |
|---|---|---|
| **Privacy (Ofuscar)** | Antes de mandar datos al LLM, reemplaza nombres, DNIs, CUITs por tokens (`[PERSONA_1]`, `[DNI_1]`). Garantiza que información sensible NUNCA llega a servidores de Google. | Presidio + spaCy `es_core_news_sm` |
| **Extractor ERP** | Entiende el texto y crea/actualiza registros de Clientes y Trámites en Neon sin que el usuario llene formularios. "Data Entry Cero". | LLM + SQLAlchemy async |
| **RAG** | Hace similarity search contra los ~500-700 chunks de normativa notarial que tenemos ingestados. Da al LLM el contexto legal específico del acto. | ChromaDB local (dev) / PGVector (prod) |
| **Redactor** | Con los datos ofuscados + contexto legal → genera el acta o certificación completa. | Gemini 2.0 Flash |
| **Validador** | Checa que el documento cumpla requisitos mínimos (`DOY FE`, longitud, etc.). Si falla → vuelve a Redactor con feedback. Máx 3 loops. | Reglas + LLM (MVP) |
| **Desofuscar** | Con el mapa de inversión del paso Privacy → recompone el documento con los datos reales. Solo se hace localmente, nunca se manda la PII a la nube. | Presidio |

---

## 6. Base de Datos y Modelos

### Diagrama de Entidades (ER)

```mermaid
erDiagram
    WORKSPACE {
        int id PK
        string nombre
        string descripcion
        datetime fecha_creacion
    }

    USUARIO {
        int id PK
        int workspace_id FK
        string email
        string hashed_password
        string nombre_completo
        string rol
        bool is_active
    }

    CLIENTE {
        int id PK
        int workspace_id FK
        string nombre_completo
        string dni
        string cuit
        string email
        string tipo_persona
    }

    TRAMITE {
        int id PK
        int workspace_id FK
        int asignado_a_id FK
        string nombre
        string tipo
        string estado
        string thread_id_langgraph
        datetime fecha_creacion
    }

    PARTICIPACION {
        int id PK
        int cliente_id FK
        int tramite_id FK
        string rol
    }

    EQUIPO_MIEMBRO {
        int id PK
        int workspace_id FK
        string nombre
        string rol
        string email
    }

    DOCUMENTO_LIBRERIA {
        int id PK
        int workspace_id FK
        string nombre
        string tipo
        string path
    }

    WORKSPACE ||--o{ USUARIO : "tiene"
    WORKSPACE ||--o{ CLIENTE : "tiene"
    WORKSPACE ||--o{ TRAMITE : "tiene"
    WORKSPACE ||--o{ EQUIPO_MIEMBRO : "tiene"
    WORKSPACE ||--o{ DOCUMENTO_LIBRERIA : "tiene"
    CLIENTE ||--o{ PARTICIPACION : "participa en"
    TRAMITE ||--o{ PARTICIPACION : "involucra"
    EQUIPO_MIEMBRO ||--o{ TRAMITE : "asignado a"
```

### Roles de Usuario

```python
class UserRole(str, enum.Enum):
    ADMIN = "Admin"       # Dueño de la escribanía
    ESCRIBANO = "Escribano" # Firma documentos
    EMPLEADO = "Empleado"  # Carga datos, no puede aprobar
```

### Nota sobre Multi-Tenancy
El aislamiento de datos se logra por `workspace_id`. Cada query en producción debería filtrar por el workspace del usuario logueado. **En el MVP actual esto no está completamente implementado** — el endpoint `/auth/me` devuelve un usuario hardcoded.

---

## 7. El RAG: La Memoria Legal

### Cómo funciona

1. `backend/app/rag/knowledge_base.py` contiene toda la normativa como strings Python (~36KB de texto legal).
2. Al inicializar el sistema (o ejecutar `init_rag.py`), ese texto se divide en chunks de 1000 caracteres con overlap de 150.
3. Cada chunk se vectoriza con **Gemini text-embedding-004** y se guarda en ChromaDB (local) o PGVector (producción).
4. En cada request, la query del usuario se vectoriza y se hace similarity search → se recuperan los 3-5 chunks más relevantes.
5. Esos chunks se inyectan en el prompt del LLM como contexto.

### Modo Local vs Producción

| | Local (Dev) | Producción (Render) |
|---|---|---|
| Vector Store | ChromaDB (archivo local `./chroma_db`) | PGVector (Neon PostgreSQL) |
| En código | `is_postgres = False` | `is_postgres = True` |
| Cómo activar prod | Setear `DATABASE_URL` a postgresql:// | Automático si `DATABASE_URL` es Postgres |

### Inicializar el RAG en Producción

```bash
# Desde tu máquina, apuntando a la DB de producción
export DATABASE_URL="postgresql://neondb_owner:TU_PASSWORD@ep-winter-grass-a4fmytnf.us-east-1.aws.neon.tech/neondb?sslmode=require"
export GOOGLE_API_KEY="AIzaSy..."
cd backend
python scripts/init_rag.py --reset
```

> ⚠️ **Pendiente crítico**: El RAG de producción nunca fue inicializado. La tabla `langchain_pg_embedding` en Neon está vacía. Las respuestas del chat en producción no tienen contexto legal real y pueden alucinar.

---

## 8. Frontend: La UI NotebookLM

La UI está inspirada en la estética de **Google NotebookLM**: tres paneles redimensionables con un diseño "Paper Clean" en tonos arena/blanco que reduce la fatiga visual.

### Estructura de la App

```
frontend/ui/
├── app/
│   ├── globals.css       # Variables de tema (dark/light), tokens de color
│   ├── layout.tsx        # Root layout con providers
│   └── page.tsx          # ⭐ TODA la UI del MVP (un solo archivo gigante ~115KB)
├── lib/
│   ├── api.ts            # Cliente HTTP tipado (fetch wrapper + manejo de errores)
│   ├── types.ts          # Interfaces TypeScript de toda la app
│   └── utils.ts          # Helpers de shadcn (cn, twMerge)
└── components/
    └── ui/               # Componentes shadcn/ui generados
```

### Los tres paneles

```
┌─────────────────────────────────────────────────────────┐
│  [Panel Izquierdo]  [Panel Central]   [Panel Derecho]   │
│                                                         │
│  📚 Librería Legal  💬 Chat Notarial  ⚡ Generación 1-Click│
│                                                         │
│  - Fuentes RAG      - Chat streaming  - Certificar Firma │
│  - Docs subidos     - RENAPER check   - Cert. Fotocopia  │
│  - Filtros fuente   - Quick chips     - Autorización     │
│                     - Historial       - Historial DOCX   │
└─────────────────────────────────────────────────────────┘
```

### Variables de Entorno Necesarias

```env
# En Vercel → Settings → Environment Variables
NEXT_PUBLIC_API_URL=https://ofisolveofisolve-backend.onrender.com
```

---

## 9. Correr el Proyecto Localmente

### Prerrequisitos
- Python 3.11+
- Node.js 20+ y pnpm
- Git

### Backend

```bash
cd backend

# 1. Crear entorno virtual
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Mac/Linux

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Descargar modelo de spaCy (necesario para Presidio)
python -m spacy download es_core_news_sm

# 4. Configurar variables de entorno
copy .env.example .env
# Editar .env con tu GOOGLE_API_KEY

# 5. Inicializar RAG (la primera vez)
python scripts/init_rag.py --reset

# 6. Correr el servidor
python main.py
# → http://localhost:8000
# → Docs en http://localhost:8000/docs
```

### Frontend

```bash
cd frontend/ui

# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno (opcional, por defecto apunta a localhost:8000)
# Crear .env.local con: NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Correr dev server
pnpm dev
# → http://localhost:3000
```

### Comando combinado (si tenés la PowerShell script)

```powershell
# Desde la raíz del proyecto
.\start-dev.ps1
```

### Endpoints importantes del Backend

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Health check global |
| `GET` | `/docs` | Swagger UI (interactivo) |
| `POST` | `/api/v1/auth/login` | Login → JWT |
| `GET` | `/api/v1/auth/me` | Usuario actual |
| `POST` | `/api/v1/generate/certificacion` | Generar DOCX directo |
| `POST` | `/api/v1/tramites/chat` | Chat SSE streaming |
| `GET` | `/api/v1/workspaces/` | Listar workspaces |
| `POST` | `/api/v1/workspaces/{id}/clientes` | Crear cliente |
| `POST` | `/api/v1/chat/notarial` | Chat sin streaming |

---

## 10. Cómo se Construyó (Historia del Proyecto)

El proyecto se construyó por fases iterativas. Acá te cuento el orden cronológico para que entiendas por qué las cosas están como están.

### Fase 1 — Fundamentos (`91ef9cc`)
Commit inicial: FastAPI básico, SQLAlchemy, primer esquema de datos. Sin IA todavía. Solo el scaffolding.

### Fase 2 — Motor RAG (`1bcc423`)
Integración de ChromaDB y LangChain. Se ingestaron los primeros documentos legales. Primer prompt de generación de certificaciones con Gemini.

### Fase 3 — Agentes Cíclicos LangGraph
Rediseño del backend para usar grafos de agentes. Nació el `certification_agent.py` con el ciclo `redactar → validar → [loop]`. Máximo 3 reintentos para evitar loops infinitos.

### Fase 4 — Privacy Engine (Presidio)
Integración de Microsoft Presidio con spaCy para anonimizar PII antes de cada llamada al LLM. Esto es el diferenciador principal de privacidad del producto.

### Fase 5 — HITL + Streaming SSE
Se agregó el `graph.py` (grafo conversacional) con streaming en tiempo real via SSE. El frontend puede ver el progreso de cada agente en tiempo real. Human-in-the-Loop: el escribano puede editar el borrador antes de aprobarlo.

### Fase 6 — SaaS Multi-Tenant
Rediseño completo de los modelos de datos: `Workspace`, `Usuario`, `Cliente`, `Tramite`, `Participacion`. Aislamiento por `workspace_id`. Multi-tenancy listo para escalar.

### Fase 7 — Consolidación y Rediseño UI (`c39db95`)
La fase más grande. En un solo commit:
- Rediseño completo del frontend (estética NotebookLM)
- Dockerización del backend (Dockerfile productivo)
- Preparación para despliegue Zero-Cost
- Jurisdicción CABA: ingesta profunda de Ley 404 y CECBA en `knowledge_base.py`

### Fixes de Pre-producción (`65de30f` → `2bb573c`)
Serie de fixes para compatibilidad con Render:
- Agregar `runtime.txt` (Python 3.11 forzado)
- Versiones de dependencias (`langchain-postgres 0.0.17`, `slowapi`)
- Renombrar modelos (`User` → `Usuario`) para consistencia SaaS

### Fase de Deploy (`7afe448`, `23a8b43`, `5231e51`)
Primera vez que el sistema toca producción. Tres fixes críticos descubiertos en producción:

```
7afe448  fix: add missing uuid import in state.py
23a8b43  fix: add missing request argument to aprobar_tramite (SlowAPI)
5231e51  fix: update CORS origins for production
```

---

## 11. Estado del Deploy (MVP)

### Infraestructura Actual

| Servicio | URL | Estado |
|---|---|---|
| **Frontend** | https://ofisolve-front.vercel.app | ✅ Live |
| **Backend** | https://ofisolveofisolve-backend.onrender.com | ⚠️ Ver abajo |
| **Base de Datos** | Neon PostgreSQL (us-east-1) | ✅ Conectada |

### Variables de Entorno en Render (Backend)

```
APP_ENV=production
GOOGLE_API_KEY=AIzaSyBmRh2zNAjKFz0sIE6Nl7lOeI8NToW1qls
DATABASE_URL=postgresql+asyncpg://neondb_owner:...@ep-winter-grass-a4fmytnf.us-east-1.aws.neon.tech/neondb
POSTGRES_URL=(misma URL)
PYTHON_VERSION=3.11
```

### Variables de Entorno en Vercel (Frontend)

```
NEXT_PUBLIC_API_URL=https://ofisolveofisolve-backend.onrender.com
```

### ⚠️ Problemas Conocidos en Producción

1. **Render Free Tier — Cold Start**: El servicio gratuito de Render "se duerme" después de 15 minutos sin tráfico. El primer request puede tardar **30-50 segundos**. El frontend puede mostrar un error de timeout antes de que el backend despierte.

2. **CORS Potencialmente Inestable**: Los orígenes CORS están hardcodeados en `config.py`. Si el dominio de Vercel cambia (por ejemplo, una preview URL), el backend la va a rechazar. Solución: pasar `CORS_ORIGINS` como variable de entorno en Render.

3. **RAG No Inicializado en Producción**: La tabla `langchain_pg_embedding` en Neon está vacía. El chat notarial en producción responde sin contexto legal real = respuestas genéricas.  
   **Para inicializarlo**:
   ```bash
   # Desde tu máquina local, con las credenciales de Neon
   cd backend
   DATABASE_URL="postgresql+asyncpg://neondb_owner:PASSWORD@ep-winter-grass-a4fmytnf.us-east-1.aws.neon.tech/neondb" python scripts/init_rag.py --reset
   ```

4. **Autenticación MVP (Hardcoded)**: El endpoint `/api/v1/auth/me` devuelve un usuario ficticio si no existe ninguno en la DB. El login real (JWT con usuarios de Neon) no está validado end-to-end en producción.

5. **spaCy en Render**: El Dockerfile incluye `RUN python -m spacy download es_core_news_sm`. Esto descarga ~50MB durante el build. Si el build falla por timeout, puede ser por esto. Alternativa: empaquetar el modelo en el repo.

### Diagrama del Flujo de Deploy

```mermaid
flowchart LR
    DEV[Local Dev] -- git push main --> GH[GitHub main]
    GH -- Auto-Deploy --> RENDER[Render Build]
    RENDER -- Dockerfile --> RUN[Backend Live]
    GH -- Auto-Deploy --> VC[Vercel Build]
    VC -- pnpm build --> FRONT[Frontend Live]
    RUN -- asyncpg + SSL --> NEON[(Neon PostgreSQL)]
```

### Cómo hacer un redeploy manual

**Render**:
1. Ir a https://dashboard.render.com → `ofisolveofisolve-backend`
2. Click en `Manual Deploy` → `Clear build cache & deploy`

**Vercel**:
1. Ir a https://vercel.com → proyecto `ofisolve-front`
2. `Deployments` → últimos deployment → `...` → `Redeploy`

---

## 12. Lo que Falta (Próximos pasos)

### Urgente (para que el MVP funcione bien)

- [ ] **Inicializar el RAG en Neon** (ver sección 11)
- [ ] **Warm-up del backend**: Configurar un cron que haga ping a `/health` cada 14 min para evitar cold starts
- [ ] **Validar login real**: Testear el flujo completo de JWT en producción con un usuario real en Neon

### Corto plazo

- [ ] **Autenticación completa**: Registrar usuario real → guardar en Neon → login → JWT válido
- [ ] **Asegurar tenant_id**: Filtrar todos los endpoints por workspace del usuario logueado
- [ ] **Firma Digital**: Integrar con infraestructura de firma remota
- [ ] **Módulo de Libros**: Gestión del libro de requerimientos

### Técnico / Deuda

- [ ] Mover `CORS_ORIGINS` a variable de entorno en Render (no hardcodeado en config.py)
- [ ] Tests de integración para los endpoints principales
- [ ] Separar `page.tsx` (115KB) en componentes más pequeños
- [ ] Upgrade de `langchain-postgres` cuando salga versión estable con async

---

*"La Fe Pública, potenciada por IA." — OfiSolve Team, 2026*

---

> **Para Pancho**: Si algo de esto no está claro o está desactualizado, editá este mismo archivo. No crear otro README. Este es el único documento de verdad.
