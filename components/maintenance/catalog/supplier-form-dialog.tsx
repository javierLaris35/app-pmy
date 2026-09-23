"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { createSupplier, updateSupplier } from "@/lib/services/maintenance";
import { ContactChannel, Supplier, SupplierContact } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";

const emptyContact = (): SupplierContact => ({ name: "", position: "", email: "", phone: "", whatsapp: "", preferredChannel: "email" });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSaved: (s: Supplier) => void;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: Props) {
  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [contacts, setContacts] = useState<SupplierContact[]>([emptyContact()]);
  const [defaultIdx, setDefaultIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setRfc(supplier?.rfc ?? "");
    setAddress(supplier?.address ?? "");
    setNotes(supplier?.notes ?? "");
    setActive(supplier?.active ?? true);
    const list = supplier?.contacts?.length ? supplier.contacts.map((c) => ({ ...c })) : [emptyContact()];
    setContacts(list);
    setDefaultIdx(Math.max(0, list.findIndex((c) => c.isDefault)));
  }, [open, supplier]);

  const patch = (i: number, p: Partial<SupplierContact>) => setContacts((cs) => cs.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const remove = (i: number) => {
    setContacts((cs) => cs.filter((_, j) => j !== i));
    setDefaultIdx((d) => (d === i ? 0 : d > i ? d - 1 : d));
  };

  const valid = name.trim().length >= 2 && contacts.length > 0 && contacts.every((c) => c.name.trim().length >= 2);

  const save = async () => {
    setSaving(true);
    const body = {
      name: name.trim(),
      rfc: rfc.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      active,
      contacts: contacts.map((c, i) => ({
        ...(c.id ? { id: c.id } : {}),
        name: c.name.trim(),
        position: c.position?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
        whatsapp: c.whatsapp?.trim() || null,
        preferredChannel: c.preferredChannel,
        isDefault: i === defaultIdx,
      })),
    };
    try {
      const saved = supplier ? await updateSupplier(supplier.id, body) : await createSupplier(body);
      toast.success(supplier ? "Proveedor actualizado" : "Proveedor agregado");
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar el proveedor"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Razón social / nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Taller Mecánico del Yaqui" />
              </div>
              <div className="grid gap-1.5">
                <Label>RFC</Label>
                <Input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} maxLength={20} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Dirección</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Horarios, condiciones de pago, etc." />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <p className="text-sm font-medium">Activo</p>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Contactos</p>
                <p className="text-xs text-muted-foreground">
                  Las órdenes se envían al contacto <b>predeterminado</b> por su medio elegido (correo o WhatsApp).
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setContacts((cs) => [...cs, emptyContact()])}>
                <Plus className="h-4 w-4" /> Agregar contacto
              </Button>
            </div>

            <RadioGroup value={String(defaultIdx)} onValueChange={(v) => setDefaultIdx(Number(v))} className="gap-3">
              {contacts.map((c, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value={String(i)} />
                      {i === defaultIdx ? <span className="font-medium text-primary">Predeterminado</span> : "Marcar como predeterminado"}
                    </label>
                    {contacts.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => remove(i)} aria-label="Quitar contacto">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={c.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="Nombre" />
                    <Input value={c.position ?? ""} onChange={(e) => patch(i, { position: e.target.value })} placeholder="Puesto (opcional)" />
                    <Input type="email" value={c.email ?? ""} onChange={(e) => patch(i, { email: e.target.value })} placeholder="Correo" />
                    <Input value={c.phone ?? ""} onChange={(e) => patch(i, { phone: e.target.value })} placeholder="Teléfono" />
                    <Input value={c.whatsapp ?? ""} onChange={(e) => patch(i, { whatsapp: e.target.value })} placeholder="WhatsApp (10 dígitos)" />
                    <Select value={c.preferredChannel} onValueChange={(v) => patch(i, { preferredChannel: v as ContactChannel })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Enviar por correo</span></SelectItem>
                        <SelectItem value="whatsapp"><span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Enviar por WhatsApp</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
