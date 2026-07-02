"use client";

import React, { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Trash2, X, MoreHorizontal, Check, Plus, Loader2, Copy, DownloadCloud, MessageSquare, FilePlus2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ofisolveApi } from "@/lib/api";
import { WelcomeHero } from "@/components/welcome-hero";
import { cn } from "@/lib/utils";
import { confirmToast, promptToast } from "@/lib/dialogs";
// @ts-ignore
import ReactMarkdown from "react-markdown";
// @ts-ignore
import remarkGfm from "remark-gfm";
import type { Tramite, ClienteResponse, MensajeChat, Usuario, EquipoMiembroResponse, DocumentoFuente } from "@/lib/types";

interface ChatAreaProps {
  clienteActual: ClienteResponse | null;
  tramiteActual: Tramite | null;
  documentoActual: DocumentoFuente | null;
  setTramiteActual: (t: Tramite | null) => void;
  usuario: Usuario | null;
  mensajesChat: MensajeChat[];
  setMensajesChat: (m: MensajeChat[] | ((prev: MensajeChat[]) => MensajeChat[])) => void;
  inputMensaje: string;
  setInputMensaje: (val: string) => void;
  enviarMensaje: () => void;
  enviandoMensaje: boolean;
  isStreaming: boolean;
  currentAgentNode: string | null;
  handleGuardarMensaje: (m: MensajeChat) => void;
  setDialogSubirDocumento: (val: boolean) => void;
  equipo: EquipoMiembroResponse[];
  miembroAsignado: EquipoMiembroResponse | null;
  setMiembroAsignado: (m: EquipoMiembroResponse | null) => void;
  handleEditarTramite: (t: Tramite) => void;
  handleDuplicarTramite: (t: Tramite) => void;
  handleExportarHistorial: (t: Tramite) => void;
  handleEliminarTramite: (t: Tramite) => void;
  formatearFecha: (d: string | Date) => string;
  getEstadoTramite: (estado?: string) => { label: string, variant: "default" | "secondary" | "destructive" | "outline" } | undefined;
  setIsNuevoClienteOpen: (val: boolean) => void;
  onExploreKnowledge: () => void;
  modoChat: "consultas" | "creador";
  setModoChat: (modo: "consultas" | "creador") => void;
}

const ChatAreaComponent = ({
  clienteActual,
  tramiteActual,
  documentoActual,
  setTramiteActual,
  usuario,
  mensajesChat,
  setMensajesChat,
  inputMensaje,
  setInputMensaje,
  enviarMensaje,
  enviandoMensaje,
  isStreaming,
  currentAgentNode,
  handleGuardarMensaje,
  setDialogSubirDocumento,
  equipo,
  miembroAsignado,
  setMiembroAsignado,
  handleEditarTramite,
  handleDuplicarTramite,
  handleExportarHistorial,
  handleEliminarTramite,
  formatearFecha,
  getEstadoTramite,
  setIsNuevoClienteOpen,
  onExploreKnowledge,
  modoChat,
  setModoChat,
}: ChatAreaProps) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [mensajesChat, isStreaming, currentAgentNode]);

  if (!clienteActual) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#fbfbfb]">
        <div className="w-full max-w-4xl">
          <WelcomeHero 
            userName={usuario?.nombre_completo || usuario?.nombre}
            onNewTramite={() => setIsNuevoClienteOpen(true)}
            onExploreKnowledge={onExploreKnowledge}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Subheader: Info del cliente actual y tramite si hay uno */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/50 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-foreground">
            {clienteActual.nombre_completo} {tramiteActual ? `> ${tramiteActual.nombre}` : ''}
          </h1>
          {tramiteActual && (
            <Badge variant={getEstadoTramite(tramiteActual?.estado)?.variant || 'secondary'} className="text-xs">
              {getEstadoTramite(tramiteActual?.estado)?.label || 'Borrador'}
            </Badge>
          )}
          
          {/* Selector de Asignación de Equipo */}
          <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3 group relative">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                >
                  {miembroAsignado ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {miembroAsignado.nombre}
                    </span>
                  ) : (
                    "Asignar a..."
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Miembros del Equipo
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {equipo.length > 0 ? (
                  equipo.map((miembro) => (
                    <DropdownMenuItem 
                      key={miembro.id}
                      onSelect={async () => {
                        if (!tramiteActual) { toast.error("Debe seleccionar una carpeta para asignar"); return; }
                        setMiembroAsignado(miembro)
                        try {
                          await ofisolveApi.actualizarTramite(tramiteActual.id, { asignado_a_id: miembro.id })
                          toast.success(`Tramite asignado a ${miembro.nombre}`)
                        } catch (error: any) {
                          toast.error("Error al persistir asignacion")
                        }
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{miembro.nombre}</span>
                        <span className="text-[10px] text-muted-foreground">{miembro.rol}</span>
                      </div>
                      {miembroAsignado?.id === miembro.id && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
                    Cargando equipo...
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-xs"
                  onClick={async () => {
                    const email = await promptToast("Ingrese el email del nuevo miembro a invitar al workspace:");
                    if (!email) return;
                    if (!email.includes('@')) {
                      toast.error("Por favor ingrese un email válido.");
                      return;
                    }
                    try {
                      await ofisolveApi.request("/workspaces/" + (clienteActual as any)?.workspace_id + "/equipo", {
                        method: "POST",
                        body: JSON.stringify({ nombre: email.split('@')[0], email, rol: "Empleado" })
                      });
                      toast.success(`Miembro ${email} agregado al equipo.`);
                    } catch {
                      toast.info(`Invitación a ${email} registrada. Se les notificará.`);
                    }
                  }}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Invitar al equipo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              if (!(await confirmToast("¿Estás seguro de que querés limpiar el historial de este cliente? Esta acción no se puede deshacer."))) return;
              setMensajesChat([]);
              // Limpiar historial en DB también
              if (clienteActual) ofisolveApi.limpiarHistorialChat(clienteActual.id).catch(() => {});
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar Chat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setTramiteActual(null)}
          >
            <X className="h-3.5 w-3.5" />
            Cerrar
          </Button>
          {tramiteActual && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditarTramite(tramiteActual)}>
                  Editar tramite
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleDuplicarTramite(tramiteActual)}>
                  Duplicar tramite
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleExportarHistorial(tramiteActual)}>
                  Exportar historial
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEliminarTramite(tramiteActual)} className="text-destructive focus:text-destructive cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Carpeta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Historial de Chat - Scrolleable */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
          {mensajesChat.map((mensaje, idx) => (
            <div
              key={mensaje.id}
              className={cn(
                "flex animate-premium-in",
                mensaje.tipo === "usuario" ? "justify-end" : "justify-start"
              )}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {mensaje.tipo === "usuario" ? (
                <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground sm:max-w-[75%] shadow-sm">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {mensaje.contenido}
                  </p>
                </div>
              ) : (
                <div className="max-w-[95%] sm:max-w-[85%]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-border shadow-sm overflow-hidden">
                      <img src="/logo-ofisolve.png" alt="AI" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="group flex-1">
                      <div className="relative prose prose-sm dark:prose-invert max-w-none text-foreground bg-card p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md prose-notarial">
                        {(enviandoMensaje || isStreaming) && idx === mensajesChat.length - 1 && !mensaje.contenido ? (
                          <div className="flex items-center gap-2 py-1">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {currentAgentNode || "Procesando..."}
                            </span>
                          </div>
                        ) : (
                          <>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {mensaje.contenido}
                            </ReactMarkdown>
                            
                            {/* Thinking indicator inside the bubble if still streaming */}
                            {isStreaming && idx === mensajesChat.length - 1 && (
                              <div className="mt-4 flex items-center gap-2 border-t border-border pt-2">
                                <div className="flex gap-1">
                                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '0ms' }} />
                                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '150ms' }} />
                                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                                  {currentAgentNode || "Generando..."}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                       </div>
                       
                       {/* Acciones del mensaje fuera de la burbuja */}
                       {!isStreaming && mensaje.contenido && (
                         <div className="mt-2 flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button
                             variant="ghost"
                             size="sm"
                             className="h-7 gap-1.5 rounded-full px-3 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                             onClick={() => {
                               navigator.clipboard.writeText(mensaje.contenido)
                               toast.success("Copiado al portapapeles")
                             }}
                           >
                             <Copy className="h-3 w-3" />
                             Copiar
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             className="h-7 gap-1.5 rounded-full px-3 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                             onClick={() => handleGuardarMensaje(mensaje)}
                           >
                             <DownloadCloud className="h-3 w-3" />
                             Guardar en Carpeta
                           </Button>
                         </div>
                       )}
                      
                      {mensaje.referencias && mensaje.referencias.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {mensaje.referencias.map((ref: any) => (
                            <button
                              key={ref.id}
                              className="inline-flex items-center rounded-lg bg-accent px-2 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                              onClick={() => toast.info(`Referencia: ${ref.texto}`)}
                            >
                              {ref.texto}
                            </button>
                          ))}
                        </div>
                      )}
                      <p suppressHydrationWarning className="mt-2 text-[10px] text-muted-foreground/50">
                        {formatearFecha(mensaje.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chips de Sugerencia e Input - Estetica Soberana */}
      <div className="shrink-0 p-4 sm:p-6 bg-gradient-to-t from-background to-transparent">
        <div className="mx-auto max-w-3xl">
          {/* Dynamic Suggestion Chips */}
          <div className="mb-3 flex flex-wrap gap-2 justify-center">
            {(!tramiteActual ? [
              "¿Qué trámites hay pendientes?",
              "Necesito validar un DNI"
            ] : tramiteActual.tipo === "Certificación de Firma" ? [
              "Verificar identidad RENAPER",
              "Redactar acta notarial",
              "¿Falta alguna firma?"
            ] : tramiteActual.tipo.includes("Poder") ? [
              "Revisar facultades otorgadas",
              "Validar apoderados",
              "Generar testimonio"
            ] : [
              "Resumir documentos",
              "Extraer entidades legales",
              "¿Hay alertas en este trámite?"
            ]).map((chip, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-[10px] bg-background/50 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-all"
                onClick={() => setInputMensaje(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>

          {/* Selector de Modo de IA */}
          <div className="mb-3 flex items-center justify-center">
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 ring-1 ring-border/50 shadow-inner">
              <button
                onClick={() => setModoChat("consultas")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all duration-200",
                  modoChat === "consultas"
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3 w-3" />
                Consultas
              </button>
              <button
                onClick={() => setModoChat("creador")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all duration-200",
                  modoChat === "creador"
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FilePlus2 className="h-3 w-3" />
                Crear Documento
              </button>
            </div>
            <span className="ml-3 text-[10px] text-muted-foreground hidden sm:block">
              {modoChat === "consultas"
                ? "Asesor de trámites y normativa"
                : "Redactor notarial formal"}
            </span>
          </div>

          <div className="chat-input-container flex items-end gap-3 rounded-[28px] border border-border bg-card p-2.5 px-4 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDialogSubirDocumento(true)}
              className="h-10 w-10 shrink-0 rounded-full hover:bg-accent text-muted-foreground"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => ofisolveApi.limpiarHistorialChat(documentoActual?.id || 0).then(() => setMensajesChat([]))}
              className="h-10 w-10 shrink-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title="Borrar chat"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            
            <form 
              className="flex-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                enviarMensaje();
              }}
            >
              <input
                type="text"
                placeholder={`Consultar sobre el cliente ${clienteActual.nombre_completo}...`}
                value={inputMensaje}
                onChange={(e) => setInputMensaje(e.target.value)}
                disabled={enviandoMensaje}
                className="w-full bg-transparent border-0 py-3 text-sm focus:ring-0 placeholder:text-muted-foreground/50 font-medium outline-none"
              />
              <Button
                size="icon"
                type="submit"
                disabled={!inputMensaje.trim() || enviandoMensaje}
                className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                {enviandoMensaje ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                )}
              </Button>
            </form>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3" /> IA Segura</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3" /> Confidencialidad Notarial</span>
          </div>
        </div>
      </div>
    </>
  );
}

export const ChatArea = React.memo(ChatAreaComponent);
