"use client";

import { EnviarNotificacionButton } from "@/components/notificaciones/enviar-notificacion";
import type { DriverMessageContext } from "@/lib/services/whatsapp-settings";

/**
 * Botón para avisar al chofer por WhatsApp sobre una guía en riesgo de Local
 * Delay. Reusa el componente genérico de envío con la plantilla
 * `prioridad_entrega`. El número se elige al enviar (por ahora "Otro número",
 * ya que el monitoreo no trae el teléfono del chofer por parada).
 */
export function SendDriverMessageButton({ context }: { context: DriverMessageContext }) {
  return (
    <EnviarNotificacionButton
      templateKeys={["prioridad_entrega"]}
      context={context as unknown as Record<string, string>}
      numberOptions={[]}
      triggerLabel="Avisar al chofer"
      triggerVariant="outline"
      triggerSize="sm"
      triggerClassName="h-7 gap-1 border-emerald-300 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white"
    />
  );
}
