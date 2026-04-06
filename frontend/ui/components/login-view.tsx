"use client"

import * as React from "react"
import { Lock, Mail, Loader2, ArrowRight, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LoginViewProps {
  onLogin: (token: string) => void
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      // Usar URL dinámica desde lib/api si fuera necesario, pero mantenemos compatibilidad
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      const formData = new FormData()
      formData.append("username", email)
      formData.append("password", password)

      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Error al iniciar sesión")
      }

      const data = await response.json()
      toast.success("Bienvenido a OfiSolve")
      onLogin(data.access_token)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfb] p-4 font-sans selection:bg-primary/10">
      {/* Sutil textura de fondo tipo papel */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

      <Card className="w-full max-w-md overflow-hidden border-border bg-card shadow-sm">
        <CardHeader className="space-y-2 pb-8 pt-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-sm shadow-primary/20">
              <PenTool className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
            OfiSolve <span className="font-normal text-muted-foreground">Notarial</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Gestión inteligente de trámites y documentos
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                Email Profesional
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  placeholder="escribano@ejemplo.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-border bg-background pl-10 text-foreground ring-offset-background transition-all placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                  Contraseña
                </Label>
                <a href="#" className="text-xs font-medium text-primary hover:underline underline-offset-4">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-border bg-background pl-10 text-foreground ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary"
                  required
                />
              </div>
            </div>
            <Button
              className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/10 transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Entrar al Workspace <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 px-8 pb-10 pt-6 text-center">
          <div className="h-px w-full bg-border/60" />
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            Este es un sistema de acceso privado. Al ingresar, confirmas que eres personal autorizado por el Colegio de Escribanos y aceptas nuestros términos de confidencialidad.
          </p>
        </CardFooter>
      </Card>
      
      {/* Footer minimalista estilo Notebook */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
          OfiSolve Intelligence Core v2.0
        </p>
      </div>
    </div>
  )
}

