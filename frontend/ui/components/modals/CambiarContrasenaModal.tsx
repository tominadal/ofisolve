"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ofisolveApi } from "@/lib/api";

interface CambiarContrasenaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CambiarContrasenaModal({ open, onOpenChange }: CambiarContrasenaModalProps) {
  const [form, setForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [guardando, setGuardando] = useState(false);

  const handleSave = async () => {
    if (form.nueva !== form.confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    
    setGuardando(true);
    try {
      // Usar actualizarPerfil para la contraseña
      await ofisolveApi.actualizarPerfil({ password: form.nueva });
      toast.success("Contraseña actualizada correctamente");
      setForm({ actual: "", nueva: "", confirmar: "" });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error al cambiar contraseña: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Ingresa tu nueva contraseña (la actual no es requerida por ahora, pero la interfaz la incluye para completitud).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground">
              Contraseña actual (opcional por ahora)
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={form.actual}
                onChange={(e) => setForm(prev => ({ ...prev, actual: e.target.value }))}
                placeholder="********"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Nueva contraseña
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={form.nueva}
                onChange={(e) => setForm(prev => ({ ...prev, nueva: e.target.value }))}
                placeholder="********"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Confirmar nueva contraseña
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={form.confirmar}
                onChange={(e) => setForm(prev => ({ ...prev, confirmar: e.target.value }))}
                placeholder="********"
                className="pl-9"
              />
            </div>
            {form.nueva && form.confirmar && form.nueva !== form.confirmar && (
              <p className="mt-1.5 text-xs text-destructive">
                Las contraseñas no coinciden
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!form.nueva || form.nueva !== form.confirmar || guardando}
          >
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
