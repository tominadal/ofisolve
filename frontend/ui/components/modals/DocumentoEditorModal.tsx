"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ofisolveApi } from "@/lib/api";
import {
  Save,
  X,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Bold,
  Italic,
  Heading,
  List,
  Quote,
  Code,
  Strikethrough,
  Minus
} from "lucide-react";
import dynamic from "next/dynamic";
import { marked } from "marked";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted-foreground">Cargando editor...</p>
});

interface DocumentoEditorModalProps {
  /** Objeto de archivo (de archivosPorTramite) */
  archivo: { id: number; nombre: string; tipo: string } | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentoEditorModal({ archivo, open, onClose }: DocumentoEditorModalProps) {
  const [contenido, setContenido] = useState("");
  const [contenidoOriginal, setContenidoOriginal] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoHace, setGuardadoHace] = useState<Date | null>(null);
  const [modoNotarial, setModoNotarial] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hayCambios = contenido !== contenidoOriginal;

  // Cargar contenido al abrir
  useEffect(() => {
    if (!open || !archivo) return;
    setCargando(true);
    setGuardadoHace(null);
    ofisolveApi
      .obtenerContenidoDocumento(archivo.id)
      .then(async (res) => {
        let text = res.contenido || "";
        if (text && !text.includes('<p>')) {
           text = await marked.parse(text);
        }
        setContenido(text);
        setContenidoOriginal(text);
      })
      .catch(() => {
        toast.error("No se pudo cargar el contenido del documento.");
        setContenido("");
        setContenidoOriginal("");
      })
      .finally(() => setCargando(false));
  }, [open, archivo?.id]);

  // Guardar cambios
  const guardar = useCallback(async () => {
    if (!archivo || guardando) return;
    setGuardando(true);
    try {
      await ofisolveApi.guardarContenidoDocumento(archivo.id, contenido);
      setContenidoOriginal(contenido);
      setGuardadoHace(new Date());
      toast.success("Documento guardado correctamente.");
    } catch (e: any) {
      toast.error(`Error al guardar: ${e.message}`);
    } finally {
      setGuardando(false);
    }
  }, [archivo, contenido, guardando]);

  // Atajo de teclado Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hayCambios) guardar();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [guardar, hayCambios]);

  // Descargar como texto plano
  const descargar = () => {
    if (!archivo) return;
    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tiempoGuardado = guardadoHace
    ? `Guardado hace ${Math.round((Date.now() - guardadoHace.getTime()) / 1000)}s`
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden [&>button:last-child]:hidden">
        {/* Header */}
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-foreground truncate max-w-[400px]">
                {archivo?.nombre || "Documento"}
              </DialogTitle>
              {archivo?.tipo && (
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider mt-0.5">
                  {archivo.tipo}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tiempo guardado */}
            {tiempoGuardado && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {tiempoGuardado}
              </span>
            )}

            {/* Cambios sin guardar */}
            {hayCambios && !guardando && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                Cambios sin guardar
              </span>
            )}

            {/* Botón Descargar */}
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] gap-1.5" onClick={descargar}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>

            <div className="flex items-center gap-2 border-l border-border pl-3 ml-1 mr-2">
              <Switch 
                id="modo-notarial" 
                checked={modoNotarial}
                onCheckedChange={setModoNotarial}
              />
              <Label htmlFor="modo-notarial" className="text-[11px] cursor-pointer">Fojas Notariales</Label>
            </div>

            {/* Botón Guardar */}
            <Button
              size="sm"
              className="h-8 px-3 text-[11px] gap-1.5 bg-primary hover:bg-primary/90"
              onClick={guardar}
              disabled={!hayCambios || guardando}
            >
              {guardando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Guardar</span>
            </Button>

            {/* Cerrar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Body — Editor */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {cargando ? (
            <div className="flex h-full items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Cargando documento...</p>
              </div>
            </div>
          ) : (
            <div className={cn("flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 quill-editor-wrapper relative flex flex-col items-center", modoNotarial ? "notarial-mode" : "")}>
              <ReactQuill
                theme="snow"
                value={contenido}
                onChange={setContenido}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                  ]
                }}
                className="w-full max-w-full flex flex-col items-center"
                placeholder="El documento está vacío..."
              />
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
                  z-index: 10;
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
                  line-height: 2; /* Interlineado doble tipico */
                  padding: 96px;
                  color: black;
                  min-height: 100%;
                }
                /* Modo Notarial (Protocolo) */
                .quill-editor-wrapper.notarial-mode .ql-container {
                  position: relative;
                }
                .quill-editor-wrapper.notarial-mode .ql-editor {
                  padding-left: 80mm !important; /* Margen izquierdo de 8cm */
                  padding-right: 15mm !important;
                  padding-top: 30mm !important;
                  padding-bottom: 30mm !important;
                }
                .quill-editor-wrapper.notarial-mode .ql-editor::before {
                  content: "1\\A 2\\A 3\\A 4\\A 5\\A 6\\A 7\\A 8\\A 9\\A 10\\A 11\\A 12\\A 13\\A 14\\A 15\\A 16\\A 17\\A 18\\A 19\\A 20\\A 21\\A 22\\A 23\\A 24\\A 25";
                  position: absolute;
                  left: 20mm;
                  top: 30mm;
                  bottom: 30mm;
                  width: 10mm;
                  color: #94a3b8;
                  font-family: monospace;
                  font-size: 10pt;
                  line-height: inherit;
                  white-space: pre;
                  text-align: right;
                  pointer-events: none;
                  user-select: none;
                }
                .quill-editor-wrapper.notarial-mode .ql-editor::after {
                  content: "";
                  position: absolute;
                  left: 32mm;
                  top: 30mm;
                  bottom: 30mm;
                  width: 1px;
                  background-color: #cbd5e1;
                  pointer-events: none;
                }
              `}</style>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-border bg-card/50 px-5 py-2">
          <span className="text-[10px] text-muted-foreground">
            {contenido.length.toLocaleString()} caracteres · {contenido.split("\n").length} líneas
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:block">
            Ctrl+S para guardar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
