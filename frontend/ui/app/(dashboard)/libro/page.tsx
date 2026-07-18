"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Printer, Loader2 } from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";

export default function LibroRequerimientosPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  const [asientos, setAsientos] = useState<any[]>([]);

  const loading = wsLoading || dataLoading;

  useEffect(() => {
    async function loadLibro() {
      if (!workspaceId) return;
      try {
        setDataLoading(true);
        const data = await ofisolveApi.obtenerLibroRequerimientos(workspaceId);
        setAsientos(data || []);
      } catch (err) {
        console.error("Error loading libro", err);
      } finally {
        setDataLoading(false);
      }
    }
    loadLibro();
  }, [workspaceId]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title print:text-lg">
            <BookOpen className="h-5 w-5 text-muted-foreground print:hidden" />
            Libro de Requerimientos
          </h1>
          <p className="page-header-subtitle print:hidden">
            Asientos cronológicos de actuaciones y certificaciones de la escribanía.
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 print:hidden">
          <Printer className="h-4 w-4" />
          Imprimir Libro
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[100px] text-xs">Correlativo</TableHead>
              <TableHead className="text-xs">Fecha Asiento</TableHead>
              <TableHead className="text-xs">Tipo de Acto</TableHead>
              <TableHead className="text-xs">Intervinientes</TableHead>
              <TableHead className="text-xs">Fojas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-sm">
                  No hay asientos registrados en el libro.
                </TableCell>
              </TableRow>
            ) : (
              asientos.map((asiento) => (
                <TableRow key={asiento.id}>
                  <TableCell className="font-mono text-sm font-medium text-center">
                    {String(asiento.nro_correlativo).padStart(5, '0')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(asiento.fecha_asiento).toLocaleDateString('es-AR', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-sm">{asiento.tipo_acto}</TableCell>
                  <TableCell className="max-w-md truncate text-sm" title={asiento.intervinientes}>
                    {asiento.intervinientes}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{asiento.fojas || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer para impresión */}
      <div className="hidden print:block mt-12 pt-8 border-t border-black text-center text-sm">
        <p>Firma y sello del Escribano Titular / Adscripto</p>
      </div>
    </div>
  );
}
