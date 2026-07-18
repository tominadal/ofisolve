import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  /** Tamaño del spinner. Por defecto: 6 (h-6 w-6) */
  size?: 4 | 6 | 8;
}

/**
 * Loader centrado para páginas del dashboard.
 * Reemplaza el patrón repetido:
 *   <div className="flex h-full items-center justify-center">
 *     <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
 *   </div>
 */
export function PageLoader({ size = 6 }: PageLoaderProps) {
  const sizeClass = size === 4 ? "h-4 w-4" : size === 8 ? "h-8 w-8" : "h-6 w-6";
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className={`${sizeClass} animate-spin text-muted-foreground`} />
    </div>
  );
}
