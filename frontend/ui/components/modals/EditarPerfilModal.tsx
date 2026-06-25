"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface EditarPerfilModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    nombre: string;
    email: string;
    telefono: string;
    nroMatricula: string;
    escribaniaNombre: string;
  };
  onSave: (datos: {
    nombre: string;
    email: string;
    telefono: string;
    nroMatricula: string;
    escribaniaNombre: string;
  }) => Promise<void>;
}

export function EditarPerfilModal({ open, onOpenChange, initialData, onSave }: EditarPerfilModalProps) {
  const [form, setForm] = useState(initialData);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData);
    }
  }, [open, initialData]);

  const handleSave = async () => {
    setGuardando(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información personal y datos de escribanía.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Nombre completo
            </label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Tu nombre"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Correo electrónico
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="tu@email.com"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Teléfono
            </label>
            <Input
              value={form.telefono}
              onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="+54 11 1234-5678"
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nro. Matrícula
              </label>
              <Input
                value={form.nroMatricula}
                onChange={(e) => setForm(prev => ({ ...prev, nroMatricula: e.target.value }))}
                placeholder="Ej: 4567"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Escribanía
              </label>
              <Input
                value={form.escribaniaNombre}
                onChange={(e) => setForm(prev => ({ ...prev, escribaniaNombre: e.target.value }))}
                placeholder="Ej: Registro 123"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={guardando}>
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
