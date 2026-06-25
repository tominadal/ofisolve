"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ofisolveApi } from "@/lib/api";

interface NuevoWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (nuevoWorkspace: any) => void;
}

export function NuevoWorkspaceModal({ open, onOpenChange, onSuccess }: NuevoWorkspaceModalProps) {
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);

  const handleSave = async () => {
    setGuardando(true);
    try {
      const nuevo = await ofisolveApi.crearWorkspace(form);
      toast.success("Workspace creado correctamente");
      setForm({ nombre: "", descripcion: "" });
      onOpenChange(false);
      onSuccess(nuevo);
    } catch (error: any) {
      toast.error(`Error al crear workspace: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>Nuevo Workspace</DialogTitle>
          <DialogDescription>
            Crea un nuevo espacio de trabajo para organizar tus trámites.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Nombre del workspace
            </label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Certificaciones 2026"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Descripción (opcional)
            </label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Describe el propósito de este workspace"
              className="mt-1.5"
            />
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
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Crear Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
