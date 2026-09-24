"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Mail, MessageCircle } from "lucide-react";
import { ContactChannel, formatKms, formatMoney, PurchaseOrder } from "@/lib/types/maintenance";
import { FieldError, invalidClass } from "../shared/field-error";

/** Motivo obligatorio (rechazar / cancelar). */
export function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, destructive, withNotifySupplier, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  withNotifySupplier?: boolean;
  onConfirm: (reason: string, notifySupplier: boolean) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason(""); setNotify(true); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label>Motivo</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          {withNotifySupplier && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Avisar al proveedor</p>
                <p className="text-xs text-muted-foreground">Se le avisa por el mismo medio por el que recibió la orden.</p>
              </div>
              <Switch checked={notify} onCheckedChange={setNotify} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Volver</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={reason.trim().length < 3 || busy}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(reason.trim(), notify); onOpenChange(false); } catch { /* el error ya se mostró; el diálogo sigue abierto */ } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Enviar/reenviar al proveedor: elige contacto y medio (preseleccionado el predeterminado). */
export function SendOrderDialog({
  open, onOpenChange, order, onSend,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: PurchaseOrder;
  onSend: (body: { channel: ContactChannel; contactId?: string }) => Promise<void>;
}) {
  const contacts = order.supplier?.contacts ?? [];
  const [contactId, setContactId] = useState<string>("");
  const [channel, setChannel] = useState<ContactChannel>("email");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = contacts.find((x) => x.id === order.contactId) ?? contacts.find((x) => x.isDefault) ?? contacts[0];
    setContactId(c?.id ?? "");
    setChannel(c?.preferredChannel ?? "email");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);

  const contact = contacts.find((c) => c.id === contactId);
  const destination = useMemo(() => {
    if (!contact) return "";
    return channel === "email" ? contact.email ?? "" : contact.whatsapp || contact.phone || "";
  }, [contact, channel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{order.status === "enviada" ? "Reenviar al proveedor" : "Enviar al proveedor"}</DialogTitle>
          <DialogDescription>
            {order.folio} · {order.supplier?.name} · {formatMoney(order.total)}. Se adjunta el PDF solo con lo autorizado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Contacto</Label>
            <Select value={contactId} onValueChange={(v) => {
              setContactId(v);
              const c = contacts.find((x) => x.id === v);
              if (c) setChannel(c.preferredChannel);
            }}>
              <SelectTrigger><SelectValue placeholder="Elige un contacto" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id!}>{c.name}{c.isDefault ? " (predeterminado)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Medio</Label>
            <RadioGroup value={channel} onValueChange={(v) => setChannel(v as ContactChannel)} className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="email" /> <Mail className="h-4 w-4 text-sky-600" /> Correo
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="whatsapp" /> <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
              </label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {destination ? <>Se enviará a <b>{destination}</b></> : "El contacto no tiene dato para este medio."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button
            disabled={!contactId || !destination || busy}
            onClick={async () => {
              setBusy(true);
              try { await onSend({ channel, contactId }); onOpenChange(false); } catch { /* el error ya se mostró; el diálogo sigue abierto */ } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const todayHmo = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" });
const plusDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Completar: el servicio se realizó. Actualiza la unidad y registra el gasto. */
export function CompleteOrderDialog({
  open, onOpenChange, order, onComplete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: PurchaseOrder;
  onComplete: (body: { completedAt: string; completedKms: number; finalAmount: number; nextMaintenanceDate: string | null }) => Promise<void>;
}) {
  const [date, setDate] = useState(todayHmo());
  const [kms, setKms] = useState("");
  const [amount, setAmount] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [busy, setBusy] = useState(false);
  const currentKms = order.vehicle?.kms ?? null;

  useEffect(() => {
    if (!open) return;
    const d = todayHmo();
    setDate(d);
    setKms(currentKms ? String(currentKms) : "");
    setAmount(String(order.total));
    setNextDate(plusDays(d, 90));
  }, [open, order.total, currentKms]);

  const lower = currentKms !== null && kms !== "" && Number(kms) < currentKms;
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) setTried(false); }, [open]);
  const allErrors: Record<string, string> = {
    ...(!date ? { date: "Indica la fecha en que se hizo el servicio." } : {}),
    ...(kms === "" || Number(kms) < 0 || Number(kms) > 1_000_000 ? { kms: "Escribe el km que marcaba la unidad." } : {}),
    ...(amount === "" || Number.isNaN(Number(amount)) || Number(amount) < 0 ? { amount: "Escribe cuánto se pagó (0 o más)." } : {}),
  };
  const errors = tried ? allErrors : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar orden {order.folio}</DialogTitle>
          <DialogDescription>Confirma que el servicio se realizó. Se actualiza la unidad y se registra el gasto de la sucursal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Fecha del servicio</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={invalidClass(errors.date)} />
              <FieldError message={errors.date} />
            </div>
            <div className="grid gap-1.5">
              <Label>Km al servicio</Label>
              <Input type="number" min={0} value={kms} onChange={(e) => setKms(e.target.value)} className={invalidClass(errors.kms)} />
              <FieldError message={errors.kms} />
            </div>
          </div>
          {lower && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>El km es menor al registrado ({formatKms(currentKms)}). Revisa que sea correcto.</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-1.5">
            <Label>Monto final pagado (con IVA)</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={invalidClass(errors.amount)} />
            <FieldError message={errors.amount} />
            <p className="text-xs text-muted-foreground">Autorizado: {formatMoney(order.total)}. Este monto es el que se registra como gasto.</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Próximo servicio (fecha, opcional)</Label>
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setTried(true);
              if (Object.keys(allErrors).length) return;
              setBusy(true);
              try {
                await onComplete({ completedAt: date, completedKms: Number(kms), finalAmount: Number(amount), nextMaintenanceDate: nextDate || null });
                onOpenChange(false);
              } catch { /* el error ya se mostró; el diálogo sigue abierto */ } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Completar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
