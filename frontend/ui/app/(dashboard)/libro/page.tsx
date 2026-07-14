"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Printer, Loader2 } from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function LibroRequerimientosPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [asientos, setAsientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const wsIdParam = urlParams.get('workspaceId');
        if (wsIdParam) {
          setWorkspaceId(Number(wsIdParam));
          return;
        }

        const workspaces = await ofisolveApi.obtenerWorkspaces();
        if (workspaces && workspaces.length > 0) {
          setWorkspaceId(Number(workspaces[0].id));
        }
      } catch(e) {
        console.error("Error loading workspaces", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadLibro() {
      if (!workspaceId) return;
      try {
        setLoading(true);
        const data = await ofisolveApi.obtenerLibroRequerimientos(workspaceId);
        setAsientos(data || []);
      } catch (err) {
        console.error("Error loading libro", err);
      } finally {
        setLoading(false);
      }
    }
    loadLibro();
  }, [workspaceId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 print:text-xl">
            <BookOpen className="h-8 w-8 print:hidden" />
            Libro de Requerimientos
          </h2>
          <p className="text-muted-foreground print:hidden">
            Asientos cronológicos de actuaciones y certificaciones de la escribanía.
          </p>
        </div>
        <Button onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Libro
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Correlativo</TableHead>
              <TableHead>Fecha Asiento</TableHead>
              <TableHead>Tipo de Acto</TableHead>
              <TableHead>Intervinientes</TableHead>
              <TableHead>Fojas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No hay asientos registrados en el libro.
                </TableCell>
              </TableRow>
            ) : (
              asientos.map((asiento) => (
                <TableRow key={asiento.id}>
                  <TableCell className="font-medium text-center">
                    {String(asiento.nro_correlativo).padStart(5, '0')}
                  </TableCell>
                  <TableCell>
                    {new Date(asiento.fecha_asiento).toLocaleDateString('es-AR', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>{asiento.tipo_acto}</TableCell>
                  <TableCell className="max-w-md truncate" title={asiento.intervinientes}>
                    {asiento.intervinientes}
                  </TableCell>
                  <TableCell>{asiento.fojas || "---"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Print-only footer for legal requirements */}
      <div className="hidden print:block mt-12 pt-8 border-t border-black text-center text-sm">
        <p>Firma y sello del Escribano Titular / Adscripto</p>
      </div>
    </div>
  );
}
