// components/configuracion/plantillas/create-template-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTemplate } from "@/lib/services/document-templates";
import { toast } from "@/lib/toast";
import { Plus } from "lucide-react";

export function CreateTemplateDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error?.("Código y nombre son obligatorios"); return; }
    setSaving(true);
    try {
      const t = await createTemplate({ code: form.code.trim(), name: form.name.trim(), type: "email", description: form.description || undefined });
      toast.success?.("Plantilla creada");
      setOpen(false);
      onCreated(t.id);
    } catch (e: any) {
      toast.error?.(e?.response?.data?.message || "No se pudo crear la plantilla");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva plantilla</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva plantilla de correo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Código interno</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="p.ej. welcome_email" /></div>
          <div className="space-y-1"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Correo de bienvenida" /></div>
          <div className="space-y-1"><Label>Descripción (opcional)</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Creando…" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
