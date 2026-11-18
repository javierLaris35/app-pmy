"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateField, MoneyField, SelectField, SwitchField, TextareaField, TextField } from "@/components/ui/field";
import { AlertTriangle, CalendarClock, CalendarDays, Gauge, Mail, MessageCircle, MessageSquareText, UserRound } from "lucide-react";
import { ContactChannel, formatKms, formatMoney, PurchaseOrder } from "@/lib/types/maintenance";

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
        <div className="grid gap-5 py-2">
          <TextareaField label="Motivo" required icon={MessageSquareText} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus
            hint="Escribe al menos 3 letras; se guarda en el historial." />
          {withNotifySupplier && (
            <SwitchField label="Avisar al proveedor" description="Se le avisa por el mismo medio por el que recibió la orden."
              checked={notify} onCheckedChange={setNotify} />
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
            {busy && <PmySpinner className="mr-2 h-4 w-4" />}
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
        <div className="grid gap-5 py-2">
          <SelectField
            label="Contacto" required icon={UserRound} placeholder="Elige un contacto" value={contactId}
            onValueChange={(v) => {
              setContactId(v);
              const c = contacts.find((x) => x.id === v);
              if (c) setChannel(c.preferredChannel);
            }}
            options={contacts.map((c) => ({ value: c.id!, label: `${c.name}${c.isDefault ? " (predeterminado)" : ""}` }))}
          />
          <div className="grid gap-1">
            <RadioGroup value={channel} onValueChange={(v) => setChannel(v as ContactChannel)} className="grid grid-cols-2 gap-3" aria-label="Medio">
              <label className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-[hsl(var(--field-border))] px-3.5 text-sm transition hover:border-foreground/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-4 has-[[data-state=checked]]:ring-primary/10">
                <RadioGroupItem value="email" /> <Mail className="h-4 w-4 text-sky-600" /> Correo
              </label>
              <label className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-[hsl(var(--field-border))] px-3.5 text-sm transition hover:border-foreground/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-4 has-[[data-state=checked]]:ring-primary/10">
                <RadioGroupItem value="whatsapp" /> <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
              </label>
            </RadioGroup>
            <p className={destination ? "px-1 text-xs text-muted-foreground" : "px-1 text-xs text-destructive"}>
              {destination ? <>Se enviará a <span className="font-medium text-foreground">{destination}</span></> : "El contacto no tiene dato para este medio."}
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
            {busy && <PmySpinner className="mr-2 h-4 w-4" />}
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
  onComplete: (body: { completedAt: string; completedKms?: number; finalAmount: number; nextMaintenanceDate: string | null }) => Promise<void>;
}) {
  const [date, setDate] = useState(todayHmo());
  const [kms, setKms] = useState("");
  const [amount, setAmount] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [busy, setBusy] = useState(false);
  const currentKms = order.vehicle?.kms ?? null;
  /** Compras sin unidad: no se pide km ni próximo servicio. */
  const withVehicle = !!order.vehicleId;

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
    ...(withVehicle && (kms === "" || Number(kms) < 0 || Number(kms) > 1_000_000) ? { kms: "Escribe el km que marcaba la unidad." } : {}),
    ...(amount === "" || Number.isNaN(Number(amount)) || Number(amount) < 0 ? { amount: "Escribe cuánto se pagó (0 o más)." } : {}),
  };
  const errors = tried ? allErrors : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar orden {order.folio}</DialogTitle>
          <DialogDescription>
            {withVehicle
              ? "Confirma que el servicio se realizó. Se actualiza la unidad y se registra el gasto de la sucursal."
              : "Confirma que ya se recibió lo comprado. Se registra el gasto de la sucursal."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <DateField label={withVehicle ? "Fecha del servicio" : "Fecha en que se recibió"} required icon={CalendarDays}
              value={date} onChange={setDate} error={errors.date} className={withVehicle ? undefined : "sm:col-span-2"} />
            {withVehicle && (
              <TextField label="Km al servicio" required icon={Gauge} type="number" min={0} inputMode="numeric"
                value={kms} onChange={(e) => setKms(e.target.value)} error={errors.kms} />
            )}
          </div>
          {lower && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>El km es menor al registrado ({formatKms(currentKms)}). Revisa que sea correcto.</AlertDescription>
            </Alert>
          )}
          <MoneyField
            label="Monto final pagado (con IVA)" required error={errors.amount}
            value={amount === "" ? "" : Number(amount)} onValueChange={(v) => setAmount(v === "" ? "" : String(v))}
            hint={`Autorizado: ${formatMoney(order.total)}. Este monto es el que se registra como gasto de la sucursal.`}
          />
          {withVehicle && (
            <DateField label="Próximo servicio" icon={CalendarClock} value={nextDate} onChange={setNextDate} placeholder="Opcional" clearable />
          )}
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
                await onComplete({
                  completedAt: date, finalAmount: Number(amount),
                  ...(withVehicle ? { completedKms: Number(kms), nextMaintenanceDate: nextDate || null } : { nextMaintenanceDate: null }),
                });
                onOpenChange(false);
              } catch { /* el error ya se mostró; el diálogo sigue abierto */ } finally { setBusy(false); }
            }}
          >
            {busy && <PmySpinner className="mr-2 h-4 w-4" />}
            Completar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
