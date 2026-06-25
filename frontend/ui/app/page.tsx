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
import { IngesiMotor } from "@/components/ingesi-motor";
import { ChatArea } from "@/components/chat/ChatArea";
import { Sidebar } from "@/components/layout/Sidebar";
import { SubirDocumentoModal } from "@/components/modals/SubirDocumentoModal";
import { ConfiguracionModal } from "@/components/modals/ConfiguracionModal";
import { EditarPerfilModal } from "@/components/modals/EditarPerfilModal";
import { CambiarContrasenaModal } from "@/components/modals/CambiarContrasenaModal";
import { NuevoWorkspaceModal } from "@/components/modals/NuevoWorkspaceModal";
import { NuevoTramiteModal } from "@/components/modals/NuevoTramiteModal";
import { PreviewDocumentoModal } from "@/components/modals/PreviewDocumentoModal";
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
  const [ollamaStatus, setOllamaStatus] = useState<"online" | "offline" | "error" | "unknown">("unknown")

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceActual, setWorkspaceActual] = useState<Workspace | null>(null)
  const [tramiteActual, setTramiteActual] = useState<Tramite | null>(null)
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [documentosFuente, setDocumentosFuente] = useState<DocumentoFuente[]>([])
  const [mensajesChat, setMensajesChat] = useState<MensajeChat[]>([])
  const [alertasLegales, setAlertasLegales] = useState<AlertaLegal[]>([])
  const [documentosGenerados, setDocumentosGenerados] = useState<DocumentoGenerado[]>([])

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
  
  const [formPerfil, setFormPerfil] = useState({ 
    nombre: "", 
    email: "", 
    telefono: "",
    nroMatricula: "",
    escribaniaNombre: ""
  })
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

    const checkOllama = async () => {
      const health = await ofisolveApi.checkHealth();
      setOllamaStatus(health?.ollama?.status || "unknown");
    };
    checkOllama();
    const interval = setInterval(checkOllama, 30000); // Check every 30s
    return () => clearInterval(interval);
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

  // --- EFFECT: Saludo inicial y carga de historial al entrar a un Trámite (B) ---
  useEffect(() => {
    if (!tramiteActual || !usuario) return;

    // Resetear chat al cambiar de carpeta
    setMensajesChat([]);
    setStreamingText("");
    setCurrentAgentNode("");

    // Primero intentar cargar historial persistido (B)
    // Si hay historial, lo usamos directamente sin llamar al LLM (F)
    ofisolveApi.obtenerHistorialChat(tramiteActual.id)
      .then(historial => {
        if (historial && historial.length > 0) {
          // (B) Historial existente — retomar conversación
          const mensajes: MensajeChat[] = historial.map((m: any) => ({
            id: m.id,
            tipo: m.role === 'user' ? 'usuario' : 'ia',
            contenido: m.contenido,
            timestamp: new Date(m.timestamp),
          }));
          setMensajesChat(mensajes);
        } else {
          // (F) Sin historial — generar saludo contextual (con fallback)
          ofisolveApi.obtenerSaludo(tramiteActual.id)
            .then(res => {
              setMensajesChat([{
                id: Date.now(),
                tipo: "ia",
                contenido: typeof res === 'string' ? res : (res.saludo || "¿En qué puedo ayudarte con esta carpeta?"),
                timestamp: new Date()
              }]);
            })
            .catch(() => {
              setMensajesChat([{
                id: Date.now(),
                tipo: "ia",
                contenido: "Hola, ¿en qué puedo ayudarte con esta carpeta?",
                timestamp: new Date()
              }]);
            });
        }
      })
      .catch(() => {
        // Si falla la carga de historial, usar saludo
        ofisolveApi.obtenerSaludo(tramiteActual.id)
          .then(res => {
            setMensajesChat([{
              id: Date.now(),
              tipo: "ia",
              contenido: typeof res === 'string' ? res : (res.saludo || "¿En qué puedo ayudarte?"),
              timestamp: new Date()
            }]);
          })
          .catch(() => {
            setMensajesChat([{
              id: Date.now(),
              tipo: "ia",
              contenido: "Hola, ¿en qué puedo ayudarte con esta carpeta?",
              timestamp: new Date()
            }]);
          });
      });
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
        
        ofisolveApi.setWorkspace(wsId)
        ofisolveApi.obtenerClientes(wsId).then(setClientes)
        ofisolveApi.obtenerEquipo(wsId).then(setEquipo)
        
        ofisolveApi.obtenerFuentesRag(wsId).then(data => {
          setDocumentosFuente(data.map((f: any) => ({
            id: f.id,
            nombre: f.titulo || f.nombre || "Documento",
            tipo: f.tipo,
            url: f.fuente || f.path || "",
            seleccionado: true,
            fechaSubida: new Date()
          })))
        }).catch(() => {}) // No bloquear si no hay documentos aún
      }
    }
  }, [workspaceActual, token])

  // Sincronizar form perfil
  useEffect(() => {
    if (usuario) {
      setFormPerfil({
        nombre: usuario.nombre_completo || usuario.nombre || "",
        email: usuario.email || "",
        telefono: usuario.telefono || "",
        nroMatricula: usuario.nroMatricula || "",
        escribaniaNombre: usuario.escribaniaNombre || ""
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

      // 2. Cargar Documentos Generados Reales (reemplaza mocks)
      ofisolveApi.obtenerDocumentosGenerados(tid)
        .then(docs => {
          if (docs && docs.length > 0) {
            setDocumentosGenerados(docs.map((d: any) => ({
              id: d.id,
              nombre: d.nombre,
              tipo: d.tipo,
              fechaGeneracion: new Date(d.fechaGeneracion),
              version: d.version || 1,
              contenidoPreview: d.contenidoPreview || "",
              contenido: d.contenidoPreview || "",
            })))
          }
        })
        .catch(() => {}) // No bloquear si no hay documentos aun
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
        .slice(-10)
        .map(m => ({
          role: m.tipo === "usuario" ? "user" : "assistant" as "user" | "assistant",
          content: m.contenido
        }))

      // (B) Persistir mensaje del usuario en DB
      if (tramiteActual) {
        ofisolveApi.guardarMensajeChat(tramiteActual.id, 'user', textoUsuario).catch(() => {});
      }

      // Usar tramite_id como thread_id para colecciones RAG por carpeta
      const threadId = tramiteActual ? `tramite_${tramiteActual.id}` : tenantId;

      await ofisolveApi.streamTramiteChat(
        textoUsuario,
        threadId,
        tenantId,
        history,
        (event) => {
          if (event.event === "estado") {
            setCurrentAgentNode(event.mensaje || event.nodo)
          } 
          else if (event.event === "token") {
            accumulatedText += event.texto
            setStreamingText(accumulatedText)
            setMensajesChat(prev => prev.map(m => 
              m.id === aiMessageId ? { ...m, contenido: accumulatedText } : m
            ))
          }
          else if (event.event === "finalizado") {
            setIsStreaming(false)
            setCurrentAgentNode(null)
            
            const finalText = event.texto_completo || accumulatedText
            if (event.texto_completo) {
              setMensajesChat(prev => prev.map(m => 
                m.id === aiMessageId ? { ...m, contenido: event.texto_completo } : m
              ))
              accumulatedText = event.texto_completo
            }

            // (B) Persistir respuesta de la IA en DB
            if (tramiteActual && finalText) {
              ofisolveApi.guardarMensajeChat(tramiteActual.id, 'assistant', finalText).catch(() => {});
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
        // (A) Pasar tramite_id para indexar en coleción RAG específica
        await ofisolveApi.subirDocumento(Number(workspaceActual?.id), archivo, tramiteActual?.id)
      }
      
      toast.success(`${archivosSeleccionados.length} archivo(s) subido(s) e indexado(s) en la carpeta`)
      
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
    // Clear all workspace-dependent state to avoid data flash from previous workspace
    setTramiteActual(null)
    setTramites([])
    setMensajesChat([])
    setDocumentosGenerados([])
    setClientes([])
    setClienteActual(null)
    setParticipaciones([])
    setDatosExtraidos(null)
    setArchivosPorTramite({})
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
    try {
      const payload = {
        nombre_completo: formPerfil.nombre,
        nro_matricula: formPerfil.nroMatricula,
        escribania_nombre: formPerfil.escribaniaNombre
      };
      
      const updatedUser = await ofisolveApi.actualizarPerfil(payload);
      
      setUsuario(prev => prev ? ({
        ...prev,
        nombre: updatedUser.nombre_completo,
        nombre_completo: updatedUser.nombre_completo,
        nroMatricula: updatedUser.nro_matricula,
        escribaniaNombre: updatedUser.escribania_nombre
      }) : null);
      
      setDialogEditarPerfil(false)
      toast.success("Perfil actualizado correctamente")
    } catch (error: any) {
      toast.error(`Error al actualizar perfil: ${error.message}`)
    }
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
    if (!formTramite.nombre.trim() || !workspaceActual) {
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

  const handleExportarHistorial = useCallback(async (tramite: Tramite) => {
    toast.info("Generando reporte de historial...");
    try {
      const historial = mensajesChat.map(m => `[${m.tipo.toUpperCase()}] ${m.contenido}`).join('\n\n');
      const contenido = `Historial de Trámite: ${tramite.nombre}\n\n${historial}`;
      await ofisolveApi.exportarDocumento(
        `Historial_${tramite.nombre.replace(/ /g, '_')}`,
        contenido,
        "pdf"
      );
      toast.success("Historial exportado como PDF");
    } catch (err) {
      toast.error("Error al exportar historial");
    }
  }, [mensajesChat]);

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

  const handleEliminarTramite = useCallback(async (tramite: Tramite) => {
    if (!workspaceActual) return;
    if (!confirm("¿Está seguro de que desea eliminar este trámite de forma permanente? Se borrarán sus documentos y chat.")) return;
    
    try {
      await ofisolveApi.eliminarTramite(Number(workspaceActual.id), tramite.id);
      setTramites(prev => prev.filter(t => t.id !== tramite.id));
      if (tramiteActual?.id === tramite.id) {
        setTramiteActual(null);
      }
      toast.success("Trámite eliminado permanentemente");
    } catch (err) {
      toast.error("Error al eliminar el trámite");
    }
  }, [tramiteActual, workspaceActual]);

  const handleExploreKnowledge = useCallback(async () => {
    if (!workspaceActual) {
      toast.error("Debe seleccionar un workspace primero");
      return;
    }

    // Buscamos si ya existe el trámite genérico de Consultas
    const tramiteExistente = tramites.find(t => t.nombre === "Consultas Normativas Generales" && t.workspaceId === workspaceActual.id);
    if (tramiteExistente) {
      setTramiteActual(tramiteExistente);
      setActiveTab('asistente');
      return;
    }

    // Si no existe, creamos uno sin cliente asociado
    try {
      const nuevo = await ofisolveApi.crearTramite(Number(workspaceActual.id), {
        nombre: "Consultas Normativas Generales",
        tipo: "consulta_legal"
      });
      const nuevoTramite: Tramite = {
        id: nuevo.id,
        tenant_id: DEFAULT_TENANT_ID,
        nombre: nuevo.nombre,
        estado: nuevo.estado as any,
        tipo: nuevo.tipo,
        workspaceId: nuevo.workspace_id.toString(),
        fechaCreacion: new Date(nuevo.fecha_creacion),
        fechaActualizacion: new Date(nuevo.fecha_actualizacion)
      };
      setTramites(prev => [...prev, nuevoTramite]);
      setTramiteActual(nuevoTramite);
      setActiveTab('asistente');
      toast.success("Área de Consultas Legales inicializada");
    } catch (error: any) {
      toast.error("Error al iniciar Biblioteca Legal: " + error.message);
    }
  }, [workspaceActual, tramites]);

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
        return <FileSpreadsheet className="h-4 w-4 text-green-600 dark:green-400" />
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
  const formatearFecha = (fecha: Date | string) => {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d)
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
  const getEstadoTramite = (estado?: Tramite['estado'] | string) => {
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
          {/* Ollama Status */}
          <div className="hidden sm:flex items-center mr-2">
            <Badge variant="outline" className={cn(
              "px-2 py-0.5 text-[10px] font-medium transition-colors",
              ollamaStatus === "online" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
              ollamaStatus === "offline" || ollamaStatus === "error" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
              "bg-muted text-muted-foreground"
            )}>
              {ollamaStatus === "online" ? "🟢 IA Local Activa" : 
               ollamaStatus === "offline" || ollamaStatus === "error" ? "🔴 IA No Disponible" : 
               "⚪ Conectando IA..."}
            </Badge>
          </div>

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
                        nombre: usuario?.nombre_completo || usuario?.nombre || "",
                        email: usuario?.email || "",
                        telefono: usuario?.telefono || "",
                        nroMatricula: usuario?.nroMatricula || "",
                        escribaniaNombre: usuario?.escribaniaNombre || ""
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
                <Sidebar
                  clientes={clientes}
                  tramites={tramites}
                  workspaceActual={workspaceActual}
                  clienteActual={clienteActual}
                  setClienteActual={setClienteActual}
                  tramiteActual={tramiteActual}
                  setTramiteActual={setTramiteActual}
                  expandedClienteId={expandedClienteId}
                  setExpandedClienteId={setExpandedClienteId}
                  setIsNuevoClienteOpen={setIsNuevoClienteOpen}
                  archivosPorTramite={archivosPorTramite}
                  setArchivosPorTramite={setArchivosPorTramite}
                  usuario={usuario}
                />
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
                <ChatArea
                  tramiteActual={tramiteActual}
                  setTramiteActual={setTramiteActual}
                  usuario={usuario}
                  mensajesChat={mensajesChat}
                  setMensajesChat={setMensajesChat}
                  inputMensaje={inputMensaje}
                  setInputMensaje={setInputMensaje}
                  enviarMensaje={enviarMensaje}
                  enviandoMensaje={enviandoMensaje}
                  isStreaming={isStreaming}
                  currentAgentNode={currentAgentNode}
                  handleGuardarMensaje={handleGuardarMensaje}
                  setDialogSubirDocumento={setDialogSubirDocumento}
                  equipo={equipo}
                  miembroAsignado={miembroAsignado}
                  setMiembroAsignado={setMiembroAsignado}
                  handleEditarTramite={handleEditarTramite}
                  handleDuplicarTramite={handleDuplicarTramite}
                  handleExportarHistorial={handleExportarHistorial}
                  handleArchivarTramite={handleArchivarTramite}
                  handleEliminarTramite={handleEliminarTramite}
                  formatearFecha={formatearFecha}
                  getEstadoTramite={getEstadoTramite}
                  setIsNuevoClienteOpen={setIsNuevoClienteOpen}
                  onExploreKnowledge={handleExploreKnowledge}
                />
              )}

              {activeTab === 'generador' && (
                /* ================================================================
                   MOTOR INGESIS — Generación Notarial Profesional
                   ================================================================ */
                <IngesiMotor
                  clientes={clientes}
                  workspaceActual={workspaceActual}
                  tramiteActual={tramiteActual}
                  clienteActual={clienteActual}
                  usuario={usuario}
                  ollamaStatus={ollamaStatus}
                  onDocumentoGenerado={async (resultado) => {
                    // 1. Agregar al panel derecho (Documentos Guardados) de forma optimista
                    const nombreArchivo = resultado.archivo_docx || `Cert_${Date.now()}.docx`;
                    setDocumentosGenerados(prev => [{
                      id: Date.now(),
                      nombre: nombreArchivo,
                      tipo: resultado.modo_llm || "docx",
                      fechaGeneracion: new Date(),
                      version: 1,
                      certificacionId: resultado.ruta_descarga || undefined,
                      contenido: resultado.texto_generado || "",
                      contenidoPreview: (resultado.texto_generado || "").substring(0, 200),
                    }, ...prev]);

                    // 2. Mostrar datos extraídos en Panel de Validación
                    if (resultado.datos_extraidos) {
                      setDatosExtraidos(resultado.datos_extraidos);
                    }

                    // 3. Agregar alerta de privacidad si hubo anonimización
                    if (resultado.anonimizacion?.campos_anonimizados > 0) {
                      setAlertasLegales(prev => [{
                        id: Date.now(),
                        tipo: 'success',
                        titulo: 'Presidio: Datos Ofuscados',
                        descripcion: `Se protegieron ${resultado.anonimizacion.campos_anonimizados} campos (${resultado.anonimizacion.tipos_detectados?.join(", ") || "PII"}).`
                      }, ...prev.filter(a => a.tipo !== 'success')]);
                    }

                    // 4. Refrescar árbol de archivos del Sidebar si hay trámite
                    const tidFinal = resultado.tramite_id || tramiteActual?.id;
                    if (tidFinal) {
                      try {
                        const archivos = await ofisolveApi.obtenerArchivosTramite(tidFinal);
                        setArchivosPorTramite(prev => ({ ...prev, [tidFinal]: archivos }));
                      } catch (e) {
                        // no bloquear si falla el refresco
                      }
                    }
                  }}
                />
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

      <SubirDocumentoModal
        open={dialogSubirDocumento}
        onOpenChange={setDialogSubirDocumento}
        workspaceId={workspaceActual?.id ? Number(workspaceActual.id) : undefined}
        tramiteId={tramiteActual?.id}
        onSuccess={() => {
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
        }}
      />

      <ConfiguracionModal
        open={dialogConfiguracion}
        onOpenChange={setDialogConfiguracion}
        onOpenPerfil={() => setDialogEditarPerfil(true)}
        onOpenContrasena={() => setDialogCambiarContrasena(true)}
      />

      <EditarPerfilModal
        open={dialogEditarPerfil}
        onOpenChange={setDialogEditarPerfil}
        initialData={formPerfil}
        onSave={async (datos) => {
          const updatedUser = await ofisolveApi.actualizarPerfil({
            nombre_completo: datos.nombre,
            nro_matricula: datos.nroMatricula,
            escribania_nombre: datos.escribaniaNombre
          });
          
          setUsuario(prev => prev ? ({
            ...prev,
            nombre: updatedUser.nombre_completo,
            nombre_completo: updatedUser.nombre_completo,
            nroMatricula: updatedUser.nro_matricula,
            escribaniaNombre: updatedUser.escribania_nombre
          }) : null);
          setFormPerfil(datos);
        }}
      />

      <CambiarContrasenaModal
        open={dialogCambiarContrasena}
        onOpenChange={setDialogCambiarContrasena}
      />

      <PreviewDocumentoModal
        open={dialogPreviewDocumento}
        onOpenChange={setDialogPreviewDocumento}
        documentoPreview={documentoPreview}
        onDownload={descargarDocumento}
        formatearFecha={formatearFecha}
      />

      <NuevoWorkspaceModal
        open={dialogNuevoWorkspace}
        onOpenChange={setDialogNuevoWorkspace}
        onSuccess={(nuevoWorkspace) => {
          setWorkspaces([...workspaces, nuevoWorkspace]);
          setWorkspaceActual(nuevoWorkspace);
        }}
      />

      <NuevoTramiteModal
        open={dialogNuevoTramite}
        onOpenChange={setDialogNuevoTramite}
        workspaceId={workspaceActual?.id ? Number(workspaceActual.id) : undefined}
        clienteId={clienteActual?.id}
        onSuccess={(nuevoTramite) => {
          const mapped: Tramite = {
            id: nuevoTramite.id,
            tenant_id: DEFAULT_TENANT_ID,
            nombre: nuevoTramite.nombre,
            estado: nuevoTramite.estado as any,
            tipo: nuevoTramite.tipo,
            workspaceId: nuevoTramite.workspace_id.toString(),
            clienteId: nuevoTramite.cliente_id,
            fechaCreacion: new Date(nuevoTramite.fecha_creacion),
            fechaActualizacion: new Date(nuevoTramite.fecha_actualizacion)
          };
          setTramites(prev => [...prev, mapped]);
          setTramiteActual(mapped);
          setActiveTab('asistente');
        }}
        initialData={formTramite}
      />

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
