"use client"

import * as React from "react"
import { Lock, Mail, Loader2, ArrowRight, PenTool, User as UserIcon } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ofisolveApi } from "@/lib/api"
import { UserCreate } from "@/lib/types"

interface LoginViewProps {
  onLogin: (token: string, keepSignedIn: boolean) => void
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  
  // Login States
  const [loginEmail, setLoginEmail] = React.useState("")
  const [loginPassword, setLoginPassword] = React.useState("")
  const [keepSignedIn, setKeepSignedIn] = React.useState(false)
  
  // Register States
  const [regEmail, setRegEmail] = React.useState("")
  const [regPassword, setRegPassword] = React.useState("")
  const [regNombre, setRegNombre] = React.useState("")

  async function onLoginSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("username", loginEmail)
      formData.append("password", loginPassword)

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/api\/v1$/, '')
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
      onLogin(data.access_token, keepSignedIn)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function onRegisterSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const userData: UserCreate = {
        email: regEmail,
        password: regPassword,
        nombre_completo: regNombre
      }

      await ofisolveApi.registrar(userData)
      toast.success("Cuenta creada exitosamente")
      
      // Auto-login
      const formData = new FormData()
      formData.append("username", regEmail)
      formData.append("password", regPassword)

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/api\/v1$/, '')
      const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        body: formData,
      })

      if (loginRes.ok) {
        const data = await loginRes.json()
        onLogin(data.access_token, keepSignedIn)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans selection:bg-primary/10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#3c4043_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

      <Card className="w-full max-w-md overflow-hidden border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-1 pb-6 pt-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-xl ring-1 ring-border overflow-hidden p-2">
              <img src="/logo-ofisolve.png" alt="OfiSolve Logo" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            OfiSolve <span className="font-light text-muted-foreground">Notarial</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-xs uppercase tracking-widest mt-2">
            Inteligencia Soberana para Escribanías
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 text-center pt-0">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={onLoginSubmit} className="space-y-5 text-left">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-foreground/80">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="login-email"
                      placeholder="escribano@ejemplo.com"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-11 rounded-xl bg-background pl-10 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground/80">Contraseña</Label>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-11 rounded-xl bg-background pl-10 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="keep-signed-in" 
                    checked={keepSignedIn}
                    onCheckedChange={(checked) => setKeepSignedIn(checked as boolean)}
                  />
                  <Label htmlFor="keep-signed-in" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mantener sesión iniciada
                  </Label>
                </div>
                <Button className="h-11 w-full rounded-xl bg-primary shadow-md hover:bg-primary/90 transition-all font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-2">Entrar <ArrowRight className="h-4 w-4" /></span>}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={onRegisterSubmit} className="space-y-5 text-left">
                <div className="space-y-2">
                  <Label htmlFor="reg-nombre" className="text-sm font-medium text-foreground/80">Nombre Completo</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="reg-nombre"
                      placeholder="Dr. Juan Pérez"
                      type="text"
                      value={regNombre}
                      onChange={(e) => setRegNombre(e.target.value)}
                      className="h-11 rounded-xl bg-background pl-10 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-sm font-medium text-foreground/80">Email Profesional</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="reg-email"
                      placeholder="escribano@ejemplo.com"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="h-11 rounded-xl bg-background pl-10 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-sm font-medium text-foreground/80">Contraseña</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="h-11 rounded-xl bg-background pl-10 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                <Button className="h-11 w-full rounded-xl bg-primary shadow-md hover:bg-primary/90 transition-all font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-2">Crear Cuenta <ArrowRight className="h-4 w-4" /></span>}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4 px-8 pb-10 pt-4 text-center">
          <div className="h-px w-full bg-border/60" />
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            Sistema local autónomo. Tus datos permanecen en este equipo.
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

