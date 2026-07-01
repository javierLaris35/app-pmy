"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react"
import { toast } from "@/lib/toast"
import { requestPasswordOtp, resetPasswordWithOtp } from "@/lib/services/login"

const apiMsg = (err: any, fallback: string) => {
  const d = err?.response?.data
  const m = Array.isArray(d?.message) ? d.message.join("\n") : d?.message
  return m || d?.apiMessage || d?.response?.message || fallback
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultEmail = "",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEmail?: string
}) {
  const [stepName, setStepName] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState(defaultEmail)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [pwd, setPwd] = useState("")
  const [pwd2, setPwd2] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      // Reset al cerrar
      setStepName("email"); setOtp(""); setPwd(""); setPwd2(""); setError(""); setLoading(false)
    }
    onOpenChange(o)
  }

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim()) return setError("Ingresa tu correo.")
    setLoading(true)
    try {
      const r = await requestPasswordOtp(email.trim())
      setMaskedEmail(r.email)
      setStepName("otp")
      toast.success(r.message || "Código enviado.")
    } catch (err) {
      setError(apiMsg(err, "No se pudo enviar el código."))
    } finally {
      setLoading(false)
    }
  }

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (otp.length < 6) return setError("Ingresa el código de 6 dígitos.")
    if (pwd.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")
    if (pwd !== pwd2) return setError("Las contraseñas no coinciden.")
    setLoading(true)
    try {
      const r = await resetPasswordWithOtp(email.trim(), otp, pwd)
      toast.success(r.message || "Contraseña actualizada.")
      handleOpenChange(false)
    } catch (err) {
      setError(apiMsg(err, "No se pudo actualizar la contraseña."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stepName === "email" ? <Mail className="h-5 w-5 text-primary" /> : <KeyRound className="h-5 w-5 text-primary" />}
            {stepName === "email" ? "Recuperar contraseña" : "Verifica y crea tu contraseña"}
          </DialogTitle>
          <DialogDescription>
            {stepName === "email"
              ? "Te enviaremos un código de 6 dígitos a tu correo registrado."
              : <>Ingresa el código enviado a <b>{maskedEmail}</b> y tu nueva contraseña.</>}
          </DialogDescription>
        </DialogHeader>

        {stepName === "email" ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Correo</Label>
              <Input id="fp-email" type="email" autoFocus placeholder="tucorreo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="whitespace-pre-line text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar código
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={doReset} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-pwd">Nueva contraseña</Label>
              <Input id="fp-pwd" type="password" placeholder="Mínimo 8, mayúscula, número y símbolo" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-pwd2">Confirmar contraseña</Label>
              <Input id="fp-pwd2" type="password" placeholder="Repite la contraseña" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required />
            </div>
            {error && <p className="whitespace-pre-line text-sm text-destructive">{error}</p>}
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => { setStepName("email"); setError("") }}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />Cambiar correo
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Actualizar contraseña
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
