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
import { WelcomeHero } from "@/components/welcome-hero"
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
  SendHorizontal,
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
  Copy,
  Mail,
  Bell,
  Palette,
  KeyRound,
  UserPlus,
  Users,
  Wand2,
  BrainCircuit,
  ShieldCheck,
  Folder
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
import { Card } from "@/components/ui/card"
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

// --- Mocks removidos para usar infraestructura real ---

/**
 * TODO: Reemplazar con GET /api/tramites/:id/documentos
 */
// --- Mocks de documentos y mensajes removidos ---

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
const documentosGeneradosMock: DocumentoGenerado[] = [
  {
    id: 1001,
    nombre: "Cert_Firma_Horizonte_2026.docx",
    tipo: "firma",
    fechaGeneracion: new Date("2026-04-18T10:30:00"),
    version: 2,
    contenidoPreview: "CERTIFICACIÓN DE FIRMA — En la Ciudad Autónoma de Buenos Aires, a los dieciocho días del mes de abril de 2026, ante mí, Escribano Público...",
    contenido: "CERTIFICACIÓN DE FIRMA\n\nEn la Ciudad Autónoma de Buenos Aires, a los dieciocho días del mes de abril de 2026, ante mí, Escribano Público, se presentó el Sr. representante de CONSTRUCTORA HORIZONTE S.A., CUIT 30-71234567-8, quien firmó en mi presencia el documento que se adjunta.\n\nDOY FE que la firma que antecede es auténtica, habiendo sido puesta en mi presencia por persona a quien identifico.\n\nConste. — Escritura Nº 234/2026"
  },
  {
    id: 1002,
    nombre: "Poder_General_Horizonte.docx",
    tipo: "poder",
    fechaGeneracion: new Date("2026-04-15T14:00:00"),
    version: 1,
    contenidoPreview: "PODER GENERAL AMPLIO — Otorgado por CONSTRUCTORA HORIZONTE S.A. a favor de...",
    contenido: "PODER GENERAL AMPLIO DE ADMINISTRACIÓN Y DISPOSICIÓN\n\nEn la Ciudad Autónoma de Buenos Aires, a los quince días del mes de abril de 2026...\n\nComparece: CONSTRUCTORA HORIZONTE S.A., representada por su Director, según acta de directorio...\n\nConfiere poder general amplio a favor de Dr. [APODERADO], DNI [NÚMERO], para que en su nombre y representación ejerza actos de administración y disposición..."
  },
  {
    id: 1003,
    nombre: "Cert_Fotocopia_Goldi_DNI.docx",
    tipo: "fotocopia",
    fechaGeneracion: new Date("2026-04-20T09:15:00"),
    version: 1,
    contenidoPreview: "CERTIFICACIÓN DE FOTOCOPIA — Certifico que la fotocopia adjunta es reproducción fiel del original...",
    contenido: "CERTIFICACIÓN DE FOTOCOPIA\n\nEn la Ciudad Autónoma de Buenos Aires, a los veinte días del mes de abril de 2026, ante mí, Escribano Público, CERTIFICO que la fotocopia que antecede es REPRODUCCIÓN FIEL del original que he tenido a la vista.\n\nDocumento: DNI de Roberto Carlos Goldi (25.987.654)\n\nConste. Doy fe."
  },
]

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
  const [activeTab, setActiveTab] = useState<'asistente' | 'generador'>('asistente')
  
  /** Estado de carga del upload */
  const [subiendoArchivos, setSubiendoArchivos] = useState(false)
  
  /** Referencia al scroll del chat */
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // ESTADO DE DATOS
  // ---------------------------------------------------------------------------
  
  const [isMounted, setIsMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceActual, setWorkspaceActual] = useState<Workspace | null>(null)
  const [tramiteActual, setTramiteActual] = useState<Tramite | null>(null)
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [documentosFuente, setDocumentosFuente] = useState<DocumentoFuente[]>([])
  const [mensajesChat, setMensajesChat] = useState<MensajeChat[]>([])
  const [alertasLegales, setAlertasLegales] = useState<AlertaLegal[]>([])
  const [documentosGenerados, setDocumentosGenerados] = useState<DocumentoGenerado[]>(documentosGeneradosMock)

  /** Clientes locales cargados */
  const [clientes, setClientes] = useState<ClienteResponse[]>([])
  const [clienteActual, setClienteActual] = useState<ClienteResponse | null>(null)
  
  /** Equipo de la escribania */
  const [equipo, setEquipo] = useState<EquipoMiembroResponse[]>([])
  const [miembroAsignado, setMiembroAsignado] = useState<EquipoMiembroResponse | null>(null)

  const [isNuevoClienteOpen, setIsNuevoClienteOpen] = useState(false)
  const [editorContent, setEditorContent] = useState("")

  /** Navegación Jerárquica */
  const [expandedClienteId, setExpandedClienteId] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)

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
  const [participaciones, setParticipaciones] = useState<any[]>([])
  const [lastOpenedTramiteId, setLastOpenedTramiteId] = useState<number | null>(null)
  const [archivosPorTramite, setArchivosPorTramite] = useState<Record<number, any[]>>({})
  
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
        setIsAuthenticated(false)
        setToken(null)
        localStorage.removeItem("ofisolve_token")
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
                clienteId: t.cliente_id,
                fechaCreacion: new Date(t.fecha_creacion),
                fechaActualizacion: new Date(t.fecha_actualizacion)
              }))
              setTramites(parsed)
              // Auto-selección desactivada para mantener WelcomeHero
            })
        }
      })
  }, [isMounted, token])

  // --- NUEVO EFFECT: Saludo Contextual al entrar a un Trámite ---
  useEffect(() => {
    if (tramiteActual && usuario) {
      // RESET CHAT on folder change to ensure context isolation
      setMensajesChat([]);
      setStreamingText("");
      setCurrentAgentNode("");

      ofisolveApi.obtenerSaludo(tramiteActual.id)
        .then(res => {
          const msgSalud: MensajeChat = {
            id: Date.now(),
            tipo: "ia",
            contenido: typeof res === 'string' ? res : (res.saludo || JSON.stringify(res)),
            timestamp: new Date()
          };
          setMensajesChat([msgSalud]);
        })
        .catch(err => {
          console.error("Error al obtener saludo:", err);
          setMensajesChat([{
            id: Date.now(),
            tipo: "ia",
            contenido: "Hola, ¿en qué puedo ayudarte con esta carpeta?",
            timestamp: new Date()
          }]);
        });
    }
  }, [tramiteActual?.id, usuario?.id]);

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
              workspaceId: t.workspace_id,
              clienteId: t.cliente_id,
              fechaCreacion: new Date(t.fecha_creacion),
              fechaActualizacion: new Date(t.fecha_actualizacion)
            }))
            setTramites(parsed)
            // Auto-selección desactivada para mantener WelcomeHero
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
        nombre: usuario.nombre_completo || usuario.nombre || "",
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

  // Carga de participaciones y Saludo Contextual
  useEffect(() => {
    if (tramiteActual && token) {
      const tid = tramiteActual.id
      
      // 1. Cargar Participaciones (Entidades Reales)
      ofisolveApi.obtenerParticipaciones(tid)
        .then(data => {
          setParticipaciones(data.clientes || [])
          // Sincronizar con el estado que usa el panel derecho
          setDatosExtraidos({
            tramite_id: tid,
            tipo_acto: tramiteActual.tipo,
            clientes: (data.clientes || []).map((p: any) => ({
              nombre: p.nombre,
              dni_cuit: p.dni_cuit,
              rol: p.rol
            }))
          })
        })
        .catch(err => console.error("Error cargando participaciones:", err))

      // 2. Saludo Contextual Automático - REMOVIDO PARA ESTABILIDAD
      // El chat ahora es bajo demanda para evitar mensajes vacíos
    }
  }, [tramiteActual, token])
  
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
    
    // 1. Limpiar input y estado de carga inmediatamente
    setInputMensaje("")
    setEnviandoMensaje(true)
    setIsStreaming(true)
    setCurrentAgentNode("Ofuscando")

    // 2. Preparar Mensaje de Usuario
    const nuevoMensaje: MensajeChat = {
      id: Date.now(),
      tipo: "usuario",
      contenido: textoUsuario,
      timestamp: new Date()
    }
    
    // 3. Preparar Placeholder de Respuesta de IA
    const aiMessageId = Date.now() + 1
    const placeholderIA: MensajeChat = {
      id: aiMessageId,
      tipo: "ia",
      contenido: "",
      timestamp: new Date()
    }

    setMensajesChat(prev => [...prev, nuevoMensaje, placeholderIA])

    let accumulatedText = ""
    
    try {
      const tenantId = workspaceActual?.tenant_id || usuario?.tenant_id || "00000000-0000-0000-0000-000000000001"
      
      const history = mensajesChat
        .filter(m => m.contenido && m.contenido.trim() !== "")
        .slice(-10) // Tomamos los últimos 10 mensajes
        .map(m => ({
          role: m.tipo === "usuario" ? "user" : "assistant" as "user" | "assistant",
          content: m.contenido
        }))

      await ofisolveApi.streamTramiteChat(
        textoUsuario,
        tramiteActual.id.toString(),
        tenantId,
        history,
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
            
            // Si el stream falló pero tenemos el texto completo, lo usamos
            const finalText = event.texto_completo || accumulatedText
            if (event.texto_completo) {
              setMensajesChat(prev => prev.map(m => 
                m.id === aiMessageId ? { ...m, contenido: event.texto_completo } : m
              ))
              accumulatedText = event.texto_completo
            }

            setEditorContent(finalText)
            toast.success("Respuesta finalizada.")
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
        toast.info(`El tipo "${tipoDocumento}" estará disponible próximamente.`)
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
      toast.error(`Error al generar: ${error.message}`)
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
        toast.warning(`El documento "${documento.nombre}" no tiene URL de descarga disponible aún.`)
      }
    } catch (error: any) {
      toast.error(`Error al descargar: ${error.message}`)
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
    localStorage.removeItem("ofisolve_token")
    setToken(null)
    setUsuario(null)
    setIsAuthenticated(false)
    setWorkspaces([])
    setWorkspaceActual(null)
    setTramiteActual(null)
    setTramites([])
    setClientes([])
    setClienteActual(null)
    setMensajesChat([])
    toast.success("Sesión cerrada correctamente")
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
    toast.success("Perfil actualizado correctamente")
  }, [formPerfil])
  
  /**
   * Cambia la contrasena del usuario
   */
  const cambiarContrasena = useCallback(async () => {
    if (formContrasena.nueva !== formContrasena.confirmar) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    setFormContrasena({ actual: "", nueva: "", confirmar: "" })
    setDialogCambiarContrasena(false)
    toast.success("Contraseña actualizada correctamente")
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
      toast.error("Error al crear el workspace")
    }
  }, [formWorkspace])
  
  /**
   * Crea un nuevo tramite
   */
  const crearTramite = useCallback(async () => {
    if (!formTramite.nombre.trim() || !workspaceActual || workspaceActual?.id?.startsWith("ws_")) {
       toast.warning("Seleccioná un workspace primero")
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
      toast.error("Error al crear el trámite")
    }
  }, [formTramite, workspaceActual])

  const handleGuardarMensaje = useCallback(async (mensaje: MensajeChat) => {
    if (!tramiteActual || !workspaceActual) return

    const nombre = prompt("Nombre del documento:", `Respuesta_${formatearFecha(new Date()).replace(/[/:]/g, '-')}.txt`)
    if (!nombre) return

    try {
      const doc = await ofisolveApi.guardarDocumento(
        Number(workspaceActual.id),
        nombre,
        mensaje.contenido,
        clienteActual?.id,
        tramiteActual.id
      )
      
      setDocumentosGenerados(prev => [{
        id: doc.id,
        nombre: doc.nombre,
        tipo: doc.tipo,
        fechaGeneracion: new Date(doc.fecha_subida),
        version: 1,
        contenido: mensaje.contenido
      }, ...prev])
      
      toast.success("Documento guardado exitosamente en la carpeta.")
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`)
    }
  }, [tramiteActual, workspaceActual, clienteActual])
  
  /**
   * Acciones de carpeta (Trámites)
   */
  const handleEditarTramite = useCallback((tramite: Tramite) => {
    setFormTramite({ nombre: tramite.nombre, tipo: tramite.tipo });
    setDialogNuevoTramite(true);
  }, []);

  const handleDuplicarTramite = useCallback(async (tramite: Tramite) => {
    if (!workspaceActual) return;
    try {
      const nuevo = await ofisolveApi.crearTramite(Number(workspaceActual.id), {
        nombre: `${tramite.nombre} (Copia)`,
        tipo: tramite.tipo,
        cliente_id: tramite.clienteId
      });
      const mapped: Tramite = {
        id: nuevo.id,
        tenant_id: DEFAULT_TENANT_ID,
        nombre: nuevo.nombre,
        estado: nuevo.estado as any,
        tipo: nuevo.tipo,
        workspaceId: nuevo.workspace_id.toString(),
        clienteId: nuevo.cliente_id,
        fechaCreacion: new Date(nuevo.fecha_creacion),
        fechaActualizacion: new Date(nuevo.fecha_actualizacion)
      };
      setTramites(prev => [...prev, mapped]);
      toast.success("Trámite duplicado correctamente");
    } catch (err) {
      toast.error("Error al duplicar el trámite");
    }
  }, [workspaceActual]);

  const handleExportarHistorial = useCallback((tramite: Tramite) => {
    toast.info("Generando reporte de historial...");
    // Simulación de descarga
    setTimeout(() => toast.success("Historial exportado como PDF"), 1500);
  }, []);

  const handleArchivarTramite = useCallback(async (tramite: Tramite) => {
    try {
      await ofisolveApi.actualizarTramite(tramite.id, { estado: "archivado" });
      setTramites(prev => prev.map(t => t.id === tramite.id ? { ...t, estado: "archivado" } : t));
      if (tramiteActual?.id === tramite.id) {
        setTramiteActual(prev => prev ? { ...prev, estado: "archivado" } : null);
      }
      toast.success("Trámite archivado correctamente");
    } catch (err) {
      toast.error("Error al archivar el trámite");
    }
  }, [tramiteActual]);

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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border overflow-hidden">
              <img src="/logo-ofisolve.png" alt="OfiSolve Logo" className="h-7 w-7 object-contain" />
            </div>
            <span className="hidden text-lg font-bold tracking-tight text-foreground sm:inline">
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

          <div className="hidden h-6 w-px bg-border sm:block mx-2" />

          {/* TABS DE NAVEGACION (Soberanía Notarial) */}
          <div className="flex rounded-lg bg-muted/30 p-1 ring-1 ring-border shadow-inner">
            <button 
              onClick={() => setActiveTab('asistente')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1 text-[11px] font-bold transition-all rounded-md tracking-tight",
                activeTab === 'asistente' ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Asistente IA
            </button>
            <button 
              onClick={() => setActiveTab('generador')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1 text-[11px] font-bold transition-all rounded-md tracking-tight",
                activeTab === 'generador' ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Motor Ingesis
            </button>
          </div>
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
                className="hidden lg:block overflow-x-hidden"
              >
                <aside className="flex h-full flex-col border-r border-border bg-sidebar overflow-x-hidden">
                  {/* Header: Buscador de Clientes */}
                  <div className="shrink-0 border-b border-border p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar cliente o DNI..." 
                        className="pl-9 h-10 rounded-xl bg-card border-border transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="shrink-0 px-4 py-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Clientes y Carpetas
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-lg"
                      onClick={() => setIsNuevoClienteOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Explorador Jerárquico */}
                  <ScrollArea className="flex-1 px-2">
                    <div className="flex flex-col gap-1 py-2">
                      {clientes.map((cliente) => {
                        const isExpanded = expandedClienteId === cliente.id;
                        const isSelected = clienteActual?.id === cliente.id;
                        
                        return (
                          <div key={cliente.id} className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                setExpandedClienteId(isExpanded ? null : cliente.id);
                                setClienteActual(cliente);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all",
                                isSelected 
                                  ? "bg-primary/10 text-primary" 
                                  : "hover:bg-accent/50 text-foreground"
                              )}
                            >
                              <div className={cn(
                                "h-8 w-8 shrink-0 flex items-center justify-center rounded-lg",
                                isSelected ? "bg-primary/20" : "bg-muted"
                              )}>
                                <UserIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-semibold">{cliente.nombre_completo}</p>
                                <p className="truncate text-[10px] opacity-70">DNI {cliente.dni}</p>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                              )}
                            </button>

                            {/* Carpetas (Trámites) del cliente */}
                            {isExpanded && (
                              <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-border pl-2 animate-in slide-in-from-left-2 duration-200">
                                {tramites.filter(t => t.workspaceId == workspaceActual?.id && t.estado !== 'archivado' && t.clienteId == cliente.id).map((tramite) => {
                                  const isTramiteSelected = tramiteActual?.id === tramite.id;
                                  const archivos = archivosPorTramite[tramite.id] || [];
                                  
                                  return (
                                    <div key={tramite.id} className="flex flex-col gap-1">
                                      <button
                                        onClick={() => {
                                          setTramiteActual(tramite);
                                          // Cargar archivos al hacer click
                                          if (!archivosPorTramite[tramite.id]) {
                                            ofisolveApi.obtenerArchivosTramite(tramite.id)
                                              .then(docs => setArchivosPorTramite(prev => ({ ...prev, [tramite.id]: docs })))
                                          }
                                        }}
                                        className={cn(
                                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-all",
                                          isTramiteSelected
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                                        )}
                                      >
                                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{tramite.nombre}</span>
                                      </button>

                                      {/* Archivos del trámite */}
                                      {isTramiteSelected && archivos.length > 0 && (
                                        <div className="ml-5 flex flex-col gap-1 border-l border-primary/20 pl-2 animate-in slide-in-from-top-1">
                                          {archivos.map(archivo => (
                                            <button
                                              key={archivo.id}
                                              onClick={() => {
                                                ofisolveApi.obtenerContenidoDocumento(archivo.id)
                                                  .then(data => {
                                                    setEditorContent(data.contenido);
                                                    toast.success(`Mostrando ${archivo.nombre}`);
                                                  })
                                                  .catch(err => {
                                                    console.error("Error cargando documento:", err);
                                                    toast.error("No se pudo cargar el archivo");
                                                  });
                                              }}
                                              className="flex items-center gap-2 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                                            >
                                              <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                                              <span className="truncate">{archivo.nombre}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 mt-1 text-[10px] text-muted-foreground hover:text-primary justify-start"
                                  onClick={() => setDialogNuevoTramite(true)}
                                >
                                  <Plus className="mr-1.5 h-3 w-3" />
                                  Nueva Carpeta
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Tramites sin cliente asignado */}
                    {tramites.filter(t => t.workspaceId == workspaceActual?.id && t.estado !== 'archivado' && !t.clienteId).length > 0 && (
                      <div className="mt-4 border-t border-border/50 pt-4 px-2">
                        <h3 className="px-2 py-1 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sin Cliente Asignado</h3>
                        <div className="space-y-1">
                          {tramites.filter(t => t.workspaceId == workspaceActual?.id && t.estado !== 'archivado' && !t.clienteId).map((tramite) => {
                            const isTramiteSelected = tramiteActual?.id === tramite.id;
                            return (
                              <button
                                key={tramite.id}
                                onClick={() => setTramiteActual(tramite)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-all",
                                  isTramiteSelected
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                                )}
                              >
                                <Folder className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{tramite.nombre}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </ScrollArea>

                  {/* SECCION DE ARCHIVADOS */}
                  <div className="shrink-0 border-t border-border bg-muted/20">
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="flex w-full items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <History className="h-3.5 w-3.5" />
                        Expedientes Archivados
                      </div>
                      {showArchived ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    </button>
                    
                    {showArchived && (
                      <div className="max-h-[200px] overflow-y-auto border-t border-border/50 bg-background/50 p-2 animate-in slide-in-from-bottom-2">
                        {clientes.filter(c => tramites.some(t => t.clienteId === c.id && t.estado === 'archivado')).map(cliente => (
                          <div key={`arch-${cliente.id}`} className="mb-2">
                            <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">{cliente.nombre_completo}</div>
                            <div className="ml-2 space-y-0.5">
                              {tramites.filter(t => t.clienteId === cliente.id && t.estado === 'archivado').map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => setTramiteActual(t)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/50 transition-colors",
                                    tramiteActual?.id === t.id && "bg-accent text-foreground font-medium"
                                  )}
                                >
                                  <Lock className="h-2.5 w-2.5 opacity-50" />
                                  <span className="truncate">{t.nombre}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {tramites.filter(t => !t.clienteId && t.estado === 'archivado').length > 0 && (
                           <div className="mt-2">
                              <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Sin Cliente</div>
                              <div className="ml-2 space-y-0.5">
                                 {tramites.filter(t => !t.clienteId && t.estado === 'archivado').map(t => (
                                   <button
                                     key={t.id}
                                     onClick={() => setTramiteActual(t)}
                                     className={cn(
                                       "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/50",
                                       tramiteActual?.id === t.id && "bg-accent text-foreground font-medium"
                                     )}
                                   >
                                     <Lock className="h-2.5 w-2.5 opacity-50" />
                                     <span className="truncate">{t.nombre}</span>
                                   </button>
                                 ))}
                              </div>
                           </div>
                        )}
                        {tramites.filter(t => t.estado === 'archivado').length === 0 && (
                          <div className="py-4 text-center text-[10px] text-muted-foreground italic">
                            No hay expedientes archivados
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info Escribanía Footer */}
                  <div className="mt-auto border-t border-border p-4 bg-accent/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Scale className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{usuario?.escribaniaNombre || "Esc. Argentina"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">Registro {usuario?.nroMatricula || "123"}</p>
                      </div>
                    </div>
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
              {activeTab === 'asistente' && (
                <>
                  {!tramiteActual ? (
                    <div className="flex h-full items-center justify-center p-8 bg-[#fbfbfb]">
                      <div className="w-full max-w-4xl">
                        <WelcomeHero 
                          userName={usuario?.nombre}
                          onNewTramite={() => setIsNuevoClienteOpen(true)}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
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
                    <div className="flex items-center gap-2">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setMensajesChat([])}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Limpiar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setTramiteActual(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cerrar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditarTramite(tramiteActual!)}>
                            Editar tramite
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleDuplicarTramite(tramiteActual!)}>
                            Duplicar tramite
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleExportarHistorial(tramiteActual!)}>
                            Exportar historial
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => handleArchivarTramite(tramiteActual!)}>
                            Archivar tramite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Historial de Chat - Scrolleable */}
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4">
                    <div className="mx-auto max-w-3xl space-y-6 pb-4">
                      {mensajesChat.map((mensaje, idx) => (
                        <div
                          key={mensaje.id}
                          className={cn(
                            "flex animate-premium-in",
                            mensaje.tipo === "usuario" ? "justify-end" : "justify-start"
                          )}
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          {mensaje.tipo === "usuario" ? (
                            <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground sm:max-w-[75%] shadow-sm">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {mensaje.contenido}
                              </p>
                            </div>
                          ) : (
                            <div className="max-w-[95%] sm:max-w-[85%]">
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-border shadow-sm overflow-hidden">
                                  <img src="/logo-ofisolve.png" alt="AI" className="h-6 w-6 object-contain" />
                                </div>
                                <div className="group flex-1">
                                  <div className="relative prose prose-sm dark:prose-invert max-w-none text-foreground bg-card p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md prose-notarial">
                                    {(enviandoMensaje || isStreaming) && idx === mensajesChat.length - 1 && !mensaje.contenido ? (
                                      <div className="flex items-center gap-2 py-1">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-sm font-medium text-muted-foreground">
                                          {currentAgentNode || "Procesando..."}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                          {mensaje.contenido}
                                        </ReactMarkdown>
                                        
                                        {/* Thinking indicator inside the bubble if still streaming */}
                                        {isStreaming && idx === mensajesChat.length - 1 && (
                                          <div className="mt-4 flex items-center gap-2 border-t border-border pt-2">
                                            <div className="flex gap-1">
                                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '0ms' }} />
                                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '150ms' }} />
                                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                                              {currentAgentNode || "Generando..."}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    
                                   </div>
                                   
                                   {/* Acciones del mensaje fuera de la burbuja */}
                                   {!isStreaming && mensaje.contenido && (
                                     <div className="mt-2 flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="h-7 gap-1.5 rounded-full px-3 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                                         onClick={() => {
                                           navigator.clipboard.writeText(mensaje.contenido)
                                           toast.success("Copiado al portapapeles")
                                         }}
                                       >
                                         <Copy className="h-3 w-3" />
                                         Copiar
                                       </Button>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="h-7 gap-1.5 rounded-full px-3 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                                         onClick={() => handleGuardarMensaje(mensaje)}
                                       >
                                         <DownloadCloud className="h-3 w-3" />
                                         Guardar en Carpeta
                                       </Button>
                                     </div>
                                   )}
                                  
                                  {mensaje.referencias && mensaje.referencias.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {mensaje.referencias.map((ref) => (
                                        <button
                                          key={ref.id}
                                          className="inline-flex items-center rounded-lg bg-accent px-2 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                                          onClick={() => toast.info(`Referencia: ${ref.texto}`)}
                                        >
                                          {ref.texto}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <p suppressHydrationWarning className="mt-2 text-[10px] text-muted-foreground/50">
                                    {formatearFecha(mensaje.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chips de Sugerencia e Input - Estetica Soberana */}
                  <div className="shrink-0 p-4 sm:p-6 bg-gradient-to-t from-background to-transparent">
                    <div className="mx-auto max-w-3xl">

                      {/* Campo de Input */}
                      <div className="chat-input-container flex items-end gap-3 rounded-[28px] border border-border bg-card p-2.5 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDialogSubirDocumento(true)}
                          className="h-10 w-10 shrink-0 rounded-full hover:bg-accent text-muted-foreground"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                        
                        <form 
                          className="flex-1 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            enviarMensaje();
                          }}
                        >
                          <input
                            type="text"
                            placeholder={`Consultar sobre ${tramiteActual?.nombre}...`}
                            value={inputMensaje}
                            onChange={(e) => setInputMensaje(e.target.value)}
                            disabled={enviandoMensaje}
                            className="w-full bg-transparent border-0 py-3 text-sm focus:ring-0 placeholder:text-muted-foreground/50 font-medium"
                          />
                          <Button
                            size="icon"
                            type="submit"
                            disabled={!inputMensaje.trim() || enviandoMensaje}
                            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
                          >
                            {enviandoMensaje ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SendHorizontal className="h-5 w-5" />
                            )}
                          </Button>
                        </form>
                      </div>
                      <p className="mt-3 text-center text-[10px] text-muted-foreground/60 tracking-tight">
                        Sistema Notarial Soberano • Datos Protegidos Localmente • Jurisdicción CABA
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

              {activeTab === 'generador' && (
                /* VISTA MOTOR INGESIS (MOCK) */
                <div className="flex flex-1 flex-col p-8 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">
                  <div className="mx-auto max-w-4xl w-full">
                    <div className="mb-8 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">Generación de Documentos (Ingesis)</h2>
                        <p className="text-muted-foreground text-sm">Carga masiva de datos y aplicación de plantillas notariales.</p>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" className="h-9">Importar Excel</Button>
                         <Button className="h-9">Nueva Plantilla</Button>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <Card className="p-6 border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                        <div className="mb-4 h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold mb-1">Certificaciones</h3>
                        <p className="text-xs text-muted-foreground">Generación masiva de actas de firma y copias.</p>
                      </Card>
                      <Card className="p-6 border-border cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="mb-4 h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold mb-1">Poderes Especiales</h3>
                        <p className="text-xs text-muted-foreground">Estructuras pre-definidas para mandatos judiciales.</p>
                      </Card>
                      <Card className="p-6 border-border cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="mb-4 h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Zap className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold mb-1">Automatización</h3>
                        <p className="text-xs text-muted-foreground">Configurar reglas de auto-completado (HITL).</p>
                      </Card>
                    </div>

                    <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center bg-muted/20">
                      <BrainCircuit className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                      <h4 className="text-lg font-semibold text-muted-foreground">Módulo en Desarrollo</h4>
                      <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">El motor Ingesis se integrará con el asistente IA para automatizar la redacción basada en sus bases de datos históricas.</p>
                    </div>
                  </div>
                </div>
              )}
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
                              onClick={() => {
                                setInputMensaje(`Por favor, redactá un borrador de ${tipo.nombre} para el trámite actual.`);
                                toast.info(`Preparando solicitud de ${tipo.nombre}`);
                              }}
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
                                {getIconoGenerable(tipo.icono)}
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
                             onClose={() => setEditorContent("")}
                             titulo={tramiteActual?.nombre || "Revisión de Documento"}
                           />
                        </div>
                      )}

                      {/* Seccion: Documentos Generados */}
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          Documentos Guardados ({documentosGenerados.length})
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
                              Aun no hay documentos guardados
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Seccion: Panel de Validación de Datos (Auditoría HITL) */}
                      {datosExtraidos && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Panel de Validación de Datos
                          </h3>
                          <div className="space-y-3">
                            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 shadow-sm">
                              <div className="mb-4 flex items-center justify-between border-b border-primary/10 pb-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Auditoría Inteligente</p>
                                <Badge variant="outline" className="bg-background text-[9px] uppercase tracking-tighter">ID {datosExtraidos.tramite_id}</Badge>
                              </div>
                              
                              <div className="space-y-4">
                                {datosExtraidos.clientes.map((cliente: any, idx: number) => {
                                   const matchingCliente = clientes.find(c => c.dni === cliente.dni_cuit);
                                   const isDataCorrect = matchingCliente && matchingCliente.nombre_completo === cliente.nombre;
                                   
                                   return (
                                     <div key={idx} className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                                       <div className="flex items-start justify-between gap-3">
                                         <div className="flex-1">
                                           <div className="flex items-center gap-2 mb-1">
                                             <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{cliente.rol || 'Interviniente'}</span>
                                             {isDataCorrect ? (
                                               <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 text-[9px] h-4">Validado</Badge>
                                             ) : (
                                               <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 text-[9px] h-4">Discrepancia</Badge>
                                             )}
                                           </div>
                                           <p className="text-sm font-bold text-foreground">{cliente.nombre}</p>
                                           <p className="font-mono text-[11px] text-muted-foreground">{cliente.dni_cuit}</p>
                                         </div>
                                         
                                         <div className="flex flex-col items-center gap-2">
                                           {isDataCorrect ? (
                                             <div className="rounded-full bg-emerald-500/10 p-1.5 ring-1 ring-emerald-500/20">
                                               <Check className="h-4 w-4 text-emerald-600" />
                                             </div>
                                           ) : (
                                             <div className="rounded-full bg-red-500/10 p-1.5 ring-1 ring-red-500/20 animate-pulse">
                                               <AlertTriangle className="h-4 w-4 text-red-600" />
                                             </div>
                                           )}
                                           {!isDataCorrect && (
                                             <Button 
                                               variant="ghost" 
                                               size="sm" 
                                               className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                                               onClick={() => toast.info("Corrigiendo datos con la base central...")}
                                             >
                                               Corregir
                                             </Button>
                                           )}
                                         </div>
                                       </div>
                                       
                                       {/* Mock validation fields */}
                                       <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-2">
                                         <div className="flex items-center gap-1.5">
                                           <div className={cn("h-1.5 w-1.5 rounded-full", isDataCorrect ? "bg-emerald-500" : "bg-red-500")} />
                                           <span className="text-[10px] text-muted-foreground">Estado Civil</span>
                                         </div>
                                         <div className="flex items-center gap-1.5">
                                           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                           <span className="text-[10px] text-muted-foreground">RENAPER OK</span>
                                         </div>
                                       </div>
                                     </div>
                                   );
                                })}
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
        <DialogContent className="glass-premium sm:max-w-lg border-primary/20">
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
        <DialogContent className="glass-premium sm:max-w-md border-primary/20">
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
        <DialogContent className="glass-premium sm:max-w-md border-primary/20">
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
        <DialogContent className="glass-premium sm:max-w-md border-primary/20">
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
        <DialogContent className="glass-premium max-h-[90vh] sm:max-w-3xl border-primary/20">
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
        <DialogContent className="glass-premium sm:max-w-md border-primary/20">
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
        <DialogContent className="glass-premium sm:max-w-md border-primary/20">
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
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        .animate-premium-in {
          animation: premium-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes premium-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .prose-notarial p {
          margin-bottom: 1.25rem;
          line-height: 1.8;
          text-align: justify;
          color: hsl(var(--foreground));
        }
        
        .prose-notarial strong {
          color: hsl(var(--foreground));
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .prose-notarial ul, .prose-notarial ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }

        .prose-notarial li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }

        .prose-notarial h1, .prose-notarial h2, .prose-notarial h3 {
          color: hsl(var(--primary));
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .glass-premium {
          background: rgba(var(--card), 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(var(--border), 0.5);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
        }

        .dark .glass-premium {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  )
}
