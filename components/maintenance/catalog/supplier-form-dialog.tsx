"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemButton, FormSection, ItemCard, SelectField, TextareaField, TextField } from "@/components/ui/field";
import { Briefcase, Building2, Hash, IdCard, Landmark, Mail, MapPin, MessageCircle, Phone, Send, Store, StickyNote, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { createSupplier, updateSupplier } from "@/lib/services/maintenance";
import { ContactChannel, Supplier, SupplierContact } from "@/lib/types/maintenance";
import { apiError } from "../shared/confirm-action";
import { FieldErrors, firstError, hasErrors, validateSupplier } from "@/lib/maintenance-validation";
import { bankFromClabe } from "@/lib/clabe";

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
  const [bankName, setBankName] = useState("");
  const [clabe, setClabe] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [active, setActive] = useState(true);
  const [contacts, setContacts] = useState<SupplierContact[]>([emptyContact()]);
  const [defaultIdx, setDefaultIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setRfc(supplier?.rfc ?? "");
    setAddress(supplier?.address ?? "");
    setNotes(supplier?.notes ?? "");
    setBankName(supplier?.bankName ?? "");
    setClabe(supplier?.clabe ?? "");
    setAccountNumber(supplier?.accountNumber ?? "");
    setActive(supplier?.active ?? true);
    const list = supplier?.contacts?.length ? supplier.contacts.map((c) => ({ ...c })) : [emptyContact()];
    setContacts(list);
    setDefaultIdx(Math.max(0, list.findIndex((c) => c.isDefault)));
    setErrors({});
    setTried(false);
  }, [open, supplier]);

  // Tras el primer intento de guardar, revalida en vivo para que el mensaje desaparezca al corregir.
  useEffect(() => {
    if (tried) setErrors(validateSupplier({ name, rfc, clabe, contacts }));
  }, [tried, name, rfc, clabe, contacts]);

  const patch = (i: number, p: Partial<SupplierContact>) => setContacts((cs) => cs.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const remove = (i: number) => {
    setContacts((cs) => cs.filter((_, j) => j !== i));
    setDefaultIdx((d) => (d === i ? 0 : d > i ? d - 1 : d));
  };

  const save = async () => {
    const e = validateSupplier({ name, rfc, clabe, contacts });
    setTried(true);
    setErrors(e);
    if (hasErrors(e)) {
      toast.error(`Revisa los campos marcados: ${firstError(e)}`);
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      rfc: rfc.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      bankName: bankName.trim() || null,
      clabe: clabe.replace(/\s/g, "") || null,
      accountNumber: accountNumber.trim() || null,
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
          <div className="grid gap-6 px-0.5 pb-1 pt-3">
            <FormSection title="Datos" columns={3}>
              <TextField label="Razón social o nombre" required icon={Store} className="md:col-span-2" placeholder="Ej. Taller Mecánico del Yaqui"
                value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <TextField label="RFC" icon={IdCard} maxLength={13} placeholder="Opcional"
                value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} error={errors.rfc} />
              <TextField label="Dirección" icon={MapPin} className="md:col-span-3" placeholder="Calle, número, colonia"
                value={address} onChange={(e) => setAddress(e.target.value)} />
              <TextareaField label="Notas" icon={StickyNote} className="md:col-span-3" rows={2} placeholder="Horarios, condiciones de pago, etc."
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormSection>

            <FormSection title="Pago" columns={3}>
              <TextField
                label="CLABE" icon={Landmark} inputMode="numeric" maxLength={22} placeholder="18 dígitos" value={clabe} error={errors.clabe}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d\s]/g, "");
                  setClabe(v);
                  const b = bankFromClabe(v);
                  if (b && !bankName.trim()) setBankName(b);
                }}
              />
              <TextField label="Banco" icon={Building2} placeholder="Se llena con la CLABE" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              <TextField label="Número de cuenta" icon={Hash} placeholder="Opcional" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </FormSection>

            <FormSection title="Contactos" description="Las órdenes se envían al contacto predeterminado por su medio elegido (correo o WhatsApp).">
              <RadioGroup value={String(defaultIdx)} onValueChange={(v) => setDefaultIdx(Number(v))} className="gap-3">
                {contacts.map((c, i) => {
                  const err = (k: string) => errors[`contacts.${i}.${k}`];
                  const withError = ["name", "email", "phone", "whatsapp"].some((k) => err(k));
                  return (
                    <ItemCard
                      key={i}
                      defaultOpen={!c.name || withError}
                      className={withError ? "border-destructive" : undefined}
                      title={c.name?.trim() || "Contacto nuevo"}
                      subtitle={[c.position, c.preferredChannel === "whatsapp" ? "WhatsApp" : "Correo"].filter(Boolean).join(" · ")}
                      aside={
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                          <RadioGroupItem value={String(i)} aria-label="Contacto predeterminado" />
                          {i === defaultIdx
                            ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Predeterminado</span>
                            : <span className="text-muted-foreground">Predeterminado</span>}
                        </label>
                      }
                      onRemove={contacts.length > 1 ? () => remove(i) : undefined}
                      removeLabel="Quitar contacto"
                    >
                      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                        <TextField label="Nombre" required icon={UserRound} value={c.name} onChange={(e) => patch(i, { name: e.target.value })} error={err("name")} />
                        <TextField label="Puesto" icon={Briefcase} placeholder="Opcional" value={c.position ?? ""} onChange={(e) => patch(i, { position: e.target.value })} />
                        <TextField label="Correo" icon={Mail} type="email" placeholder="nombre@empresa.com" value={c.email ?? ""} onChange={(e) => patch(i, { email: e.target.value })} error={err("email")} />
                        <TextField label="Teléfono" icon={Phone} inputMode="tel" placeholder="10 dígitos" value={c.phone ?? ""} onChange={(e) => patch(i, { phone: e.target.value })} error={err("phone")} />
                        <TextField label="WhatsApp" icon={MessageCircle} inputMode="tel" placeholder="10 dígitos" value={c.whatsapp ?? ""} onChange={(e) => patch(i, { whatsapp: e.target.value })} error={err("whatsapp")} />
                        <SelectField label="Enviar órdenes por" icon={Send} value={c.preferredChannel}
                          onValueChange={(v) => patch(i, { preferredChannel: v as ContactChannel })}
                          options={[{ value: "email", label: "Correo" }, { value: "whatsapp", label: "WhatsApp" }]} />
                      </div>
                    </ItemCard>
                  );
                })}
              </RadioGroup>
              <AddItemButton onClick={() => setContacts((cs) => [...cs, emptyContact()])}>Agregar contacto</AddItemButton>
            </FormSection>
          </div>
        </ScrollArea>
        <DialogFooter className="items-center border-t pt-4">
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm">
            <Switch checked={active} onCheckedChange={setActive} /> {active ? "Activo" : "Inactivo"}
          </label>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <PmySpinner className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
