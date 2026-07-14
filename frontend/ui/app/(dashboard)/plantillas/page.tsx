"use client";

import React, { useEffect, useState } from "react";
import { 
  FileText, Loader2, Search, Star, Copy, Edit2, Plus, 
  Trash2, Filter
} from "lucide-react";
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

export default function PlantillasPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevaPlantilla, setNuevaPlantilla] = useState({
    nombre: "",
    categoria: "escritura",
    descripcion: "",
    contenido: "",
    es_favorito: false
  });

  const categorias = ["todas", "escritura", "certificacion", "poder", "acta", "otro"];

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
      const data = await ofisolveApi.obtenerPlantillas(workspaceId);
      setPlantillas(data || []);
    } catch (err) {
      toast.error("Error al cargar la biblioteca de modelos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevaPlantilla.nombre || !nuevaPlantilla.contenido) {
      toast.error("Nombre y contenido son obligatorios");
      return;
    }

    try {
      setIsSubmitting(true);
      await ofisolveApi.crearPlantilla(workspaceId, nuevaPlantilla);
      toast.success("Modelo guardado en la biblioteca");
      setIsModalOpen(false);
      setNuevaPlantilla({ nombre: "", categoria: "escritura", descripcion: "", contenido: "", es_favorito: false });
      loadData();
    } catch (error) {
      toast.error("Error al guardar el modelo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsar = async (plantilla: any) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.usarPlantilla(workspaceId, plantilla.id);
      navigator.clipboard.writeText(plantilla.contenido);
      toast.success("Contenido copiado al portapapeles");
      loadData(); // Actualiza contador de uso
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
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = plantillas.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                          (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    const matchCat = filtroCategoria === "todas" || p.categoria === filtroCategoria;
    return matchBusqueda && matchCat;
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-slate-800" />
            Biblioteca de Modelos
          </h2>
          <p className="text-muted-foreground">
            Repositorio central de plantillas y modelos documentales notariables.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Modelo
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o descripción..." 
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {categorias.map(cat => (
            <Badge 
              key={cat} 
              variant={filtroCategoria === cat ? "default" : "outline"}
              className="cursor-pointer capitalize px-3 py-1 text-sm"
              onClick={() => setFiltroCategoria(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p>No se encontraron modelos documentales.</p>
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="flex flex-col bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="p-5 border-b bg-slate-50/50 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-xs font-medium">
                      {p.categoria}
                    </Badge>
                    {p.uso_count > 10 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Popular</Badge>
                    )}
                  </div>
                  <button onClick={() => toggleFavorito(p)} className="text-gray-400 hover:text-amber-500 transition-colors">
                    <Star className={`h-5 w-5 ${p.es_favorito ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2 text-slate-800 line-clamp-2" title={p.nombre}>{p.nombre}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3" title={p.descripcion}>
                  {p.descripcion || "Sin descripción"}
                </p>
              </div>
              <div className="p-3 bg-slate-100 flex gap-2 justify-end items-center">
                <span className="text-xs text-muted-foreground mr-auto pl-2">
                  Usado {p.uso_count} {p.uso_count === 1 ? 'vez' : 'veces'}
                </span>
                <Button variant="outline" size="sm" className="h-8 px-3 gap-1 bg-white hover:bg-slate-50" onClick={() => handleUsar(p)}>
                  <Copy className="h-3.5 w-3.5" /> Copiar Texto
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nuevo Modelo Documental</DialogTitle>
            <DialogDescription>
              Añade una plantilla a la biblioteca. Usa [CORCHETES] para indicar campos a completar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 flex-1 overflow-y-auto pr-2">
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
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
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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
                className="min-h-[300px] flex-1 font-mono text-sm leading-relaxed"
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
