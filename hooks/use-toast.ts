"use client"

/**
 * Shim de compatibilidad shadcn → **sileo**.
 *
 * Antes este hook manejaba el toast radix de shadcn (que ni siquiera estaba
 * montado, así que esos toasts no se veían). Ahora delega en sileo a través del
 * adaptador central `@/lib/toast`, conservando la firma por-objeto
 * `toast({ title, description, variant })` y `useToast()` para no tocar los
 * sitios de llamada existentes.
 */
import * as React from "react"
import { toast as sileoToast, type ToastOptions } from "@/lib/toast"

type ToastVariant = "default" | "destructive" | null

export interface Toast {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
  duration?: number
  action?: ToastOptions["action"]
}

export interface ToastReturn {
  id: string
  dismiss: () => void
  update: (props: Toast) => void
}

function toast({ title, description, variant, duration, action }: Toast): ToastReturn {
  const opts: ToastOptions = {}
  if (description != null) opts.description = description
  if (duration != null) opts.duration = duration
  if (action) opts.action = action

  // El title de sileo es texto; si llega JSX lo mandamos como description.
  const message = title ?? description ?? ""

  const id =
    variant === "destructive"
      ? sileoToast.error(message, opts)
      : sileoToast.success(message, opts)

  return {
    id,
    dismiss: () => sileoToast.dismiss(id),
    // sileo no soporta actualizar un toast existente; emitimos uno nuevo.
    update: (props: Toast) => {
      sileoToast.dismiss(id)
      toast(props)
    },
  }
}

// Forma mínima para compatibilidad con el viejo <Toaster/> radix (ya no se monta;
// el host real es sileo). Siempre vacío: sileo gestiona su propia cola.
type LegacyToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  open?: boolean
}

function useToast() {
  return {
    toasts: [] as LegacyToast[],
    toast,
    dismiss: (toastId?: string) => sileoToast.dismiss(toastId),
  }
}

export { useToast, toast }
