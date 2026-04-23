# OfiSolve Infrastructure (INFRA.MD)

Esta es la documentación técnica de la infraestructura **OfiSolve Soberano**, diseñada para una escribanía profesional donde la privacidad y la persistencia de datos son críticas.

## 🏛️ Arquitectura de Fusión (SQL + Sistema de Archivos)

OfiSolve no es una aplicación web tradicional que solo guarda datos en una base de datos. Es un sistema **híbrido** que fusiona la potencia relacional con la soberanía del sistema de archivos local.

### 1. La Capa de Metadatos (SQL / SQLite)
- **Ubicación**: `backend/ofisolve.db`
- **Responsabilidad**: Es el "Cerebro" que gestiona las relaciones. Sabe que el Cliente A tiene el Trámite B, y que dicho trámite tiene 3 documentos asociados.
- **Por qué**: Permite búsquedas instantáneas, manejo de estados (borrador, aprobado) y auditoría de cambios.

### 2. La Capa de Persistencia Física (Local FS)
- **Ubicación**: `backend/uploads/clientes/{cliente_id}/{tramite_id}/`
- **Responsabilidad**: Es el "Protocolo" real. Aquí residen los documentos físicos (.pdf, .docx, .txt).
- **Por qué**: Garantiza que el escribano tenga control total sobre sus documentos. Puede abrirlos desde Windows Explorer sin necesidad de la aplicación.

### 3. Sincronización (The Sync Layer)
- El sistema sincroniza ambas capas. Si subes un archivo vía la UI, se guarda en el disco y se crea un registro en la DB.
- Si editas un documento en el `NotarialEditor`, el backend sobreescribe el archivo físico, garantizando que la "Verdad" siempre esté en el disco.

---

## 📂 Estructura de Carpetas

```text
ofisolve/
├── backend/                # Motor de la Aplicación (FastAPI)
│   ├── app/                # Lógica de Negocio
│   │   ├── agents/         # Grafos de Agentes (LangGraph)
│   │   ├── api/            # Endpoints REST y Streaming
│   │   ├── core/           # Configuración y Base de Datos
│   │   ├── models/         # Definiciones SQL y Esquemas Pydantic
│   │   ├── rag/            # Motor de Vectores y Normativa
│   │   └── services/       # Lógica (LLM, Privacidad, Archivos)
│   ├── uploads/            # BIBLIOTECA REAL de documentos notariales
│   └── main.py             # Punto de entrada del Backend
├── frontend/ui/            # Interfaz de Usuario (Next.js 15)
│   ├── app/                # Páginas y Layouts (Page Router)
│   ├── components/         # Componentes UI (Aesthetics-First)
│   └── lib/                # Cliente API (api.ts) y Utilidades
├── scripts/                # Herramientas auxiliares
└── backend/scripts/        # Mantenimiento e Infr (seed_db.py)
└── boot_ofisolve.ps1       # Script de arranque silencioso
```

---

## 🛡️ Soberanía de Datos

Toda la computación ocurre en la máquina del usuario:
- **Inferencia**: Ollama Local.
- **Embeddings**: Nomic-Embed-Text Local.
- **Privacidad**: Microsoft Presidio + spaCy Local.
- **Base de Datos**: SQLite Local.

*Nada sale de la infraestructura de la escribanía.*
