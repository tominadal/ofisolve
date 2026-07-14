"use client";

import React, { useEffect, useState } from "react";
import { 
  ShieldAlert, Loader2, Download, Search, AlertTriangle, ShieldCheck, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function UifPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [sujetosObligados, setSujetosObligados] = useState<any[]>([]);

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
      } catch (e) {
        console.error("Error loading workspaces", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!workspaceId) return;
      try {
        setLoading(true);
        const data = await ofisolveApi.obtenerSujetosUIF(workspaceId);
        setSujetosObligados(data || []);
      } catch (error) {
        console.error("Error loading UIF data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = sujetosObligados.filter(s => 
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    s.cuit.includes(busqueda)
  );

  const handleExportarCSV = () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const headers = ["ID", "Nombre", "CUIT", "Nivel Riesgo", "Ultima Revisión", "Estado", "Operaciones CUI"];
    const rows = filtered.map(s => [
      s.id,
      s.nombre,
      s.cuit,
      s.nivelRiesgo,
      new Date(s.ultimaRevision).toLocaleDateString('es-AR'),
      s.estado,
      s.operacionesCUI
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `matriz_uif_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Matriz exportada a CSV con éxito");
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-700" />
            Panel UIF / Prevención Lavado
          </h2>
          <p className="text-muted-foreground">
            Gestión de Sujetos Obligados, matrices de riesgo y Reportes de Operaciones Sospechosas (ROS).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={handleExportarCSV}>
            <Download className="h-4 w-4" />
            Exportar Matriz CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Sujetos Analizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{sujetosObligados.filter(s => s.estado === 'Aprobado' || s.nivelRiesgo === 'Bajo').length}</div>
            <p className="text-sm text-green-600/80 mt-1">Legajos al día</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{sujetosObligados.filter(s => s.estado === 'En Análisis' || s.nivelRiesgo === 'Medio').length}</div>
            <p className="text-sm text-amber-600/80 mt-1">Actualización de DDJJ pendiente</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              ROS Potenciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{sujetosObligados.filter(s => s.estado === 'Requiere ROS' || s.nivelRiesgo === 'Alto' || s.operacionesCUI > 3).length}</div>
            <p className="text-sm text-red-600/80 mt-1">Superan umbral sin justificación</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de Riesgo Clientes</CardTitle>
          <CardDescription>
            Listado de clientes con su perfilamiento de riesgo según resoluciones de la UIF.
          </CardDescription>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o CUIT..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CUIT/CUIL</TableHead>
                  <TableHead>Nivel de Riesgo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Ops. Efectivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{s.cuit}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        s.nivelRiesgo === 'Bajo' ? 'bg-green-50 text-green-700 border-green-200' :
                        s.nivelRiesgo === 'Medio' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }>
                        {s.nivelRiesgo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={s.estado.includes('ROS') ? 'bg-red-100 text-red-800' : ''}>
                        {s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={s.operacionesCUI > 3 ? "text-red-600 font-bold" : "text-gray-500"}>
                        {s.operacionesCUI}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <FileText className="h-3.5 w-3.5" /> Legajo UIF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
