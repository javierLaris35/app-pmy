"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth.store"
import { login } from "@/lib/services/login"
import { getProfile } from "@/lib/services/profile"
import { Loader2Icon, Mail } from "lucide-react"
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog"

const APP_VERSION = "v2.0.0"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // 1) Autentica: el token ya NO trae el estado pesado, solo { sub, email, role }.
      const res = await login(email, password)
      if (!res || !res.access_token) {
        setError("Usuario o contraseña incorrectos")
        return
      }

      // 2) Guarda el token primero: el interceptor de axios lo necesita en el
      //    store para adjuntarlo al GET /auth/profile.
      useAuthStore.getState().setToken(res.access_token)

      // 3) Trae el perfil "pesado" (permisos, sucursales) y guárdalo en el estado.
      const profile = await getProfile()
      useAuthStore.getState().setUser(profile)

      router.push("/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      // Si algo falla tras autenticar, no dejamos una sesión a medias.
      useAuthStore.getState().logout()
      setError("Usuario o contraseña incorrectos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Marca */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex aspect-square size-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-primary/15">
          <Image src="/logo-app.png" alt="PMY App" width={80} height={80} className="size-full object-contain p-1.5" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight">PMY App</h1>
          <p className="text-xs text-muted-foreground">Sistema de gestión logística · {APP_VERSION}</p>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            placeholder="tucorreo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Contraseña</Label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Validando…
            </>
          ) : (
            "Iniciar sesión"
          )}
        </Button>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
      </div>

      {/* Solicitud de acceso (ya no hay auto-registro) */}
      <div className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span>¿No tienes una cuenta? Solicita tu acceso al área de <b className="text-foreground">Sistemas</b>; ellos te darán de alta.</span>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
    </form>
  )
}
