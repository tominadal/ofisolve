import { TipoDocumentoGenerable } from "./types"

/**
 * Tipos de documentos generables por la IA
 * Estos se muestran en el panel derecho de generación
 */
export const TIPOS_DOCUMENTOS_GENERABLES: TipoDocumentoGenerable[] = [
  { 
    id: "certificacion_firma", 
    nombre: "Certificación de Firma", 
    descripcion: "Firma en presencia del escribano",
    categoria: 'certificacion',
    icono: 'stamp'
  },
  { 
    id: "certificacion_fotocopia", 
    nombre: "Certificación de Fotocopia", 
    descripcion: "Reproducción fiel de original",
    categoria: 'certificacion',
    icono: 'stamp'
  },
  { 
    id: "autorizacion_viaje", 
    nombre: "Autorización de Viaje", 
    descripcion: "Para menores de edad (Exterior)",
    categoria: 'acta',
    icono: 'scroll'
  },
  { 
    id: "certificado_supervivencia", 
    nombre: "Certificado Supervivencia", 
    descripcion: "Acredita existencia física",
    categoria: 'acta',
    icono: 'signature'
  },
  { 
    id: "poder_especial", 
    nombre: "Poder Especial", 
    descripcion: "Para un fin determinado",
    categoria: 'acta',
    icono: 'signature'
  },
  { 
    id: "poder_general", 
    nombre: "Poder General", 
    descripcion: "Administración general",
    categoria: 'acta',
    icono: 'signature'
  },
  { 
    id: "consulta_legal", 
    nombre: "Consulta Legal", 
    descripcion: "Consulta de normativa general",
    categoria: 'certificacion',
    icono: 'gavel'
  },
]
