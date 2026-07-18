"use client";

import React, { useEffect, useState } from "react";
import { FileText, Loader2, Search, Star, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlantillasPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevaPlantilla, setNuevaPlantilla] = useState({
    nombre: "",
    categoria: "escritura",
    descripcion: "",
    contenido: "",
    es_favorito: false
  });

  const categorias = ["todas", "escritura", "certificacion", "poder", "acta", "otro"];

  const loading = wsLoading || dataLoading;

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setDataLoading(true);
      const data = await ofisolveApi.obtenerPlantillas(workspaceId);
      setPlantillas(data || []);
    } catch (err) {
      toast.error("Error al cargar la biblioteca de modelos");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevaPlantilla.nombre || !nuevaPlantilla.contenido) {
      toast.error("Nombre y contenido son obligatorios");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editandoId) {
        await ofisolveApi.actualizarPlantilla(workspaceId, editandoId, nuevaPlantilla);
        toast.success("Modelo actualizado");
      } else {
        await ofisolveApi.crearPlantilla(workspaceId, nuevaPlantilla);
        toast.success("Modelo guardado en la biblioteca");
      }
      setIsModalOpen(false);
      setNuevaPlantilla({ nombre: "", categoria: "escritura", descripcion: "", contenido: "", es_favorito: false });
      loadData();
    } catch (error) {
      toast.error("Error al guardar el modelo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditar = (p: any) => {
    setEditandoId(p.id);
    setNuevaPlantilla({
      nombre: p.nombre,
      categoria: p.categoria || "otro",
      descripcion: p.descripcion || "",
      contenido: p.contenido || "",
      es_favorito: p.es_favorito || false
    });
    setIsModalOpen(true);
  };

  const handleEliminar = async (id: number) => {
    if (!workspaceId || !confirm("¿Eliminar este modelo?")) return;
    try {
      await ofisolveApi.eliminarPlantilla(workspaceId, id);
      toast.success("Modelo eliminado");
      loadData();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const handleUsar = async (plantilla: any) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.usarPlantilla(workspaceId, plantilla.id);
      navigator.clipboard.writeText(plantilla.contenido);
      toast.success("Contenido copiado al portapapeles");
      loadData();
    } catch (error) {
      toast.error("Error al copiar");
    }
  };

  const toggleFavorito = async (plantilla: any) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.request(`/workspaces/${workspaceId}/plantillas/${plantilla.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ es_favorito: !plantilla.es_favorito })
      });
      loadData();
    } catch (error) {
      toast.error("Error al actualizar favorito");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const filtered = plantillas.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    const matchCat = filtroCategoria === "todas" || p.categoria === filtroCategoria;
    return matchBusqueda && matchCat;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Biblioteca de Modelos
          </h1>
          <p className="page-header-subtitle">
            Repositorio central de plantillas y modelos documentales notariables.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditandoId(null);
            setNuevaPlantilla({ nombre: "", categoria: "escritura", descripcion: "", contenido: "", es_favorito: false });
            setIsModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Modelo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categorias.map(cat => (
            <Badge
              key={cat}
              variant={filtroCategoria === cat ? "default" : "outline"}
              className="cursor-pointer capitalize px-3 py-1 text-xs"
              onClick={() => setFiltroCategoria(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid de plantillas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <EmptyState 
            icon={FileText}
            title="No se encontraron modelos"
            description="No hay plantillas que coincidan con la búsqueda."
            className="col-span-full"
          />
        ) : (
          filtered.map(p => (
            <div
              key={p.id}
              className="ds-card flex flex-col overflow-hidden group ds-transition hover:shadow-[var(--shadow-elevated)]"
            >
              {/* Cuerpo */}
              <div className="p-4 flex-1 border-b bg-muted/20">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize text-xs font-medium">
                      {p.categoria}
                    </Badge>
                    {p.uso_count > 10 && (
                      <span className="ds-badge-warning">Popular</span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleFavorito(p)}
                    className="text-muted-foreground hover:text-foreground ds-transition"
                    title={p.es_favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                  >
                    <Star className={`h-4 w-4 ${p.es_favorito ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <h3 className="font-semibold text-sm leading-snug mb-1.5 text-foreground line-clamp-2" title={p.nombre}>
                  {p.nombre}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3" title={p.descripcion}>
                  {p.descripcion || "Sin descripción"}
                </p>
              </div>

              {/* Footer de acciones */}
              <div className="px-4 py-2.5 bg-card flex gap-1 justify-end items-center">
                <span className="text-xs text-muted-foreground mr-auto">
                  Usado {p.uso_count} {p.uso_count === 1 ? 'vez' : 'veces'}
                </span>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleEditar(p)}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleEliminar(p.id)}
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-3 gap-1.5 ml-1 text-xs" onClick={() => handleUsar(p)}>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Modelo Documental" : "Nuevo Modelo Documental"}</DialogTitle>
            <DialogDescription>
              Añade una plantilla a la biblioteca. Usa [CORCHETES] para indicar campos a completar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3 space-y-2">
                <Label>Nombre del Modelo</Label>
                <Input
                  placeholder="Ej. Poder Especial Irrevocable"
                  value={nuevaPlantilla.nombre}
                  onChange={(e) => setNuevaPlantilla({...nuevaPlantilla, nombre: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                  value={nuevaPlantilla.categoria}
                  onChange={(e) => setNuevaPlantilla({...nuevaPlantilla, categoria: e.target.value})}
                >
                  <option value="escritura">Escritura</option>
                  <option value="certificacion">Certificación</option>
                  <option value="poder">Poder</option>
                  <option value="acta">Acta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción breve</Label>
              <Input
                placeholder="Para qué sirve o cuándo se usa este modelo"
                value={nuevaPlantilla.descripcion}
                onChange={(e) => setNuevaPlantilla({...nuevaPlantilla, descripcion: e.target.value})}
              />
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <Label>Contenido del Documento</Label>
              <Textarea
                placeholder="ESCRITURA NÚMERO [NUMERO]..."
                className="min-h-[280px] flex-1 font-mono text-sm leading-relaxed resize-none"
                value={nuevaPlantilla.contenido}
                onChange={(e) => setNuevaPlantilla({...nuevaPlantilla, contenido: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
