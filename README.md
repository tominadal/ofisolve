# OfiSolve: IA Notarial Soberana (Edición Profesional)

> **"La Fe Pública, potenciada por IA local y persistencia física."**  
> OfiSolve es un ERP Notarial de grado empresarial diseñado para escribanías argentinas, donde la **privacidad extrema** y la **soberanía de datos** son el núcleo del producto. Toda la computación ocurre en la máquina del usuario, garantizando que el secreto profesional nunca abandone la infraestructura de la escribanía.

---

## 🏛️ El Stack Soberano y Arquitectura (Lokal-First)

Hemos migrado OfiSolve a una arquitectura 100% privada e híbrida (Fusión SQL + Sistema de Archivos Local).

### 1. Motor de IA Súper-Privado
- **Motor de IA (LLM)**: [Ollama](https://ollama.com/) corriendo **Qwen 2.5 (7B)** para máxima comprensión legal en español.
- **Embeddings**: Nomic-Embed-Text Local.
- **Privacidad (PII)**: Microsoft Presidio + spaCy para anonimización local.
- **Orquestación**: LangGraph (Grafos de agentes cíclicos con validación de calidad).

### 2. La Capa de Metadatos (SQL / SQLite)
- **Ubicación**: `backend/ofisolve.db`
- **Responsabilidad**: Es el "Cerebro" que gestiona las relaciones (ej. Cliente A tiene el Trámite B con 3 documentos).
- Permite búsquedas instantáneas, manejo de estados y auditoría de cambios.

### 3. La Capa de Persistencia Física (Local FS)
- **Ubicación**: `backend/uploads/clientes/{cliente_id}/{tramite_id}/`
- **Responsabilidad**: Es el "Protocolo" real. Aquí residen los documentos físicos (.pdf, .docx).
- Garantiza que el escribano tenga control total sobre sus documentos. Puede abrirlos desde Windows Explorer sin necesidad de la aplicación.
- **Sincronización**: Al editar en la UI, el backend sobreescribe el archivo físico garantizando que la "Verdad" siempre esté en el disco.

### 4. Frontend Premium
- **Framework**: Next.js 15 (App Router).
- **Diseño**: Estética premium tipo "NotebookLM" enfocada en la UX profesional.

---

## 📂 Estructura de Carpetas

```text
ofisolve/
├── backend/                # Motor de la Aplicación (FastAPI)
│   ├── app/                # Lógica de Negocio (Agentes, API, RAG, Servicios)
│   ├── uploads/            # BIBLIOTECA REAL de documentos notariales
│   ├── tests/              # Suite de Pruebas LLM Avanzada
│   ├── scripts/            # Herramientas de Mantenimiento y Diagnóstico
│   └── main.py             # Punto de entrada
├── frontend/ui/            # Interfaz de Usuario (Next.js 15)
│   ├── app/                # Páginas y Layouts
│   └── components/         # Componentes UI Premium
└── boot_ofisolve.ps1       # Script de arranque silencioso
```

---

## 🌟 Novedades y Funcionalidades Recientes

- **Suite ERP Notarial Completa**: Integración de módulos de gestión administrativa inspirados en los más altos estándares del mercado:
  - **Panel UIF / Prevención de Lavado**: Matriz de riesgo automatizada, alertas de umbrales en efectivo (CUI) y exportación de reportes para cumplimiento normativo.
  - **Finanzas y Flujo de Caja**: Tablero analítico con ingresos/egresos, proyecciones a 6 meses (gráficos interactivos) y exportación contable a CSV.
  - **Presupuestador Inteligente**: Calculadora automática de honorarios, aportes, fojas y sellos (configurables). Generación y exportación de PDFs listos para el cliente.
  - **Agenda y Vencimientos**: Alertas automáticas de vencimientos registrales (15 días) y panel de turnos.
  - **Muro de Notas y Plantillas**: Espacio colaborativo en tiempo real y biblioteca de modelos (textos predefinidos).
- **Suite de Mantenimiento y Diagnóstico**: Herramientas como `watchdog.py` y `diagnostics.py` para recuperación automática y reportes técnicos.
- **Suite de Pruebas de Calidad LLM (Benchmarks)**: Testing exhaustivo (`run_llm_benchmarks.py`) de la velocidad y coherencia de la IA.
- **Nueva UI de Autenticación Premium**: Inicio de sesión rediseñado (`login-view.tsx`) con estética minimalista y validaciones en tiempo real.
- **RAG y Base Legal Optimizada**: Contexto aislado por expediente, vector-store (ChromaDB) vía patrón Singleton, y acceso al Código Civil y Comercial.

---

## 🚀 Guía de Inicio Rápido (Local)

### Requisitos
- Ollama instalado y corriendo (`ollama serve`).
- Modelos: Se instalan automáticamente al iniciar (`qwen2.5:7b` y `bge-m3`).
- Node.js y Python 3.10+ instalados.

### Arranque Maestro
Para iniciar tanto el Backend como el Frontend en segundo plano de forma concurrente, además del Watchdog:
```powershell
./boot_ofisolve.ps1
```

### Sincronización e Inicialización (Seed)
Para inicializar o resetear la base de datos de desarrollo con datos simulados realistas:
```powershell
python backend/scripts/seed_db.py
```

---

## 🛠️ Roadmap a Futuro (Propuestas de Mejora)

1. **Migración a PostgreSQL**: Para escalar a modelo SaaS multi-tenant a futuro.
2. **Fallbacks Híbridos (Cloud/Local)**: Integrar un proveedor Cloud como respaldo en caso de sobrecarga de GPU local.
3. **Edición Colaborativa en Tiempo Real**: Migrar de SSE a WebSockets para edición tipo Google Docs en los borradores.

---

*"Doy fe por la tecnología, protejo por la privacidad." — OfiSolve Team, 2026*
