"use client";

import React, { useEffect, useState } from "react";
import { 
  StickyNote, Plus, Loader2, Pin, Users, User, Trash2
} from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NotasPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [notas, setNotas] = useState<any[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevaNota, setNuevaNota] = useState({
    titulo: "",
    contenido: "",
    color: "#FEF3C7", // Amarillo post-it por defecto
    visibilidad: "equipo",
    fijada: false
  });

  const COLORES = [
    { value: "#FEF3C7", label: "Amarillo" },
    { value: "#DBEAFE", label: "Azul" },
    { value: "#FCE7F3", label: "Rosa" },
    { value: "#D1FAE5", label: "Verde" },
    { value: "#FEE2E2", label: "Rojo" },
  ];

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
      const data = await ofisolveApi.obtenerNotas(workspaceId);
      setNotas(data || []);
    } catch (err) {
      toast.error("Error al cargar notas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevaNota.titulo) {
      toast.error("El título es obligatorio");
      return;
    }

    try {
      setIsSubmitting(true);
      await ofisolveApi.crearNota(workspaceId, nuevaNota);
      toast.success("Nota creada");
      setIsModalOpen(false);
      setNuevaNota({ titulo: "", contenido: "", color: "#FEF3C7", visibilidad: "equipo", fijada: false });
      loadData();
    } catch (error) {
      toast.error("Error al guardar nota");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFijar = async (nota: any) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.actualizarNota(workspaceId, nota.id, { fijada: !nota.fijada });
      loadData();
    } catch (error) {
      toast.error("Error al actualizar nota");
    }
  };

  const eliminarNota = async (id: number) => {
    if (!workspaceId || !confirm("¿Eliminar esta nota?")) return;
    try {
      await ofisolveApi.eliminarNota(workspaceId, id);
      toast.success("Nota eliminada");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <StickyNote className="h-8 w-8 text-amber-500" />
            Notas Colaborativas
          </h2>
          <p className="text-muted-foreground">
            Muro compartido para recordatorios rápidos y anotaciones de la escribanía.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4" />
          Nueva Nota
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start">
        {notas.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <StickyNote className="h-16 w-16 mb-4 opacity-20" />
            <p>No hay notas en el muro.</p>
          </div>
        ) : (
          notas.map(nota => (
            <div 
              key={nota.id} 
              className="relative p-5 rounded-xl shadow-md border hover:shadow-lg transition-all group hover:-translate-y-1"
              style={{ backgroundColor: nota.color, borderColor: 'rgba(0,0,0,0.05)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-gray-900 pr-8">{nota.titulo}</h3>
                <div className="flex gap-1 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => toggleFijar(nota)}
                    className="p-1.5 hover:bg-black/10 rounded-full transition-colors"
                    title={nota.fijada ? "Desfijar" : "Fijar al principio"}
                  >
                    <Pin className={`h-4 w-4 ${nota.fijada ? 'fill-gray-900' : 'text-gray-600'}`} />
                  </button>
                  <button 
                    onClick={() => eliminarNota(nota.id)}
                    className="p-1.5 hover:bg-black/10 hover:text-red-600 rounded-full transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {nota.fijada && <Pin className="h-4 w-4 fill-gray-900 absolute top-4 right-4 group-hover:hidden" />}
              </div>
              
              {nota.contenido && (
                <p className="text-gray-700 text-sm whitespace-pre-wrap mb-6">
                  {nota.contenido}
                </p>
              )}
              
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-xs text-gray-500 font-medium">
                <div className="flex items-center gap-1 opacity-70">
                  {nota.visibilidad === 'equipo' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {nota.visibilidad === 'equipo' ? 'Equipo' : 'Personal'}
                </div>
                <div className="opacity-70">
                  {new Date(nota.fecha_actualizacion).toLocaleDateString('es-AR')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nota</DialogTitle>
            <DialogDescription>Añade un recordatorio al muro.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                placeholder="Ej. Llamar al Colegio" 
                value={nuevaNota.titulo}
                onChange={(e) => setNuevaNota({...nuevaNota, titulo: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea 
                placeholder="Detalles de la nota..." 
                className="min-h-[100px]"
                value={nuevaNota.contenido}
                onChange={(e) => setNuevaNota({...nuevaNota, contenido: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNuevaNota({...nuevaNota, color: c.value})}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${nuevaNota.color === c.value ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105 shadow-sm'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-white">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
