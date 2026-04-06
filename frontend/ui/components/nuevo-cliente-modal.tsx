"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { UserPlus, Loader2 } from "lucide-react"
import { ofisolveApi } from "@/lib/api"

const clientSchema = z.object({
  nombre_completo: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  dni: z.string().min(7, "DNI no válido"),
  cuit: z.string().optional(),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  domicilio: z.string().optional(),
  tipo_persona: z.enum(["Fisica", "Juridica"]).default("Fisica"),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface NuevoClienteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (cliente: any) => void
  workspaceId: number
}

export function NuevoClienteModal({ isOpen, onClose, onSuccess, workspaceId }: NuevoClienteModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nombre_completo: "",
      dni: "",
      cuit: "",
      email: "",
      telefono: "",
      domicilio: "",
      tipo_persona: "Fisica",
    },
  })


  async function onSubmit(values: ClientFormValues) {
    setIsSubmitting(true)
    try {
      // Usar el cliente API tipado en lugar de fetch hardcodeado
      const newClient = await ofisolveApi.crearCliente(workspaceId, {
        nombre_completo: values.nombre_completo,
        dni: values.dni,
        cuit: values.cuit,
        email: values.email,
        telefono: values.telefono,
        domicilio: values.domicilio,
        tipo_persona: values.tipo_persona as any
      })

      toast.success("Cliente registrado con éxito")
      onSuccess(newClient)
      form.reset()
      onClose()
    } catch (error: any) {
      toast.error(error.message || "Error al crear cliente")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-white/5 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="h-5 w-5 text-indigo-400" />
            Registrar Nuevo Cliente
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Completa los datos del ciudadano o empresa para el ecosistema notarial.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre_completo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-slate-300">Nombre Completo / Razón Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Juan Pérez" {...field} className="bg-white/5 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">DNI</FormLabel>
                    <FormControl>
                      <Input placeholder="8 digitos" {...field} className="bg-white/5 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">CUIT / CUIL</FormLabel>
                    <FormControl>
                      <Input placeholder="11 digitos" {...field} className="bg-white/5 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} className="bg-white/5 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 9..." {...field} className="bg-white/5 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domicilio"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-slate-300">Domicilio Real</FormLabel>
                    <FormControl>
                      <Input placeholder="Calle, Número, Localidad" {...field} className="bg-white/5 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Registrar Cliente"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
