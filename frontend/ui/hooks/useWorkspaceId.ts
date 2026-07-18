"use client";

import { useState, useEffect } from "react";
import { ofisolveApi } from "@/lib/api";

/**
 * Hook para resolver el workspaceId actual.
 *
 * Prioridad:
 * 1. Query param `?workspaceId=N` de la URL actual
 * 2. Primer workspace disponible del usuario (API)
 *
 * Reemplaza el boilerplate de resolución de workspaceId
 * repetido textualmente en 8 páginas del dashboard.
 *
 * @example
 * const { workspaceId, loading: wsLoading } = useWorkspaceId();
 */
export function useWorkspaceId() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        // 1. Intentar leer desde la URL
        const urlParams = new URLSearchParams(window.location.search);
        const wsIdParam = urlParams.get("workspaceId");
        if (wsIdParam && !isNaN(Number(wsIdParam))) {
          if (!cancelled) {
            setWorkspaceId(Number(wsIdParam));
            setLoading(false);
          }
          return;
        }

        // 2. Fallback: primer workspace del usuario
        const workspaces = await ofisolveApi.obtenerWorkspaces();
        if (!cancelled) {
          if (workspaces?.length > 0) {
            setWorkspaceId(Number(workspaces[0].id));
          } else {
            setError("No se encontró ningún workspace");
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Error al obtener workspace");
          setLoading(false);
        }
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return { workspaceId, loading, error };
}
