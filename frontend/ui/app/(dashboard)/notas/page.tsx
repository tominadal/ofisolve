"use client";

import React, { useEffect, useState } from "react";
import { StickyNote, Plus, Loader2, Pin, Users, User, Trash2, Pencil } from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Colores de las notas (post-it) — son datos del usuario,
 * se conservan pero se integran armónicamente con el DS.
 * El contenedor DS (fondo, bordes, sombras) viene de los tokens.
 */
const COLORES = [
  { value: "#FEF3C7", label: "Amarillo" },
  { value: "#DBEAFE", label: "Azul" },
  { value: "#FCE7F3", label: "Rosa" },
  { value: "#D1FAE5", label: "Verde" },
  { value: "#FEE2E2", label: "Rojo" },
];

export default function NotasPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  
  const [notas, setNotas] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevaNota, setNuevaNota] = useState({
    titulo: "",
    contenido: "",
    color: "#FEF3C7",
    visibilidad: "equipo",
    fijada: false
  });

  const loading = wsLoading || dataLoading;

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setDataLoading(true);
      const data = await ofisolveApi.obtenerNotas(workspaceId);
      setNotas(data || []);
    } catch (err) {
      toast.error("Error al cargar notas");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevaNota.titulo) {
      toast.error("El título es obligatorio");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editandoId) {
        await ofisolveApi.actualizarNota(workspaceId, editandoId, nuevaNota);
        toast.success("Nota actualizada");
      } else {
        await ofisolveApi.crearNota(workspaceId, nuevaNota);
        toast.success("Nota creada");
      }
      setIsModalOpen(false);
      setNuevaNota({ titulo: "", contenido: "", color: "#FEF3C7", visibilidad: "equipo", fijada: false });
      loadData();
    } catch (error) {
      toast.error("Error al guardar nota");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditar = (nota: any) => {
    setEditandoId(nota.id);
    setNuevaNota({
      titulo: nota.titulo,
      contenido: nota.contenido || "",
      color: nota.color || "#FEF3C7",
      visibilidad: nota.visibilidad || "equipo",
      fijada: nota.fijada || false
    });
    setIsModalOpen(true);
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
    return <PageLoader />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <StickyNote className="h-5 w-5 text-muted-foreground" />
            Notas Colaborativas
          </h1>
          <p className="page-header-subtitle">
            Muro compartido para recordatorios rápidos y anotaciones de la escribanía.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditandoId(null);
            setNuevaNota({ titulo: "", contenido: "", color: "#FEF3C7", visibilidad: "equipo", fijada: false });
            setIsModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Nota
        </Button>
      </div>

      {/* Muro de Notas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start">
        {notas.length === 0 ? (
          <EmptyState 
            icon={StickyNote}
            title="No hay notas en el muro"
            className="col-span-full"
          />
        ) : (
          notas.map(nota => (
            <div
              key={nota.id}
              className="relative rounded-lg overflow-hidden group ds-transition hover:-translate-y-0.5"
              style={{
                backgroundColor: nota.color,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Accion fijada — marcador en esquina superior */}
              {nota.fijada && (
                <div className="absolute top-0 right-0 p-2 group-hover:hidden">
                  <Pin className="h-3.5 w-3.5 fill-current opacity-50" />
                </div>
              )}

              {/* Acciones (hover) */}
              <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 ds-transition">
                <button
                  onClick={() => toggleFijar(nota)}
                  className="p-1.5 rounded-md hover:bg-black/10 ds-transition"
                  title={nota.fijada ? "Desfijar" : "Fijar al principio"}
                >
                  <Pin className={`h-3.5 w-3.5 ${nota.fijada ? 'fill-current opacity-70' : 'opacity-50'}`} />
                </button>
                <button
                  onClick={() => handleEditar(nota)}
                  className="p-1.5 rounded-md hover:bg-black/10 ds-transition"
                  title="Editar nota"
                >
                  <Pencil className="h-3.5 w-3.5 opacity-50" />
                </button>
                <button
                  onClick={() => eliminarNota(nota.id)}
                  className="p-1.5 rounded-md hover:bg-black/10 ds-transition"
                  title="Eliminar nota"
                >
                  <Trash2 className="h-3.5 w-3.5 opacity-50" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-4 pb-10">
                <h3 className="font-semibold text-sm text-gray-900 pr-16 mb-2 leading-snug">{nota.titulo}</h3>
                {nota.contenido && (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {nota.contenido}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2 flex justify-between items-center border-t border-black/5">
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  {nota.visibilidad === 'equipo'
                    ? <><Users className="h-3 w-3" /> Equipo</>
                    : <><User className="h-3 w-3" /> Personal</>
                  }
                </div>
                <div className="text-[10px] text-gray-500">
                  {new Date(nota.fecha_actualizacion).toLocaleDateString('es-AR')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Nota" : "Crear Nota"}</DialogTitle>
            <DialogDescription>Añade o modifica un recordatorio en el muro.</DialogDescription>
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
                className="min-h-[100px] resize-none"
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
                    className={`h-7 w-7 rounded-md border-2 ds-transition ${
                      nuevaNota.color === c.value
                        ? 'border-foreground/60 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value, boxShadow: 'var(--shadow-card)' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Visibilidad</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio" name="visibilidad" value="equipo"
                    checked={nuevaNota.visibilidad === 'equipo'}
                    onChange={(e) => setNuevaNota({...nuevaNota, visibilidad: e.target.value})}
                  />
                  Equipo
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio" name="visibilidad" value="personal"
                    checked={nuevaNota.visibilidad === 'personal'}
                    onChange={(e) => setNuevaNota({...nuevaNota, visibilidad: e.target.value})}
                  />
                  Personal
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
