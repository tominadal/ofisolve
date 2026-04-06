"use client"

/**
 * =============================================================================
 * OFISOLVE - Sistema de IA para Escribanias Argentinas
 * =============================================================================
 * 
 * Este componente es la interfaz principal del asistente de IA para escribanias.
 * Implementa un layout de tres paneles redimensionables (sidebar, chat, auditoria)
 * inspirado en Google NotebookLM, adaptado para el flujo de trabajo notarial.
 * 
 * ARQUITECTURA:
 * - Panel Izquierdo: Gestion de fuentes documentales, workspaces y configuracion
 * - Area Central: Chat conversacional con el asistente de IA
 * - Panel Derecho: Generacion de documentos y auditoria legal
 * 
 * INTEGRACION CON BACKEND:
 * Este componente esta preparado para conectarse con un backend que provea:
 * 
 * API DE AUTENTICACION:
 * - GET  /api/auth/me              - Obtener usuario actual
 * - POST /api/auth/login           - Iniciar sesion
 * - POST /api/auth/logout          - Cerrar sesion
 * - PUT  /api/auth/profile         - Actualizar perfil
 * - PUT  /api/auth/password        - Cambiar contrasena
 * 
 * API DE WORKSPACES:
 * - GET  /api/workspaces           - Listar workspaces del usuario
 * - POST /api/workspaces           - Crear nuevo workspace
 * - PUT  /api/workspaces/:id       - Actualizar workspace
 * - DELETE /api/workspaces/:id     - Eliminar workspace
 * 
 * API DE TRAMITES:
 * - GET  /api/tramites             - Listar tramites del workspace actual
 * - POST /api/tramites             - Crear nuevo tramite
 * - PUT  /api/tramites/:id         - Actualizar tramite
 * - DELETE /api/tramites/:id       - Eliminar tramite
 * 
 * API DE DOCUMENTOS:
 * - GET  /api/tramites/:id/documentos           - Listar documentos de un tramite
 * - POST /api/tramites/:id/documentos           - Subir documento
 * - DELETE /api/tramites/:id/documentos/:docId  - Eliminar documento
 * - POST /api/tramites/:id/documentos/link      - Agregar link como fuente
 * 
 * API DE CHAT (con streaming):
 * - POST /api/chat                 - Enviar mensaje y recibir respuesta (streaming)
 * - GET  /api/tramites/:id/mensajes - Obtener historial de mensajes
 * 
 * API DE GENERACION:
 * - POST /api/generar-documento    - Generar documento con IA
 * - GET  /api/tramites/:id/documentos-generados - Listar documentos generados
 * - GET  /api/documentos-generados/:id/preview  - Obtener preview del documento
 * 
 * API DE AUDITORIA:
 * - GET  /api/tramites/:id/alertas - Obtener alertas de auditoria
 * - POST /api/verificar-renaper    - Verificar identidad con RENAPER
 * 
 * API DE CONFIGURACION:
 * - GET  /api/config               - Obtener configuracion del usuario
 * - PUT  /api/config               - Actualizar configuracion
 * 
 * VARIABLES DE ENTORNO REQUERIDAS:
 * - OPENAI_API_KEY      - Clave de API de OpenAI (o modelo similar)
 * - DATABASE_URL        - URL de la base de datos
 * - STORAGE_URL         - URL del storage para documentos
 * - RENAPER_API_KEY     - Clave de API de RENAPER (opcional)
 * - NEXTAUTH_SECRET     - Secret para autenticacion
 * 
 * @author OfiSolve Team
 * @version 3.0.0
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { ofisolveApi } from "@/lib/api"
import type { 
  CertificacionResponse, 
  ClienteResponse, 
  EquipoMiembroResponse,
  TramiteResponse,
  Usuario,
  Workspace,
  Tramite,
  DocumentoFuente,
  MensajeChat,
  AlertaLegal,
  DocumentoGenerado,
  TipoDocumentoGenerable
} from "@/lib/types"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  FileType2,
  FileImage,
  FileSpreadsheet,
  Link2,
  Moon,
  Sun,
  Plus,
  Send,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  FileCheck,
  FileCheck2,
  FilePlus,
  Download,
  DownloadCloud,
  Eye,
  Loader2,
  Upload,
  FolderOpen,
  Settings,
  LogOut,
  User,
  UserIcon,
  UserCog,
  Building2,
  Globe,
  HelpCircle,
  Briefcase,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Check,
  Stamp,
  ScrollText,
  FileSignature,
  Scale,
  Gavel,
  History,
  Sparkles,
  Zap,
  ArrowRight,
  Search,
  Lock,
  Mail,
  Bell,
  Palette,
  KeyRound,
  UserPlus,
  Users
} from "lucide-react"

// Nuevos componentes Fase 4
import { LoginView } from "@/components/login-view"
import { NotarialEditor } from "@/components/notarial-editor"
import { NuevoClienteModal } from "@/components/nuevo-cliente-modal"
// @ts-ignore
import ReactMarkdown from "react-markdown"
// @ts-ignore
import remarkGfm from "remark-gfm"


import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================// --- Interfaces locales removidas para usar las de @/lib/types ---

/**
 * =============================================================================
 * DATOS DE PRUEBA (MOCKS) - Se reemplazaran por llamadas API
 * =============================================================================
 */

// UUID constante para el tenant de prueba (OfiSolve Demo)
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"

const USUARIO_MOCK: Usuario = {
  id: '1',
  tenant_id: DEFAULT_TENANT_ID,
  nombre: 'Tomas Escribano',
  email: 'tomas@eltanook.com',
  rol: 'escribano',
  escribaniaId: '1',
  escribaniaNombre: 'Escribania del Tanook S.A.',
  telefono: '+54 9 11 1234-5678'
}

const WORKSPACES_MOCK: Workspace[] = [
  {
    id: '1',
    tenant_id: DEFAULT_TENANT_ID,
    nombre: 'Tramites Familiares',
    descripcion: 'Poderes, autorizaciones y sucesiones fluviales',
    color: 'blue',
    tramitesCount: 8,
    ultimaActividad: new Date()
  },
  {
    id: '2',
    tenant_id: DEFAULT_TENANT_ID,
    nombre: 'Inmuebles CABA',
    descripcion: 'Escrituras y reglamentos de propiedad horizontal',
    color: 'green',
    tramitesCount: 15,
    ultimaActividad: new Date(Date.now() - 86400000)
  },
  {
    id: '3',
    tenant_id: DEFAULT_TENANT_ID,
    nombre: 'Sociedades',
    descripcion: 'Constituciones y actas de directorio',
    color: 'purple',
    tramitesCount: 4,
    ultimaActividad: new Date(Date.now() - 172800000)
  }
]

const TRAMITES_MOCK: Tramite[] = [
  {
    id: 101,
    tenant_id: DEFAULT_TENANT_ID,
    nombre: 'Certificacion de Firmas - Juan Perez',
    estado: 'en_progreso',
    tipo: 'Certificacion',
    workspaceId: '1',
    fechaCreacion: new Date(Date.now() - 3600000),
    fechaActualizacion: new Date()
  },
  {
    id: 102,
    tenant_id: DEFAULT_TENANT_ID,
    nombre: 'Poder Especial para Venta - Maria Garcia',
    estado: 'borrador',
    tipo: 'Poder',
    workspaceId: '1',
    fechaCreacion: new Date(Date.now() - 86400000),
    fechaActualizacion: new Date(Date.now() - 82800000)
  },
  {
    id: 103,
    tenant_id: DEFAULT_TENANT_ID,
    nombre: 'Autorizacion Viaje Menor - Familia Lopez',
    estado: 'completado',
    tipo: 'Certificacion',
    workspaceId: '1',
    fechaCreacion: new Date(Date.now() - 172800000),
    fechaActualizacion: new Date(Date.now() - 169200000)
  }
]

/**
 * TODO: Reemplazar con GET /api/tramites/:id/documentos
 */
const documentosFuenteMock: DocumentoFuente[] = [
  { id: 1, nombre: 'DNI_Frente.pdf', tipo: 'pdf', url: '#', seleccionado: true, fechaSubida: new Date() },
  { id: 2, nombre: 'DNI_Dorso.pdf', tipo: 'pdf', url: '#', seleccionado: true, fechaSubida: new Date() },
  { id: 3, nombre: 'Titulo_Propiedad.pdf', tipo: 'pdf', url: '#', seleccionado: true, fechaSubida: new Date() },
  { id: 4, nombre: 'Boleta_ABL.pdf', tipo: 'pdf', url: '#', seleccionado: false, fechaSubida: new Date() },
]


/**
 * TODO: Reemplazar con GET /api/tramites/:id/mensajes
 */
const mensajesChatMock: MensajeChat[] = [
  {
    id: 1,
    tipo: "ia",
    contenido: "👋 ¡Hola! Soy OfiSolve, tu asistente notarial para la Ciudad Autónoma de Buenos Aires.\n\nEstoy configurado para aplicar la **Ley 404** y el **Reglamento de Certificaciones del CECBA**.\n\nAsegurate de revisar la Identidad física (DNI último ejemplar) o seleccionar un Cliente arriba. Usa la *Librería Legal* a la izquierda para restringir mis respuestas, o usa los atajos rápidos de la derecha para generar certificaciones extraprotocolares en 1 click.",
    timestamp: new Date('2026-03-29T10:00:00')
  }
]

/**
 * TODO: Reemplazar con GET /api/tramites/:id/alertas
 */
const alertasLegalesMock: AlertaLegal[] = []

/**
 * Tipos de documentos generables por la IA
 * Estos se muestran en el panel derecho
 */
const tiposDocumentosGenerables: TipoDocumentoGenerable[] = [
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
]

/**
 * TODO: Reemplazar con GET /api/tramites/:id/documentos-generados
 */
const documentosGeneradosMock: DocumentoGenerado[] = []

/**
 * Chips de sugerencias rapidas para el chat
 * TODO: Pueden ser dinamicos basados en el contexto del tramite
 */
const sugerenciasChips = [
  "Validar Identidad RENAPER",
  "Certificar firma",
  "Autorización de viaje",
  "Certificar fotocopia",
]

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function OfiSolve() {
  // ---------------------------------------------------------------------------
  // ESTADO DE LA UI
  // ---------------------------------------------------------------------------
  
  /** Estado de visibilidad del panel izquierdo */
  const [panelIzquierdoVisible, setPanelIzquierdoVisible] = useState(true)
  
  /** Estado de visibilidad del panel derecho */
  const [panelDerechoVisible, setPanelDerechoVisible] = useState(true)
  
  /** Tema claro/oscuro */
  const [theme, setTheme] = useState<"light" | "dark">("light")
  
  /** Estado del dialogo de subir documento */
  const [dialogSubirDocumento, setDialogSubirDocumento] = useState(false)
  
  /** Estado del dialogo de configuracion */
  const [dialogConfiguracion, setDialogConfiguracion] = useState(false)
  
  /** Estado del dialogo de nuevo workspace */
  const [dialogNuevoWorkspace, setDialogNuevoWorkspace] = useState(false)
  
  /** Estado del dialogo de nuevo tramite */
  const [dialogNuevoTramite, setDialogNuevoTramite] = useState(false)
  
  /** Estado del dialogo de editar perfil */
  const [dialogEditarPerfil, setDialogEditarPerfil] = useState(false)
  
  /** Estado del dialogo de cambiar contrasena */
  const [dialogCambiarContrasena, setDialogCambiarContrasena] = useState(false)
  
  /** Estado del dialogo de previsualizacion de documento */
  const [dialogPreviewDocumento, setDialogPreviewDocumento] = useState(false)
  
  /** Documento seleccionado para preview */
  const [documentoPreview, setDocumentoPreview] = useState<DocumentoGenerado | null>(null)
  
  /** Tab activa en el dialogo de subir documento */
  const [tabSubirDocumento, setTabSubirDocumento] = useState<string>("archivo")
  
  /** Tab activa en el dialogo de configuracion */
  const [tabConfiguracion, setTabConfiguracion] = useState<string>("apariencia")
  
  /** Estado del dropdown de tramites */
  const [dropdownTramitesAbierto, setDropdownTramitesAbierto] = useState(false)
  
  /** Referencia al input de archivo */
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  
  /** Archivos seleccionados para subir */
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([])
  
  /** URL del link a agregar */
  const [linkUrl, setLinkUrl] = useState("")
  
  /** Estado de carga del upload */
  const [subiendoArchivos, setSubiendoArchivos] = useState(false)
  
  /** Referencia al scroll del chat */
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // ESTADO DE DATOS
  // ---------------------------------------------------------------------------
  
  const [isMounted, setIsMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(USUARIO_MOCK)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [workspaces, setWorkspaces] = useState<Workspace[]>(WORKSPACES_MOCK)
  const [workspaceActual, setWorkspaceActual] = useState<Workspace | null>(WORKSPACES_MOCK[0])
  const [tramiteActual, setTramiteActual] = useState<Tramite | null>(TRAMITES_MOCK[0])
  const [tramites, setTramites] = useState<Tramite[]>(TRAMITES_MOCK)
  const [documentosFuente, setDocumentosFuente] = useState<DocumentoFuente[]>(documentosFuenteMock)
  const [mensajesChat, setMensajesChat] = useState<MensajeChat[]>(mensajesChatMock)
  const [alertasLegales, setAlertasLegales] = useState<AlertaLegal[]>([])
  const [documentosGenerados, setDocumentosGenerados] = useState<DocumentoGenerado[]>([])

  /** Clientes locales cargados */
  const [clientes, setClientes] = useState<ClienteResponse[]>([])
  const [clienteActual, setClienteActual] = useState<ClienteResponse | null>(null)
  
  /** Equipo de la escribania */
  const [equipo, setEquipo] = useState<EquipoMiembroResponse[]>([])
  const [miembroAsignado, setMiembroAsignado] = useState<EquipoMiembroResponse | null>(null)

  /** Control del popover de clientes */
  const [comboboxClientesAbierto, setComboboxClientesAbierto] = useState(false)

  const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false)
  const [editorContent, setEditorContent] = useState("")

  // ---------------------------------------------------------------------------
  // ESTADO DEL CHAT
  // ---------------------------------------------------------------------------
  
  const [inputMensaje, setInputMensaje] = useState("")
  const [enviandoMensaje, setEnviandoMensaje] = useState(false)
  const [datosExtraidos, setDatosExtraidos] = useState<any>(null)
  const [generandoDocumento, setGenerandoDocumento] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAgentNode, setCurrentAgentNode] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState("")
  
  // ---------------------------------------------------------------------------
  // ESTADO DE FORMULARIOS
  // ---------------------------------------------------------------------------
  
  const [formPerfil, setFormPerfil] = useState({ nombre: "", email: "", telefono: "" })
  const [formContrasena, setFormContrasena] = useState({ actual: "", nueva: "", confirmar: "" })
  const [formWorkspace, setFormWorkspace] = useState({ nombre: "", descripcion: "" })
  const [formTramite, setFormTramite] = useState({ nombre: "", tipo: "" })

  // ---------------------------------------------------------------------------
  // EFECTOS DE INICIALIZACIÓN
  // ---------------------------------------------------------------------------

  // Montaje único y recuperación de sesión
  useEffect(() => {
    setIsMounted(true)
    const storedToken = localStorage.getItem("ofisolve_token")
    if (storedToken) {
      setToken(storedToken)
      ofisolveApi.setToken(storedToken)
    }
  }, [])

  // Carga de perfil y datos globales
  useEffect(() => {
    if (!isMounted || !token) return

    ofisolveApi.obtenerPerfil()
      .then(u => {
        setUsuario(u)
        setIsAuthenticated(true)
      })
      .catch(err => {
        console.error("Error cargando perfil:", err)
        setUsuario(USUARIO_MOCK)
      })

    ofisolveApi.obtenerWorkspaces()
      .then(data => {
        const mappedWorkspaces: Workspace[] = data.map(w => ({
          id: w.id.toString(),
          tenant_id: DEFAULT_TENANT_ID,
          nombre: w.nombre,
          descripcion: w.descripcion,
          color: 'blue',
          tramitesCount: w.tramites?.length || 0,
          ultimaActividad: new Date(w.fecha_creacion)
        }))
        setWorkspaces(mappedWorkspaces)
        
        if (mappedWorkspaces.length > 0) {
          const w = mappedWorkspaces[0]
          setWorkspaceActual(w)
          
          ofisolveApi.obtenerTramites(Number(w.id))
            .then(data => {
              const parsed: Tramite[] = data.map(t => ({
                id: t.id,
                tenant_id: DEFAULT_TENANT_ID,
                nombre: t.nombre,
                estado: t.estado as any,
                tipo: t.tipo,
                workspaceId: t.workspace_id.toString(),
                fechaCreacion: new Date(t.fecha_creacion),
                fechaActualizacion: new Date(t.fecha_actualizacion)
              }))
              setTramites(parsed)
              if (parsed.length > 0) setTramiteActual(parsed[0])
            })
        }
      })
  }, [isMounted, token])

  // Carga de contexto de Workspace
  useEffect(() => {
    if (workspaceActual?.id && token) {
      const wsId = Number(workspaceActual.id)
      if (!isNaN(wsId)) {
        ofisolveApi.obtenerTramites(wsId)
          .then(data => {
            const parsed = data.map(t => ({
              id: t.id,
              tenant_id: DEFAULT_TENANT_ID,
              nombre: t.nombre,
              estado: t.estado as any,
              tipo: t.tipo,
              workspaceId: t.workspace_id.toString(),
              fechaCreacion: new Date(t.fecha_creacion),
              fechaActualizacion: new Date(t.fecha_actualizacion)
            }))
            setTramites(parsed)
            if (parsed.length > 0 && !tramiteActual) setTramiteActual(parsed[0])
          })
        
        ofisolveApi.obtenerClientes(wsId).then(setClientes)
        ofisolveApi.obtenerEquipo(wsId).then(setEquipo)
        
        ofisolveApi.obtenerFuentesRag().then(data => {
          setDocumentosFuente(data.map(f => ({
            id: f.id,
            nombre: f.titulo,
            tipo: f.tipo,
            url: f.fuente,
            seleccionado: true,
            fechaSubida: new Date()
          })))
        })
      }
    }
  }, [workspaceActual, token])

  // Sincronizar form perfil
  useEffect(() => {
    if (usuario) {
      setFormPerfil({
        nombre: usuario.nombre || "",
        email: usuario.email || "",
        telefono: usuario.telefono || ""
      })
    }
  }, [usuario])

  // UI Effects: Theme & Scroll
  useEffect(() => {
    const savedTheme = localStorage.getItem("ofisolve-theme") as "light" | "dark" | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    }
  }, [])
  
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [mensajesChat])

  /**
   * Inicializa el tema desde localStorage o preferencia del sistema
   * Se ejecuta solo en el cliente para evitar hydration mismatch
   */
  useEffect(() => {
    const savedTheme = localStorage.getItem("ofisolve-theme") as "light" | "dark" | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    }
  }, [])
  
  /**
   * Scroll automatico al final del chat cuando hay nuevos mensajes
   */
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [mensajesChat])

  // ---------------------------------------------------------------------------
  // HANDLERS DE TEMA Y UI
  // ---------------------------------------------------------------------------

  /**
   * Alterna entre tema claro y oscuro
   * Persiste la preferencia en localStorage
   */
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("ofisolve-theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }, [theme])

  /**
   * Cierra la sesion del usuario
   */
  const handleLogout = useCallback(() => {
    localStorage.removeItem("ofisolve_token")
    setToken(null)
    toast.success("Sesion cerrada correctamente")
  }, [])

  // ---------------------------------------------------------------------------
  // HANDLERS DE CHAT
  // ---------------------------------------------------------------------------

  /**
   * Envia un mensaje al chat e inicia el flujo de streaming SSE
   */
  const enviarMensaje = useCallback(async (overrideText?: string) => {
    const textoUsuario = overrideText || inputMensaje
    if (!textoUsuario?.trim() || enviandoMensaje || !tramiteActual) return
    
    // 1. Preparar Mensaje de Usuario
    const nuevoMensaje: MensajeChat = {
      id: Date.now(),
      tipo: "usuario",
      contenido: textoUsuario,
      timestamp: new Date()
    }
    setMensajesChat(prev => [...prev, nuevoMensaje])
    setInputMensaje("")
    setEnviandoMensaje(true)
    setIsStreaming(true)
    setCurrentAgentNode("Ofuscando")

    // 2. Preparar Placeholder de Respuesta de IA
    const aiMessageId = Date.now() + 1
    const placeholderIA: MensajeChat = {
      id: aiMessageId,
      tipo: "ia",
      contenido: "",
      timestamp: new Date()
    }
    setMensajesChat(prev => [...prev, placeholderIA])

    let accumulatedText = ""
    
    try {
      // 3. Iniciar Stream con el Backend SaaS (Fase 4)
      const tenantId = workspaceActual?.tenant_id || usuario?.tenant_id || ""
      
      await ofisolveApi.streamTramiteChat(
        textoUsuario,
        tramiteActual.id.toString(),
        tenantId,
        (event) => {
          if (event.event === "estado") {
            // event.mensaje es el texto amigable (ej: "Ofuscando...")
            setCurrentAgentNode(event.mensaje || event.nodo)
          } 
          else if (event.event === "token") {
            accumulatedText += event.texto
            setStreamingText(accumulatedText)
            
            // Actualizar mensaje en el chat
            setMensajesChat(prev => prev.map(m => 
              m.id === aiMessageId ? { ...m, contenido: accumulatedText } : m
            ))
          }
          else if (event.event === "finalizado") {
            setIsStreaming(false)
            setCurrentAgentNode(null)
            setEditorContent(accumulatedText)
            toast.success("Documento finalizado. Listo para revisión editando en el panel derecho.")
          }
          else if (event.event === "error") {
            throw new Error(event.mensaje)
          }
        }
      )
    } catch (error: any) {
      console.error("Error en streaming:", error)
      setMensajesChat(prev => prev.map(m => 
        m.id === aiMessageId ? { ...m, contenido: `❌ Error: ${error.message || "Se perdió la conexión con el servidor"}` } : m
      ))
    } finally {
      setEnviandoMensaje(false)
      setIsStreaming(false)
    }
  }, [inputMensaje, enviandoMensaje, workspaceActual, tramiteActual, usuario])

  /**
   * Maneja el click en un chip de sugerencia
   */
  const handleChipClick = useCallback((chip: string) => {
    enviarMensaje(chip)
  }, [enviarMensaje])

  // ---------------------------------------------------------------------------
  // HANDLERS DE DOCUMENTOS
  // ---------------------------------------------------------------------------

  /**
   * Genera un documento del tipo especificado
   */
  const generarDocumento = useCallback(async (tipoDocumento: string) => {
    if (!tramiteActual) return
    setGenerandoDocumento(tipoDocumento)
    
    try {
      // Mapear el ID del tipo de doc al tipo que espera el backend
      const tipoMap: Record<string, string> = {
        "certificacion_firma": "firma",
        "certificacion_fotocopia": "fotocopia",
        "autorizacion_viaje": "viaje_menores",
        "certificado_supervivencia": "supervivencia",
      }
      
      const tipoBackend = tipoMap[tipoDocumento]
      
      if (!tipoBackend) {
        // Para tipos no certificables aún (poderes, actas, escrituras)
        alert(`El tipo "${tipoDocumento}" aún no está disponible. Próximamente.`)
        setGenerandoDocumento(null)
        return
      }

      // Usar datos del trámite actual o clienteActual como contexto
      const cert = await ofisolveApi.generarCertificacion(
        {
          nombre_requirente: clienteActual?.nombre_completo || "Juan Carlos Perez",
          dni: clienteActual?.dni || "35123456",
          tipo_documento_a_certificar: tipoBackend as any,
          fuentes_seleccionadas: documentosFuente.filter(d => d.seleccionado).map(d => d.nombre)
        },
        {
          nombre_escribano: usuario?.nombre || "Escribano",
          nro_registro: "123",
        }
      )

      // Agregamos al lateral
      setDocumentosGenerados(prev => [{
        id: Date.now(),
        nombre: cert.ruta_descarga ? cert.ruta_descarga.split(/[\\/]/).pop()! : `Cert_Rapida.docx`,
        tipo: tipoBackend,
        fechaGeneracion: new Date(),
        version: 1,
        certificacionId: cert.ruta_descarga || undefined,
        contenido: cert.texto_generado
      }, ...prev])

      // Agregar alerta si hubo anonimizacion
      if (cert.anonimizacion?.campos_anonimizados > 0) {
         setAlertasLegales(prev => [{
           id: Date.now(),
           tipo: 'success',
           titulo: 'Presidio: Datos Ofuscados',
           descripcion: `Se anonimizaron ${cert.anonimizacion.campos_anonimizados} entidades (${cert.anonimizacion.tipos_detectados.join(", ")}).`
         }, ...prev.filter(a => a.tipo !== 'success')])
      }

      // Mostrar resultado en el chat
      const msg: MensajeChat = {
        id: Date.now(),
        tipo: "ia",
        contenido: `✅ Documento generado exitosamente\n\nTipo: ${tipoDocumento}\nModo: ${cert.modo_llm}\nCampos protegidos: ${cert.anonimizacion?.campos_anonimizados || 0}\n\n---\n${cert.texto_generado}\n---\n\n${cert.archivo_docx ? `📄 Archivo: ${cert.archivo_docx}` : ""}`,
        referencias: [
          { id: 1, texto: "Art. 299-312 CCyCN" },
          { id: 2, texto: "Ley 404 CABA" },
        ],
        timestamp: new Date()
      }
      setMensajesChat(prev => [...prev, msg])

      // --- GUARDAR DATOS EXTRAIDOS (NUEVO) ---
      if (cert.datos_extraidos) {
        setDatosExtraidos(cert.datos_extraidos)
      }

      // Si hay archivo disponible, ofrecer descarga
      if (cert.ruta_descarga) {
        const descargar = confirm("Documento generado. ¿Desea descargar el archivo .docx?")
        if (descargar) {
          await ofisolveApi.descargarDocx(cert.ruta_descarga, cert.archivo_docx || "certificacion.docx")
        }
      }
    } catch (error: any) {
      alert(`Error al generar: ${error.message}`)
    } finally {
      setGenerandoDocumento(null)
    }
  }, [usuario?.nombre, clienteActual, documentosFuente, tramiteActual])

  /**
   * Finaliza el tramite aprobando el documento (HITL)
   */
  const handleApproveDocumento = useCallback(async (contenido: string) => {
    if (!tramiteActual || !workspaceActual) return
    
    try {
      await ofisolveApi.aprobarTramite(
        Number(workspaceActual.id),
        tramiteActual.id,
        contenido
      )
      
      // Actualizar estado local
      setTramiteActual(prev => prev ? { ...prev, estado: 'completado' } : null)
      setTramites(prev => prev.map(t => 
        t.id === tramiteActual.id ? { ...t, estado: 'completado' } : t
      ))
      
      toast.success("Trámite finalizado y documentos persistidos en base de datos.")
    } catch (error: any) {
      console.error("Error en aprobación:", error)
      throw error // Propagar al editor para mostrar el toast de error
    }
  }, [tramiteActual, workspaceActual])

  /**
   * Maneja el cambio de contenido en el editor
   */
  const handleEditorChange = useCallback((contenido: string) => {
    setEditorContent(contenido)
  }, [])

  /**
   * Descarga un documento generado
   */
  const descargarDocumento = useCallback(async (documento: DocumentoGenerado) => {
    try {
      if (documento.certificacionId) {
        const ruta = `/api/v1/generate/descargar/${documento.nombre}`
        await ofisolveApi.descargarDocx(ruta, documento.nombre)
      } else if (documento.url) {
        window.open(documento.url, '_blank')
      } else {
        alert(`El documento "${documento.nombre}" no tiene una URL de descarga disponible aún.`)
      }
    } catch (error: any) {
      alert(`Error al descargar: ${error.message}`)
    }
  }, [])

  /**
   * Previsualiza un documento generado
   */
  const previsualizarDocumento = useCallback((documento: DocumentoGenerado) => {
    setDocumentoPreview(documento)
    setDialogPreviewDocumento(true)
  }, [])
  
  /**
   * Alterna la seleccion de un documento fuente
   */
  const toggleSeleccionDocumento = useCallback((documentoId: number) => {
    setDocumentosFuente(prev => prev.map(doc => 
      doc.id === documentoId 
        ? { ...doc, seleccionado: !doc.seleccionado }
        : doc
    ))
  }, [])


  /**
   * Maneja la seleccion de archivos para subir
   */
  const handleSeleccionArchivos = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setArchivosSeleccionados(Array.from(files))
    }
  }, [])

  /**
   * Sube los archivos seleccionados
   */
  const subirArchivos = useCallback(async () => {
    if (archivosSeleccionados.length === 0 || !workspaceActual) return
    
    setSubiendoArchivos(true)
    
    try {
      for (const archivo of archivosSeleccionados) {
        await ofisolveApi.subirDocumento(Number(workspaceActual?.id), archivo)
      }
      
      toast.success(`${archivosSeleccionados.length} archivo(s) subido(s) e indexado(s) exitosamente`)
      
      // Refrescar lista de documentos
      ofisolveApi.obtenerFuentesRag().then((data: any[]) => {
        const docs = data.map((f: any) => ({
          id: f.id,
          nombre: f.titulo,
          tipo: f.tipo,
          url: f.fuente,
          seleccionado: true,
          fechaSubida: new Date()
        }))
        setDocumentosFuente(docs)
      })

      setArchivosSeleccionados([])
      setDialogSubirDocumento(false)
    } catch (error: any) {
      toast.error(`Error al subir archivos: ${error.message}`)
    } finally {
      setSubiendoArchivos(false)
    }
  }, [archivosSeleccionados, workspaceActual?.id])

  /**
   * Agrega un link como fuente
   */
  const agregarLink = useCallback(async () => {
    if (!linkUrl.trim() || !workspaceActual) return
    
    setSubiendoArchivos(true)
    
    setTimeout(() => {
      const nuevoLink: DocumentoFuente = {
        id: Date.now(),
        nombre: linkUrl,
        tipo: 'link',
        url: linkUrl,
        fechaSubida: new Date(),
        seleccionado: true
      }
      
      setDocumentosFuente(prev => [...prev, nuevoLink])
      setLinkUrl("")
      setSubiendoArchivos(false)
      setDialogSubirDocumento(false)
    }, 1000)
  }, [linkUrl, workspaceActual])

  /**
   * Elimina un documento fuente
   */
  const eliminarDocumento = useCallback((documentoId: number) => {
    if (confirm("Estas seguro de eliminar este documento?")) {
      setDocumentosFuente(prev => prev.filter(d => d.id !== documentoId))
    }
  }, [])


  // ---------------------------------------------------------------------------
  // HANDLERS DE NAVEGACION
  // ---------------------------------------------------------------------------

  /**
   * Cambia el workspace actual
   */
  const cambiarWorkspace = useCallback((workspace: Workspace) => {
    setWorkspaceActual(workspace)
  }, [])

  /**
   * Cambia el tramite actual
   */
  const cambiarTramite = useCallback((tramite: Tramite) => {
    setTramiteActual(tramite)
    setDropdownTramitesAbierto(false)
  }, [])

  /**
   * Cierra sesion del usuario
   */
  const cerrarSesion = useCallback(() => {
    alert("Cerrar sesion - Conectar con backend")
  }, [])
  
  /**
   * Guarda los cambios del perfil
   */
  const guardarPerfil = useCallback(async () => {
    setUsuario(prev => prev ? ({
      ...prev,
      nombre: formPerfil.nombre,
      email: formPerfil.email,
      telefono: formPerfil.telefono
    }) : null)
    setDialogEditarPerfil(false)
    alert("Perfil actualizado - Conectar con backend para persistir")
  }, [formPerfil])
  
  /**
   * Cambia la contrasena del usuario
   */
  const cambiarContrasena = useCallback(async () => {
    if (formContrasena.nueva !== formContrasena.confirmar) {
      alert("Las contrasenas no coinciden")
      return
    }
    setFormContrasena({ actual: "", nueva: "", confirmar: "" })
    setDialogCambiarContrasena(false)
    alert("Contrasena cambiada - Conectar con backend")
  }, [formContrasena])
  
  /**
   * Crea un nuevo workspace
   */
  const crearWorkspace = useCallback(async () => {
    if (!formWorkspace.nombre.trim()) return
    try {
      const nuevo = await ofisolveApi.crearWorkspace({
        nombre: formWorkspace.nombre,
        descripcion: formWorkspace.descripcion
      })
      const mapped: Workspace = {
        id: nuevo.id.toString(),
        tenant_id: DEFAULT_TENANT_ID,
        nombre: nuevo.nombre,
        descripcion: nuevo.descripcion,
        color: 'blue',
        tramitesCount: 0,
        ultimaActividad: new Date(nuevo.fecha_creacion)
      }
      setWorkspaces(prev => [...prev, mapped])
      setWorkspaceActual(mapped)
      setFormWorkspace({ nombre: "", descripcion: "" })
      setDialogNuevoWorkspace(false)
    } catch (err) {
      console.error(err)
      alert("Error creando workspace")
    }
  }, [formWorkspace])
  
  /**
   * Crea un nuevo tramite
   */
  const crearTramite = useCallback(async () => {
    if (!formTramite.nombre.trim() || !workspaceActual || workspaceActual?.id?.startsWith("ws_")) {
       alert("Selecciona un workspace real primero")
       return
    }
    
    try {
      const nuevo = await ofisolveApi.crearTramite(Number(workspaceActual?.id), {
        nombre: formTramite.nombre,
        tipo: formTramite.tipo
      })
      
      const mapped: Tramite = {
        id: nuevo.id,
        tenant_id: DEFAULT_TENANT_ID,
        nombre: nuevo.nombre,
        estado: nuevo.estado as any,
        tipo: nuevo.tipo,
        workspaceId: nuevo.workspace_id.toString(),
        fechaCreacion: new Date(nuevo.fecha_creacion),
        fechaActualizacion: new Date(nuevo.fecha_actualizacion)
      }
      
      setTramites(prev => [...prev, mapped])
      setTramiteActual(mapped)
      setFormTramite({ nombre: "", tipo: "" })
      setDialogNuevoTramite(false)
    } catch (err) {
      console.error(err)
      alert("Error creando tramite")
    }
  }, [formTramite, workspaceActual])

  // ---------------------------------------------------------------------------
  // FUNCIONES DE UTILIDAD
  // ---------------------------------------------------------------------------

  /**
   * Retorna el icono apropiado segun el tipo de documento
   */
  const getIconoDocumento = (tipo: string) => {
    switch (tipo) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
      case "word":
        return <FileType2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
      case "link":
        return <Link2 className="h-4 w-4 text-muted-foreground" />
      case "image":
        return <FileImage className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
      case "excel":
        return <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "legislacion":
        return <Gavel className="h-4 w-4 text-amber-500 dark:text-amber-400" />
      case "procedimiento":
        return <BookOpen className="h-4 w-4 text-sky-500 dark:text-sky-400" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }
  
  /**
   * Retorna el icono apropiado segun el tipo de documento generable
   */
  const getIconoGenerable = (icono: TipoDocumentoGenerable['icono']) => {
    switch (icono) {
      case "stamp":
        return <Stamp className="h-5 w-5" />
      case "signature":
        return <FileSignature className="h-5 w-5" />
      case "scroll":
        return <ScrollText className="h-5 w-5" />
      case "scale":
        return <Scale className="h-5 w-5" />
      case "gavel":
        return <Gavel className="h-5 w-5" />
      default:
        return <FileCheck className="h-5 w-5" />
    }
  }

  /**
   * Retorna los estilos de alerta segun el tipo
   */
  const getAlertaEstilo = (tipo: string) => {
    switch (tipo) {
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-800/50",
          icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          titleColor: "text-amber-800 dark:text-amber-300",
        }
      case "success":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-800/50",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          titleColor: "text-emerald-800 dark:text-emerald-300",
        }
      case "info":
        return {
          bg: "bg-sky-50 dark:bg-sky-950/30",
          border: "border-sky-200 dark:border-sky-800/50",
          icon: <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
          titleColor: "text-sky-800 dark:text-sky-300",
        }
      case "error":
        return {
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-200 dark:border-red-800/50",
          icon: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
          titleColor: "text-red-800 dark:text-red-300",
        }
      default:
        return {
          bg: "bg-muted",
          border: "border-border",
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
          titleColor: "text-foreground",
        }
    }
  }

  /**
   * Formatea la fecha de generacion de un documento
   */
  const formatearFecha = (fecha: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha)
  }

  /**
   * Formatea el tamano de archivo
   */
  const formatearTamano = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Obtiene el estado del tramite con estilo
   */
  const getEstadoTramite = (estado: Tramite['estado'] | string) => {
    switch (estado) {
      case 'borrador':
        return { label: 'Borrador', variant: 'secondary' as const }
      case 'en_progreso':
      case 'abierto':
        return { label: 'En progreso', variant: 'default' as const }
      case 'completado':
        return { label: 'Completado', variant: 'outline' as const }
      case 'archivado':
        return { label: 'Archivado', variant: 'secondary' as const }
      default:
        return { label: estado || 'Desconocido', variant: 'secondary' as const }
    }
  }
  
  /**
   * Cuenta documentos seleccionados
   */
  const documentosSeleccionadosCount = documentosFuente.filter(d => d.seleccionado).length

  // ---------------------------------------------------------------------------
  // RENDERIZADO
  // ---------------------------------------------------------------------------

  if (!isMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Iniciando OfiSolve ERP...</p>
        </div>
      </div>
    )
  }

  if (!token && isAuthenticated === false) {
    return <LoginView onLogin={(newToken: string) => {
      localStorage.setItem("ofisolve_token", newToken)
      setToken(newToken)
      setIsAuthenticated(true)
    }} />
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* =================================================================
          HEADER PRINCIPAL
          Contiene: Logo, selector workspace, usuario, acciones globales
          ================================================================= */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        {/* Seccion Izquierda: Toggle panel + Logo + Workspace */}
        <div className="flex items-center gap-3">
          {/* Toggle Panel Izquierdo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPanelIzquierdoVisible(!panelIzquierdoVisible)}
            className="hidden rounded-lg lg:flex"
            aria-label={panelIzquierdoVisible ? "Ocultar panel de fuentes" : "Mostrar panel de fuentes"}
          >
            {panelIzquierdoVisible ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">O</span>
            </div>
            <span className="hidden text-lg font-semibold text-foreground sm:inline">
              OfiSolve
            </span>
          </div>

          {/* Separador */}
          <div className="hidden h-6 w-px bg-border sm:block" />

          {/* Selector de Workspace */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden gap-2 rounded-lg sm:flex">
                <div 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: workspaceActual?.color || "#ccc" }}
                />
                <span className="max-w-[150px] truncate text-sm font-medium">
                  {workspaceActual?.nombre || "Cargando..."}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => cambiarWorkspace(workspace)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-2.5 w-2.5 rounded-full" 
                      style={{ backgroundColor: workspace.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{workspace.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {workspace.tramitesCount} tramites
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDialogNuevoWorkspace(true)}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Seccion Central: Nombre del tramite actual (mobile) */}
        <div className="flex-1 px-4 sm:hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {tramiteActual?.nombre || "Sin trámite"}
          </p>
        </div>

        {/* Seccion Derecha: Tema + Auditoria + Usuario */}
        <div className="flex items-center gap-1">
          {/* Toggle Tema */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="rounded-lg"
            aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Toggle Panel Derecho */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPanelDerechoVisible(!panelDerechoVisible)}
            className={cn(
              "hidden rounded-lg lg:flex",
              panelDerechoVisible && "bg-accent"
            )}
            aria-label={panelDerechoVisible ? "Ocultar panel de trabajo" : "Mostrar panel de trabajo"}
          >
            {panelDerechoVisible ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>

          {/* Menu Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 rounded-lg">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-medium lg:inline">
                  {usuario?.nombre || "Usuario"}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Info Usuario */}
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground">{usuario?.nombre || "Cargando..."}</p>
                <p className="text-xs text-muted-foreground">{usuario?.email}</p>
                {usuario?.escribaniaNombre && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {usuario?.escribaniaNombre}
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                 <DropdownMenuItem 
                  onClick={() => {
                    if (usuario) {
                      setFormPerfil({
                        nombre: usuario?.nombre,
                        email: usuario?.email,
                        telefono: usuario?.telefono || ""
                      })
                      setDialogEditarPerfil(true)
                    }
                  }}
                  className="cursor-pointer"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDialogConfiguracion(true)}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configuracion
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Ayuda
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* =================================================================
          CONTENIDO PRINCIPAL CON PANELES REDIMENSIONABLES
          ================================================================= */}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* ===============================================================
              PANEL IZQUIERDO - FUENTES DEL CASO
              =============================================================== */}
          {panelIzquierdoVisible && (
            <>
              <ResizablePanel 
                defaultSize={20} 
                minSize={15} 
                maxSize={35}
                className="hidden lg:block"
              >
                <aside className="flex h-full flex-col border-r border-border bg-sidebar">
                  {/* Header: Selector de Tramite con dropdown mejorado */}
                  <div className="shrink-0 border-b border-border p-4">
                    <button 
                      onClick={() => setDropdownTramitesAbierto(!dropdownTramitesAbierto)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{tramiteActual?.nombre}</span>
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        dropdownTramitesAbierto && "rotate-180"
                      )} />
                    </button>
                    
                    {/* Dropdown de Tramites expandido */}
                    {dropdownTramitesAbierto && (
                      <div className="mt-2 rounded-xl border border-border bg-card shadow-lg">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Tramites
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setDropdownTramitesAbierto(false)
                              setDialogNuevoTramite(true)
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Nuevo
                          </Button>
                        </div>
                        <ScrollArea className="max-h-64">
                          <div className="p-1">
                            {tramites.map((tramite) => {
                              const estado = getEstadoTramite(tramite.estado)
                              const isSelected = tramite.id === tramiteActual?.id
                              return (
                                <button
                                  key={tramite.id}
                                  onClick={() => cambiarTramite(tramite)}
                                  className={cn(
                                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
                                    isSelected 
                                      ? "bg-primary/10 text-primary" 
                                      : "hover:bg-accent"
                                  )}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    <span className={cn(
                                      "truncate text-sm",
                                      !isSelected && "ml-5"
                                    )}>
                                      {tramite.nombre}
                                    </span>
                                  </div>
                                  <Badge variant={estado.variant} className="ml-2 shrink-0 text-xs">
                                    {estado.label}
                                  </Badge>
                                </button>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  {/* Boton Subir Documento */}
                  <div className="shrink-0 p-4">
                    <Button 
                      className="w-full rounded-xl shadow-sm"
                      onClick={() => setDialogSubirDocumento(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar fuente
                    </Button>
                  </div>

                  {/* Lista de Fuentes del Caso - Scrolleable */}
                  <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                    <h3 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Librería Legal ({documentosSeleccionadosCount}/{documentosFuente.length} seleccionadas)
                    </h3>
                    <ScrollArea className="flex-1">
                      <div className="flex flex-col gap-2 pr-3">
                        {documentosFuente.map((doc) => (
                          <div
                            key={doc.id}
                            className={cn(
                              "group flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-all",
                              doc.seleccionado 
                                ? "border-primary/50 bg-primary/5" 
                                : "border-border hover:border-primary/30 hover:shadow"
                            )}
                          >
                            {/* Checkbox de seleccion */}
                            <Checkbox
                              checked={doc.seleccionado}
                              onCheckedChange={() => toggleSeleccionDocumento(Number(doc.id))}
                              className="shrink-0"
                            />
                            
                            {/* Icono y nombre */}
                            <div 
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                              onClick={() => toggleSeleccionDocumento(Number(doc.id))}
                            >
                              {getIconoDocumento(doc.tipo)}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-foreground">
                                  {doc.nombre}
                                </p>
                                {doc.tamano && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatearTamano(doc.tamano)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Boton eliminar */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                eliminarDocumento(Number(doc.id))
                              }}
                              className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                              aria-label={`Eliminar ${doc.nombre}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </aside>
              </ResizablePanel>
              <ResizableHandle withHandle className="hidden lg:flex" />
            </>
          )}

          {/* ===============================================================
              AREA CENTRAL - CHAT DEL ASISTENTE
              =============================================================== */}
          <ResizablePanel defaultSize={panelIzquierdoVisible && panelDerechoVisible ? 55 : 100}>
            <main className="flex h-full flex-col overflow-hidden bg-background">
              {/* Subheader: Info del tramite actual */}
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/50 px-4 py-2 sm:px-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-sm font-medium text-foreground">
                    {tramiteActual?.nombre}
                  </h1>
                  <Badge variant={getEstadoTramite(tramiteActual?.estado)?.variant || 'secondary'} className="text-xs">
                    {getEstadoTramite(tramiteActual?.estado)?.label || 'Borrador'}
                  </Badge>
                  
                  {/* Selector de Asignación de Equipo */}
                  <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3 group relative">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                        >
                          {miembroAsignado ? (
                            <span className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {miembroAsignado.nombre}
                            </span>
                          ) : (
                            "Asignar a..."
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Miembros del Equipo
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {equipo.length > 0 ? (
                          equipo.map((miembro) => (
                            <DropdownMenuItem 
                              key={miembro.id}
                              onSelect={async () => {
                                setMiembroAsignado(miembro)
                                try {
                                  await ofisolveApi.actualizarTramite(tramiteActual!.id, { asignado_a_id: miembro.id })
                                  toast.success(`Tramite asignado a ${miembro.nombre}`)
                                } catch (error: any) {
                                  toast.error("Error al persistir asignacion")
                                }
                              }}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">{miembro.nombre}</span>
                                <span className="text-[10px] text-muted-foreground">{miembro.rol}</span>
                              </div>
                              {miembroAsignado?.id === miembro.id && (
                                <Check className="h-3 w-3 text-primary" />
                              )}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
                            Cargando equipo...
                          </div>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-xs">
                          <Plus className="mr-2 h-3 w-3" />
                          Gestionar equipo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer">
                      Editar tramite
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      Duplicar tramite
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      Exportar historial
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                      Archivar tramite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Historial de Chat - Scrolleable */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-3xl space-y-6 pb-4">
                  {mensajesChat.map((mensaje) => (
                    <div
                      key={mensaje.id}
                      className={cn(
                        "flex",
                        mensaje.tipo === "usuario" ? "justify-end" : "justify-start"
                      )}
                    >
                      {mensaje.tipo === "usuario" ? (
                        // Mensaje del usuario - con bubble
                        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground sm:max-w-[75%]">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {mensaje.contenido}
                          </p>
                        </div>
                      ) : (
                        // Mensaje de la IA - sin bubble, como ChatGPT/NotebookLM
                        <div className="max-w-[95%] sm:max-w-[85%]">
                          <div className="flex items-start gap-3">
                            {/* Avatar de la IA */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <span className="text-xs font-bold text-primary">O</span>
                            </div>
                            <div className="flex-1">
                              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {mensaje.contenido}
                                </ReactMarkdown>
                              </div>
                              {mensaje.referencias && mensaje.referencias.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {mensaje.referencias.map((ref) => (
                                    <button
                                      key={ref.id}
                                      className="inline-flex items-center rounded-lg bg-accent px-2 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                                      onClick={() => {
                                        // TODO: Abrir referencia legal en modal o nueva tab
                                        alert(`Ver referencia: ${ref.texto}`)
                                      }}
                                    >
                                      {ref.texto}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <p suppressHydrationWarning className="mt-2 text-xs text-muted-foreground">
                                {formatearFecha(mensaje.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Indicador de escritura mejorado con Nodo de Agente */}
                  {(enviandoMensaje || isStreaming) && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-xs font-bold text-primary">O</span>
                        </div>
                        <div className="flex flex-col gap-1.5 py-1">
                          <div className="flex items-center gap-2">
                             <Loader2 className="h-4 w-4 animate-spin text-primary" />
                             <span className="text-sm font-medium text-foreground">
                               {currentAgentNode ? `Asistente: ${currentAgentNode}...` : "Procesando..."}
                             </span>
                          </div>
                          {isStreaming && (
                            <span className="text-[10px] text-muted-foreground animate-pulse">
                              Recibiendo tokens en tiempo real vía SSE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chips de Sugerencia e Input - Siempre visible */}
              <div className="shrink-0 border-t border-border bg-card p-3 sm:p-4">
                <div className="mx-auto max-w-3xl">
                  {/* Selector de Cliente Rápido */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                       <User size={14}/> 
                       {clienteActual ? (
                         <div className="flex items-center gap-2">
                           <span className="font-semibold text-foreground">{clienteActual.nombre_completo}</span>
                           <span>(DNI {clienteActual.dni})</span>
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="h-6 px-2 text-[10px] bg-blue-50/50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                             onClick={() => enviarMensaje("Validar Biometría RENAPER")}
                           >
                             Validar RENAPER
                           </Button>
                         </div>
                       ) : "Seleccione un cliente para operar"}
                    </div>
                    <div className="flex gap-2">
                       <Popover open={comboboxClientesAbierto} onOpenChange={setComboboxClientesAbierto}>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             role="combobox"
                             aria-expanded={comboboxClientesAbierto}
                             className="h-8 w-[200px] justify-between text-xs font-normal"
                           >
                             <div className="flex items-center gap-2 truncate">
                               <Search className="h-3 w-3 shrink-0 opacity-50" />
                               {clienteActual ? clienteActual.nombre_completo : "Buscar cliente..."}
                             </div>
                             <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-[250px] p-0" align="end">
                           <Command>
                             <CommandInput placeholder="Nombre o DNI..." className="h-8 text-xs" />
                             <CommandList>
                               <CommandEmpty className="py-2 text-center text-xs">No se encontraron clientes.</CommandEmpty>
                               <CommandGroup heading="Clientes Recientes">
                                 {clientes.map((c) => (
                                   <CommandItem
                                     key={c.id}
                                     value={c.nombre_completo + " " + c.dni}
                                     onSelect={() => {
                                       setClienteActual(c)
                                       setComboboxClientesAbierto(false)
                                     }}
                                     className="text-xs"
                                   >
                                     <div className="flex flex-col">
                                       <span className="font-medium">{c.nombre_completo}</span>
                                       <span className="text-[10px] text-muted-foreground">DNI {c.dni}</span>
                                     </div>
                                     <Check
                                       className={cn(
                                         "ml-auto h-3 w-3",
                                         clienteActual?.id === c.id ? "opacity-100" : "opacity-0"
                                       )}
                                     />
                                   </CommandItem>
                                 ))}
                               </CommandGroup>
                             </CommandList>
                           </Command>
                         </PopoverContent>
                       </Popover>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-8 w-8 text-muted-foreground"
                         title="Nuevo Cliente"
                         onClick={() => setIsNuevoClienteOpen(true)}
                       >
                         <UserPlus className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                  {/* Chips de Sugerencia */}
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {sugerenciasChips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleChipClick(chip)}
                        className="shrink-0 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent hover:text-foreground"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Campo de Input */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault()
                      enviarMensaje()
                    }}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2 shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 sm:gap-3 sm:px-4 sm:py-3"
                  >
                    <input
                      type="text"
                      placeholder="Escribe tu instruccion o pregunta..."
                      value={inputMensaje}
                      onChange={(e) => setInputMensaje(e.target.value)}
                      disabled={enviandoMensaje}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      className={cn(
                        "rounded-xl p-2 transition-colors",
                        inputMensaje.trim() && !enviandoMensaje
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-accent text-muted-foreground"
                      )}
                      disabled={!inputMensaje.trim() || enviandoMensaje}
                      aria-label="Enviar mensaje"
                    >
                      {enviandoMensaje ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </main>
          </ResizablePanel>

          {/* ===============================================================
              PANEL DERECHO - GENERACION Y AUDITORIA
              =============================================================== */}
          {panelDerechoVisible && (
            <>
              <ResizableHandle withHandle className="hidden lg:flex" />
              <ResizablePanel 
                defaultSize={25} 
                minSize={20} 
                maxSize={40}
                className="hidden lg:block"
              >
                <aside className="flex h-full min-h-0 flex-col border-l border-border bg-sidebar">
                  {/* Header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      Panel de Trabajo
                    </h2>
                  </div>

                  {/* Contenido scrolleable */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-6 p-4">
                      {/* Seccion: Generar Documentos - Grid 2 columnas */}
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <FilePlus className="h-3.5 w-3.5" />
                          Generar Documento
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {tiposDocumentosGenerables.map((tipo) => (
                            <button
                              key={tipo.id}
                              onClick={() => generarDocumento(tipo.id)}
                              disabled={generandoDocumento === tipo.id}
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm",
                                generandoDocumento === tipo.id && "opacity-70"
                              )}
                            >
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-lg",
                                tipo.categoria === 'certificacion' && "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                                tipo.categoria === 'poder' && "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
                                tipo.categoria === 'acta' && "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                                tipo.categoria === 'escritura' && "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
                              )}>
                                {generandoDocumento === tipo.id ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  getIconoGenerable(tipo.icono)
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-foreground">
                                  {tipo.nombre}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* AREA DE EDICION Fase 4 */}
                      {editorContent && (
                        <div className="h-[500px] border border-border rounded-xl overflow-hidden shadow-lg">
                           <NotarialEditor 
                             content={editorContent} 
                             onChange={handleEditorChange}
                             onApprove={handleApproveDocumento}
                             titulo={tramiteActual?.nombre || "Revision de Documento"}
                           />
                        </div>
                      )}

                      {/* Seccion: Documentos Generados */}
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Documentos Generados ({documentosGenerados.length})
                        </h3>
                        {documentosGenerados.length > 0 ? (
                          <div className="space-y-2">
                            {documentosGenerados.map((doc) => (
                              <div
                                key={doc.id}
                                className="rounded-xl border border-border bg-card p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {doc.nombre}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatearFecha(doc.fechaGeneracion)} - v{doc.version}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={() => setEditorContent(doc.contenido || "")}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 rounded-lg text-xs"
                                    onClick={() => descargarDocumento(doc)}
                                  >
                                    <Download className="mr-1.5 h-3 w-3" />
                                    Descargar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center">
                            <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                            <p className="mt-2 text-xs text-muted-foreground">
                              Aun no hay documentos generados
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Seccion: Entidades Detectadas (NUEVO) */}
                      {datosExtraidos && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            <Users className="h-3.5 w-3.5" />
                            Entidades Detectadas en BD
                          </h3>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                              <p className="text-[10px] font-bold uppercase tracking-tight text-blue-500 mb-2">Trámite #{datosExtraidos.tramite_id}</p>
                              <p className="text-sm font-semibold text-foreground mb-3">{datosExtraidos.tipo_acto}</p>
                              
                              <div className="space-y-2">
                                {datosExtraidos.clientes.map((cliente: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-card p-2 border border-blue-100/50 dark:border-blue-800/30 shadow-sm">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                                      <User size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold text-foreground">
                                        {cliente.nombre}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-muted-foreground uppercase">
                                          {cliente.rol}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <p className="text-[10px] text-muted-foreground">
                                          DNI {cliente.dni_cuit}
                                        </p>
                                      </div>
                                    </div>
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Seccion: Alertas de Auditoria Legal */}
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Auditoria Legal ({alertasLegales.length})
                        </h3>
                        <div className="space-y-2">
                          {alertasLegales.map((alerta) => {
                            const estilo = getAlertaEstilo(alerta.tipo)
                            return (
                              <div
                                key={alerta.id}
                                className={cn(
                                  "rounded-xl border p-3",
                                  estilo.bg,
                                  estilo.border
                                )}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="mt-0.5 shrink-0">{estilo.icon}</div>
                                  <div className="min-w-0 flex-1">
                                    <p className={cn("text-sm font-medium", estilo.titleColor)}>
                                      {alerta.titulo}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {alerta.descripcion}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </aside>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* =================================================================
          DIALOGO: SUBIR DOCUMENTO (estilo NotebookLM)
          Tabs: Archivo / Link
          
          TODO: Integrar con storage backend
          ================================================================= */}
      <Dialog open={dialogSubirDocumento} onOpenChange={setDialogSubirDocumento}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar fuente</DialogTitle>
            <DialogDescription>
              Sube archivos o agrega enlaces como fuentes de informacion para este tramite.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tabSubirDocumento} onValueChange={setTabSubirDocumento}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="archivo">
                <Upload className="mr-2 h-4 w-4" />
                Archivo
              </TabsTrigger>
              <TabsTrigger value="link">
                <Globe className="mr-2 h-4 w-4" />
                Enlace web
              </TabsTrigger>
            </TabsList>

            {/* Tab: Subir Archivo */}
            <TabsContent value="archivo" className="mt-4">
              <div
                onClick={() => inputArchivoRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted"
              >
                <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Haz clic para seleccionar archivos
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, Word, imagenes o Excel (max. 25 MB)
                </p>
                <input
                  ref={inputArchivoRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleSeleccionArchivos}
                  className="hidden"
                />
              </div>

              {/* Lista de archivos seleccionados */}
              {archivosSeleccionados.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Archivos seleccionados:
                  </p>
                  {archivosSeleccionados.map((archivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{archivo.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatearTamano(archivo.size)})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setArchivosSeleccionados(prev => 
                            prev.filter((_, i) => i !== index)
                          )
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Agregar Link */}
            <TabsContent value="link" className="mt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    URL del sitio web
                  </label>
                  <Input
                    type="url"
                    placeholder="https://ejemplo.com/documento"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Puedes agregar enlaces a sitios web, articulos o documentos publicos.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDialogSubirDocumento(false)
                setArchivosSeleccionados([])
                setLinkUrl("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={tabSubirDocumento === "archivo" ? subirArchivos : agregarLink}
              disabled={
                subiendoArchivos ||
                (tabSubirDocumento === "archivo" && archivosSeleccionados.length === 0) ||
                (tabSubirDocumento === "link" && !linkUrl.trim())
              }
            >
              {subiendoArchivos ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          DIALOGO: CONFIGURACION
          Tabs: Apariencia / Notificaciones
          
          TODO: GET/PUT /api/config para persistir configuracion
          ================================================================= */}
      <Dialog open={dialogConfiguracion} onOpenChange={setDialogConfiguracion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configuracion</DialogTitle>
            <DialogDescription>
              Personaliza tu experiencia en OfiSolve.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tabConfiguracion} onValueChange={setTabConfiguracion}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="apariencia">
                <Palette className="mr-2 h-4 w-4" />
                Apariencia
              </TabsTrigger>
              <TabsTrigger value="cuenta">
                <User className="mr-2 h-4 w-4" />
                Cuenta
              </TabsTrigger>
              <TabsTrigger value="notificaciones">
                <Bell className="mr-2 h-4 w-4" />
                Alertas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Apariencia */}
            <TabsContent value="apariencia" className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Tema oscuro</p>
                  <p className="text-xs text-muted-foreground">
                    Cambia entre modo claro y oscuro
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                >
                  {theme === "light" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Cuenta */}
            <TabsContent value="cuenta" className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Editar perfil</p>
                  <p className="text-xs text-muted-foreground">
                    Actualiza tu nombre y datos
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (usuario) {
                      setFormPerfil({
                        nombre: usuario?.nombre,
                        email: usuario?.email,
                        telefono: usuario?.telefono || ""
                      })
                      setDialogEditarPerfil(true)
                    }
                  }}
                >
                  <UserCog className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Cambiar contrasena</p>
                  <p className="text-xs text-muted-foreground">
                    Actualiza tu contrasena de acceso
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDialogConfiguracion(false)
                    setFormContrasena({ actual: "", nueva: "", confirmar: "" })
                    setDialogCambiarContrasena(true)
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Notificaciones */}
            <TabsContent value="notificaciones" className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificaciones por email</p>
                  <p className="text-xs text-muted-foreground">
                    Recibe alertas de tramites por correo
                  </p>
                </div>
                <Checkbox defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Alertas de auditoria</p>
                  <p className="text-xs text-muted-foreground">
                    Notificaciones de alertas legales
                  </p>
                </div>
                <Checkbox defaultChecked />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={() => setDialogConfiguracion(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          DIALOGO: EDITAR PERFIL
          
          TODO: PUT /api/auth/profile
          ================================================================= */}
      <Dialog open={dialogEditarPerfil} onOpenChange={setDialogEditarPerfil}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Actualiza tu informacion personal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nombre completo
              </label>
              <Input
                value={formPerfil.nombre}
                onChange={(e) => setFormPerfil(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Tu nombre"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Correo electronico
              </label>
              <Input
                type="email"
                value={formPerfil.email}
                onChange={(e) => setFormPerfil(prev => ({ ...prev, email: e.target.value }))}
                placeholder="tu@email.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Telefono
              </label>
              <Input
                value={formPerfil.telefono}
                onChange={(e) => setFormPerfil(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="+54 11 1234-5678"
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarPerfil(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarPerfil}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          DIALOGO: CAMBIAR CONTRASENA
          
          TODO: PUT /api/auth/password
          ================================================================= */}
      <Dialog open={dialogCambiarContrasena} onOpenChange={setDialogCambiarContrasena}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contrasena</DialogTitle>
            <DialogDescription>
              Ingresa tu contrasena actual y la nueva contrasena.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Contrasena actual
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={formContrasena.actual}
                  onChange={(e) => setFormContrasena(prev => ({ ...prev, actual: e.target.value }))}
                  placeholder="********"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Nueva contrasena
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={formContrasena.nueva}
                  onChange={(e) => setFormContrasena(prev => ({ ...prev, nueva: e.target.value }))}
                  placeholder="********"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Confirmar nueva contrasena
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={formContrasena.confirmar}
                  onChange={(e) => setFormContrasena(prev => ({ ...prev, confirmar: e.target.value }))}
                  placeholder="********"
                  className="pl-9"
                />
              </div>
              {formContrasena.nueva && formContrasena.confirmar && formContrasena.nueva !== formContrasena.confirmar && (
                <p className="mt-1.5 text-xs text-destructive">
                  Las contrasenas no coinciden
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCambiarContrasena(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={cambiarContrasena}
              disabled={!formContrasena.actual || !formContrasena.nueva || formContrasena.nueva !== formContrasena.confirmar}
            >
              Cambiar contrasena
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          DIALOGO: PREVIEW DE DOCUMENTO
          
          TODO: GET /api/documentos-generados/:id/preview
          ================================================================= */}
      <Dialog open={dialogPreviewDocumento} onOpenChange={setDialogPreviewDocumento}>
        <DialogContent className="max-h-[90vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{documentoPreview?.nombre}</DialogTitle>
            <DialogDescription>
              Version {documentoPreview?.version} - {documentoPreview && formatearFecha(documentoPreview.fechaGeneracion)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="mt-4 max-h-[60vh] rounded-lg border border-border bg-card p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {documentoPreview?.contenidoPreview || "Sin contenido para previsualizar"}
            </pre>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogPreviewDocumento(false)}>
              Cerrar
            </Button>
            <Button onClick={() => documentoPreview && descargarDocumento(documentoPreview)}>
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          DIALOGO: NUEVO WORKSPACE
          
          TODO: POST /api/workspaces para crear workspace
          ================================================================= */}
      <Dialog open={dialogNuevoWorkspace} onOpenChange={setDialogNuevoWorkspace}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Workspace</DialogTitle>
            <DialogDescription>
              Crea un nuevo espacio de trabajo para organizar tus tramites.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nombre del workspace
              </label>
              <Input
                value={formWorkspace.nombre}
                onChange={(e) => setFormWorkspace(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Certificaciones 2026"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Descripcion (opcional)
              </label>
              <Input
                value={formWorkspace.descripcion}
                onChange={(e) => setFormWorkspace(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe el proposito de este workspace"
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevoWorkspace(false)}>
              Cancelar
            </Button>
            <Button onClick={crearWorkspace} disabled={!formWorkspace.nombre.trim()}>
              Crear Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          DIALOGO: NUEVO TRAMITE
          
          TODO: POST /api/tramites para crear tramite
          ================================================================= */}
      <Dialog open={dialogNuevoTramite} onOpenChange={setDialogNuevoTramite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Tramite</DialogTitle>
            <DialogDescription>
              Crea un nuevo tramite en el workspace actual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nombre del tramite
              </label>
              <Input
                value={formTramite.nombre}
                onChange={(e) => setFormTramite(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Certificacion de Firma - Rodriguez"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Tipo de tramite
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="mt-1.5 w-full justify-between">
                    {formTramite.tipo || "Seleccionar tipo"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setFormTramite(prev => ({ ...prev, tipo: "Certificacion de Firma" }))}>
                    Certificacion de Firma
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormTramite(prev => ({ ...prev, tipo: "Poder Especial" }))}>
                    Poder Especial
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormTramite(prev => ({ ...prev, tipo: "Poder General" }))}>
                    Poder General
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormTramite(prev => ({ ...prev, tipo: "Escritura de Compraventa" }))}>
                    Escritura de Compraventa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormTramite(prev => ({ ...prev, tipo: "Acta Notarial" }))}>
                    Acta Notarial
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormTramite(prev => ({ ...prev, tipo: "Otro" }))}>
                    Otro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevoTramite(false)}>
              Cancelar
            </Button>
            <Button onClick={crearTramite} disabled={!formTramite.nombre.trim()}>
              Crear Tramite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales Fase 4 */}
      <NuevoClienteModal 
        isOpen={isNuevoClienteOpen} 
        onClose={() => setIsNuevoClienteOpen(false)}
        workspaceId={Number(workspaceActual?.id)}
        onSuccess={(nuevoCliente: any) => {
          setClientes([nuevoCliente, ...clientes])
          setClienteActual(nuevoCliente)
        }}
      />
    </div>
  )
}
