"use client";

import React, { useEffect, useState } from "react";
import { Brain, Trash2, Plus, Loader2, Save } from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MemoriaNotarialPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [reglas, setReglas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaRegla, setNuevaRegla] = useState("");
  const [agregando, setAgregando] = useState(false);

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
      } catch(e) {
        console.error("Error loading workspaces", e);
      }
    }
    init();
  }, []);

  const loadMemoria = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const data = await ofisolveApi.obtenerMemoriaNotarial(workspaceId);
      setReglas(data || []);
    } catch (err) {
      console.error("Error loading memoria", err);
      toast.error("Error al cargar la memoria notarial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemoria();
  }, [workspaceId]);

  const handleAgregar = async () => {
    if (!nuevaRegla.trim() || !workspaceId) return;
    
    try {
      setAgregando(true);
      await ofisolveApi.agregarReglaMemoria(workspaceId, {
        preferencia: nuevaRegla,
        categoria: "estilo"
      });
      toast.success("Regla de estilo guardada correctamente");
      setNuevaRegla("");
      await loadMemoria();
    } catch (err) {
      console.error("Error saving rule", err);
      toast.error("Hubo un error al guardar la regla");
    } finally {
      setAgregando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.eliminarReglaMemoria(workspaceId, id);
      toast.success("Regla eliminada");
      await loadMemoria();
    } catch(err) {
      console.error("Error deleting rule", err);
      toast.error("No se pudo eliminar la regla");
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Brain className="h-6 w-6 text-purple-500" />
              Memoria Notarial (IA)
            </h1>
            <p className="text-sm text-muted-foreground">
              Define preferencias de redacción y formato que la IA aplicará automáticamente en todos tus documentos.
            </p>
          </div>
        </div>

        {/* Agregar Nueva Regla */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-medium">Nueva Regla de Redacción</h3>
            <p className="text-sm text-muted-foreground">
              Ej: "Firma siempre al margen izquierdo", "Nunca abrevies CABA".
            </p>
          </div>
          
          <div className="flex gap-4">
            <Input 
              placeholder="Escribe una instrucción clara para la IA..."
              value={nuevaRegla}
              onChange={(e) => setNuevaRegla(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if(e.key === 'Enter') handleAgregar();
              }}
            />
            <Button onClick={handleAgregar} disabled={agregando || !nuevaRegla.trim()} className="gap-2 bg-purple-600 hover:bg-purple-700">
              {agregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Regla
            </Button>
          </div>
        </div>

        {/* Tabla de Reglas Actuales */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-muted/50 border-b">
            <h3 className="font-medium text-sm text-foreground">Reglas Activas</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reglas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">La Memoria Notarial está vacía.</p>
              <p className="text-xs text-muted-foreground/70">La IA redactará utilizando los estándares notariales generales.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Preferencia / Regla</TableHead>
                  <TableHead className="w-[120px]">Categoría</TableHead>
                  <TableHead className="w-[80px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reglas.map((regla) => (
                  <TableRow key={regla.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{regla.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {regla.preferencia}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                        {regla.categoria.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleEliminar(regla.id)}
                        title="Eliminar regla"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
