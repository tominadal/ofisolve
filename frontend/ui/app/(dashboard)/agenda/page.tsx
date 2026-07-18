"use client";

import React, { useEffect, useState } from "react";
import { 
  Calendar, Plus, Loader2, Clock, AlertCircle, Users, CheckCircle2,
  Pencil, Trash2
} from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AgendaPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  
  const [eventos, setEventos] = useState<any[]>([]);
  const [vencimientos, setVencimientos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: "",
    tipo: "turno",
    fecha_inicio: new Date().toISOString().split('T')[0] + "T09:00",
    fecha_fin: new Date().toISOString().split('T')[0] + "T10:00",
    color: "#3B82F6",
    cliente_id: ""
  });

  const loading = wsLoading || dataLoading;

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setDataLoading(true);
      const [eveData, venData, cliData] = await Promise.all([
        ofisolveApi.obtenerEventos(workspaceId),
        ofisolveApi.obtenerVencimientos(workspaceId, 15),
        ofisolveApi.obtenerClientes(workspaceId)
      ]);
      setEventos(eveData || []);
      setVencimientos(venData || []);
      setClientes(cliData || []);
    } catch (err) {
      toast.error("Error al cargar agenda");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevoEvento.titulo) {
      toast.error("Complete el título del evento");
      return;
    }
    try {
      setIsSubmitting(true);
      const dataPayload = {
        ...nuevoEvento,
        fecha_inicio: new Date(nuevoEvento.fecha_inicio).toISOString(),
        fecha_fin: new Date(nuevoEvento.fecha_fin).toISOString(),
        cliente_id: nuevoEvento.cliente_id ? Number(nuevoEvento.cliente_id) : undefined
      };
      if (editandoId) {
        await ofisolveApi.actualizarEvento(workspaceId, editandoId, dataPayload);
        toast.success("Evento actualizado");
      } else {
        await ofisolveApi.crearEvento(workspaceId, dataPayload);
        toast.success("Evento agendado");
      }
      setIsModalOpen(false);
      setNuevoEvento({
        titulo: "", tipo: "turno",
        fecha_inicio: new Date().toISOString().split('T')[0] + "T09:00",
        fecha_fin: new Date().toISOString().split('T')[0] + "T10:00",
        color: "#3B82F6", cliente_id: ""
      });
      loadData();
    } catch (error) {
      toast.error("Error al guardar evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletar = async (id: number, current: boolean) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.actualizarEvento(workspaceId, id, { completado: !current });
      loadData();
    } catch (error) {
      toast.error("Error al actualizar evento");
    }
  };

  const handleEliminar = async (id: number) => {
    if (!workspaceId || !confirm("¿Eliminar este evento?")) return;
    try {
      await ofisolveApi.eliminarEvento(workspaceId, id);
      toast.success("Evento eliminado");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar evento");
    }
  };

  const handleEditar = (evento: any) => {
    const toLocalISO = (d: string) => {
      const date = new Date(d);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setEditandoId(evento.id);
    setNuevoEvento({
      titulo: evento.titulo,
      tipo: evento.tipo,
      fecha_inicio: toLocalISO(evento.fecha_inicio),
      fecha_fin: evento.fecha_fin ? toLocalISO(evento.fecha_fin) : toLocalISO(evento.fecha_inicio),
      color: evento.color || "#3B82F6",
      cliente_id: evento.cliente_id ? String(evento.cliente_id) : ""
    });
    setIsModalOpen(true);
  };

  /** Devuelve clases DS para el badge de tipo de evento */
  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'turno':       return 'ds-badge-info';
      case 'vencimiento': return 'ds-badge-warning';
      case 'audiencia':   return 'ds-badge-danger';
      case 'recordatorio': return 'ds-badge-danger';
      default:            return 'ds-badge-info';
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const eventosPorFecha: Record<string, any[]> = {};
  eventos.forEach(e => {
    const fecha = new Date(e.fecha_inicio).toLocaleDateString('es-AR');
    if (!eventosPorFecha[fecha]) eventosPorFecha[fecha] = [];
    eventosPorFecha[fecha].push(e);
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Agenda y Vencimientos
          </h1>
          <p className="page-header-subtitle">
            Gestione turnos, audiencias y alertas de vencimientos registrales.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditandoId(null);
            setNuevoEvento({
              titulo: "", tipo: "turno",
              fecha_inicio: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) + "T09:00",
              fecha_fin:    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) + "T10:00",
              color: "#3B82F6", cliente_id: ""
            });
            setIsModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Agendar Evento
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Panel de Vencimientos */}
        <div className="md:col-span-1 space-y-3">
          <div className="ds-panel-warning">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: 'var(--color-warning)' }}>
              <AlertCircle className="h-4 w-4" />
              Alertas de Vencimiento (15 días)
            </h3>
            {vencimientos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 italic">
                No hay vencimientos próximos.
              </p>
            ) : (
              <div className="space-y-2">
                {vencimientos.map(v => (
                  <div key={v.id} className="ds-card relative overflow-hidden group p-3">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l" style={{ backgroundColor: 'var(--color-warning)' }} />
                    <div className="flex justify-between items-start pl-3">
                      <div>
                        <div className="font-medium text-sm text-foreground">{v.titulo}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Vence: {new Date(v.fecha_inicio).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleCompletar(v.id, v.completado)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 ds-transition"
                        title="Marcar completado"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Listado de Agenda */}
        <div className="md:col-span-2 space-y-4">
          {Object.keys(eventosPorFecha).length === 0 ? (
            <EmptyState 
              icon={Calendar}
              title="No hay eventos próximos"
              description="La agenda está vacía para este workspace."
              className="bg-card border border-border rounded-lg"
            />
          ) : (
            Object.keys(eventosPorFecha).map(fecha => (
              <div key={fecha} className="space-y-2">
                <h4 className="section-label sticky top-0 bg-background/95 py-2 backdrop-blur z-10 border-b border-border pb-2">
                  {fecha}
                </h4>
                <div className="space-y-2">
                  {eventosPorFecha[fecha].map(e => (
                    <div
                      key={e.id}
                      className={`ds-card flex items-stretch overflow-hidden ds-transition hover:shadow-[var(--shadow-elevated)] ${e.completado ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: e.color || 'var(--color-info)' }} />
                      <div className="flex-1 p-4 flex justify-between items-center gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{e.titulo}</span>
                            <span className={getTipoBadgeClass(e.tipo)}>{e.tipo}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(e.fecha_inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              {!e.todo_el_dia && e.fecha_fin && (
                                <> — {new Date(e.fecha_fin).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</>
                              )}
                            </div>
                            {e.cliente_nombre && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {e.cliente_nombre}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleCompletar(e.id, e.completado)}
                            className={`h-8 w-8 ${e.completado ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            title="Marcar completado"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleEditar(e)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleEliminar(e.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Nuevo/Editar Evento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Evento" : "Agendar Evento"}</DialogTitle>
            <DialogDescription>
              Complete los datos del turno, audiencia o vencimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Ej. Firma Escritura Compraventa"
                value={nuevoEvento.titulo}
                onChange={(e) => setNuevoEvento({...nuevoEvento, titulo: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={nuevoEvento.tipo}
                  onValueChange={(val) => {
                    let color = "#3B82F6";
                    if (val === 'vencimiento') color = "#F59E0B";
                    if (val === 'audiencia')   color = "#8B5CF6";
                    if (val === 'recordatorio') color = "#EF4444";
                    setNuevoEvento({...nuevoEvento, tipo: val, color});
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turno">Turno / Reunión</SelectItem>
                    <SelectItem value="vencimiento">Vencimiento Registral</SelectItem>
                    <SelectItem value="audiencia">Audiencia</SelectItem>
                    <SelectItem value="recordatorio">Recordatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente (Opcional)</Label>
                <Select
                  value={nuevoEvento.cliente_id}
                  onValueChange={(val) => setNuevoEvento({...nuevoEvento, cliente_id: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input
                  type="datetime-local"
                  value={nuevoEvento.fecha_inicio}
                  onChange={(e) => setNuevoEvento({...nuevoEvento, fecha_inicio: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="datetime-local"
                  value={nuevoEvento.fecha_fin}
                  onChange={(e) => setNuevoEvento({...nuevoEvento, fecha_fin: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
