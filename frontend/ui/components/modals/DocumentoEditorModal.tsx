"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hayCambios = contenido !== contenidoOriginal;

  // Cargar contenido al abrir
  useEffect(() => {
    if (!open || !archivo) return;
    setCargando(true);
    setGuardadoHace(null);
    ofisolveApi
      .obtenerContenidoDocumento(archivo.id)
      .then((res) => {
        setContenido(res.contenido || "");
        setContenidoOriginal(res.contenido || "");
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

        {/* Toolbar de Markdown */}
        {!cargando && (
          <div className="shrink-0 flex items-center gap-1 border-b border-border bg-muted/30 px-5 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = ta.value;
                const sel = val.substring(start, end);
                const before = val.substring(0, start);
                const after = val.substring(end);
                setContenido(before + "**" + (sel || "negrita") + "**" + after);
                setTimeout(() => {
                  ta.focus();
                  ta.setSelectionRange(start + 2, start + 2 + (sel || "negrita").length);
                }, 0);
              }}
              title="Negrita"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = ta.value;
                const sel = val.substring(start, end);
                const before = val.substring(0, start);
                const after = val.substring(end);
                setContenido(before + "_" + (sel || "cursiva") + "_" + after);
                setTimeout(() => {
                  ta.focus();
                  ta.setSelectionRange(start + 1, start + 1 + (sel || "cursiva").length);
                }, 0);
              }}
              title="Cursiva"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const val = ta.value;
                const before = val.substring(0, start);
                const after = val.substring(start);
                setContenido(before + "\\n### Título\\n" + after);
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 5, start + 11); }, 0);
              }}
              title="Título"
            >
              <Heading className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const val = ta.value;
                const before = val.substring(0, start);
                const after = val.substring(start);
                setContenido(before + "\\n- Elemento de lista\\n" + after);
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 3, start + 20); }, 0);
              }}
              title="Lista"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = ta.value;
                const sel = val.substring(start, end);
                const before = val.substring(0, start);
                const after = val.substring(end);
                setContenido(before + "~~" + (sel || "tachado") + "~~" + after);
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2 + (sel || "tachado").length); }, 0);
              }}
              title="Tachado"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = ta.value;
                const sel = val.substring(start, end);
                const before = val.substring(0, start);
                const after = val.substring(end);
                setContenido(before + "\\n> " + (sel || "Cita") + "\\n" + after);
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 3, start + 3 + (sel || "Cita").length); }, 0);
              }}
              title="Cita"
            >
              <Quote className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = ta.value;
                const sel = val.substring(start, end);
                const before = val.substring(0, start);
                const after = val.substring(end);
                setContenido(before + "\\n```\\n" + (sel || "código") + "\\n```\\n" + after);
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 5, start + 5 + (sel || "código").length); }, 0);
              }}
              title="Código"
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const start = ta.selectionStart;
                const val = ta.value;
                const before = val.substring(0, start);
                const after = val.substring(start);
                setContenido(before + "\\n---\\n" + after);
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 5, start + 5); }, 0);
              }}
              title="Separador"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Body — Editor */}
        <div className="flex-1 overflow-hidden bg-background relative">
          {cargando ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Cargando documento...</p>
              </div>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="h-full w-full resize-none bg-background p-6 font-mono text-sm text-foreground leading-relaxed focus:outline-none"
              placeholder="El documento está vacío..."
              spellCheck={false}
            />
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
