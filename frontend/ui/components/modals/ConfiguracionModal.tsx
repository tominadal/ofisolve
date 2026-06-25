"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Palette, User, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface ConfiguracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPerfil: () => void;
  onOpenContrasena: () => void;
}

export function ConfiguracionModal({ open, onOpenChange, onOpenPerfil, onOpenContrasena }: ConfiguracionModalProps) {
  const [tabConfiguracion, setTabConfiguracion] = React.useState("apariencia");
  const { theme, setTheme } = useTheme();
  const [notifPerm, setNotifPerm] = React.useState<NotificationPermission | "default">("default");

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleActivarNotificaciones = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const p = await Notification.requestPermission();
        setNotifPerm(p);
      } catch (e) {
        console.error("Error pidiendo permiso notificaciones:", e);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>
            Personaliza tu experiencia en OfiSolve.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tabConfiguracion} onValueChange={setTabConfiguracion}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="apariencia">
              <Palette className="mr-2 h-4 w-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="cuenta">
              <User className="mr-2 h-4 w-4" />
              Cuenta
            </TabsTrigger>
            <TabsTrigger value="notificaciones">
              <Bell className="mr-2 h-4 w-4" />
              Alertas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Apariencia */}
          <TabsContent value="apariencia" className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Tema oscuro</p>
                <p className="text-xs text-muted-foreground">
                  Cambia entre modo claro y oscuro
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Tab: Cuenta */}
          <TabsContent value="cuenta" className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Editar perfil</p>
                <p className="text-xs text-muted-foreground">
                  Actualiza tu nombre y datos
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenPerfil();
                }}
              >
                Editar
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Contraseña</p>
                <p className="text-xs text-muted-foreground">
                  Cambia tu contraseña
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenContrasena();
                }}
              >
                Cambiar
              </Button>
            </div>
          </TabsContent>

          {/* Tab: Notificaciones */}
          <TabsContent value="notificaciones" className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Notificaciones Push</p>
                <p className="text-xs text-muted-foreground">
                  Recibe alertas en tu navegador
                </p>
              </div>
              <Button 
                variant={notifPerm === 'granted' ? 'default' : 'outline'}
                size="sm" 
                onClick={handleActivarNotificaciones}
                disabled={notifPerm === 'granted'}
              >
                {notifPerm === 'granted' ? 'Activado' : notifPerm === 'denied' ? 'Denegado' : 'Activar'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
