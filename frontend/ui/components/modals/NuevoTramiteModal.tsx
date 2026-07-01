"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ofisolveApi } from "@/lib/api";
import { TIPOS_DOCUMENTOS_GENERABLES } from "@/lib/constants";

interface NuevoTramiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number | undefined;
  clienteId?: number | undefined;
  onSuccess: (nuevoTramite: any) => void;
  initialData?: { nombre: string, tipo: string };
}

export function NuevoTramiteModal({ open, onOpenChange, workspaceId, clienteId, onSuccess, initialData }: NuevoTramiteModalProps) {
  const [form, setForm] = useState({ nombre: "", tipo: "" });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({ nombre: "", tipo: "" });
      }
    }
  }, [open, initialData]);

  const handleSave = async () => {
    if (!workspaceId) {
      toast.error("Debe seleccionar un workspace primero");
      return;
    }
    
    setGuardando(true);
    try {
      const nuevo = await ofisolveApi.crearTramite(workspaceId, {
        nombre: form.nombre,
        tipo: form.tipo,
        cliente_id: clienteId
      });
      toast.success("Trámite creado correctamente");
      onOpenChange(false);
      onSuccess(nuevo);
    } catch (error: any) {
      toast.error(`Error al crear trámite: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Trámite" : "Nuevo Trámite"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modifica los detalles del trámite." : "Crea un nuevo trámite en el workspace actual."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Nombre del trámite
            </label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Certificación de Firma - Rodriguez"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Tipo de trámite
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="mt-1.5 w-full justify-between">
                  {form.tipo || "Seleccionar tipo"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full h-48 overflow-y-auto">
                {TIPOS_DOCUMENTOS_GENERABLES.map((tipoDoc) => (
                  <DropdownMenuItem 
                    key={tipoDoc.id} 
                    onClick={() => setForm(prev => ({ ...prev, tipo: tipoDoc.nombre }))}
                  >
                    {tipoDoc.nombre}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!form.nombre.trim() || guardando}
          >
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar Trámite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
