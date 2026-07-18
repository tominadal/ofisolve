"use client";

import React, { useEffect, useState } from "react";
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Activity,
  Plus, Loader2, Download, Trash2
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
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";

export default function FinanzasPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [flujoCaja, setFlujoCaja] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo: "ingreso",
    monto: "",
    descripcion: "",
    fecha: new Date().toISOString().split('T')[0],
    categoria_id: "",
    cliente_id: "",
    proveedor_id: ""
  });

  const loading = wsLoading || dataLoading;

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setDataLoading(true);
      const [movData, resData, flujoData, catData, cliData, provData] = await Promise.all([
        ofisolveApi.obtenerMovimientos(workspaceId),
        ofisolveApi.obtenerResumenFinanciero(workspaceId),
        ofisolveApi.obtenerFlujoCaja(workspaceId, 6),
        ofisolveApi.obtenerCategoriasFinancieras(workspaceId),
        ofisolveApi.obtenerClientes(workspaceId),
        ofisolveApi.obtenerProveedores(workspaceId).catch(() => [])
      ]);
      setMovimientos(movData || []);
      setResumen(resData);
      setFlujoCaja(flujoData || []);
      setCategorias(catData || []);
      setClientes(cliData || []);
      setProveedores(provData || []);
    } catch (err) {
      toast.error("Error al cargar datos financieros");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workspaceId]);

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
        categoria_id: nuevoMovimiento.categoria_id ? Number(nuevoMovimiento.categoria_id) : undefined,
        cliente_id: nuevoMovimiento.cliente_id ? Number(nuevoMovimiento.cliente_id) : undefined,
        proveedor_id: nuevoMovimiento.proveedor_id ? Number(nuevoMovimiento.proveedor_id) : undefined,
      });
      toast.success("Movimiento registrado");
      setIsModalOpen(false);
      setNuevoMovimiento({
        tipo: "ingreso", monto: "", descripcion: "",
        fecha: new Date().toISOString().split('T')[0],
        categoria_id: "", cliente_id: "", proveedor_id: ""
      });
      loadData();
    } catch (error) {
      toast.error("No se pudo registrar el movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

  const handleExportarCSV = () => {
    if (movimientos.length === 0) { toast.error("No hay movimientos para exportar"); return; }
    const headers = ["ID", "Fecha", "Tipo", "Descripción", "Monto", "Estado"];
    const rows = movimientos.map(m => [
      m.id,
      new Date(m.fecha).toLocaleDateString('es-AR'),
      m.tipo,
      `"${(m.descripcion || "").replace(/"/g, '""')}"`,
      m.monto,
      m.estado
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `movimientos_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo CSV descargado");
  };

  const handleEliminar = async (id: number) => {
    if (!workspaceId || !confirm("¿Eliminar este movimiento?")) return;
    try {
      await ofisolveApi.eliminarMovimiento(workspaceId, id);
      toast.success("Movimiento eliminado");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  if (loading && !resumen) {
    return <PageLoader />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Finanzas y Flujo de Caja
          </h1>
          <p className="page-header-subtitle">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (Mes)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold ds-kpi-success tabular-nums">
              {formatCurrency(resumen?.total_ingresos || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos (Mes)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold ds-kpi-danger tabular-nums">
              {formatCurrency(resumen?.total_egresos || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Neto</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatCurrency(resumen?.saldo_neto || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente de Cobro</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold ds-kpi-warning tabular-nums">
              {formatCurrency(resumen?.pendiente_cobro || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y Movimientos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Flujo de Caja — Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flujoCaja} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: 600, color: 'var(--foreground)' }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontSize: 12
                    }}
                  />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="egresos"  name="Egresos"  stroke="var(--color-danger)"  strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-medium">Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Descripción</TableHead>
                  <TableHead className="text-right text-xs">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground text-sm">
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
                        {mov.categoria_nombre && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 mt-0.5">{mov.categoria_nombre}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-medium text-sm tabular-nums ${mov.tipo === 'ingreso' ? 'ds-kpi-success' : 'ds-kpi-danger'}`}>
                            {mov.tipo === 'ingreso' ? '+' : '−'}{formatCurrency(mov.monto)}
                          </span>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleEliminar(mov.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 hover:opacity-100 ds-transition"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
            <DialogDescription>Agregue un nuevo ingreso o egreso a la caja.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={nuevoMovimiento.tipo}
                  onValueChange={(val) => setNuevoMovimiento({...nuevoMovimiento, tipo: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
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
                type="number" placeholder="0.00"
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
                <SelectTrigger><SelectValue placeholder="Seleccione categoría" /></SelectTrigger>
                <SelectContent>
                  {categorias
                    .filter(c => c.tipo_default === nuevoMovimiento.tipo || !c.es_sistema)
                    .map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {nuevoMovimiento.tipo === 'ingreso' ? (
              <div className="space-y-2">
                <Label>Cliente (Opcional)</Label>
                <Select
                  value={nuevoMovimiento.cliente_id}
                  onValueChange={(val) => setNuevoMovimiento({...nuevoMovimiento, cliente_id: val, proveedor_id: ""})}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nombre_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Proveedor (Opcional)</Label>
                <Select
                  value={nuevoMovimiento.proveedor_id}
                  onValueChange={(val) => setNuevoMovimiento({...nuevoMovimiento, proveedor_id: val, cliente_id: ""})}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {proveedores.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nombre_fantasia || p.razon_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
