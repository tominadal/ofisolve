"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"
import { UserPlus, Loader2, AlertTriangle } from "lucide-react"
import { ofisolveApi } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const clientSchema = z.object({
  tipo_persona: z.enum(["Fisica", "Juridica"]).default("Fisica"),
  sexo: z.string().optional(),
  nombre_completo: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  variante_nombre: z.string().optional(),
  variante_apellido: z.string().optional(),
  nacionalidad: z.string().default("Argentino"),
  fecha_nacimiento: z.string().optional(),
  lugar_nacimiento: z.string().optional(),
  tipo_documento: z.string().default("DNI"),
  dni: z.string().min(7, "DNI no válido"),
  emision_documento: z.string().optional(),
  tramite_nro_documento: z.string().optional(),
  ejemplar_documento: z.string().optional(),
  vencimiento_documento: z.string().optional(),
  
  exhibio_documento_idoneo: z.boolean().default(false),
  tipo_documento_impositivo: z.string().optional(),
  cuit: z.string().optional(),
  condicion_iva: z.string().optional(),
  inscripto_ganancias: z.boolean().default(false),
  
  nombre_padre: z.string().optional(),
  apellido_padre: z.string().optional(),
  nombre_madre: z.string().optional(),
  apellido_madre: z.string().optional(),
  estado_familia: z.string().optional(),
  union_convivencial: z.boolean().default(false),
  
  domicilio_calle: z.string().optional(),
  domicilio_numero: z.string().optional(),
  domicilio_piso: z.string().optional(),
  domicilio_depto: z.string().optional(),
  domicilio_sector: z.string().optional(),
  domicilio_torre: z.string().optional(),
  domicilio_manzana: z.string().optional(),
  domicilio_barrio: z.string().optional(),
  domicilio_cp: z.string().optional(),
  domicilio_localidad: z.string().optional(),
  domicilio_partido_departamento: z.string().optional(),
  domicilio_provincia: z.string().optional(),
  domicilio_pais: z.string().default("República Argentina"),
  domicilio_fiscal_diferente: z.boolean().default(false),
  
  telefono: z.string().optional(),
  telefonos_adicionales: z.string().optional(),
  email: z.string().optional().or(z.literal("")),
  emails_adicionales: z.string().optional(),
  pagina_web: z.string().optional(),
  
  es_pep: z.boolean().default(false),
  riesgo_uif: z.enum(["Bajo", "Medio", "Alto", "Falta clasificación de riesgo"]).default("Falta clasificación de riesgo"),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface NuevoClienteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (cliente: any) => void
  workspaceId: number
  cliente?: any
}

export function NuevoClienteModal({ isOpen, onClose, onSuccess, workspaceId, cliente }: NuevoClienteModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("personales")

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: cliente ? {
      tipo_persona: cliente.tipo_persona || "Fisica",
      sexo: cliente.sexo || "",
      nombre_completo: cliente.nombre_completo || "",
      variante_nombre: cliente.variante_nombre || "",
      variante_apellido: cliente.variante_apellido || "",
      nacionalidad: cliente.nacionalidad || "Argentino",
      fecha_nacimiento: cliente.fecha_nacimiento || "",
      lugar_nacimiento: cliente.lugar_nacimiento || "",
      tipo_documento: cliente.tipo_documento || "DNI",
      dni: cliente.dni || "",
      emision_documento: cliente.emision_documento || "",
      tramite_nro_documento: cliente.tramite_nro_documento || "",
      ejemplar_documento: cliente.ejemplar_documento || "",
      vencimiento_documento: cliente.vencimiento_documento || "",
      exhibio_documento_idoneo: cliente.exhibio_documento_idoneo || false,
      tipo_documento_impositivo: cliente.tipo_documento_impositivo || "CUIT",
      cuit: cliente.cuit || "",
      condicion_iva: cliente.condicion_iva || "Consumidor Final",
      inscripto_ganancias: cliente.inscripto_ganancias || false,
      nombre_padre: cliente.nombre_padre || "",
      apellido_padre: cliente.apellido_padre || "",
      nombre_madre: cliente.nombre_madre || "",
      apellido_madre: cliente.apellido_madre || "",
      estado_familia: cliente.estado_familia || "Soltero",
      union_convivencial: cliente.union_convivencial || false,
      domicilio_calle: cliente.domicilio_calle || "",
      domicilio_numero: cliente.domicilio_numero || "",
      domicilio_piso: cliente.domicilio_piso || "",
      domicilio_depto: cliente.domicilio_depto || "",
      domicilio_sector: cliente.domicilio_sector || "",
      domicilio_torre: cliente.domicilio_torre || "",
      domicilio_manzana: cliente.domicilio_manzana || "",
      domicilio_barrio: cliente.domicilio_barrio || "",
      domicilio_cp: cliente.domicilio_cp || "",
      domicilio_localidad: cliente.domicilio_localidad || "",
      domicilio_partido_departamento: cliente.domicilio_partido_departamento || "",
      domicilio_provincia: cliente.domicilio_provincia || "Capital Federal",
      domicilio_pais: cliente.domicilio_pais || "República Argentina",
      domicilio_fiscal_diferente: cliente.domicilio_fiscal_diferente || false,
      telefono: cliente.telefono || "",
      telefonos_adicionales: cliente.telefonos_adicionales || "",
      email: cliente.email || "",
      emails_adicionales: cliente.emails_adicionales || "",
      pagina_web: cliente.pagina_web || "",
      es_pep: cliente.es_pep || false,
      riesgo_uif: cliente.riesgo_uif || "Falta clasificación de riesgo",
    } : {
      tipo_persona: "Fisica",
      sexo: "",
      nombre_completo: "",
      variante_nombre: "",
      variante_apellido: "",
      nacionalidad: "Argentino",
      fecha_nacimiento: "",
      lugar_nacimiento: "",
      tipo_documento: "DNI",
      dni: "",
      emision_documento: "",
      tramite_nro_documento: "",
      ejemplar_documento: "",
      vencimiento_documento: "",
      exhibio_documento_idoneo: false,
      tipo_documento_impositivo: "CUIT",
      cuit: "",
      condicion_iva: "Consumidor Final",
      inscripto_ganancias: false,
      nombre_padre: "",
      apellido_padre: "",
      nombre_madre: "",
      apellido_madre: "",
      estado_familia: "Soltero",
      union_convivencial: false,
      domicilio_calle: "",
      domicilio_numero: "",
      domicilio_piso: "",
      domicilio_depto: "",
      domicilio_sector: "",
      domicilio_torre: "",
      domicilio_manzana: "",
      domicilio_barrio: "",
      domicilio_cp: "",
      domicilio_localidad: "",
      domicilio_partido_departamento: "",
      domicilio_provincia: "Capital Federal",
      domicilio_pais: "República Argentina",
      domicilio_fiscal_diferente: false,
      telefono: "",
      telefonos_adicionales: "",
      email: "",
      emails_adicionales: "",
      pagina_web: "",
      es_pep: false,
      riesgo_uif: "Falta clasificación de riesgo",
    },
  })


  async function onSubmit(values: ClientFormValues) {
    setIsSubmitting(true)
    try {
      const parsedValues = { ...values }
      // Adaptar fechas vacías a null para el backend
      if (!parsedValues.fecha_nacimiento) delete parsedValues.fecha_nacimiento
      if (!parsedValues.emision_documento) delete parsedValues.emision_documento
      if (!parsedValues.vencimiento_documento) delete parsedValues.vencimiento_documento
      
      let finalClient;
      if (cliente && cliente.id) {
        finalClient = await ofisolveApi.editarCliente(workspaceId, cliente.id, parsedValues)
        toast.success("Cliente actualizado con éxito")
      } else {
        finalClient = await ofisolveApi.crearCliente(workspaceId, parsedValues)
        toast.success("Cliente registrado con éxito")
      }
      
      onSuccess(finalClient)
      form.reset()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Error al guardar cliente")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper renderizador rápido
  const renderField = (name: any, label: string, placeholder: string = "", colSpan: boolean = false, type: string = "text") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={colSpan ? "col-span-2" : ""}>
          <FormLabel className="text-xs">{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} className="h-8 text-sm" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  )

  const renderSelect = (name: any, label: string, options: string[], colSpan: boolean = false) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={colSpan ? "col-span-2" : ""}>
          <FormLabel className="text-xs">{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value as string}>
            <FormControl>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={label} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  )

  const renderSwitch = (name: any, label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm bg-background">
          <FormLabel className="text-xs">{label}</FormLabel>
          <FormControl>
            <Switch
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
              className="scale-75"
            />
          </FormControl>
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] bg-background border border-border shadow-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            {cliente ? "Editar Cliente" : "Nuevo Cliente (Ingesis Parity)"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {cliente ? "Actualiza los datos del cliente seleccionado." : "Completa exhaustivamente todos los campos necesarios para la correcta redacción notarial automática."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
              <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-5 h-9">
                  <TabsTrigger value="personales" className="text-[10px] md:text-xs">Identificación</TabsTrigger>
                  <TabsTrigger value="impositivos" className="text-[10px] md:text-xs">Impositivos</TabsTrigger>
                  <TabsTrigger value="filiacion" className="text-[10px] md:text-xs">Filiación</TabsTrigger>
                  <TabsTrigger value="domicilios" className="text-[10px] md:text-xs">Domicilios</TabsTrigger>
                  <TabsTrigger value="contactos" className="text-[10px] md:text-xs">Contactos/UIF</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <TabsContent value="personales" className="m-0 space-y-4 outline-none">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {renderSelect("tipo_persona", "Tipo de Persona", ["Fisica", "Juridica"], true)}
                    {renderSelect("sexo", "Sexo", ["Masculino", "Femenino", "No Binario"], true)}
                    
                    {renderField("nombre_completo", "Nombre Completo / Razón Social", "Ej: Tomas Ignacio Nadal", true)}
                    {renderField("dni", "Nº Documento", "46.360.712", true)}
                    
                    {renderField("variante_nombre", "Variante de Nombre", "", true)}
                    {renderField("variante_apellido", "Variante de Apellido", "", true)}

                    {renderSelect("tipo_documento", "Tipo Doc.", ["DNI", "Pasaporte", "LC", "LE"])}
                    {renderField("nacionalidad", "Nacionalidad", "Argentino")}
                    
                    {renderField("fecha_nacimiento", "Fecha de Nac.", "YYYY-MM-DD", false, "date")}
                    {renderField("lugar_nacimiento", "Lugar de Nac.", "Capital Federal")}
                    
                    {renderField("emision_documento", "Emisión Doc.", "YYYY-MM-DD", false, "date")}
                    {renderField("vencimiento_documento", "Vencimiento Doc.", "YYYY-MM-DD", false, "date")}
                    
                    {renderField("tramite_nro_documento", "Trámite Nº", "")}
                    {renderField("ejemplar_documento", "Ejemplar", "A")}
                  </div>
                </TabsContent>

                <TabsContent value="impositivos" className="m-0 space-y-4 outline-none">
                  <div className="grid grid-cols-2 gap-4">
                    {renderSwitch("exhibio_documento_idoneo", "Exhibición de documento idóneo")}
                    {renderSelect("tipo_documento_impositivo", "T.Doc. Impositivo", ["CUIT", "CUIL", "CDI"])}
                    {renderField("cuit", "Nº Doc. Impositivo (CUIT/CUIL)", "20-12345678-9", true)}
                    {renderSelect("condicion_iva", "T. de IVA", ["Consumidor Final", "Resp. Inscripto", "Monotributo", "Exento"], true)}
                    {renderSwitch("inscripto_ganancias", "Inscripto en Ganancias?")}
                  </div>
                </TabsContent>

                <TabsContent value="filiacion" className="m-0 space-y-4 outline-none">
                  <div className="grid grid-cols-2 gap-3">
                    {renderField("nombre_padre", "Nombre del padre")}
                    {renderField("apellido_padre", "Apellido del padre")}
                    {renderField("nombre_madre", "Nombre de la madre")}
                    {renderField("apellido_madre", "Apellido de la madre")}
                    {renderSelect("estado_familia", "Estado de familia", ["Soltero", "Casado", "Divorciado", "Viudo"], true)}
                    {renderSwitch("union_convivencial", "Unión Convivencial")}
                  </div>
                </TabsContent>

                <TabsContent value="domicilios" className="m-0 space-y-4 outline-none">
                  <div className="grid grid-cols-3 gap-3">
                    {renderField("domicilio_calle", "Calle", "Av. Salvador Maria del Carril", true)}
                    {renderField("domicilio_numero", "Número", "4551")}
                    
                    {renderField("domicilio_piso", "Piso")}
                    {renderField("domicilio_depto", "Departamento")}
                    {renderField("domicilio_sector", "Sector")}
                    
                    {renderField("domicilio_torre", "Torre")}
                    {renderField("domicilio_manzana", "Manzana")}
                    {renderField("domicilio_barrio", "Barrio")}
                    
                    {renderField("domicilio_localidad", "Localidad", "CABA")}
                    {renderField("domicilio_partido_departamento", "Part./Dto.")}
                    {renderField("domicilio_provincia", "Provincia", "Capital Federal")}
                    
                    {renderField("domicilio_cp", "C.P.A.", "C1419BME")}
                    {renderField("domicilio_pais", "País", "República Argentina", true)}
                  </div>
                  {renderSwitch("domicilio_fiscal_diferente", "Completar sólo si el domicilio fiscal es distinto al real")}
                </TabsContent>

                <TabsContent value="contactos" className="m-0 space-y-4 outline-none">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 border rounded-xl p-3 bg-muted/20 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <h4 className="text-sm font-semibold">Cumplimiento Normativo (UIF)</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderSwitch("es_pep", "¿Es Persona Expuesta Políticamente (PEP)?")}
                        {renderSelect("riesgo_uif", "Nivel de Riesgo UIF", ["Falta clasificación de riesgo", "Bajo", "Medio", "Alto"])}
                      </div>
                    </div>

                    {renderField("telefono", "Teléfono Principal", "+54 9 11...")}
                    {renderField("telefonos_adicionales", "Teléfono 2")}
                    
                    {renderField("email", "E-Mail 1", "correo@ejemplo.com")}
                    {renderField("emails_adicionales", "E-Mail 2")}
                    
                    {renderField("pagina_web", "Web", "https://...", true)}
                  </div>
                </TabsContent>
              </div>

              <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => {
                      const tabs = ["personales", "impositivos", "filiacion", "domicilios", "contactos"];
                      const currentIdx = tabs.indexOf(activeTab);
                      if (currentIdx < tabs.length - 1) setActiveTab(tabs[currentIdx + 1]);
                    }}
                    className={activeTab === "contactos" ? "hidden" : ""}
                  >
                    Siguiente Pestaña
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {cliente ? "Guardar Cambios" : "Guardar Cliente Completo"}
                  </Button>
                </div>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
