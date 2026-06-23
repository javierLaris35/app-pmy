"use client"

/**
 * Copia histórica del hook shadcn. Ahora es solo un re-export del shim único
 * basado en **sileo** (`@/hooks/use-toast`), para que todos los módulos que
 * importaban desde aquí usen la misma implementación.
 */
export { useToast, toast } from "@/hooks/use-toast"
export type { Toast, ToastReturn } from "@/hooks/use-toast"
