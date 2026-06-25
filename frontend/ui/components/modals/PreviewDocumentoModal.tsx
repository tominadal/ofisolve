"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download } from "lucide-react";

interface PreviewDocumentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoPreview: any | null;
  onDownload: (doc: any) => void;
  formatearFecha: (fecha: string | Date) => string;
}

export function PreviewDocumentoModal({
  open,
  onOpenChange,
  documentoPreview,
  onDownload,
  formatearFecha
}: PreviewDocumentoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>{documentoPreview?.nombre}</DialogTitle>
          <DialogDescription>
            Versión {documentoPreview?.version} - {documentoPreview && formatearFecha(documentoPreview.fechaGeneracion)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-4 max-h-[60vh] rounded-lg border border-border bg-card p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {documentoPreview?.contenidoPreview || "Sin contenido para previsualizar"}
          </pre>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => documentoPreview && onDownload(documentoPreview)}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
