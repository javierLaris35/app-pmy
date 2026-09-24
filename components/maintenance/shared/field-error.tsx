import { cn } from "@/lib/utils";

/** Mensaje de validación debajo de un campo (lenguaje simple, color destructivo de shadcn). */
export function FieldError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return <p role="alert" className={cn("text-xs font-medium text-destructive", className)}>{message}</p>;
}

/** Clase para marcar el input con error. */
export const invalidClass = (message?: string) => (message ? "border-destructive focus-visible:ring-destructive" : undefined);
