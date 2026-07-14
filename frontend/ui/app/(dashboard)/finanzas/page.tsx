"use client";

import React, { useEffect, useState } from "react";
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Activity, 
  Plus, Loader2, Download, Search, Filter 
} from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FinanzasPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [flujoCaja, setFlujoCaja] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo: "ingreso",
    monto: "",
    descripcion: "",
    fecha: new Date().toISOString().split('T')[0],
    categoria_id: ""
  });

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

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [movData, resData, flujoData, catData] = await Promise.all([
        ofisolveApi.obtenerMovimientos(workspaceId),
        ofisolveApi.obtenerResumenFinanciero(workspaceId),
        ofisolveApi.obtenerFlujoCaja(workspaceId, 6), // Últimos 6 meses para el gráfico
        ofisolveApi.obtenerCategoriasFinancieras(workspaceId)
      ]);
      setMovimientos(movData || []);
      setResumen(resData);
      setFlujoCaja(flujoData || []);
      setCategorias(catData || []);
    } catch (err) {
      console.error("Error loading finance data", err);
      toast.error("Error al cargar datos financieros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleSubmit = async () => {
    if (!workspaceId || !nuevoMovimiento.monto || !nuevoMovimiento.descripcion) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    try {
      setIsSubmitting(true);
      await ofisolveApi.crearMovimiento(workspaceId, {
        ...nuevoMovimiento,
        monto: Number(nuevoMovimiento.monto),
        categoria_id: nuevoMovimiento.categoria_id ? Number(nuevoMovimiento.categoria_id) : undefined
      });
      toast.success("Movimiento registrado");
      setIsModalOpen(false);
      setNuevoMovimiento({
        tipo: "ingreso", monto: "", descripcion: "", 
        fecha: new Date().toISOString().split('T')[0], categoria_id: ""
      });
      loadData();
    } catch (error) {
      console.error("Error saving movement", error);
      toast.error("No se pudo registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  const handleExportarCSV = () => {
    if (movimientos.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }
    const headers = ["ID", "Fecha", "Tipo", "Descripción", "Monto", "Estado"];
    const rows = movimientos.map(m => [
      m.id,
      new Date(m.fecha).toLocaleDateString('es-AR'),
      m.tipo,
      m.descripcion,
      m.monto,
      m.estado
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `movimientos_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo CSV descargado");
  };

  if (loading && !resumen) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Finanzas y Flujo de Caja
          </h2>
          <p className="text-muted-foreground">
            Gestión de ingresos, egresos y proyecciones de la escribanía.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportarCSV}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos (Mes)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumen?.total_ingresos || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos (Mes)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(resumen?.total_egresos || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(resumen?.saldo_neto || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Cobro</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(resumen?.pendiente_cobro || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y Movimientos Recientes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Flujo de Caja (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flujoCaja} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value/1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Movimientos Table */}
        <Card className="col-span-3 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientos.slice(0, 10).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(mov.fecha).toLocaleDateString('es-AR')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-[150px]" title={mov.descripcion}>
                          {mov.descripcion}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {mov.categoria_nombre && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{mov.categoria_nombre}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal Nuevo Movimiento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              Agregue un nuevo ingreso o egreso a la caja.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={nuevoMovimiento.tipo} 
                  onValueChange={(val) => setNuevoMovimiento({...nuevoMovimiento, tipo: val})}
                >
                  <SelectTrigger className={nuevoMovimiento.tipo === 'ingreso' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso" className="text-green-600 font-medium">Ingreso</SelectItem>
                    <SelectItem value="egreso" className="text-red-600 font-medium">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input 
                  type="date" 
                  value={nuevoMovimiento.fecha}
                  onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, fecha: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={nuevoMovimiento.monto}
                onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, monto: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select 
                  value={nuevoMovimiento.categoria_id} 
                  onValueChange={(val) => setNuevoMovimiento({...nuevoMovimiento, categoria_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias
                      .filter(c => c.tipo_default === nuevoMovimiento.tipo || !c.es_sistema)
                      .map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nombre}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input 
                placeholder="Ej. Honorarios Compraventa Perez" 
                value={nuevoMovimiento.descripcion}
                onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, descripcion: e.target.value})}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
