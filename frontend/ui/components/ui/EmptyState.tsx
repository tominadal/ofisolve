import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  /** Icono Lucide a mostrar */
  icon: LucideIcon;
  /** Texto principal */
  title: string;
  /** Texto secundario opcional */
  description?: string;
  /** Texto del botón CTA opcional */
  actionLabel?: string;
  /** Handler del botón CTA */
  onAction?: () => void;
  /** Clase extra para el contenedor */
  className?: string;
}

/**
 * Estado vacío reutilizable para listas, tablas y grids.
 * Reemplaza el patrón repetido de "icono + mensaje + botón".
 *
 * @example
 * <EmptyState
 *   icon={Calendar}
 *   title="La agenda está vacía"
 *   description="No hay eventos agendados."
 *   actionLabel="Agendar Evento"
 *   onAction={() => setIsModalOpen(true)}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center text-muted-foreground ${className}`}>
      <Icon className="h-10 w-10 mb-3 opacity-20" />
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
