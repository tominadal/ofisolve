/**
 * OFISOLVE API CLIENT (RECONSTRUCTED & ROBUST)
 * Cliente unificado para comunicación con el backend FastAPI.
 * Soporta autenticación, Workspaces, Trámites y Streaming de IA.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class OfiSolveApi {
  private token: string | null = null;
  private workspaceId: number | null = null;

  constructor() {
    // Auto-initialize token from localStorage at construction time
    // so the very first API calls are already authenticated
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("ofisolve_token");
      if (stored) {
        this.token = stored;
      }
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  setWorkspace(id: number) {
    this.workspaceId = id;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    
    // Recuperar token de localStorage si no está en memoria
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem("ofisolve_token");
    }

    const isFormData = options.body instanceof FormData;
    const headers: any = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem("ofisolve_token");
          // Redirección forzada para evitar estado zombie (Fix #5)
          window.location.href = '/login';
        }
        throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.");
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Error desconocido" }));
        throw new Error(error.detail || "Error en la petición");
      }

      return response.json();
    } catch (error: any) {
      console.error(`API Request Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // --- AUTENTICACIÓN ---
  async login(formData: FormData): Promise<any> {
    // NOTE: BASE_URL already contains /api/v1, so we must NOT repeat it
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Credenciales inválidas" }));
      throw new Error(error.detail || "Error en la petición");
    }
    return response.json();
  }

  async registrar(data: any): Promise<any> {
    return this.request("/auth/register", { 
      method: "POST", 
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" }
    });
  }

  async obtenerPerfil(): Promise<any> {
    return this.request("/auth/me");
  }

  async actualizarPerfil(datos: any): Promise<any> {
    return this.request("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(datos)
    });
  }

  // --- WORKSPACES ---
  async obtenerWorkspaces(): Promise<any[]> {
    return this.request("/workspaces/");
  }

  async crearWorkspace(data: { nombre: string; descripcion?: string }): Promise<any> {
    return this.request("/workspaces/", { method: "POST", body: JSON.stringify(data) });
  }

  // --- TRAMITES ---
  async obtenerTramites(workspaceId: number): Promise<any[]> {
    return this.request(`/workspaces/${workspaceId}/tramites`);
  }

  async crearTramite(workspaceId: number, data: any): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/tramites`, { method: "POST", body: JSON.stringify(data) });
  }

  async eliminarTramite(workspaceId: number, tramiteId: number): Promise<void> {
    await this.request(`/workspaces/${workspaceId}/tramites/${tramiteId}`, { method: "DELETE" });
  }

  async actualizarTramite(tramiteId: number, data: any): Promise<any> {
    return this.request(`/workspaces/tramites/${tramiteId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async aprobarTramite(tramiteId: number, contenido: string): Promise<any> {
    return this.request(`/tramites/${tramiteId}/aprobar`, { 
      method: "POST", 
      body: JSON.stringify({ contenido }) 
    });
  }

  async obtenerSaludo(tramiteId: number): Promise<{ saludo: string }> {
    return this.request(`/tramites/${tramiteId}/saludo`);
  }

  // --- HISTORIAL DE CHAT (Mejora B) ---
  async obtenerHistorialChat(tramiteId: number): Promise<any[]> {
    try {
      return await this.request(`/tramites/${tramiteId}/mensajes`);
    } catch {
      return [];
    }
  }

  async guardarMensajeChat(tramiteId: number, role: string, contenido: string): Promise<any> {
    return this.request(`/tramites/${tramiteId}/mensajes`, {
      method: "POST",
      body: JSON.stringify({ role, contenido })
    });
  }

  async limpiarHistorialChat(tramiteId: number): Promise<void> {
    return this.request(`/tramites/${tramiteId}/mensajes`, {
      method: "DELETE"
    });
  }

  async obtenerArchivosTramite(tramiteId: number): Promise<any[]> {
    return this.request(`/tramites/${tramiteId}/archivos`);
  }

  async obtenerParticipaciones(tramiteId: number): Promise<any> {
    return this.request(`/tramites/${tramiteId}/participaciones`);
  }

  async checkHealth(): Promise<any> {
    try {
      // Usamos fetch directamente porque puede no estar bajo /api/v1
      const response = await fetch(`${BASE_URL.replace('/api/v1', '')}/health`);
      return await response.json();
    } catch {
      return { status: "offline", ollama: { status: "offline" } };
    }
  }

  async obtenerContenidoDocumento(docId: number): Promise<{ contenido: string }> {
    return this.request(`/tramites/documentos/${docId}/contenido`);
  }

  async guardarDocumento(workspaceId: number, nombre: string, contenido: string, clienteId?: number, tramiteId?: number): Promise<any> {
    // Crea un documento de texto en la librería del workspace
    const blob = new Blob([contenido], { type: 'text/plain' });
    const file = new File([blob], nombre, { type: 'text/plain' });
    return this.subirDocumento(workspaceId, file, tramiteId);
  }

  // --- CLIENTES ---
  async obtenerClientes(workspaceId: number): Promise<any[]> {
    // Intentamos la ruta del workspace, fallback a global si falla
    try {
      return await this.request(`/workspaces/${workspaceId}/clientes`);
    } catch {
      return this.request("/clientes");
    }
  }

  async crearCliente(workspaceId: number, data: any): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/clientes`, { method: "POST", body: JSON.stringify(data) });
  }

  // --- EQUIPO ---
  async obtenerEquipo(workspaceId: number): Promise<any[]> {
    return this.request(`/workspaces/${workspaceId}/equipo`);
  }

  // --- RAG & DOCUMENTOS ---
  async obtenerFuentesRag(workspaceId?: number): Promise<any[]> {
    const wsId = workspaceId || this.workspaceId || 1;
    try {
      return await this.request(`/workspaces/${wsId}/documentos`);
    } catch {
      // Fallback a fuentes estáticas del RAG global
      return (this.request("/generate/rag/sources") as Promise<any[]>).catch(() => [] as any[]);
    }
  }

  async subirDocumento(workspaceId: number, file: File, tramiteId?: number): Promise<any> {
    // Límite de 10MB estricto en cliente
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new Error(`El archivo excede el límite permitido de ${MAX_MB}MB.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    if (tramiteId != null) {
      formData.append("tramite_id", String(tramiteId));
    }

    const response = await fetch(`${BASE_URL}/workspaces/${workspaceId}/documentos`, {
      method: "POST",
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: formData,
    });
    return response.json();
  }

  async generarCertificacion(data: any, params?: any): Promise<any> {
    const queryString = params ? `?nombre_escribano=${encodeURIComponent(params.nombre_escribano || '')}&nro_registro=${encodeURIComponent(params.nro_registro || '')}` : '';
    return this.request(`/generate/certificacion${queryString}`, { 
      method: "POST", 
      body: JSON.stringify(data) 
    });
  }

  async obtenerDocumentosGenerados(tramiteId: number): Promise<any[]> {
    try {
      return await this.request(`/tramites/${tramiteId}/documentos-generados`);
    } catch {
      return [];
    }
  }

  async streamTramiteChat(
    mensaje: string,
    threadId: string,
    tenantId: string,
    history: { role: string; contenido: string }[] = [],
    modelo?: string,
    onEvent?: (event: any) => void
  ): Promise<void> {
    const url = `${BASE_URL}/documentos/chat/`;
    const payload: any = {
      mensaje,
      thread_id: threadId,
      tenant_id: tenantId,
      history: history.map(h => ({ role: h.role, contenido: h.contenido }))
    };
    if (modelo) {
      payload.modelo = modelo;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) throw new Error("Error en el stream del chat");
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            if (onEvent) onEvent({ event: "done" });
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (onEvent) onEvent(parsed);
          } catch (e) {
            console.error("Error parsing SSE JSON:", e);
          }
        }
      }
    }
  }

  // --- EXPORTAR ---
  async descargarDocx(ruta: string, filename: string) {
    const response = await fetch(ruta, {
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      }
    });
    if (!response.ok) throw new Error("Error al descargar archivo");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async exportarDocumento(titulo: string, contenido: string, formato: "docx" | "pdf"): Promise<void> {
    // NOTE: BASE_URL already contains /api/v1, so we must NOT repeat it
    const response = await fetch(`${BASE_URL}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ titulo, contenido, formato }),
    });

    if (!response.ok) throw new Error("Error al exportar documento");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo.replace(/ /g, '_')}.${formato}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // --- Sistema ---
  async obtenerModelos(): Promise<string[]> {
    const res = await this.request('/sistema/modelos');
    return res.modelos || [];
  }
}

export const ofisolveApi = new OfiSolveApi();
