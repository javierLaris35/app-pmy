"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"


export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
    
        if (email === "admin@delyaqui.com" && password === "admin123") {
            router.push("/dashboard")
        } else {
            setError("Usuario o contraseña incorrectos")
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
                        <a
                        href="#"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                        Olvido sú contraseña?
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
                <Button type="submit" className="w-full">
                    Iniciar Sesión
                </Button>
            </div>
            <div className="text-center text-sm">
                No tiene una cuenta?{" "}
                <a href="#" className="underline underline-offset-4">
                    Solicitar Acceso.
                </a>
            </div>
        </form>
    )
}
