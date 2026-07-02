import React, { useState } from "react";
import { Search, UserPlus, ChevronDown, ChevronRight, UserIcon, Folder, FolderPlus, History, ChevronUp, Lock, Scale, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ofisolveApi } from "@/lib/api";
import { toast } from "sonner";
import { Tramite, ClienteResponse, Workspace, Usuario, DocumentoFuente } from "@/lib/types";

interface SidebarProps {
  clientes: ClienteResponse[];
  tramites: Tramite[];
  workspaceActual: Workspace | null;
  clienteActual: ClienteResponse | null;
  setClienteActual: (cliente: ClienteResponse | null) => void;
  tramiteActual: Tramite | null;
  setTramiteActual: (tramite: Tramite | null) => void;
  documentoActual: DocumentoFuente | null;
  setDocumentoActual: (documento: DocumentoFuente | null) => void;
  expandedClienteId: number | null;
  setExpandedClienteId: (id: number | null) => void;
  setIsNuevoClienteOpen: (open: boolean) => void;
  setIsNuevoTramiteOpen: (open: boolean) => void;
  onMoverTramite?: (tramiteId: number, nuevoClienteId: number) => void;
  onMoverDocumento?: (documentoId: number, nuevoTramiteId: number) => void;
  archivosPorTramite: Record<number, any[]>;
  setArchivosPorTramite: React.Dispatch<React.SetStateAction<Record<number, any[]>>>;
  usuario: Usuario | null;
  onAbrirDocumento?: (archivo: any) => void;
}

export function Sidebar({
  clientes,
  tramites,
  workspaceActual,
  clienteActual,
  setClienteActual,
  tramiteActual,
  setTramiteActual,
  documentoActual,
  setDocumentoActual,
  expandedClienteId,
  setExpandedClienteId,
  setIsNuevoClienteOpen,
  setIsNuevoTramiteOpen,
  onMoverTramite,
  onMoverDocumento,
  archivosPorTramite,
  setArchivosPorTramite,
  usuario,
  onAbrirDocumento,
}: SidebarProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Filtrar clientes y trámites basado en el texto de búsqueda
  const clientesFiltrados = busqueda.trim()
    ? clientes.filter(c =>
        c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.dni?.includes(busqueda) ||
        c.cuit?.includes(busqueda)
      )
    : clientes;

  const tramitesSinCliente = tramites.filter(t =>
    t.workspaceId == workspaceActual?.id &&
    !t.clienteId &&
    t.estado !== 'archivado' &&
    (busqueda.trim() ? t.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true)
  );

  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar overflow-x-hidden">
      {/* Header: Buscador de Clientes */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar cliente o DNI..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-card border-border transition-all focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="shrink-0 px-4 py-2 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Clientes y Carpetas
        </h3>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-lg"
            onClick={() => setIsNuevoTramiteOpen(true)}
            title="Crear nueva carpeta (trámite)"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-lg"
            onClick={() => setIsNuevoClienteOpen(true)}
            title="Agregar cliente"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Explorador Jerárquico */}
      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-1 py-2">
          {clientesFiltrados.length === 0 && tramitesSinCliente.length === 0 && (
            <div className="flex flex-col items-center justify-center p-4 text-center mt-4">
              <Folder className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">{busqueda ? "Sin resultados" : "No hay carpetas"}</p>
              {!busqueda && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-[10px] h-7"
                  onClick={() => setIsNuevoClienteOpen(true)}
                >
                  Crear Cliente
                </Button>
              )}
            </div>
          )}
          
          {clientesFiltrados.map((cliente) => {
            const isExpanded = expandedClienteId === cliente.id;
            const isSelected = clienteActual?.id === cliente.id;
            
            return (
              <div 
                key={cliente.id} 
                className="flex flex-col gap-1"
                onDragOver={(e) => {
                  e.preventDefault();
                  // Visual feedback can be added here
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const tramiteId = e.dataTransfer.getData("tramiteId");
                  if (tramiteId && onMoverTramite) {
                    onMoverTramite(Number(tramiteId), cliente.id);
                  }
                }}
              >
                <button
                  onClick={() => {
                    setExpandedClienteId(isExpanded ? null : cliente.id);
                    setClienteActual(cliente);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all",
                    isSelected 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-accent/50 text-foreground"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 shrink-0 flex items-center justify-center rounded-lg",
                    isSelected ? "bg-primary/20" : "bg-muted"
                  )}>
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{cliente.nombre_completo}</p>
                    <p className="truncate text-[10px] opacity-70">DNI {cliente.dni}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  )}
                </button>

                {/* Carpetas (Trámites) del cliente */}
                {isExpanded && (
                  <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-border pl-2 animate-in slide-in-from-left-2 duration-200">
                    {tramites.filter(t => t.workspaceId == workspaceActual?.id && t.estado !== 'archivado' && t.clienteId == cliente.id).map((tramite) => {
                      const isTramiteSelected = tramiteActual?.id === tramite.id;
                      const archivos = archivosPorTramite[tramite.id] || [];
                      
                      return (
                        <div key={tramite.id} className="flex flex-col gap-0.5">
                          <button
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("tramiteId", tramite.id.toString());
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const docId = e.dataTransfer.getData("documentoId");
                              if (docId && onMoverDocumento) {
                                onMoverDocumento(Number(docId), tramite.id);
                                return;
                              }
                              
                              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                e.stopPropagation();
                                const file = e.dataTransfer.files[0];
                                if (workspaceActual) {
                                  try {
                                    toast.info(`Subiendo ${file.name}...`);
                                    await ofisolveApi.subirDocumento(workspaceActual.id, file, tramite.id);
                                    toast.success(`${file.name} subido exitosamente`);
                                    
                                    ofisolveApi.obtenerArchivosTramite(tramite.id)
                                      .then(docs => setArchivosPorTramite(prev => ({ ...prev, [tramite.id]: docs })))
                                      .catch(err => console.error(err));
                                  } catch (error: any) {
                                    toast.error(`Error al subir archivo: ${error.message}`);
                                  }
                                }
                              }
                            }}
                            onClick={() => {
                              setTramiteActual(tramite);
                              // Cargar archivos al hacer click
                              if (!archivosPorTramite[tramite.id]) {
                                ofisolveApi.obtenerArchivosTramite(tramite.id)
                                  .then(docs => setArchivosPorTramite(prev => ({ ...prev, [tramite.id]: docs })))
                                  .catch(err => console.error(err));
                              }
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition-all group/item",
                              isTramiteSelected
                                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{tramite.nombre}</span>
                            </div>
                          </button>

                          {/* Archivos del trámite */}
                          {isTramiteSelected && archivos.length > 0 && (
                            <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-primary/20 pl-2 animate-in fade-in duration-200">
                              {archivos.map(archivo => (
                                <button
                                  key={archivo.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData("documentoId", archivo.id.toString());
                                  }}
                                  onClick={async () => {
                                    setDocumentoActual(archivo);
                                    if (onAbrirDocumento) {
                                      onAbrirDocumento(archivo);
                                    } else {
                                      try {
                                        const doc = await ofisolveApi.obtenerContenidoDocumento(archivo.id);
                                        if (doc) {
                                          toast.success(`Seleccionado ${archivo.nombre}`);
                                        }
                                      } catch(e) {
                                        toast.error("Error al cargar documento");
                                      }
                                    }
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-all",
                                    documentoActual?.id === archivo.id
                                      ? "bg-primary/20 text-primary font-medium"
                                      : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                                  )}
                                >
                                  <FileText className="h-3 w-3 shrink-0 opacity-50" />
                                  <span className="truncate">{archivo.nombre}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {tramites.filter(t => t.workspaceId == workspaceActual?.id && t.estado !== 'archivado' && t.clienteId == cliente.id).length === 0 && (
                      <div className="px-3 py-2 text-[10px] text-muted-foreground/60 italic">
                        No hay carpetas
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {tramitesSinCliente.length > 0 && (
            <div className="mt-4">
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
                Otras carpetas
              </div>
              <div className="flex flex-col gap-0.5">
                {tramitesSinCliente.map((tramite) => {
                  const isTramiteSelected = tramiteActual?.id === tramite.id;
                  const archivos = archivosPorTramite[tramite.id] || [];
                  return (
                    <div key={tramite.id} className="flex flex-col gap-0.5">
                      <button
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("tramiteId", tramite.id.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const docId = e.dataTransfer.getData("documentoId");
                          if (docId && onMoverDocumento) {
                            onMoverDocumento(Number(docId), tramite.id);
                            return;
                          }
                          
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            e.stopPropagation();
                            const file = e.dataTransfer.files[0];
                            if (workspaceActual) {
                              try {
                                toast.info(`Subiendo ${file.name}...`);
                                await ofisolveApi.subirDocumento(workspaceActual.id, file, tramite.id);
                                toast.success(`${file.name} subido exitosamente`);
                                
                                ofisolveApi.obtenerArchivosTramite(tramite.id)
                                  .then(docs => setArchivosPorTramite(prev => ({ ...prev, [tramite.id]: docs })))
                                  .catch(err => console.error(err));
                              } catch (error: any) {
                                toast.error(`Error al subir archivo: ${error.message}`);
                              }
                            }
                          }
                        }}
                        onClick={() => {
                          setTramiteActual(tramite);
                          // Cargar archivos al hacer click
                          if (!archivosPorTramite[tramite.id]) {
                            ofisolveApi.obtenerArchivosTramite(tramite.id)
                              .then(docs => setArchivosPorTramite(prev => ({ ...prev, [tramite.id]: docs })))
                              .catch(err => console.error(err));
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-all",
                          isTramiteSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                        )}
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate flex-1">{tramite.nombre}</span>
                        {archivos.length > 0 && (
                          <span className={cn(
                            "text-[9px] px-1 rounded-full font-bold",
                            isTramiteSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>{archivos.length}</span>
                        )}
                      </button>
                      {/* Archivos del trámite sin cliente */}
                      {isTramiteSelected && archivos.length > 0 && (
                        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-primary/20 pl-2 animate-in fade-in duration-200">
                          {archivos.map(archivo => (
                            <button
                              key={archivo.id}
                              onClick={async () => {
                              if (onAbrirDocumento) {
                                onAbrirDocumento(archivo);
                              } else {
                                try {
                                  await ofisolveApi.obtenerContenidoDocumento(archivo.id);
                                  toast.success(`Cargando ${archivo.nombre}`);
                                } catch(e) {
                                  toast.error("Error al cargar documento");
                                }
                              }
                            }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-all"
                            >
                              <FileText className="h-3 w-3 shrink-0 opacity-50" />
                              <span className="truncate">{archivo.nombre}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* SECCION DE ARCHIVADOS */}
      <div className="shrink-0 border-t border-border bg-muted/20">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex w-full items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5" />
            Expedientes Archivados
          </div>
          {showArchived ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
        
        {showArchived && (
          <div className="max-h-[200px] overflow-y-auto border-t border-border/50 bg-background/50 p-2 animate-in slide-in-from-bottom-2">
            {clientes.filter(c => tramites.some(t => t.clienteId === c.id && t.estado === 'archivado')).map(cliente => (
              <div key={`arch-${cliente.id}`} className="mb-2">
                <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">{cliente.nombre_completo}</div>
                <div className="ml-2 space-y-0.5">
                  {tramites.filter(t => t.clienteId === cliente.id && t.estado === 'archivado').map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTramiteActual(t)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/50 transition-colors",
                        tramiteActual?.id === t.id && "bg-accent text-foreground font-medium"
                      )}
                    >
                      <Lock className="h-2.5 w-2.5 opacity-50" />
                      <span className="truncate">{t.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {tramites.filter(t => !t.clienteId && t.estado === 'archivado').length > 0 && (
                <div className="mt-2">
                  <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Sin Cliente</div>
                  <div className="ml-2 space-y-0.5">
                      {tramites.filter(t => !t.clienteId && t.estado === 'archivado').map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTramiteActual(t)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/50",
                            tramiteActual?.id === t.id && "bg-accent text-foreground font-medium"
                          )}
                        >
                          <Lock className="h-2.5 w-2.5 opacity-50" />
                          <span className="truncate">{t.nombre}</span>
                        </button>
                      ))}
                  </div>
                </div>
            )}
            {tramites.filter(t => t.estado === 'archivado').length === 0 && (
              <div className="py-4 text-center text-[10px] text-muted-foreground italic">
                No hay expedientes archivados
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Escribanía Footer */}
      <div className="mt-auto border-t border-border p-4 bg-accent/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Scale className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{usuario?.escribaniaNombre}</p>
            <p className="text-[10px] text-muted-foreground truncate">Registro {usuario?.nroMatricula}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
