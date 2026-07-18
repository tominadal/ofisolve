"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, FileText, Loader2, Link as LinkIcon, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { ofisolveApi } from "@/lib/api";

interface SubirDocumentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number | undefined;
  tramiteId: number | undefined;
  onSuccess: () => void;
}

export function SubirDocumentoModal({
  open,
  onOpenChange,
  workspaceId,
  tramiteId,
  onSuccess
}: SubirDocumentoModalProps) {
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [subiendoArchivos, setSubiendoArchivos] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSeleccionArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevos = Array.from(e.target.files);
      const invalidosTamanio = nuevos.filter(f => f.size > 25 * 1024 * 1024);
      if (invalidosTamanio.length > 0) {
        toast.error("Algunos archivos superan el límite de 25MB");
        return;
      }
      
      const permitidos = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".png", ".jpg", ".jpeg"];
      const invalidosTipo = nuevos.filter(f => {
        const ext = "." + f.name.split('.').pop()?.toLowerCase();
        return !permitidos.includes(ext);
      });
      if (invalidosTipo.length > 0) {
        toast.error("Algunos archivos tienen un formato no soportado");
        return;
      }
      
      setArchivosSeleccionados(prev => [...prev, ...nuevos]);
    }
  };

  const subirArchivos = async () => {
    if (archivosSeleccionados.length === 0 || !workspaceId) return;
    
    setSubiendoArchivos(true);
    setProgreso(0);
    
    try {
      let subidos = 0;
      for (const archivo of archivosSeleccionados) {
        await ofisolveApi.subirDocumento(workspaceId, archivo, tramiteId);
        subidos++;
        setProgreso(Math.round((subidos / archivosSeleccionados.length) * 100));
      }
      
      toast.success(`${archivosSeleccionados.length} archivo(s) subido(s) e indexado(s)`);
      
      setArchivosSeleccionados([]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error al subir archivos: ${error.message}`);
    } finally {
      setSubiendoArchivos(false);
      setTimeout(() => setProgreso(0), 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden bg-background border-border">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <DownloadCloud className="h-5 w-5 text-primary" />
              Subir Documentación
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Agregá archivos para que la IA los analice.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="archivos" className="w-full">
          <div className="px-6 border-b border-border">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-6">
              <TabsTrigger 
                value="archivos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 font-medium"
              >
                <FileText className="h-4 w-4 mr-2" />
                Archivos Locales
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="archivos" className="mt-0 outline-none">
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Arrastrá archivos o hacé clic</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Soporta PDF, Word, Excel, TXT, Imágenes (Max 25MB)
                </p>
                <Button variant="outline" className="mx-auto relative z-10 pointer-events-none">
                  Seleccionar archivos
                </Button>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleSeleccionArchivos}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                />
              </div>

              {archivosSeleccionados.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3 flex items-center justify-between">
                    <span>Archivos seleccionados ({archivosSeleccionados.length})</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setArchivosSeleccionados([])}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Limpiar
                    </Button>
                  </h4>
                  <ScrollArea className="h-32 border border-border rounded-lg bg-card/50">
                    <div className="p-2 space-y-1">
                      {archivosSeleccionados.map((archivo, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-accent group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate font-medium">{archivo.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {(archivo.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              const nuevos = [...archivosSeleccionados];
                              nuevos.splice(index, 1);
                              setArchivosSeleccionados(nuevos);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {subiendoArchivos && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subiendo e indexando...</span>
                        <span>{progreso}%</span>
                      </div>
                      <Progress value={progreso} className="h-2" />
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={subiendoArchivos}>
                      Cancelar
                    </Button>
                    <Button onClick={subirArchivos} disabled={subiendoArchivos} className="gap-2">
                      {subiendoArchivos ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                      ) : (
                        <><UploadCloud className="h-4 w-4" /> Subir e Indexar</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="links" className="mt-0 outline-none space-y-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <LinkIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h4 className="font-medium text-muted-foreground">Funcionalidad en desarrollo</h4>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                  Pronto podrás agregar páginas web y artículos como contexto para tus trámites.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
