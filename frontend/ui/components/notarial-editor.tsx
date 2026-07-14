"use client"

import * as React from "react"
import { marked } from "marked"
import { Save, FileText, Download, Printer, Copy, Check, Wand2, CheckCircle2, FileType2, X } from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ofisolveApi } from "@/lib/api"

// Carga dinamica de React Quill para evitar errores de SSR
const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-muted/20" />
}) as any;
import "react-quill-new/dist/quill.snow.css"

interface NotarialEditorProps {
  documentId?: number
  content: string
  onChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  onClose?: () => void
  titulo?: string
  usuario?: any // Usamos any para simplificar, idealmente Usuario
}

const NotarialEditorComponent = ({ documentId, content, onChange, onSave, onApprove, onClose, titulo = "Documento Notarial", usuario }: NotarialEditorProps & { onApprove?: (content: string) => void }) => {
  const [value, setValue] = React.useState(content)
  const [isSaved, setIsSaved] = React.useState(true)
  const [isCopied, setIsCopied] = React.useState(false)
  const [isApproving, setIsApproving] = React.useState(false)
  const [lockedBy, setLockedBy] = React.useState<string | null>(null)
  
  const ws = React.useRef<WebSocket | null>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // WebSocket connection
  React.useEffect(() => {
    if (!documentId) return;
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws') + `/editor/ws/${documentId}`;
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'update' && data.content !== undefined) {
          setValue(data.content);
          if (onChange) onChange(data.content);
        } else if (data.event === 'lock') {
          setLockedBy(data.user || "Otro usuario");
        } else if (data.event === 'unlock') {
          setLockedBy(null);
        }
      } catch (e) {
        console.error("Error parsing WS message", e);
      }
    };
    
    return () => {
      ws.current?.close();
    };
  }, [documentId]);

  // Sincronizar el valor interno cuando cambia el contenido prop (ej. nueva generacion IA)
  React.useEffect(() => {
    const parseContent = async () => {
      if (content && !content.includes('<p>')) {
        const htmlContent = await marked.parse(content);
        setValue(htmlContent);
      } else {
        setValue(content);
      }
    };
    parseContent();
  }, [content])

  const handleChange = (newVal: string) => {
    // Si esta bloqueado por otro, no deberia cambiarlo, pero por las dudas
    if (lockedBy) return;

    setValue(newVal)
    setIsSaved(false)
    if (onChange) onChange(newVal)
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      // 1. Enviar evento de update
      ws.current.send(JSON.stringify({ event: 'update', content: newVal }));
      
      // 2. Avisar que estamos escribiendo (lock)
      const username = usuario?.nombre_completo || usuario?.email || "Usuario Local";
      ws.current.send(JSON.stringify({ event: 'lock', user: username }));
      
      // 3. Debounce para soltar el lock (si dejamos de tipear por 1.5s)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ event: 'unlock' }));
        }
      }, 1500);
    }
  }

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave(value);
        setIsSaved(true)
        toast.success("Documento borrador guardado en el servidor")
      } catch (error: any) {
        toast.error(`Error al guardar: ${error.message}`);
      }
    } else {
      setIsSaved(true)
      toast.success("Documento guardado localmente")
    }
  }

  const handleApprove = async () => {
    if (!onApprove) {
      toast.error("Funcion de aprobacion no configurada")
      return
    }

    setIsApproving(true)
    try {
      await onApprove(value)
      toast.success("Trámite aprobado y cerrado oficialmente")
      setIsSaved(true)
      if (onClose) onClose()
    } catch (error: any) {
      const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      toast.error("Error al aprobar el trámite: " + errorMessage)
    } finally {
      setIsApproving(false)
    }
  }

  const handleCopy = () => {
    const tempElement = document.createElement("div")
    tempElement.innerHTML = value
    const textToCopy = tempElement.innerText || tempElement.textContent || ""
    
    navigator.clipboard.writeText(textToCopy)
    setIsCopied(true)
    toast.success("Texto copiado al portapapeles")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["clean"],
    ],
  }

  return (
    <div className="flex h-full flex-col bg-card font-sans">
      {/* Header del Editor */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="rounded bg-indigo-500/10 p-1.5 ring-1 ring-indigo-500/20">
            <FileText className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {titulo} {!isSaved && <span className="text-[10px] uppercase text-amber-500 ml-2 animate-pulse">(Sin guardar)</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Printer className="h-4 w-4" />
          </Button>
          
          {/* BOTONES DE EXPORTACION */}
          <div className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                title="Exportar a Word"
                onClick={() => ofisolveApi.exportarDocumento(titulo, value, 'docx')}
                className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
            >
                <FileType2 className="h-4 w-4" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                title="Exportar a PDF"
                onClick={() => ofisolveApi.exportarDocumento(titulo, value, 'pdf')}
                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
            >
                <FileType2 className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSave}
            className="h-8 border-indigo-500/30 text-xs font-semibold hover:bg-indigo-500/10"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Guardar
          </Button>
          <div className="mx-1 h-4 w-[1px] bg-border" />
          <Button 
            size="sm" 
            variant="default" 
            disabled={isApproving}
            onClick={handleApprove}
            className="h-8 bg-emerald-600 px-3 text-xs font-semibold hover:bg-emerald-500 text-white"
          >
            {isApproving ? <Wand2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
            Aprobar
          </Button>

          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 ml-1">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Area del Editor (Estilo Notion/Papel) */}
      <div className="flex-1 overflow-y-auto bg-muted quill-editor-wrapper relative flex flex-col items-center">
        {lockedBy && (
          <div className="absolute top-4 z-10 flex items-center justify-center">
            <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-5 py-2.5 rounded-full border border-amber-300 flex items-center gap-2 text-sm font-semibold shadow-lg animate-pulse">
              {lockedBy} está editando...
            </div>
          </div>
        )}
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          readOnly={!!lockedBy}
          modules={modules}
          className="w-full max-w-full flex flex-col items-center"
          placeholder="Escribe o deja que la IA genere el contenido..."
        />
      </div>

      {/* Footer / Status Bar */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-1.5 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Palabras: {value.replace(new RegExp("<[^>]*>", "g"), "").split(/\s+/).filter(Boolean).length}</span>
          <span>Caracteres: {value.replace(new RegExp("<[^>]*>", "g"), "").length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Wand2 className="h-3 w-3 text-indigo-400" />
          <style>{`
            .quill-editor-wrapper .quill {
              width: 100%;
            }
            .quill-editor-wrapper .ql-toolbar {
              width: 100%;
              border: none;
              border-bottom: 1px solid var(--border);
              background-color: var(--background);
              padding: 0.75rem 1rem;
              position: sticky;
              top: 0;
              z-index: 5;
            }
            .quill-editor-wrapper .ql-container {
              width: 210mm;
              min-height: 297mm;
              background-color: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              margin: 2rem auto;
              border: 1px solid #e2e8f0;
              border-radius: 2px;
            }
            .quill-editor-wrapper .ql-editor {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              padding: 96px;
              color: black;
              min-height: 100%;
            }
            .quill-editor-wrapper .ql-editor.ql-blank::before {
              color: #94a3b8;
              font-style: italic;
              left: 96px;
            }
            .quill-editor-wrapper .ql-snow .ql-stroke {
              stroke: var(--muted-foreground);
            }
            .quill-editor-wrapper .ql-snow .ql-fill {
              fill: var(--muted-foreground);
            }
            .quill-editor-wrapper .ql-snow .ql-picker {
              color: var(--muted-foreground);
            }
            .quill-editor-wrapper .ql-snow .ql-picker-options {
              background-color: var(--popover);
              border-color: var(--border);
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
              border-radius: 0.5rem;
            }
          `}</style>
          Optimizado por OfiSolve AI
        </div>
      </div>
    </div>
  )
}

export const NotarialEditor = React.memo(NotarialEditorComponent);
