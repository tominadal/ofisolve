# OfiSolve: IA Notarial Soberana (Edición Profesional)

> **"La Fe Pública, potenciada por IA local y persistencia física."**  
> OfiSolve es un ERP Notarial de grado empresarial diseñado para escribanías argentinas, donde la **privacidad extrema** y la **soberanía de datos** son el núcleo del producto. 

---

## 🏛️ El Stack Soberano (Lokal-First)

Hemos migrado OfiSolve a una arquitectura 100% privada para garantizar el secreto profesional:

- **Motor de IA (LLM)**: [Ollama](https://ollama.com/) corriendo **Qwen 2.5 (7B)** para máxima comprensión legal en español.
- **Data Layer (Fusión FS-DB)**: SQLite para metadatos jerárquicos y Sistema de Archivos Local para persistencia de documentos.
- **Privacidad (PII)**: Microsoft Presidio + spaCy (anonimización local).
- **Orquestación**: LangGraph (Grafos de agentes cíclicos con validación de calidad).
- **Frontend**: Next.js 15 (Dashboard con estética "NotebookLM").

---

## 📂 Jerarquía de 3 Niveles (Professional UX)

El sistema organiza la información de forma natural para el escribano:
1.  **Cliente**: Entidad principal en la base de datos.
2.  **Trámite (Carpeta)**: Directorio físico en el disco donde se agrupa la documentación.
3.  **Documento (Archivo)**: El documento real (.pdf, .docx) que puede ser editado y guardado permanentemente.

---

## 🌟 Novedades (Última Fase: Escalabilidad y UX)

- **UX de Grado Empresarial**: Filtrado en tiempo real de clientes y expedientes. Componente de carga de documentos validado y asíncrono con barra de progreso. Autocompletado del "Requirente" directo desde la DB de clientes.
- **RAG y Contexto Mejorado**: El chat de IA ahora entiende el contexto específico de cada expediente (`thread_id` aislado). El acceso a Qdrant/ChromaDB fue optimizado mediante un patrón Singleton para máxima velocidad.
- **Base Legal Ampliada**: El LLM tiene acceso inmediato y privado al Código Civil y Comercial para Compraventas, Hipotecas, Donaciones, Testamentos, Mandatos y resoluciones de Honorarios Notariales.

---

## 🛠️ Roadmap a Futuro (Propuestas de Mejora)

1. **Migración a PostgreSQL**: Para despliegues multi-tenant (SaaS) a gran escala, reemplazar SQLite por PostgreSQL.
2. **Fallbacks Híbridos (Cloud/Local)**: Integrar un proveedor Cloud (OpenAI/Anthropic) como respaldo opcional si el hardware local se satura.
3. **Colaboración en Tiempo Real**: Reemplazar SSE por WebSockets para edición colaborativa estilo Google Docs en los borradores notariales.
4. **Auth Robusta**: Integración nativa de JWT y OAuth2 para gestión avanzada de escribanos y personal administrativo.

---

## 🚀 Guía de Inicio Rápido (Local)

### Requisitos
- Ollama instalado y corriendo (`ollama serve`).
- Modelos: Se instalan automáticamente al iniciar (`qwen2.5:7b` y `bge-m3`).

### Arranque Maestro
Para iniciar tanto el Backend como el Frontend en segundo plano (modo silencioso):
```powershell
./boot_ofisolve.ps1
```

### Sincronización e Inicialización (Seed)
Para resetear la base de datos con clientes premium, trámites y estructura de archivos físicos de prueba:
```powershell
python backend/scripts/seed_db.py
```

---

## 🛠️ Documentación Adicional
Para más detalles sobre la arquitectura interna y la estructura de carpetas, consulta el archivo [INFRA.MD](./INFRA.MD).

---

*"Doy fe por la tecnología, protejo por la privacidad." — OfiSolve Team, 2026*
