"use client";

/**
 * IngesiMotor — Motor de Generación Notarial
 *
 * Basado en el flujo real de Ingesis SRL (IngedatW + IngecertW):
 * - Paso 1: Selección del tipo de acto notarial
 * - Paso 2: Carga de datos (intervinientes desde la DB, datos del acto)
 * - Paso 3: Preview del borrador y descarga en DOCX
 *
 * Conecta directamente con el endpoint /api/v1/generate/certificacion
 */

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ofisolveApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import {
  FileText,
  ShieldCheck,
  Stamp,
  Plane,
  BookOpen,
  Scroll,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  X,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  FilePlus,
  Eye,
  Save,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ------- Tipos de Acto Notarial -------
export interface CampoDinamico {
  id: string;
  label: string;
  tipo: "text" | "date" | "textarea" | "select";
  placeholder?: string;
  colSpan?: 1 | 2;
  opciones?: string[];
  opcional?: boolean;
}

export interface TipoActo {
  id: string;
  nombre: string;
  descripcion: string;
  icono: any;
  color: string;
  colorActive: string;
  categoria: string;
  camposEspecificos?: CampoDinamico[];
}

const TIPOS_ACTO: TipoActo[] = [
  {
    id: "certificacion_firma",
    nombre: "Certificación de Firma",
    descripcion: "Acta de certificación de firma ológrafa o digital",
    icono: Stamp,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    colorActive: "bg-blue-100 border-blue-400",
    categoria: "certificacion",
    camposEspecificos: [
      { id: "documento_base", label: "Documento Base", tipo: "text", placeholder: "Ej: Contrato de Locación Inmueble, Formulario 08 Automotor..." }
    ]
  },
  {
    id: "certificacion_copia",
    nombre: "Certificación de Fotocopia",
    descripcion: "Fiel copia de documento original",
    icono: FileText,
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    colorActive: "bg-indigo-100 border-indigo-400",
    categoria: "certificacion",
    camposEspecificos: [
      { id: "documento_base", label: "Documento Base", tipo: "text", placeholder: "Ej: Contrato de Locación Inmueble, Formulario 08 Automotor..." }
    ]
  },
  {
    id: "autorizacion_viaje",
    nombre: "Autorización de Viaje",
    descripcion: "Consentimiento de viaje de menor al exterior",
    icono: Plane,
    color: "bg-sky-50 border-sky-200 text-sky-700",
    colorActive: "bg-sky-100 border-sky-400",
    categoria: "acta",
    camposEspecificos: [
      { id: "paises_destino", label: "Países de Destino", tipo: "text", placeholder: "Ej: República Federativa de Brasil, Estados Unidos...", colSpan: 2 },
      { id: "fecha_salida", label: "Fecha de Salida", tipo: "date" },
      { id: "fecha_regreso", label: "Fecha de Regreso (Opcional)", tipo: "date", opcional: true },
      { id: "acompanantes", label: "Acompañantes", tipo: "text", placeholder: "Ej: Viaja solo, o viaja con su abuelo paterno Juan Perez DNI...", colSpan: 2 },
      { id: "medio_transporte", label: "Medio de Transporte", tipo: "select", placeholder: "Seleccionar medio...", opciones: ["Vía Aérea", "Vía Terrestre", "Vía Fluvial", "Vía Marítima"], colSpan: 2 }
    ]
  },
  {
    id: "poder_especial",
    nombre: "Poder Especial",
    descripcion: "Mandato para actos específicos",
    icono: ShieldCheck,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    colorActive: "bg-purple-100 border-purple-400",
    categoria: "poder",
    camposEspecificos: [
      { id: "facultades", label: "Facultades Otorgadas", tipo: "textarea", placeholder: "Ej: Amplias facultades de administración y disposición, operatoria bancaria, etc." },
      { id: "plazo_validez", label: "Plazo de Validez", tipo: "select", placeholder: "Seleccionar plazo...", opciones: ["Revocable en cualquier momento", "Válido por 1 año", "Válido por 5 años", "Válido hasta revocación expresa"] }
    ]
  },
  {
    id: "poder_general",
    nombre: "Poder General",
    descripcion: "Mandato amplio de representación",
    icono: BookOpen,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    colorActive: "bg-violet-100 border-violet-400",
    categoria: "poder",
    camposEspecificos: [
      { id: "facultades", label: "Facultades Otorgadas", tipo: "textarea", placeholder: "Ej: Amplias facultades de administración y disposición, operatoria bancaria, etc." },
      { id: "plazo_validez", label: "Plazo de Validez", tipo: "select", placeholder: "Seleccionar plazo...", opciones: ["Revocable en cualquier momento", "Válido por 1 año", "Válido por 5 años", "Válido hasta revocación expresa"] }
    ]
  },
  {
    id: "acta_notarial",
    nombre: "Acta Notarial",
    descripcion: "Acta de constatación de hechos",
    icono: Scroll,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    colorActive: "bg-amber-100 border-amber-400",
    categoria: "acta",
  },
];

interface Interviniente {
  nombre: string;
  dni: string;
  cuit?: string;
  domicilio?: string;
  rol: string;
  es_pep?: boolean;
  riesgo_uif?: string;
}

interface IngesiMotorProps {
  clientes: any[];
  workspaceActual: any;
  tramiteActual: any;
  usuario: any;
  clienteActual?: any;
  participaciones?: any[];
  ollamaStatus?: "online" | "offline" | "error" | "unknown";
  onDocumentoGenerado?: (resultado: any) => void;
}

export function IngesiMotor({ clientes, workspaceActual, tramiteActual, clienteActual, participaciones = [], usuario, ollamaStatus, onDocumentoGenerado }: IngesiMotorProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoActo | null>(null);
  const [intervinientes, setIntervinientes] = useState<Interviniente[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lugaresFecha, setLugaresFecha] = useState(
    `Ciudad Autónoma de Buenos Aires, ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`
  );
  const [datosEspecificos, setDatosEspecificos] = useState<Record<string, any>>({});
  const [generando, setGenerando] = useState(false);
  const [guardandoCarpeta, setGuardandoCarpeta] = useState(false);
  const [asentandoLibro, setAsentandoLibro] = useState(false);
  const [asentado, setAsentado] = useState(false);
  const [documentoGenerado, setDocumentoGenerado] = useState<any | null>(null);
  const [nroCorrelativo] = useState(() => Math.floor(Math.random() * 9000) + 1000);

  // Filtrar clientes para búsqueda
  const clientesFiltrados = clientes.filter(
    (c) =>
      busquedaCliente.length >= 2 &&
      (c.nombre_completo.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        c.dni.includes(busquedaCliente))
  );

  useEffect(() => {
    setDatosEspecificos({});
  }, [tipoSeleccionado]);

  useEffect(() => {
    if (participaciones && participaciones.length > 0 && intervinientes.length === 0) {
      setIntervinientes(
        participaciones.map((p) => {
          // Intentar buscar el cliente completo para obtener domicilio/cuit
          const c = clientes.find((cli) => cli.dni === p.dni_cuit);
          return {
            nombre: p.nombre,
            dni: p.dni_cuit,
            cuit: c?.cuit,
            domicilio: c?.domicilio,
            rol: p.rol || "Requirente",
            es_pep: c?.es_pep,
            riesgo_uif: c?.riesgo_uif,
          };
        })
      );
    } else if (clienteActual && intervinientes.length === 0) {
      setIntervinientes([{
        nombre: clienteActual.nombre_completo,
        dni: clienteActual.dni,
        cuit: clienteActual.cuit,
        domicilio: clienteActual.domicilio,
        rol: "Requirente",
        es_pep: clienteActual.es_pep,
        riesgo_uif: clienteActual.riesgo_uif,
      }]);
    }
  }, [clienteActual, participaciones, clientes]);

  const agregarInterviniente = useCallback(
    (cliente: any, rol: string) => {
      if (intervinientes.find((i) => i.dni === cliente.dni)) {
        toast.warning("Este interviniente ya fue agregado");
        return;
      }
      setIntervinientes((prev) => [
        ...prev,
        {
          nombre: cliente.nombre_completo,
          dni: cliente.dni,
          cuit: cliente.cuit,
          domicilio: cliente.domicilio,
          rol,
          es_pep: cliente.es_pep,
          riesgo_uif: cliente.riesgo_uif,
        },
      ]);
      setBusquedaCliente("");
    },
    [intervinientes]
  );

  const eliminarInterviniente = (dni: string) => {
    setIntervinientes((prev) => prev.filter((i) => i.dni !== dni));
  };

  const generarDocumento = async () => {
    if (!tipoSeleccionado || intervinientes.length === 0) return;
    
    // Validación Zod dinámica de campos requeridos locales
    if (tipoSeleccionado.camposEspecificos) {
      const shape: Record<string, any> = {};
      tipoSeleccionado.camposEspecificos.forEach(c => {
        if (!c.opcional) {
          shape[c.id] = z.string({ required_error: `El campo ${c.label} es obligatorio` })
                         .min(1, `El campo ${c.label} no puede estar vacío`);
        } else {
          shape[c.id] = z.string().optional();
        }
      });
      const schema = z.object(shape);
      const result = schema.safeParse(datosEspecificos);
      if (!result.success) {
        const firstError = result.error.errors[0];
        toast.error(firstError.message);
        return;
      }
    }

    setGenerando(true);

    try {
      const requirente = intervinientes.find((i) => i.rol === "Requirente") || intervinientes[0];

      // Mapeo de IDs de la UI al enum del backend
      const tipoMap: Record<string, string> = {
        "certificacion_firma": "firma",
        "certificacion_copia": "fotocopia",
        "autorizacion_viaje": "viaje_menores",
      };

      // Enriquecer observaciones con datos específicos dinámicos
      let obsEnriquecida = observaciones || `Lugar y fecha: ${lugaresFecha}. Intervinientes extras: ${intervinientes.filter(i => i.rol !== 'Requirente').map(i => i.nombre).join(', ')}`;
      if (Object.keys(datosEspecificos).length > 0) {
        obsEnriquecida += "\n\n--- DATOS ESPECÍFICOS DEL ACTO ---\n";
        for (const [key, value] of Object.entries(datosEspecificos)) {
           // Formatear clave (ej: fecha_salida -> Fecha Salida)
           const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
           obsEnriquecida += `${label}: ${value}\n`;
        }
      }

      const payload = {
        nombre_requirente: requirente.nombre,
        dni: requirente.dni,
        cuit: requirente.cuit || "",
        domicilio: requirente.domicilio || "",
        tipo_documento_a_certificar: tipoMap[tipoSeleccionado.id] || "firma",
        observaciones: obsEnriquecida,
        workspace_id: workspaceActual?.id ? Number(workspaceActual.id) : undefined,
        tramite_id: tramiteActual?.id ? Number(tramiteActual.id) : undefined
      };

      const params = {
        nombre_escribano: usuario?.nombre || "Escribano/a",
        nro_registro: usuario?.nroMatricula || "---",
      };

      const resultado = await ofisolveApi.generarCertificacion(payload, params);
      setDocumentoGenerado(resultado); 
      setPaso(3);
      if (onDocumentoGenerado) {
        onDocumentoGenerado(resultado);
      }
    } catch (err: any) {
      toast.error(`Error generando documento: ${err.message || "Fallo interno"}`);
    } finally {
      setGenerando(false);
    }
  };

  const handleGuardarEnCarpeta = async () => {
    if (!tramiteActual || !documentoGenerado?.texto_generado) return;
    setGuardandoCarpeta(true);
    try {
      const nombreArchivo = documentoGenerado.archivo_docx || `Cert_${Date.now()}.docx`;
      await ofisolveApi.guardarDocumentoGenerado(
        tramiteActual.id,
        nombreArchivo,
        documentoGenerado.texto_generado
      );
      toast.success("Documento guardado oficialmente en la carpeta del trámite");
    } catch (err: any) {
      toast.error(`Error guardando: ${err.message}`);
    } finally {
      setGuardandoCarpeta(false);
    }
  };

  const descargarDocumento = async () => {
    if (!documentoGenerado || typeof documentoGenerado === 'string') {
        toast.error("No se pudo descargar el documento");
        return;
    }
    
    try {
        if (documentoGenerado.ruta_descarga) {
            await ofisolveApi.descargarDocx(documentoGenerado.ruta_descarga, documentoGenerado.archivo_docx || "documento.docx");
            toast.success("Documento descargado");
        } else {
            toast.warning("El documento no tiene una ruta de descarga");
        }
    } catch(err) {
        toast.error("Error al descargar el archivo");
    }
  };

  const asentarEnLibro = async () => {
    if (!workspaceActual?.id || !tipoSeleccionado || intervinientes.length === 0) return;
    
    setAsentandoLibro(true);
    try {
      const payload = {
        tramite_id: tramiteActual?.id ? Number(tramiteActual.id) : undefined,
        nro_correlativo: nroCorrelativo,
        tipo_acto: tipoSeleccionado.nombre,
        intervinientes: intervinientes.map(i => `${i.nombre} (${i.dni})`).join(', ')
      };
      
      await ofisolveApi.crearAsientoLibro(Number(workspaceActual.id), payload);
      toast.success("Asiento generado en el Libro de Requerimientos");
      setAsentado(true);
    } catch (err: any) {
      toast.error(`Error al asentar en libro: ${err.message}`);
    } finally {
      setAsentandoLibro(false);
    }
  };

  const reiniciar = () => {
    setPaso(1);
    setTipoSeleccionado(null);
    setIntervinientes([]);
    setBusquedaCliente("");
    setObservaciones("");
    setDocumentoGenerado(null);
    setAsentado(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-muted/20">
      {/* ---- HEADER ---- */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-8 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Motor Ingesis</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">
                Generación notarial profesional · Registro correlativo #{nroCorrelativo}
              </p>
              {/* Badge de estado del modelo IA */}
              <Badge variant="outline" className={cn(
                "text-[9px] px-1.5 py-0 h-4 font-semibold transition-colors",
                ollamaStatus === "online" ? "border-emerald-500 text-emerald-700 bg-emerald-50" :
                ollamaStatus === "offline" || ollamaStatus === "error" ? "border-red-500 text-red-700 bg-red-50" :
                "border-amber-500 text-amber-700 bg-amber-50"
              )}>
                <div className="flex items-center">
                  <Brain className="h-3 w-3 mr-1" />
                  {ollamaStatus === "online" ? "ofisolve-notarial" :
                   ollamaStatus === "offline" || ollamaStatus === "error" ? "Modo MOCK" :
                   "Conectando IA"}
                </div>
              </Badge>
            </div>
          </div>
          {/* Indicador de pasos */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-1.5">
                <div
                  className={`h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                    paso >= n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {paso > n ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <span className={`text-xs hidden sm:block ${paso >= n ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {n === 1 ? "Tipo de Acto" : n === 2 ? "Datos" : "Documento"}
                </span>
                {n < 3 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="mx-auto max-w-4xl w-full">

          {/* ===== PASO 1: Seleccionar Tipo de Acto ===== */}
          {paso === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Seleccionar Tipo de Acto Notarial</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Elegí el instrumento a generar. El motor cargará la plantilla correspondiente.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TIPOS_ACTO.map((tipo) => {
                  const Icono = tipo.icono;
                  const isSelected = tipoSeleccionado?.id === tipo.id;
                  return (
                    <button
                      key={tipo.id}
                      onClick={() => setTipoSeleccionado(tipo)}
                      className={`group relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
                        isSelected
                          ? tipo.colorActive + " shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${tipo.color}`}>
                        <Icono className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{tipo.nombre}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tipo.descripcion}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <Badge variant="outline" className="text-[10px] mt-auto capitalize">
                        {tipo.categoria}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => tipoSeleccionado && setPaso(2)}
                  disabled={!tipoSeleccionado}
                  className="gap-2"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ===== PASO 2: Datos del Acto ===== */}
          {paso === 2 && tipoSeleccionado && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${tipoSeleccionado.color}`}>
                  <tipoSeleccionado.icono className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{tipoSeleccionado.nombre}</h3>
                  <p className="text-xs text-muted-foreground">Completá los datos del acto y los intervinientes</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Lugar y Fecha */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FilePlus className="h-4 w-4 text-primary" />
                    Datos del Acto
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Lugar y Fecha
                      </label>
                      <Input
                        value={lugaresFecha}
                        onChange={(e) => setLugaresFecha(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Observaciones / Objeto del Acto
                      </label>
                      <textarea
                        className="w-full min-h-[80px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus-visible:ring-offset-2"
                        placeholder="Describí brevemente el objeto del acto..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                      />
                    </div>
                    </div>

                    {/* --- CAMPOS DINAMICOS SEGUN TIPO --- */}
                    {tipoSeleccionado.camposEspecificos && tipoSeleccionado.camposEspecificos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border mt-3">
                        {tipoSeleccionado.camposEspecificos.map((campo) => (
                          <div key={campo.id} className={campo.colSpan === 2 || campo.tipo === "textarea" ? "col-span-1 sm:col-span-2" : "col-span-1"}>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                              {campo.label} {!campo.opcional && <span className="text-destructive">*</span>}
                            </label>
                            {campo.tipo === "textarea" ? (
                              <textarea
                                className="w-full min-h-[80px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus-visible:ring-offset-2"
                                placeholder={campo.placeholder}
                                value={datosEspecificos[campo.id] || ""}
                                onChange={e => setDatosEspecificos(p => ({...p, [campo.id]: e.target.value}))}
                              />
                            ) : campo.tipo === "select" ? (
                              <Select
                                value={datosEspecificos[campo.id] || ""}
                                onValueChange={(val) => setDatosEspecificos(p => ({...p, [campo.id]: val}))}
                              >
                                <SelectTrigger className="w-full text-sm h-9">
                                  <SelectValue placeholder={campo.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {campo.opciones?.map(opc => (
                                    <SelectItem key={opc} value={opc}>{opc}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={campo.tipo}
                                placeholder={campo.placeholder}
                                value={datosEspecificos[campo.id] || ""}
                                onChange={e => setDatosEspecificos(p => ({...p, [campo.id]: e.target.value}))}
                                className="h-9 text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                {/* Intervinientes */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Intervinientes
                    <Badge variant="secondary" className="ml-auto">{intervinientes.length}</Badge>
                  </h4>

                  {/* Buscador de clientes */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 text-sm"
                      placeholder="Buscar cliente por nombre o DNI..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                    />
                    {clientesFiltrados.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                        {clientesFiltrados.slice(0, 6).map((c) => (
                          <div key={c.id} className="border-b border-border/50 last:border-0">
                            <div className="px-3 py-2.5">
                              <p className="text-sm font-medium">{c.nombre_completo}</p>
                              <p className="text-xs text-muted-foreground">DNI: {c.dni}{c.cuit ? ` · CUIT: ${c.cuit}` : ""}</p>
                            </div>
                            <div className="flex gap-1 px-3 pb-2 flex-wrap">
                              {["Requirente", "Apoderado", "Poderdante", "Firmante", "Testigo"].map((rol) => (
                                <button
                                  key={rol}
                                  onClick={() => agregarInterviniente(c, rol)}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                                >
                                  + {rol}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista de intervinientes */}
                  {intervinientes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                      <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Buscá un cliente y asignale un rol al acto
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {intervinientes.map((inv, idx) => (
                        <div
                          key={inv.dni}
                          className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {inv.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{inv.nombre}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                <span>DNI: {inv.dni}</span> · <span className="text-primary font-semibold">{inv.rol}</span>
                                {inv.es_pep && (
                                  <Badge variant="destructive" className="h-4 text-[9px] px-1.5 flex gap-1 items-center bg-red-600">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    ALERTA UIF: PEP
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => eliminarInterviniente(inv.dni)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setPaso(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Volver
                </Button>
                <Button
                  onClick={generarDocumento}
                  disabled={generando || intervinientes.length === 0}
                  className="gap-2"
                >
                  {generando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Generar Borrador
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ===== PASO 3: Preview y Descarga ===== */}
          {paso === 3 && documentoGenerado && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Borrador Generado</h3>
                    <p className="text-xs text-muted-foreground">
                      {tipoSeleccionado?.nombre} · #{nroCorrelativo} · {new Date().toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reiniciar} className="gap-2">
                    <FilePlus className="h-4 w-4" />
                    Nuevo Acto
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={asentarEnLibro}
                    disabled={asentandoLibro || asentado}
                  >
                    {asentandoLibro ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : asentado ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    {asentado ? "Asentado en Libro" : "Asentar en Libro"}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={descargarDocumento}>
                    <Download className="h-4 w-4" />
                    Descargar DocX
                  </Button>
                  {tramiteActual && (
                    <Button 
                      onClick={handleGuardarEnCarpeta} 
                      disabled={guardandoCarpeta} 
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {guardandoCarpeta ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar en Carpeta
                    </Button>
                  )}
                </div>
              </div>

              {/* Resumen de intervinientes */}
              <div className="mb-4 flex flex-wrap gap-2">
                {intervinientes.map((inv) => (
                  <Badge key={inv.dni} variant="secondary" className="gap-1.5">
                    <span className="font-semibold">{inv.rol}:</span> {inv.nombre}
                  </Badge>
                ))}
              </div>

              {/* Clientes extraídos por el agente IA */}
              {documentoGenerado?.datos_extraidos?.clientes?.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-in fade-in duration-500">
                  <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Entidades extraídas por el Agente IA
                  </p>
                  <div className="space-y-1.5">
                    {documentoGenerado.datos_extraidos.clientes.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2 border border-emerald-500/20">
                        <span className="font-medium text-foreground">{c.nombre}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono">{c.dni_cuit}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{c.rol}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {documentoGenerado?.tramite_id && (
                    <p className="text-[10px] text-emerald-600 mt-2">
                      ✅ Guardado en Trámite #{documentoGenerado.tramite_id} · Carpeta sincronizada
                    </p>
                  )}
                </div>
              )}

              {/* Preview del documento */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {tipoSeleccionado?.nombre.toUpperCase()} — BORRADOR
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {documentoGenerado?.modo_llm && documentoGenerado.modo_llm !== 'mock' && (
                      <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 bg-emerald-50">
                        🧠 IA Real
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
                      Pendiente de revisión
                    </Badge>
                  </div>
                </div>
                <div className="p-6 max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground">
                    {typeof documentoGenerado === 'string' ? documentoGenerado : documentoGenerado?.texto_generado}
                  </pre>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] text-muted-foreground/60">
                Este es un borrador generado por IA. Revisá el contenido antes de protocolizar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
