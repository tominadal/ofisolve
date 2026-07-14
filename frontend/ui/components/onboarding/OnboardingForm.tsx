"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";

// Esquema Zod con todas las validaciones
const onboardingSchema = z.object({
  // Paso 1: Identidad
  nacionalidad: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  lugar_nacimiento: z.string().optional(),
  tipo_documento: z.string().optional(),
  emision_documento: z.string().optional(),
  vencimiento_documento: z.string().optional(),
  tramite_nro_documento: z.string().optional(),
  ejemplar_documento: z.string().optional(),
  
  // Paso 2: Filiación y Estado Civil
  nombre_padre: z.string().optional(),
  apellido_padre: z.string().optional(),
  nombre_madre: z.string().optional(),
  apellido_madre: z.string().optional(),
  estado_familia: z.string().optional(),
  union_convivencial: z.boolean().optional(),

  // Paso 3: Datos Impositivos
  tipo_documento_impositivo: z.string().optional(),
  cuit: z.string().optional(),
  condicion_iva: z.string().optional(),
  inscripto_ganancias: z.boolean().optional(),

  // Paso 4: Contacto y Domicilio
  telefonos_adicionales: z.string().optional(),
  emails_adicionales: z.string().optional(),
  domicilio_calle: z.string().optional(),
  domicilio_numero: z.string().optional(),
  domicilio_piso: z.string().optional(),
  domicilio_depto: z.string().optional(),
  domicilio_localidad: z.string().optional(),
  domicilio_provincia: z.string().optional(),
  domicilio_cp: z.string().optional(),
  domicilio_pais: z.string().optional(),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: "identidad", title: "Identidad" },
  { id: "filiacion", title: "Familia" },
  { id: "impositivos", title: "Impuestos" },
  { id: "contacto", title: "Contacto" },
];

export default function OnboardingForm({
  initialData,
  token,
}: {
  initialData: any;
  token: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Formatear fechas para los inputs type="date"
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    return dateString.split("T")[0]; // YYYY-MM-DD
  };

  const defaultValues: OnboardingData = {
    nacionalidad: initialData.nacionalidad || "",
    fecha_nacimiento: formatDateForInput(initialData.fecha_nacimiento),
    lugar_nacimiento: initialData.lugar_nacimiento || "",
    tipo_documento: initialData.tipo_documento || "",
    emision_documento: formatDateForInput(initialData.emision_documento),
    vencimiento_documento: formatDateForInput(initialData.vencimiento_documento),
    tramite_nro_documento: initialData.tramite_nro_documento || "",
    ejemplar_documento: initialData.ejemplar_documento || "",
    
    nombre_padre: initialData.nombre_padre || "",
    apellido_padre: initialData.apellido_padre || "",
    nombre_madre: initialData.nombre_madre || "",
    apellido_madre: initialData.apellido_madre || "",
    estado_familia: initialData.estado_familia || "",
    union_convivencial: initialData.union_convivencial || false,

    tipo_documento_impositivo: initialData.tipo_documento_impositivo || "",
    cuit: initialData.cuit || "",
    condicion_iva: initialData.condicion_iva || "",
    inscripto_ganancias: initialData.inscripto_ganancias || false,

    telefonos_adicionales: initialData.telefonos_adicionales || "",
    emails_adicionales: initialData.emails_adicionales || "",
    domicilio_calle: initialData.domicilio_calle || "",
    domicilio_numero: initialData.domicilio_numero || "",
    domicilio_piso: initialData.domicilio_piso || "",
    domicilio_depto: initialData.domicilio_depto || "",
    domicilio_localidad: initialData.domicilio_localidad || "",
    domicilio_provincia: initialData.domicilio_provincia || "",
    domicilio_cp: initialData.domicilio_cp || "",
    domicilio_pais: initialData.domicilio_pais || "",
  };

  const { register, handleSubmit, watch, formState: { errors } } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues,
  });

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      // Limpiar strings vacíos que deberían ser null en la base de datos
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === "" ? null : v])
      );

      const response = await fetch(`${apiUrl}/onboarding/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) throw new Error("Error al guardar");

      setIsSuccess(true);
      toast.success("¡Datos guardados exitosamente!");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un problema al guardar los datos. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((prev) => prev + 1);
  };
  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  // UI Components helpers
  const InputGroup = ({ label, name, type = "text", placeholder = "" }: any) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
      />
      {errors[name as keyof OnboardingData] && (
        <span className="text-xs text-red-500 mt-1">Error en el campo</span>
      )}
    </div>
  );

  const SelectGroup = ({ label, name, options }: any) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <select
        {...register(name)}
        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm appearance-none"
      >
        <option value="">Seleccionar...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  const CheckboxGroup = ({ label, name }: any) => (
    <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
      <input
        type="checkbox"
        id={name}
        {...register(name)}
        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
      />
      <label htmlFor={name} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        {label}
      </label>
    </div>
  );

  if (isSuccess) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center transition-all duration-500 animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Datos Guardados!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Hemos recibido su información correctamente. Puede cerrar esta pestaña y avisarle a la escribanía.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-500/5 transition-all duration-300">
      
      {/* Progress Wizard */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10 -translate-y-1/2"></div>
        <div 
          className="absolute left-0 top-1/2 h-0.5 bg-blue-600 -z-10 -translate-y-1/2 transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        ></div>
        
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center gap-2">
            <div 
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-300
                ${idx < currentStep ? 'bg-blue-600 border-blue-600 text-white' : 
                  idx === currentStep ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600' : 
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}
            >
              {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : (idx + 1)}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${idx <= currentStep ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        {/* Step Content with basic fade animation */}
        <div className="min-h-[400px] animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* STEP 1: IDENTIDAD */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Datos de Identidad
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputGroup label="Nacionalidad" name="nacionalidad" />
                <InputGroup label="Lugar de Nacimiento" name="lugar_nacimiento" />
                <InputGroup label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" />
                
                <SelectGroup label="Tipo de Documento" name="tipo_documento" options={["DNI", "Pasaporte", "LC", "LE"]} />
                <InputGroup label="Emisión del Documento" name="emision_documento" type="date" />
                <InputGroup label="Vencimiento" name="vencimiento_documento" type="date" />
                
                <InputGroup label="Nº de Trámite (11 dígitos)" name="tramite_nro_documento" placeholder="00000000000" />
                <InputGroup label="Ejemplar" name="ejemplar_documento" placeholder="Ej: A, B, C" />
              </div>
            </div>
          )}

          {/* STEP 2: FILIACION */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Filiación y Estado Civil
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputGroup label="Nombre del Padre" name="nombre_padre" />
                <InputGroup label="Apellido del Padre" name="apellido_padre" />
                
                <InputGroup label="Nombre de la Madre" name="nombre_madre" />
                <InputGroup label="Apellido de la Madre" name="apellido_madre" />
                
                <SelectGroup label="Estado Civil / de Familia" name="estado_familia" 
                  options={["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Separado/a de hecho"]} 
                />
                <div className="pt-7">
                  <CheckboxGroup label="¿Posee Unión Convivencial registrada?" name="union_convivencial" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: IMPOSITIVOS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Datos Impositivos (AFIP)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SelectGroup label="Documento Impositivo" name="tipo_documento_impositivo" options={["CUIT", "CUIL", "CDI"]} />
                <InputGroup label="Número de CUIT/CUIL" name="cuit" placeholder="XX-XXXXXXXX-X" />
                
                <SelectGroup label="Condición frente al IVA" name="condicion_iva" 
                  options={["Consumidor Final", "Responsable Inscripto", "Monotributo", "Exento", "No Alcanzado"]} 
                />
                <div className="pt-7">
                  <CheckboxGroup label="¿Se encuentra inscripto en Ganancias?" name="inscripto_ganancias" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONTACTO */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Contacto y Domicilio Real
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputGroup label="Teléfonos (Adicionales)" name="telefonos_adicionales" placeholder="Separados por coma" />
                <InputGroup label="Emails (Adicionales)" name="emails_adicionales" placeholder="Separados por coma" />
                
                <div className="sm:col-span-2 grid grid-cols-12 gap-5">
                  <div className="col-span-12 sm:col-span-8">
                    <InputGroup label="Calle" name="domicilio_calle" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <InputGroup label="Número" name="domicilio_numero" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <InputGroup label="Piso/Depto" name="domicilio_piso" placeholder="Ej: 3B" />
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <InputGroup label="Localidad / Ciudad" name="domicilio_localidad" />
                  <InputGroup label="Provincia" name="domicilio_provincia" />
                  <InputGroup label="Código Postal" name="domicilio_cp" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Controls */}
        <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Atrás
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSubmitting ? "Guardando..." : "Guardar Ficha"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
