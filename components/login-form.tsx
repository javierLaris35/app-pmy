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
import { Loader2Icon } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setError("")
    setIsLoading(true)

    try {
      const user = await login(email, password)
      console.log("🚀 ~ user:", user)

      if (user && user.access_token) {
        useAuthStore.getState().login(user.user, user.access_token)
        router.push("/dashboard")
      } else {
        setError("Usuario o contraseña incorrectos")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Usuario o contraseña incorrectos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center text-center">
        <div className="flex justify-center items-center">
          <Image src="/logo.png" alt="Logo Del Yaqui" width={160} height={160} />
        </div>
        <p className="text-balance text-sm text-muted-foreground">
          Ingrese sus credenciales para acceder al sistema
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@delyaqui.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Contraseña</Label>
            <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
              ¿Olvidó su contraseña?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Ingrese su contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </Button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>

      <div className="text-center text-sm">
        ¿No tiene una cuenta?{" "}
        <a href="#" className="underline underline-offset-4">
          Solicitar Acceso.
        </a>
      </div>
    </form>
  )
}
