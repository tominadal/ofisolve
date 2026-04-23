/**
 * OFISOLVE API CLIENT (RECONSTRUCTED & ROBUST)
 * Cliente unificado para comunicación con el backend FastAPI.
 * Soporta autenticación, Workspaces, Trámites y Streaming de IA.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class OfiSolveApi {
  private token: string | null = null;
  private workspaceId: number | null = null;

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

    const headers = {
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...((options.headers as any) || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem("ofisolve_token");
          // Podríamos emitir un evento o manejar el redireccionamiento aquí
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

  async obtenerArchivosTramite(tramiteId: number): Promise<any[]> {
    return this.request(`/tramites/${tramiteId}/archivos`);
  }

  async obtenerParticipaciones(tramiteId: number): Promise<any> {
    return this.request(`/tramites/${tramiteId}/participaciones`);
  }

  async obtenerContenidoDocumento(docId: number): Promise<{ contenido: string }> {
    return this.request(`/tramites/documentos/${docId}/contenido`);
  }

  async guardarDocumento(docId: number, contenido: string): Promise<any> {
    return this.request(`/tramites/documentos/${docId}/guardar`, {
      method: "POST",
      body: JSON.stringify({ contenido })
    });
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
  async obtenerFuentesRag(): Promise<any[]> {
    // Dummy o según routes_upload.py
    return this.request("/workspaces/1/documentos"); // Por ahora hardcoded ws 1
  }

  async subirDocumento(workspaceId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    
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

  // --- CHAT STREAMING (SSE) ---
  async streamTramiteChat(
    mensaje: string,
    threadId: string,
    tenantId: string,
    history: any[],
    onEvent: (event: any) => void
  ): Promise<void> {
    const response = await fetch(`${BASE_URL}/tramites/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ mensaje, thread_id: threadId, tenant_id: tenantId, history }),
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
          try {
            const data = JSON.parse(line.substring(6));
            onEvent(data);
          } catch (e) {
            console.error("Error parseando SSE:", e);
          }
        }
      }
    }
  }

  // --- EXPORTAR ---
  async descargarDocx(ruta: string, filename: string) {
    const response = await fetch(`${BASE_URL}/export/download?path=${encodeURIComponent(ruta)}`, {
        headers: { ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async exportarDocumento(titulo: string, contenido: string, formato: 'docx' | 'pdf') {
      // Endpoint que deberíamos crear en routes_export.py o similar
      console.log(`Exportando ${titulo} a ${formato}...`);
  }
}

export const ofisolveApi = new OfiSolveApi();
