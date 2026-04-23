"use client"

import * as React from "react"
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
  content: string
  onChange?: (content: string) => void
  onApprove?: (content: string) => Promise<void>
  onClose?: () => void
  titulo?: string
}

export function NotarialEditor({ content, onChange, onApprove, onClose, titulo = "Documento Notarial" }: NotarialEditorProps) {
  const [value, setValue] = React.useState(content)
  const [isSaved, setIsSaved] = React.useState(true)
  const [isCopied, setIsCopied] = React.useState(false)
  const [isApproving, setIsApproving] = React.useState(false)

  // Sincronizar el valor interno cuando cambia el contenido prop (ej. nueva generacion IA)
  React.useEffect(() => {
    setValue(content)
  }, [content])

  const handleChange = (newVal: string) => {
    setValue(newVal)
    setIsSaved(false)
    if (onChange) onChange(newVal)
  }

  const handleSave = () => {
    setIsSaved(true)
    toast.success("Documento guardado localmente")
    // TODO: Persistir en el backend via POST /api/v1/workspaces/:id/documentos-generados/:id
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

      {/* Area del Editor */}
      <div className="flex-1 overflow-hidden bg-white/5 quill-editor-wrapper">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={modules}
          className="h-full text-foreground"
          placeholder="Escribe o deja que la IA genere el contenido..."
        />
      </div>

      {/* Footer / Status Bar */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-1.5 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Palabras: {value.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length}</span>
          <span>Caracteres: {value.replace(/<[^>]*>/g, "").length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Wand2 className="h-3 w-3 text-indigo-400" />
          Optimizado por OfiSolve AI
        </div>
      </div>

      <style jsx global>{`
        .quill-editor-wrapper .ql-toolbar.ql-snow {
          border: none;
          background: rgba(var(--muted), 0.3);
          border-bottom: 1px solid var(--border);
        }
        .quill-editor-wrapper .ql-container.ql-snow {
          border: none;
        }
        .quill-editor-wrapper .ql-editor {
          font-family: var(--font-sans);
          font-size: 0.875rem;
          line-height: 1.6;
          padding: 2rem;
          height: 100%;
          color: var(--foreground);
        }
        .quill-editor-wrapper .ql-editor.ql-blank::before {
          color: var(--muted-foreground);
          font-style: italic;
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
        }
      `}</style>
    </div>
  )
}
