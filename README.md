# OfiSolve: ERP Notarial SaaS de Nueva Generación 🖋️🤖

OfiSolve es una plataforma **SaaS Enterprise** diseñada para transformar las escribanías argentinas mediante Inteligencia Artificial de vanguardia. Utiliza una arquitectura de **Agentes de IA Cíclicos** con memoria legal (RAG) y supervisión humana (**Human-in-the-Loop**) para garantizar la máxima seguridad jurídica con el mínimo esfuerzo operativo.

---

## 🌟 Pilares Tecnológicos

### 1. Motor Legal RAG (CABA Specialization)
OfiSolve no solo "escribe", sino que "conoce". Hemos ingerido la normativa de la **Ciudad Autónoma de Buenos Aires** (Ley 404, Resoluciones del CECBA) en una base de datos vectorial de alto rendimiento (**PGVector**).
- **Citas Precisas**: El sistema referencia automáticamente artículos de ley en cada borrador.
- **Asentimiento y Sociedades**: Conocimiento profundo sobre el Art. 470 del CCyCN y validación de facultades societarias ante la IGJ.

### 2. Arquitectura de Agentes Cíclicos (LangGraph)
Nuestra IA opera como un equipo de expertos que colaboran en tiempo real:
- **Agente Extractor**: Identifica automáticamente DNI, CUIT, nombres y objetos del acto.
- **Agente Redactor**: Genera el documento basado en la normativa recuperada.
- **Agente Validador**: Audita el borrador antes de presentarlo al humano, buscando errores u omisiones legales.

### 3. Experiencia "NotebookLM" (Premium UI)
Hemos diseñado una interfaz reactiva inspirada en los mejores estándares de productividad:
- **Streaming SSE**: Visualización en tiempo real del progreso de cada agente.
- **HITL Editor**: Un editor notarial enriquecido donde el escribano revisa, ajusta y aprueba el documento final.
- **Diseño "Paper Clean"**: Una estética sobria y profesional en tonos arena y blanco hueso que reduce la fatiga visual.

---

## 🛠 Stack Técnico

- **Backend**: FastAPI (Python 3.11+), SQLAlchemy, `asyncpg`, PostgreSQL + PGVector.
- **IA**: Gemini 2.0 Flash, LangChain, LangGraph, Presidio (PII De-identification).
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Lucide Icons, Shadcn/UI.
- **Infraestructura**: Preparado para Vercel (Front) y Railway/DigitalOcean (Back).

---

## 🚀 Despliegue Rápido (Local)

1. **Requisitos**: Docker (para Postgres) y Python 3.11.
2. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   # Configurar GOOGLE_API_KEY en .env
   python scripts/init_rag.py --reset
   python main.py
   ```
3. **Frontend**:
   ```bash
   cd frontend/ui
   npm install
   npm run dev -- -p 3001
   ```

---

## 🗺 Roadmap de Evolución
- [x] **Multi-Tenancy (Fase 3)**: Aislamiento total de datos por Escribanía.
- [x] **HITL & Streaming (Fase 4)**: Edición supervisada y chat reactivo.
- [x] **Jurisdicción CABA (Fase 5)**: Ingesta de normativa local profunda.
- [ ] **Firma Digital**: Integración con infraestructura de firma remota.
- [ ] **Módulo de Libros**: Gestión automatizada de libros de requerimientos.

© 2026 OfiSolve Team - "La Fe Pública, potenciada por IA".
