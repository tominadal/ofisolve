"use client";

import React, { useEffect, useState } from "react";
import { 
  Calendar, Plus, Loader2, Clock, AlertCircle, Users, CheckCircle2,
  ChevronLeft, ChevronRight
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

export default function AgendaPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [eventos, setEventos] = useState<any[]>([]);
  const [vencimientos, setVencimientos] = useState<any[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: "",
    tipo: "turno",
    fecha_inicio: new Date().toISOString().split('T')[0] + "T09:00",
    fecha_fin: new Date().toISOString().split('T')[0] + "T10:00",
    color: "#3B82F6"
  });

  useEffect(() => {
    async function init() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const wsIdParam = urlParams.get('workspaceId');
        if (wsIdParam) {
          setWorkspaceId(Number(wsIdParam));
          return;
        }

        const workspaces = await ofisolveApi.obtenerWorkspaces();
        if (workspaces && workspaces.length > 0) {
          setWorkspaceId(Number(workspaces[0].id));
        }
      } catch (e) {
        console.error("Error loading workspaces", e);
      }
    }
    init();
  }, []);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [eveData, venData] = await Promise.all([
        ofisolveApi.obtenerEventos(workspaceId),
        ofisolveApi.obtenerVencimientos(workspaceId, 15) // Próximos 15 días
      ]);
      setEventos(eveData || []);
      setVencimientos(venData || []);
    } catch (err) {
      console.error("Error loading agenda", err);
      toast.error("Error al cargar agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevoEvento.titulo) {
      toast.error("Complete el título del evento");
      return;
    }

    try {
      setIsSubmitting(true);
      await ofisolveApi.crearEvento(workspaceId, {
        ...nuevoEvento,
        fecha_inicio: new Date(nuevoEvento.fecha_inicio).toISOString(),
        fecha_fin: new Date(nuevoEvento.fecha_fin).toISOString(),
      });
      toast.success("Evento agendado");
      setIsModalOpen(false);
      setNuevoEvento({
        titulo: "", tipo: "turno", 
        fecha_inicio: new Date().toISOString().split('T')[0] + "T09:00",
        fecha_fin: new Date().toISOString().split('T')[0] + "T10:00",
        color: "#3B82F6"
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

  const getTipoColor = (tipo: string) => {
    switch(tipo) {
      case 'turno': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'vencimiento': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'audiencia': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'recordatorio': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Agrupar eventos por fecha
  const eventosPorFecha: Record<string, any[]> = {};
  eventos.forEach(e => {
    const fecha = new Date(e.fecha_inicio).toLocaleDateString('es-AR');
    if (!eventosPorFecha[fecha]) eventosPorFecha[fecha] = [];
    eventosPorFecha[fecha].push(e);
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-indigo-600" />
            Agenda y Vencimientos
          </h2>
          <p className="text-muted-foreground">
            Gestione turnos, audiencias y alertas de vencimientos registrales.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Agendar Evento
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Próximos Vencimientos Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5" />
              Alertas de Vencimiento (15 días)
            </h3>
            
            {vencimientos.length === 0 ? (
              <p className="text-sm text-orange-600/70 text-center py-4 italic">
                No hay vencimientos próximos.
              </p>
            ) : (
              <div className="space-y-3">
                {vencimientos.map(v => (
                  <div key={v.id} className="bg-white rounded-lg p-3 border border-orange-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400" />
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{v.titulo}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Vence: {new Date(v.fecha_inicio).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" size="icon" 
                        onClick={() => handleCompletar(v.id, v.completado)}
                        className="h-6 w-6 text-gray-400 hover:text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Listado de Agenda (Próximos Días) */}
        <div className="md:col-span-2 space-y-4">
          {Object.keys(eventosPorFecha).length === 0 ? (
             <Card>
               <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                 <Calendar className="h-12 w-12 mb-4 opacity-20" />
                 <p>La agenda está vacía</p>
               </CardContent>
             </Card>
          ) : (
            Object.keys(eventosPorFecha).map(fecha => (
              <div key={fecha} className="space-y-3">
                <h4 className="font-bold text-sm text-muted-foreground sticky top-0 bg-background/95 py-2 backdrop-blur z-10 border-b">
                  {fecha}
                </h4>
                <div className="space-y-2">
                  {eventosPorFecha[fecha].map(e => (
                    <div key={e.id} className={`flex items-stretch bg-card rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${e.completado ? 'opacity-50 grayscale' : ''}`}>
                      <div className="w-2" style={{ backgroundColor: e.color || '#3B82F6' }} />
                      <div className="flex-1 p-4 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{e.titulo}</span>
                            <Badge variant="outline" className={`text-[10px] uppercase h-5 ${getTipoColor(e.tipo)}`}>
                              {e.tipo}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(e.fecha_inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              {!e.todo_el_dia && e.fecha_fin && (
                                <> - {new Date(e.fecha_fin).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</>
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
                        
                        <Button 
                          variant="ghost" 
                          onClick={() => handleCompletar(e.id, e.completado)}
                          className={e.completado ? "text-green-600 bg-green-50" : "text-muted-foreground hover:text-green-600 hover:bg-green-50"}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Nuevo Evento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agendar Evento</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={nuevoEvento.tipo} 
                  onValueChange={(val) => {
                    let color = "#3B82F6";
                    if (val === 'vencimiento') color = "#F59E0B";
                    if (val === 'audiencia') color = "#8B5CF6";
                    if (val === 'recordatorio') color = "#EF4444";
                    setNuevoEvento({...nuevoEvento, tipo: val, color});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turno">Turno / Reunión</SelectItem>
                    <SelectItem value="vencimiento">Vencimiento Registral</SelectItem>
                    <SelectItem value="audiencia">Audiencia</SelectItem>
                    <SelectItem value="recordatorio">Recordatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
