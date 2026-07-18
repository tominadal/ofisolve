"use client";

import React, { useEffect, useState } from "react";
import { Brain, Trash2, Loader2, Save } from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MemoriaNotarialPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  const [reglas, setReglas] = useState<any[]>([]);
  const [nuevaRegla, setNuevaRegla] = useState("");
  const [agregando, setAgregando] = useState(false);

  const loading = wsLoading || dataLoading;

  const loadMemoria = async () => {
    if (!workspaceId) return;
    try {
      setDataLoading(true);
      const data = await ofisolveApi.obtenerMemoriaNotarial(workspaceId);
      setReglas(data || []);
    } catch (err) {
      toast.error("Error al cargar la memoria notarial");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadMemoria(); }, [workspaceId]);

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
    } catch (err) {
      toast.error("No se pudo eliminar la regla");
    }
  };

  return (
    <div className="page-container">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="page-header border-b pb-6">
          <div>
            <h1 className="page-header-title">
              <Brain className="h-5 w-5 text-muted-foreground" />
              Memoria Notarial (IA)
            </h1>
            <p className="page-header-subtitle">
              Define preferencias de redacción y formato que la IA aplicará en todos tus documentos.
            </p>
          </div>
        </div>

        {/* Agregar Regla */}
        <div className="ds-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Nueva Regla de Redacción</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ej: "Firma siempre al margen izquierdo", "Nunca abrevies CABA".
            </p>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Escribe una instrucción clara para la IA..."
              value={nuevaRegla}
              onChange={(e) => setNuevaRegla(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAgregar(); }}
            />
            <Button
              onClick={handleAgregar}
              disabled={agregando || !nuevaRegla.trim()}
              className="gap-2"
            >
              {agregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>

        {/* Tabla de Reglas */}
        <div className="ds-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Reglas Activas
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center p-10 min-h-[200px] items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reglas.length === 0 ? (
            <EmptyState 
              icon={Brain}
              title="La Memoria Notarial está vacía"
              description="La IA redactará utilizando los estándares notariales generales."
              className="border-0 shadow-none"
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="w-[80px] text-xs">ID</TableHead>
                    <TableHead className="text-xs">Preferencia / Regla</TableHead>
                    <TableHead className="w-[110px] text-xs">Categoría</TableHead>
                    <TableHead className="w-[60px] text-right text-xs">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reglas.map((regla) => (
                    <TableRow key={regla.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{regla.id}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {regla.preferencia}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] uppercase font-medium">
                          {regla.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleEliminar(regla.id)}
                          title="Eliminar regla"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
