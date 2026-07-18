"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, Brain, Bot, User, Sparkles } from "lucide-react"
import { ofisolveApi } from "@/lib/api"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchEventSource } from '@microsoft/fetch-event-source'

interface GlobalChatPanelProps {
  isOpen: boolean
  onClose: () => void
  sessionId: number | null
  sessionTitle: string
  workspaceId: number
}

interface Message {
  role: "user" | "assistant"
  contenido: string
  id?: number
}

export function GlobalChatPanel({ isOpen, onClose, sessionId, sessionTitle, workspaceId }: GlobalChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [estadoIA, setEstadoIA] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && sessionId) {
      cargarHistorial()
    } else {
      setMessages([])
    }
  }, [isOpen, sessionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, estadoIA])

  const cargarHistorial = async () => {
    if (!sessionId) return
    setLoadingHistory(true)
    try {
      const hist = await ofisolveApi.obtenerMensajesChatSession(sessionId)
      setMessages(hist.map((m: any) => ({ role: m.role, contenido: m.contenido, id: m.id })))
    } catch (e) {
      console.error("Error al cargar historial", e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isStreaming) return
    const msg = input.trim()
    setInput("")
    enviarMensaje(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const enviarMensaje = async (userMsg: string) => {
    if (!sessionId) return

    setMessages(prev => [...prev, { role: "user", contenido: userMsg }])
    
    // Guardar mensaje de usuario asíncronamente
    ofisolveApi.guardarMensajeChatSession(sessionId, "user", userMsg).catch(console.error)

    setIsStreaming(true)
    setEstadoIA("Analizando...")
    
    let aiResponse = ""
    setMessages(prev => [...prev, { role: "assistant", contenido: "" }])

    const token = typeof window !== 'undefined' ? localStorage.getItem('ofisolve-token') : null

    try {
      await fetchEventSource(`http://127.0.0.1:8080/api/v1/chat/chat-sessions/${sessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mensaje: userMsg,
          history: messages
        }),
        onmessage(event) {
          const data = JSON.parse(event.data)
          if (data.event === "estado") {
            setEstadoIA(data.mensaje)
          } else if (data.event === "token") {
            setEstadoIA("")
            aiResponse += data.texto
            setMessages(prev => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].contenido = aiResponse
              return newMsgs
            })
          } else if (data.event === "finalizado") {
            setEstadoIA("")
          }
        },
        onclose() {
          ofisolveApi.guardarMensajeChatSession(sessionId, "assistant", aiResponse).catch(console.error)
          setIsStreaming(false)
        },
        onerror(err) {
          console.error("Error streaming SSE:", err)
          setIsStreaming(false)
          setEstadoIA("Error en la conexión con la IA")
          throw err
        }
      })
    } catch (err) {
      setIsStreaming(false)
      setEstadoIA("Fallo la respuesta")
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 border-l border-border bg-background" side="right">
        <SheetHeader className="p-4 border-b shrink-0 flex flex-row items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-lg">{sessionTitle || "Gestor de Clientes IA"}</SheetTitle>
            <p className="text-xs text-muted-foreground">Acceso global a toda la base de datos de la escribanía</p>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loadingHistory ? (
            <div className="flex justify-center items-center h-full text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center space-y-5 p-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="text-sm max-w-[250px]">
                <p className="font-semibold text-foreground text-base mb-2">Asistente Global Iniciado</p>
                <p className="leading-relaxed">Pregúntame sobre cualquier cliente, o pídeme que modifique sus datos directamente en la base de datos.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`text-sm rounded-lg px-4 py-2 max-w-[85%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {m.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">
                        {m.contenido}
                      </ReactMarkdown>
                    ) : (
                      m.contenido
                    )}
                  </div>
                </div>
              ))}
              {estadoIA && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="text-xs text-muted-foreground self-center italic bg-muted/30 px-3 py-1.5 rounded-full">
                    {estadoIA}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border/50 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="relative rounded-2xl border border-input bg-muted/20 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Busca clientes con riesgo UIF medio y cambia su teléfono a..."
                className="min-h-[50px] max-h-[150px] w-full resize-none bg-transparent px-4 py-3 text-sm focus-visible:ring-0 focus-visible:outline-none border-0 pr-12 leading-relaxed"
                disabled={isStreaming}
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
              </Button>
            </div>
            <div className="text-[10px] text-center text-muted-foreground mt-2 font-medium">
              El asistente puede acceder y modificar datos reales del sistema.
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
