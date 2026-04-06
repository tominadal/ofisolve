"use client"

import * as React from "react"
import { Shield, Lock, Mail, Loader2, ArrowRight } from "lucide-react"
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
      const formData = new FormData()
      formData.append("username", email)
      formData.append("password", password)

      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <Card className="w-full max-w-md border-white/5 bg-white/5 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl bg-indigo-500/20 p-3 ring-1 ring-indigo-500/50">
              <Shield className="h-10 w-10 text-indigo-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            OfiSolve <span className="text-indigo-400">Notarial</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email Profesional
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
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
                  className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Contraseña
                </Label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-white/5 pl-10 text-white focus:border-indigo-500/50 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>
            <Button
              className="w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Iniciar Sesión <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-slate-500">
            Acceso restringido a personal autorizado de la red OfiSolve.
            Al ingresar aceptas nuestros términos de privacidad notarial.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
