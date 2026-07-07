"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, Send, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  buildDriverMessage, sendWhatsappMessage,
  type WhatsappSettings, type DriverMessageContext,
} from "@/lib/services/whatsapp-settings";

/** Formatea el número a algo legible (+52 644 423 0374) solo para mostrar. */
function prettyPhone(digits: string): string {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("52")) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d ? `+${d}` : "—";
}

/**
 * Botón + diálogo para avisar al chofer por WhatsApp sobre una guía en riesgo de
 * Local Delay. El mensaje parte de la plantilla configurada (con los datos de la
 * parada ya sustituidos) y el usuario puede personalizarlo antes de enviarlo.
 * El envío sale DIRECTO de nuestra API (gateway Baileys) — no abre WhatsApp en la
 * PC ni web.whatsapp.com.
 */
export function SendDriverMessageButton({ settings, context }: { settings: WhatsappSettings; context: DriverMessageContext }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const defaultMessage = useMemo(() => buildDriverMessage(settings.messageTemplate, context), [settings.messageTemplate, context]);
  const [message, setMessage] = useState(defaultMessage);

  // Al abrir, reinicia el texto al mensaje por defecto recalculado (por si cambió la config o la parada).
  const openDialog = () => { setMessage(defaultMessage); setOpen(true); };

  const send = async () => {
    const text = message.trim() || defaultMessage;
    setSending(true);
    try {
      await sendWhatsappMessage(text, settings.driverPhone);
      toast.success(`Mensaje enviado al chofer (${prettyPhone(settings.driverPhone)}).`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar el mensaje. Revisa la conexión de WhatsApp en Configuración.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 border-emerald-300 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white"
        onClick={openDialog}
      >
        <MessageCircle className="h-3.5 w-3.5" /> Avisar al chofer
      </Button>

      <Dialog open={open} onOpenChange={(o) => !sending && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Enviar mensaje al chofer</DialogTitle>
            <DialogDescription>
              El mensaje se enviará por WhatsApp a <strong>{prettyPhone(settings.driverPhone)}</strong> directamente desde el sistema. Puedes personalizarlo antes de enviar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={11} className="text-sm" disabled={sending} />
            <button
              type="button"
              onClick={() => setMessage(defaultMessage)}
              disabled={sending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar mensaje por defecto
            </button>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancelar</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={send} disabled={sending || !settings.driverPhone}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? "Enviando…" : "Enviar por WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
