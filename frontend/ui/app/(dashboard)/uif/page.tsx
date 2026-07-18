"use client";

import React, { useEffect, useState } from "react";
import { 
  ShieldAlert, Loader2, Download, Search, AlertTriangle, ShieldCheck, FileText
} from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";

export default function UifPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [sujetosObligados, setSujetosObligados] = useState<any[]>([]);

  const loading = wsLoading || dataLoading;

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return;
      try {
        setDataLoading(true);
        const data = await ofisolveApi.obtenerSujetosUIF(workspaceId);
        setSujetosObligados(data || []);
      } catch (error) {
        console.error("Error loading UIF data", error);
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [workspaceId]);

  if (loading) {
    return <PageLoader />;
  }

  const filtered = sujetosObligados.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.cuit.includes(busqueda)
  );

  const handleExportarCSV = () => {
    if (filtered.length === 0) { toast.error("No hay datos para exportar"); return; }
    const headers = ["ID", "Nombre", "CUIT", "Nivel Riesgo", "Ultima Revisión", "Estado", "Operaciones CUI"];
    const rows = filtered.map(s => [
      s.id,
      `"${(s.nombre || "").replace(/"/g, '""')}"`,
      s.cuit, s.nivelRiesgo,
      new Date(s.ultimaRevision).toLocaleDateString('es-AR'),
      s.estado, s.operacionesCUI
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `matriz_uif_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Matriz exportada a CSV con éxito");
  };

  /** Badge de nivel de riesgo usando clases DS */
  const getRiesgoBadge = (nivel: string) => {
    if (nivel === 'Bajo')  return <span className="ds-badge-success">{nivel}</span>;
    if (nivel === 'Medio') return <span className="ds-badge-warning">{nivel}</span>;
    return <span className="ds-badge-danger">{nivel}</span>;
  };

  const analizados  = sujetosObligados.filter(s => s.estado === 'Aprobado' || s.nivelRiesgo === 'Bajo').length;
  const atencion    = sujetosObligados.filter(s => s.estado === 'En Análisis' || s.nivelRiesgo === 'Medio').length;
  const rosPotencial = sujetosObligados.filter(s => s.estado === 'Requiere ROS' || s.nivelRiesgo === 'Alto' || s.operacionesCUI > 3).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            Panel UIF / Prevención de Lavado
          </h1>
          <p className="page-header-subtitle">
            Gestión de Sujetos Obligados, matrices de riesgo y Reportes de Operaciones Sospechosas (ROS).
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportarCSV}>
          <Download className="h-4 w-4" />
          Exportar Matriz CSV
        </Button>
      </div>

      {/* KPI Cards — semántica de estado */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Sujetos Analizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold ds-kpi-success tabular-nums">{analizados}</div>
            <p className="text-xs text-muted-foreground mt-1">Legajos al día</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold ds-kpi-warning tabular-nums">{atencion}</div>
            <p className="text-xs text-muted-foreground mt-1">Actualización de DDJJ pendiente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              ROS Potenciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold ds-kpi-danger tabular-nums">{rosPotencial}</div>
            <p className="text-xs text-muted-foreground mt-1">Superan umbral sin justificación</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Riesgo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Matriz de Riesgo de Clientes</CardTitle>
          <CardDescription className="text-xs">
            Listado de clientes con perfilamiento de riesgo según resoluciones de la UIF.
          </CardDescription>
          <div className="mt-3 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o CUIT..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">CUIT/CUIL</TableHead>
                <TableHead className="text-xs">Nivel de Riesgo</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-center text-xs">Ops. Efectivo</TableHead>
                <TableHead className="text-right text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-sm">
                    No hay sujetos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.nombre}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{s.cuit}</TableCell>
                    <TableCell>{getRiesgoBadge(s.nivelRiesgo)}</TableCell>
                    <TableCell>
                      <span className={s.estado.includes('ROS') ? 'ds-badge-danger' : 'ds-badge-info'}>
                        {s.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-medium ${s.operacionesCUI > 3 ? 'ds-kpi-danger' : 'text-muted-foreground'}`}>
                        {s.operacionesCUI}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                        <FileText className="h-3.5 w-3.5" />
                        Legajo UIF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
