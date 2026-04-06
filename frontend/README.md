# OfiSolve Frontend (UI) - CABA Notary Edition

Aplicación de interfaz construida en **Next.js 16 (React)** y **Tailwind CSS**. 
Este frontend fue rediseñado tras una auditoría desde la perspectiva de un *Escribano de la Ciudad Autónoma de Buenos Aires (CECBA)*, removiendo features genéricos de generación de contratos y acotando el MVP a lo que realmente se usa en mostrador: **Trámites Extraprotocolares**.

## Estructura de la UI

La vista principal de la aplicación (`page.tsx`) se divide en tres partes modulares (Paneles Resizables):

1. **Panel Izquierdo: "Librería Legal"**
   - Refleja los documentos de la Base de Conocimientos que el Backend entrega.
   - Aquí el escribano determina qué normas usar ("Reglamento CECBA", "Ley 404"). Esta selección viaja directo al agente RAG para restringir el universo de respuestas de Gemini.

2. **Panel Central: "Escritorio Chat"**
   - El espacio interactivo natural. Permite escribir consultas del estilo *"Mandame el borrador para certificar firma de Pedro"*.
   - Arriba, incluye un simulador de **Validación de Identidad (RENAPER)**. El paso crítico en una escribanía antes de firmar cualquier folio de actuación es validar que el DNI físico es legítimo.
   - Chips de acción rápida contextuales.

3. **Panel Derecho: "Panel de Trabajo (Generación Directa)"**
   - Atajos de generación "1-Click" que obvian el chat.
   - **Certificación de Firma**.
   - **Certificación de Fotocopia**.
   - **Autorización de Viajes (Menores)**.
   - **Certificado de Supervivencia**.
   - Lista histórica de los documentos autogenerados listos para descargar o auditar.

## Stack Tecnológico 🏗

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes**: [shadcn/ui](https://ui.shadcn.com/) y [Lucide Icons](https://lucide.dev/)
- **Resizing**: `react-resizable-panels`

## Estructura de Proyecto

\`\`\`text
frontend/ui/
├── app/
│   ├── globals.css    # Variables base y tema dark/light
│   ├── layout.tsx
│   └── page.tsx       # Toda la UI del MVP. Conexión RAG y Chat
├── lib/
│   ├── api.ts         # Cliente API (Axios interactuando con local:8000)
│   ├── types.ts       # Interfaces y tipados Strict de la api y app
│   └── utils.ts       # Funciones utilitarias de shadcn (clx, twMerge)
└── components/
    └── ui/            # Colección de componentes UI
\`\`\`
