"use client";

import React, { useEffect, useState } from "react";
import { 
  Calculator, Plus, Loader2, Download, Send, Search, Building2,
  FileText, Briefcase
} from "lucide-react";
import { ofisolveApi } from "@/lib/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PresupuestosPage() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [presupuestos, setPresupuestos] = useState<any[]>([]);
  const [aranceles, setAranceles] = useState<any[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({
    titulo: "",
    tipo_acto: "",
    monto_operacion: "",
    items: [] as any[]
  });
  const [montoCalculo, setMontoCalculo] = useState("");
  const [tipoActoCalculo, setTipoActoCalculo] = useState("compraventa");
  const [calculando, setCalculando] = useState(false);

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
      const [presData, aranData] = await Promise.all([
        ofisolveApi.obtenerPresupuestos(workspaceId),
        ofisolveApi.obtenerAranceles(workspaceId)
      ]);
      setPresupuestos(presData || []);
      setAranceles(aranData || []);
    } catch (err) {
      console.error("Error loading budgets", err);
      toast.error("Error al cargar presupuestos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

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
        monto_operacion: Number(nuevoPresupuesto.monto_operacion) || 0
      });
      toast.success("Presupuesto creado");
      setIsModalOpen(false);
      setNuevoPresupuesto({ titulo: "", tipo_acto: "", monto_operacion: "", items: [] });
      loadData();
    } catch (error) {
      toast.error("Error al guardar presupuesto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  const getStatusBadge = (estado: string) => {
    switch(estado) {
      case 'borrador': return <Badge variant="outline" className="bg-gray-50 text-gray-700">Borrador</Badge>;
      case 'enviado': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Enviado</Badge>;
      case 'aceptado': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aceptado</Badge>;
      case 'rechazado': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rechazado</Badge>;
      default: return <Badge>{estado}</Badge>;
    }
  };

  const enviarWhatsApp = (p: any) => {
    const texto = `Hola! Te envío el presupuesto para la operación de ${p.tipo_acto}. El total estimado es de ${formatCurrency(p.total)}. Saludos!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleExportarPDF = () => {
    toast.success("Abriendo diálogo de impresión para guardar como PDF...");
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
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            Presupuestador
          </h2>
          <p className="text-muted-foreground">
            Cálculo automático de aranceles, sellos y honorarios notariales.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presupuestos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No hay presupuestos generados
                </TableCell>
              </TableRow>
            ) : (
              presupuestos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.titulo}
                    {p.cliente_nombre && <div className="text-xs text-muted-foreground">Cliente: {p.cliente_nombre}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {p.tipo_acto}
                    </div>
                    {p.monto_operacion > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Base: {formatCurrency(p.monto_operacion)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(p.estado)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.fecha_creacion).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-700">
                    {formatCurrency(p.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" title="Exportar PDF" className="h-8 w-8 text-muted-foreground" onClick={handleExportarPDF}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Enviar WhatsApp" onClick={() => enviarWhatsApp(p)} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle>Generar Presupuesto</DialogTitle>
              <DialogDescription>
                Utilice la calculadora automática o agregue ítems manualmente.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-6 pt-4">
              
              {/* Sección Calculadora */}
              <div className="bg-muted/50 p-4 rounded-xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-bold text-blue-800">
                  <Calculator className="h-4 w-4" />
                  Calculadora Automática
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-muted-foreground">Tipo de Acto</Label>
                    <Select value={tipoActoCalculo} onValueChange={setTipoActoCalculo}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compraventa">Compraventa</SelectItem>
                        <SelectItem value="hipoteca">Hipoteca</SelectItem>
                        <SelectItem value="donacion">Donación</SelectItem>
                        <SelectItem value="todos">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-muted-foreground">Monto Operación ($)</Label>
                    <Input 
                      type="number" className="bg-background"
                      value={montoCalculo} onChange={(e) => setMontoCalculo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end pb-0.5">
                    <Button onClick={handleCalcular} disabled={calculando} variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                      {calculando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Formulario Manual */}
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
                  <Label className="flex items-center justify-between">
                    <span>Ítems del Presupuesto</span>
                    <span className="text-blue-600 font-bold">
                      Total: {formatCurrency(nuevoPresupuesto.items.reduce((acc, curr) => acc + curr.monto, 0))}
                    </span>
                  </Label>
                  
                  {nuevoPresupuesto.items.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm">
                      Use la calculadora arriba para generar los ítems.
                    </div>
                  ) : (
                    <div className="space-y-2 border rounded-xl p-2 bg-muted/20">
                      {nuevoPresupuesto.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-background p-2 rounded-lg border text-sm shadow-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.concepto}</span>
                            {item.es_porcentaje && (
                              <span className="text-[10px] text-muted-foreground">
                                Calculado al {(item.porcentaje_valor * 100).toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-right tabular-nums">{formatCurrency(item.monto)}</span>
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
              <Button onClick={handleSubmit} disabled={isSubmitting || nuevoPresupuesto.items.length === 0} className="bg-blue-600 hover:bg-blue-700">
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
