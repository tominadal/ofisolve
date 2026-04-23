# OfiSolve: IA Notarial Soberana (Edición Profesional)

> **"La Fe Pública, potenciada por IA local y persistencia física."**  
> OfiSolve es un ERP Notarial de grado empresarial diseñado para escribanías argentinas, donde la **privacidad extrema** y la **soberanía de datos** son el núcleo del producto. 

---

## 🏛️ El Stack Soberano (Lokal-First)

Hemos migrado OfiSolve a una arquitectura 100% privada para garantizar el secreto profesional:

- **Motor de IA (LLM)**: [Ollama](https://ollama.com/) corriendo **Llama 3.1 (8B)**.
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

## 🚀 Guía de Inicio Rápido (Local)

### Requisitos
- Ollama instalado y corriendo (`ollama serve`).
- Modelos: `ollama pull llama3.1:8b` y `ollama pull nomic-embed-text`.

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
