/**
 * =============================================================================
 * OFISOLVE - CLIENTE API TIPADO
 * =============================================================================
 * 
 * Este modulo provee un cliente API completamente tipado para comunicarse
 * con el backend de OfiSolve (FastAPI).
 * 
 * BASE URL: Dynamically loaded from environment or http://localhost:8000
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * ENDPOINTS IMPLEMENTADOS:
 * })
 * 
 * // Descargar DOCX
 * await ofisolveApi.descargarDocx(response.ruta_descarga, "certificacion.docx")
 * ```
 * 
 * @author OfiSolve Team
 * @version 1.0.0
 */

import type {
  CertificacionQueryParams,
  CertificacionRequest,
  CertificacionResponse,
  Cliente,
  DocumentoGenerado,
  ErrorResponse,
  FuenteRag,
  HealthResponse,
  InfoAnonimizacion,
  TipoDocumentoACertificar,
  WorkspaceCreate,
  WorkspaceResponse,
  TramiteCreate,
  TramiteResponse,
  ValidationError,
  RAGStats,
  ClienteCreate,
  ClienteResponse,
  EquipoMiembroCreate,
  EquipoMiembroResponse,
  ChatNotarialRequest,
  ChatNotarialResponse
} from "./types"

// =============================================================================
// CONFIGURACION
// =============================================================================

/**
 * URL base del backend FastAPI
 * En produccion, esto deberia venir de una variable de entorno
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * Timeout por defecto para las peticiones (120 segundos para generacion pesada con LLM RAG)
 */
const DEFAULT_TIMEOUT = 120000

// =============================================================================
// TIPOS DE ERROR CUSTOM
// =============================================================================

/**
 * Error personalizado para errores de la API
 */
export class OfiSolveApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "OfiSolveApiError"
  }
}

/**
 * Error de validacion (422)
 */
export class ValidationApiError extends OfiSolveApiError {
  constructor(
    public errors: ValidationError["detail"]
  ) {
    super("Error de validacion en los datos enviados", 422, "VALIDATION_ERROR", errors)
    this.name = "ValidationApiError"
  }
  
  /**
   * Obtiene los mensajes de error formateados para mostrar en UI
   */
  getFormattedErrors(): Record<string, string> {
    const formatted: Record<string, string> = {}
    for (const error of this.errors) {
      const field = error.loc[error.loc.length - 1]?.toString() || "general"
      formatted[field] = error.msg
    }
    return formatted
  }
}

// =============================================================================
// FUNCIONES HELPER
// =============================================================================

/**
 * Realiza una peticion fetch con timeout y manejo de errores
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("ofisolve_token") : null
    const headers = {
      ...options.headers as any,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    }).catch(err => {
      console.error(`[OfiSolve API] Connection error for ${url}:`, err);
      throw err;
    });
    return response;
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Procesa la respuesta y lanza errores si corresponde
 */
async function handleResponse<T>(response: Response): Promise<T> {
  // Si es un 422, parsear los errores de validacion
  if (response.status === 422) {
    const validationError = await response.json() as ValidationError
    throw new ValidationApiError(validationError.detail)
  }

  // Si no es ok, lanzar error general
  if (!response.ok) {
    let errorData: ErrorResponse | null = null
    try {
      errorData = await response.json() as ErrorResponse
    } catch {
      // Si no se puede parsear el JSON, usar un mensaje generico
    }

    throw new OfiSolveApiError(
      errorData?.detail || `Error ${response.status}: ${response.statusText}`,
      response.status,
      errorData?.error_code
    )
  }

  // Parsear respuesta JSON
  return response.json() as Promise<T>
}

/**
 * Construye URL con query parameters
 */
function buildUrl(path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(path, API_BASE_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value)
      }
    })
  }
  return url.toString()
}

// =============================================================================
// CLIENTE API
// =============================================================================

/**
 * Cliente API de OfiSolve
 * Contiene todos los metodos para interactuar con el backend
 */
export const ofisolveApi = {
  /**
   * Setea el token para las peticiones (ya se maneja via localStorage en fetchWithTimeout)
   */
  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("ofisolve_token", token)
    }
  },

  // ---------------------------------------------------------------------------
  // AUTENTICACION
  // ---------------------------------------------------------------------------

  /**
   * Obtiene el perfil del usuario actual (me)
   */
  async obtenerPerfil(): Promise<any> {
    const url = buildUrl("/api/v1/auth/me")
    const response = await fetchWithTimeout(url, { method: "GET" })
    return handleResponse<any>(response)
  },

  // ---------------------------------------------------------------------------
  // CERTIFICACIONES
  // ---------------------------------------------------------------------------

  /**
   * Genera una certificacion notarial
   * 
   * @param data - Datos del requirente y tipo de certificacion
   * @param options - Opciones adicionales (nombre escribano, nro registro)
   * @returns Certificacion generada con texto y metadatos
   * 
   * @example
   * ```typescript
   * const cert = await ofisolveApi.generarCertificacion({
   *   nombre_requirente: "Juan Carlos Perez",
   *   dni: "28456789",
   *   tipo_documento_a_certificar: "firma",
   *   domicilio: "Av. Corrientes 1234, CABA"
   * }, {
   *   nombre_escribano: "Dr. Martin Rodriguez",
   *   nro_registro: "123"
   * })
   * 
   * console.log(cert.texto_generado)
   * ```
   */
  async generarCertificacion(
    data: CertificacionRequest,
    options?: CertificacionQueryParams
  ): Promise<CertificacionResponse> {
    const url = buildUrl("/api/v1/generate/certificacion", {
      format: options?.format,
      nombre_escribano: options?.nombre_escribano,
      nro_registro: options?.nro_registro,
    })

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    return handleResponse<CertificacionResponse>(response)
  },

  /**
   * Genera y descarga directamente un archivo DOCX de certificacion
   * 
   * @param data - Datos del requirente y tipo de certificacion
   * @param options - Opciones adicionales
   * @param filename - Nombre del archivo a descargar
   * 
   * @example
   * ```typescript
   * await ofisolveApi.generarYDescargarDocx({
   *   nombre_requirente: "Juan Carlos Perez",
   *   dni: "28456789",
   *   tipo_documento_a_certificar: "firma"
   * }, {
   *   nombre_escribano: "Dr. Martin Rodriguez"
   * }, "certificacion_perez.docx")
   * ```
   */
  async generarYDescargarDocx(
    data: CertificacionRequest,
    options?: Omit<CertificacionQueryParams, "format">,
    filename = "certificacion.docx"
  ): Promise<void> {
    const url = buildUrl("/api/v1/generate/certificacion", {
      format: "docx",
      nombre_escribano: options?.nombre_escribano,
      nro_registro: options?.nro_registro,
    })

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      // Si hay error, intentar parsear como JSON
      if (response.status === 422) {
        const validationError = await response.json() as ValidationError
        throw new ValidationApiError(validationError.detail)
      }
      const errorData = await response.json().catch(() => null) as ErrorResponse | null
      throw new OfiSolveApiError(
        errorData?.detail || `Error ${response.status}`,
        response.status,
        errorData?.error_code
      )
    }

    // Descargar el blob
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  },

  /**
   * Descarga un archivo DOCX previamente generado
   * 
   * @param rutaDescarga - Ruta retornada por generarCertificacion
   * @param filename - Nombre del archivo a guardar
   * 
   * @example
   * ```typescript
   * // Despues de generar una certificacion
   * if (cert.ruta_descarga) {
   *   await ofisolveApi.descargarDocx(cert.ruta_descarga, "mi_cert.docx")
   * }
   * ```
   */
  async descargarDocx(rutaDescarga: string, filename = "documento.docx"): Promise<void> {
    // Si la ruta ya es completa, usarla directamente
    const url = rutaDescarga.startsWith("http")
      ? rutaDescarga
      : `${API_BASE_URL}${rutaDescarga}`

    const response = await fetchWithTimeout(url, {
      method: "GET",
    })

    if (!response.ok) {
      throw new OfiSolveApiError(
        `Error al descargar: ${response.statusText}`,
        response.status
      )
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  },

  // ---------------------------------------------------------------------------
  // RAG (Retrieval-Augmented Generation)
  // ---------------------------------------------------------------------------

  /**
   * Ingesta la base de conocimiento legal en el sistema RAG
   * 
   * @param forzar - Si es true, reinicia e ingesta desde cero
   * 
   * @example
   * ```typescript
   * // Ingesta inicial
   * await ofisolveApi.ingestarRAG()
   * 
   * // Reingestar todo
   * await ofisolveApi.ingestarRAG(true)
   * ```
   */
  async ingestarRAG(forzar = false): Promise<{ message: string }> {
    const url = buildUrl("/api/v1/generate/rag/ingestar", {
      forzar: forzar ? "true" : undefined,
    })

    const response = await fetchWithTimeout(url, {
      method: "POST",
    })

    return handleResponse<{ message: string }>(response)
  },

  /**
   * Obtiene estadisticas del sistema RAG
   * 
   * @returns Estadisticas del RAG (documentos, chunks, estado)
   * 
   * @example
   * ```typescript
   * const stats = await ofisolveApi.obtenerRAGStats()
   * console.log(`Documentos ingestados: ${stats.total_documentos}`)
   * ```
   */
  async obtenerRAGStats(): Promise<RAGStats> {
    const url = buildUrl("/api/v1/generate/rag/stats")

    const response = await fetchWithTimeout(url, {
      method: "GET",
    })

    return handleResponse<RAGStats>(response)
  },

  // ---------------------------------------------------------------------------
  // HEALTH CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Health check del servicio de generacion
   * 
   * @returns Estado del servicio
   */
  async healthCheckGeneracion(): Promise<HealthResponse> {
    const url = buildUrl("/api/v1/generate/health")

    const response = await fetchWithTimeout(url, {
      method: "GET",
    }, 5000) // Timeout mas corto para health checks

    return handleResponse<HealthResponse>(response)
  },

  /**
   * Health check global del backend
   * 
   * @returns Estado general del sistema
   */
  async healthCheck(): Promise<HealthResponse> {
    const url = buildUrl("/health")

    const response = await fetchWithTimeout(url, {
      method: "GET",
    }, 5000)

    return handleResponse<HealthResponse>(response)
  },

  // ---------------------------------------------------------------------------
  // FUENTES RAG
  // ---------------------------------------------------------------------------

  /**
   * Obtiene la lista de fuentes documentales del backend RAG
   */
  async obtenerFuentesRag(): Promise<FuenteRag[]> {
    const url = buildUrl("/api/v1/generate/rag/sources")
    const response = await fetchWithTimeout(url, {
      method: "GET",
    })
    return handleResponse<FuenteRag[]>(response)
  },

  // ---------------------------------------------------------------------------
  // WORKSPACES & TRAMITES
  // ---------------------------------------------------------------------------

  async obtenerWorkspaces(): Promise<WorkspaceResponse[]> {
    const url = buildUrl("/api/v1/workspaces/")
    const response = await fetchWithTimeout(url, { method: "GET" })
    return handleResponse<WorkspaceResponse[]>(response)
  },

  async crearWorkspace(data: WorkspaceCreate): Promise<WorkspaceResponse> {
    const url = buildUrl("/api/v1/workspaces/")
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return handleResponse<WorkspaceResponse>(response)
  },

  async obtenerTramites(workspaceId: number): Promise<TramiteResponse[]> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/tramites`)
    const response = await fetchWithTimeout(url, { method: "GET" })
    return handleResponse<TramiteResponse[]>(response)
  },

  async crearTramite(workspaceId: number, data: TramiteCreate): Promise<TramiteResponse> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/tramites`)
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return handleResponse<TramiteResponse>(response)
  },

  // ---------------------------------------------------------------------------
  // CLIENTES & EQUIPO
  // ---------------------------------------------------------------------------

  async obtenerClientes(workspaceId: number): Promise<ClienteResponse[]> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/clientes`)
    const response = await fetchWithTimeout(url, { method: "GET" })
    return handleResponse<ClienteResponse[]>(response)
  },

  async crearCliente(workspaceId: number, data: ClienteCreate): Promise<ClienteResponse> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/clientes`)
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return handleResponse<ClienteResponse>(response)
  },

  async obtenerEquipo(workspaceId: number): Promise<EquipoMiembroResponse[]> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/equipo`)
    const response = await fetchWithTimeout(url, { method: "GET" })
    return handleResponse<EquipoMiembroResponse[]>(response)
  },

  async crearMiembroEquipo(workspaceId: number, data: EquipoMiembroCreate): Promise<EquipoMiembroResponse> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/equipo`)
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return handleResponse<EquipoMiembroResponse>(response)
  },

  // ---------------------------------------------------------------------------
  // CHAT NOTARIAL (RAG STRICT)
  // ---------------------------------------------------------------------------

  async chatNotarial(data: ChatNotarialRequest): Promise<ChatNotarialResponse> {
    const url = buildUrl("/api/v1/chat/notarial")
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return handleResponse<ChatNotarialResponse>(response)
  },

  // ---------------------------------------------------------------------------
  // ACTUALIZACIONES (Fase 4)
  // ---------------------------------------------------------------------------

  async actualizarTramite(id: number, data: Partial<TramiteCreate>): Promise<TramiteResponse> {
    const url = buildUrl(`/api/v1/workspaces/tramites/${id}`)
    const response = await fetchWithTimeout(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    return handleResponse<TramiteResponse>(response)
  },

  async subirDocumento(workspaceId: number, file: File): Promise<any> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/documentos`)
    const formData = new FormData()
    formData.append("file", file)
    
    const response = await fetchWithTimeout(url, {
      method: "POST",
      body: formData
    })
    return handleResponse<any>(response)
  },

  async obtenerDocumentosLibreria(workspaceId: number): Promise<any[]> {
    const url = buildUrl(`/api/v1/workspaces/${workspaceId}/documentos`)
    const response = await fetchWithTimeout(url, { method: "GET" })
    return handleResponse<any[]>(response)
  },

  // ---------------------------------------------------------------------------
  // STREAMING & HITL (Fase 4)
  // ---------------------------------------------------------------------------

  /**
   * Peticion de chat con streaming (SSE)
   * Usa ReadableStream para consumir eventos en tiempo real
   */
  async streamTramiteChat(
    mensaje: string, 
    threadId: string, 
    tenantId: string, 
    onEvent: (event: any) => void
  ): Promise<void> {
    const url = buildUrl("/api/v1/tramites/chat")
    const token = typeof window !== "undefined" ? localStorage.getItem("ofisolve_token") : null
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        mensaje,
        thread_id: threadId,
        tenant_id: tenantId
      })
    })

    if (!response.ok) {
      throw new OfiSolveApiError(`Error ${response.status}`, response.status)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error("ReadableStream not supported")

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split("\n")
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6))
            onEvent(data)
          } catch (e) {
            console.warn("Error parseando SSE chunk:", e)
          }
        }
      }
    }
  },

  /**
   * Finaliza un tramite (Aprobar HITL)
   * Actualiza el estado y el contenido definitivo
   */
  async aprobarTramite(workspaceId: number, tramiteId: number, contenido: string): Promise<any> {
    const url = buildUrl(`/api/v1/tramites/${tramiteId}/aprobar`)
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido })
    })
    return handleResponse<any>(response)
  }

}

// =============================================================================
// HOOKS HELPERS (para usar con SWR o React Query)
// =============================================================================

/**
 * Fetcher generico para usar con SWR
 * 
 * @example
 * ```typescript
 * import useSWR from 'swr'
 * import { swrFetcher } from '@/lib/api'
 * 
 * const { data, error } = useSWR('/api/v1/generate/rag/stats', swrFetcher)
 * ```
 */
export async function swrFetcher<T>(path: string): Promise<T> {
  const url = buildUrl(path)
  const response = await fetchWithTimeout(url)
  return handleResponse<T>(response)
}

// =============================================================================
// VALIDACIONES CLIENT-SIDE
// =============================================================================

/**
 * Valida el formato del DNI (7-8 digitos sin puntos)
 */
export function validarDNI(dni: string): boolean {
  return /^\d{7,8}$/.test(dni)
}

/**
 * Valida el formato del CUIT (XX-XXXXXXXX-X)
 */
export function validarCUIT(cuit: string): boolean {
  return /^\d{2}-\d{8}-\d{1}$/.test(cuit)
}

/**
 * Formatea un DNI con puntos para mostrar
 * @example formatearDNI("28456789") => "28.456.789"
 */
export function formatearDNI(dni: string): string {
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/**
 * Limpia un DNI removiendo puntos y espacios
 * @example limpiarDNI("28.456.789") => "28456789"
 */
export function limpiarDNI(dni: string): string {
  return dni.replace(/[.\s]/g, "")
}
