"use client";

import React, { useEffect, useState } from "react";
import { 
  Calculator, Plus, Loader2, Download, Send, Building2
} from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { PageLoader } from "@/components/ui/PageLoader";

export default function PresupuestosPage() {
  const { workspaceId, loading: wsLoading } = useWorkspaceId();
  const [dataLoading, setDataLoading] = useState(true);
  
  const [presupuestos, setPresupuestos] = useState<any[]>([]);
  const [aranceles, setAranceles] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({
    titulo: "",
    tipo_acto: "",
    monto_operacion: "",
    cliente_id: "",
    items: [] as any[]
  });
  const [montoCalculo, setMontoCalculo] = useState("");
  const [tipoActoCalculo, setTipoActoCalculo] = useState("compraventa");
  const [calculando, setCalculando] = useState(false);

  const loading = wsLoading || dataLoading;

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setDataLoading(true);
      const [presData, aranData, cliData] = await Promise.all([
        ofisolveApi.obtenerPresupuestos(workspaceId),
        ofisolveApi.obtenerAranceles(workspaceId),
        ofisolveApi.obtenerClientes(workspaceId)
      ]);
      setPresupuestos(presData || []);
      setAranceles(aranData || []);
      setClientes(cliData || []);
    } catch (err) {
      toast.error("Error al cargar presupuestos");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [workspaceId]);

  const handleCalcular = async () => {
    if (!workspaceId || !montoCalculo) return;
    try {
      setCalculando(true);
      const res = await ofisolveApi.calcularAranceles(workspaceId, tipoActoCalculo, Number(montoCalculo));
      setNuevoPresupuesto({
        ...nuevoPresupuesto,
        tipo_acto: res.tipo_acto,
        monto_operacion: res.monto_operacion.toString(),
        items: res.items
      });
      toast.success("Aranceles calculados automáticamente");
    } catch (err) {
      toast.error("Error al calcular aranceles");
    } finally {
      setCalculando(false);
    }
  };

  const handleSubmit = async () => {
    if (!workspaceId || !nuevoPresupuesto.titulo || !nuevoPresupuesto.tipo_acto) {
      toast.error("Complete el título y el tipo de acto");
      return;
    }
    try {
      setIsSubmitting(true);
      await ofisolveApi.crearPresupuesto(workspaceId, {
        ...nuevoPresupuesto,
        monto_operacion: Number(nuevoPresupuesto.monto_operacion) || 0,
        cliente_id: nuevoPresupuesto.cliente_id ? Number(nuevoPresupuesto.cliente_id) : undefined
      });
      toast.success("Presupuesto creado");
      setIsModalOpen(false);
      setNuevoPresupuesto({ titulo: "", tipo_acto: "", monto_operacion: "", cliente_id: "", items: [] });
      loadData();
    } catch (error) {
      toast.error("Error al guardar presupuesto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

  /** Badge de estado usando clases DS */
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'borrador':  return <span className="ds-badge-info">Borrador</span>;
      case 'enviado':   return <span className="ds-badge-info">Enviado</span>;
      case 'aceptado':  return <span className="ds-badge-success">Aceptado</span>;
      case 'rechazado': return <span className="ds-badge-danger">Rechazado</span>;
      default:          return <span className="ds-badge-info">{estado}</span>;
    }
  };

  const enviarWhatsApp = (p: any) => {
    const texto = `Hola! Te envío el presupuesto para la operación de ${p.tipo_acto}. El total estimado es de ${formatCurrency(p.total)}. Saludos!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleEstadoCambio = async (id: number, estado: string) => {
    if (!workspaceId) return;
    try {
      await ofisolveApi.actualizarEstadoPresupuesto(workspaceId, id, { estado });
      toast.success("Estado actualizado");
      loadData();
    } catch (e) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleExportarPDF = async (p: any) => {
    toast.info("Generando PDF...");
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: Inter, sans-serif; color: #1a1a1d;">
        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Presupuesto Notarial</h1>
          <p style="color: #6b7280; margin-top: 4px; font-size: 13px;">Fecha: ${new Date(p.fecha_creacion).toLocaleDateString('es-AR')}</p>
        </div>
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${p.titulo}</h2>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Tipo de Operación:</strong> ${p.tipo_acto}</p>
          ${p.cliente_nombre ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Cliente:</strong> ${p.cliente_nombre}</p>` : ''}
          ${p.monto_operacion > 0 ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Monto Base:</strong> ${formatCurrency(p.monto_operacion)}</p>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Concepto</th>
              <th style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${(p.items || []).map((i: any) => `
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">${i.concepto}</td>
                <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(i.monto)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 12px; text-align: right; font-weight: 700; font-size: 15px;">TOTAL</td>
              <td style="padding: 12px; text-align: right; font-weight: 700; font-size: 15px;">${formatCurrency(p.total)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top: 50px; text-align: center; color: #9ca3af; font-size: 11px;">
          <p>Documento generado por OfiSolve — ERP Notarial</p>
        </div>
      </div>
    `;
    html2pdf().set({
      margin: 0,
      filename: `Presupuesto_${p.titulo.replace(/ /g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Presupuestador
          </h1>
          <p className="page-header-subtitle">
            Cálculo automático de aranceles, sellos y honorarios notariales.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs">Título</TableHead>
              <TableHead className="text-xs">Operación</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-right text-xs">Total</TableHead>
              <TableHead className="text-center text-xs w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presupuestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-sm">
                  No hay presupuestos generados
                </TableCell>
              </TableRow>
            ) : (
              presupuestos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">
                    {p.titulo}
                    {p.cliente_nombre && (
                      <div className="text-xs text-muted-foreground">Cliente: {p.cliente_nombre}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.tipo_acto}
                    </div>
                    {p.monto_operacion > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Base: {formatCurrency(p.monto_operacion)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={p.estado} onValueChange={(val) => handleEstadoCambio(p.id, val)}>
                      <SelectTrigger className="h-8 w-32 border-0 bg-transparent p-0 focus:ring-0">
                        {getStatusBadge(p.estado)}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="aceptado">Aceptado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.fecha_creacion).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm tabular-nums">
                    {formatCurrency(p.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost" size="icon" title="Exportar PDF"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleExportarPDF(p)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" title="Enviar WhatsApp"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => enviarWhatsApp(p)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle>Generar Presupuesto</DialogTitle>
              <DialogDescription>
                Utilice la calculadora automática o agregue ítems manualmente.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Calculadora */}
              <div className="bg-muted/40 p-4 rounded-lg border space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Calculadora Automática
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo de Acto</Label>
                    <Select value={tipoActoCalculo} onValueChange={setTipoActoCalculo}>
                      <SelectTrigger className="bg-background h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compraventa">Compraventa</SelectItem>
                        <SelectItem value="hipoteca">Hipoteca</SelectItem>
                        <SelectItem value="donacion">Donación</SelectItem>
                        <SelectItem value="todos">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Monto Operación ($)</Label>
                    <Input
                      type="number" className="bg-background h-9"
                      value={montoCalculo}
                      onChange={(e) => setMontoCalculo(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCalcular} disabled={calculando}
                    variant="secondary" size="sm" className="h-9"
                  >
                    {calculando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                  </Button>
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título del Presupuesto</Label>
                  <Input
                    placeholder="Ej. Presupuesto Escritura Depto Belgrano"
                    value={nuevoPresupuesto.titulo}
                    onChange={(e) => setNuevoPresupuesto({...nuevoPresupuesto, titulo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente (Opcional)</Label>
                  <Select
                    value={nuevoPresupuesto.cliente_id}
                    onValueChange={(val) => setNuevoPresupuesto({...nuevoPresupuesto, cliente_id: val})}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Ítems del Presupuesto</Label>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      Total: {formatCurrency(nuevoPresupuesto.items.reduce((acc, curr) => acc + curr.monto, 0))}
                    </span>
                  </div>
                  {nuevoPresupuesto.items.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                      Use la calculadora arriba para generar los ítems.
                    </div>
                  ) : (
                    <div className="space-y-2 border rounded-lg p-2 bg-muted/20">
                      {nuevoPresupuesto.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-background p-2.5 rounded-md border text-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.concepto}</span>
                            {item.es_porcentaje && (
                              <span className="text-[10px] text-muted-foreground">
                                Calculado al {(item.porcentaje_valor * 100).toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <span className="font-semibold tabular-nums">{formatCurrency(item.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t bg-background">
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || nuevoPresupuesto.items.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Presupuesto
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
