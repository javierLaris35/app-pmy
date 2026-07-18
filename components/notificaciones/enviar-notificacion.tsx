"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { sendWhatsappMessage } from "@/lib/services/whatsapp-settings";
import { listWhatsappTemplates, buildMessage, type WhatsappTemplate } from "@/lib/services/whatsapp-templates";

export interface NumberOption {
  /** Etiqueta visible, ej. "Chofer (Juan)". */
  label: string;
  /** Teléfono destino (se limpia a solo dígitos al enviar). */
  value: string;
}

interface Props {
  /** Claves de plantilla ofrecidas para este módulo (ej. ["salida_ruta"]). */
  templateKeys: string[];
  /** Valores para los {placeholders} de la plantilla (incluye {link}). */
  context: Record<string, string>;
  /** Números prearmados (chofer/encargado). Siempre se agrega la opción "Custom". */
  numberOptions: NumberOption[];
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm";
}

const CUSTOM = "__custom__";

function prettyPhone(digits: string): string {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("52")) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d ? `+${d}` : "—";
}

/**
 * Botón + diálogo reutilizable para enviar una notificación por WhatsApp desde
 * cualquier módulo. El usuario elige la plantilla, personaliza el mensaje y
 * decide el número destino (custom, chofer o encargado). El envío sale directo
 * de la API (gateway Baileys).
 */
export function EnviarNotificacionButton({
  templateKeys, context, numberOptions,
  triggerLabel = "Enviar notificación", triggerClassName,
  triggerVariant = "outline", triggerSize = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [templateKey, setTemplateKey] = useState<string>("");
  const [numberMode, setNumberMode] = useState<string>(numberOptions[0]?.value ?? CUSTOM);
  const [customNumber, setCustomNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    listWhatsappTemplates()
      .then((all) => {
        const usable = all.filter((t) => t.active && templateKeys.includes(t.key));
        setTemplates(usable);
        setTemplateKey((prev) => (usable.some((t) => t.key === prev) ? prev : usable[0]?.key ?? ""));
      })
      .catch(() => toast.error("No se pudieron cargar las plantillas."));
  }, [open, templateKeys]);

  const selected = useMemo(() => templates.find((t) => t.key === templateKey), [templates, templateKey]);

  useEffect(() => {
    if (selected) setMessage(buildMessage(selected.body, context));
  }, [selected, context]);

  const to = numberMode === CUSTOM ? customNumber : numberMode;
  const toDigits = to.replace(/\D/g, "");

  const send = async () => {
    const text = message.trim();
    if (!text) { toast.error("El mensaje no puede estar vacío."); return; }
    if (!toDigits) { toast.error("Indica el número destino."); return; }
    setSending(true);
    try {
      await sendWhatsappMessage(text, toDigits);
      toast.success(`Notificación enviada a ${prettyPhone(toDigits)}.`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar. Revisa la conexión de WhatsApp en Configuración.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} className={triggerClassName} onClick={() => setOpen(true)}>
        <MessageCircle className="mr-1 h-3.5 w-3.5" /> {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !sending && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Enviar notificación</DialogTitle>
            <DialogDescription>Se enviará por WhatsApp directamente desde el sistema. Puedes personalizar el mensaje antes de enviar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Plantilla */}
            <div className="space-y-1.5">
              <Label>Plantilla</Label>
              <Select value={templateKey} onValueChange={setTemplateKey} disabled={sending || templates.length === 0}>
                <SelectTrigger><SelectValue placeholder="Selecciona una plantilla" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.key}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Número destino */}
            <div className="space-y-1.5">
              <Label>Número destino</Label>
              <Select value={numberMode} onValueChange={setNumberMode} disabled={sending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {numberOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label} ({prettyPhone(o.value)})</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Otro número…</SelectItem>
                </SelectContent>
              </Select>
              {numberMode === CUSTOM && (
                <Input
                  value={customNumber}
                  onChange={(e) => setCustomNumber(e.target.value)}
                  placeholder="Número destino (ej. 526441234567)"
                  disabled={sending}
                />
              )}
            </div>

            {/* Mensaje */}
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} className="text-sm" disabled={sending} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancelar</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={send} disabled={sending || !toDigits || !message.trim()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? "Enviando…" : "Enviar por WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
