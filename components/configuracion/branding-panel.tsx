"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrand, upsertBrand, Brand } from "@/lib/services/document-templates";
import { toast } from "@/lib/toast";

const COLOR_KEYS = ["primary", "secondary", "button", "text", "background"] as const;

export function BrandingPanel() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getBrand().then(setBrand).catch(() => { toast.error?.("No se pudo cargar el branding"); setBrand({}); }); }, []);

  const setColor = (k: string, val: string) => setBrand((b) => ({ ...(b || {}), colors: { ...(b?.colors || {}), [k]: val } }));
  const setField = (group: keyof Brand, k: string, val: string) =>
    setBrand((b) => ({ ...(b || {}), [group]: { ...((b?.[group] as any) || {}), [k]: val } }));

  const save = async () => {
    if (!brand) return;
    setSaving(true);
    try { setBrand(await upsertBrand(brand)); toast.success?.("Branding guardado"); }
    catch { toast.error?.("No se pudo guardar"); }
    finally { setSaving(false); }
  };

  if (!brand) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Logos</CardTitle><CardDescription>URLs de los logotipos.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Logo claro (URL)</Label><Input value={brand.logoLight || ""} onChange={(e) => setBrand({ ...brand, logoLight: e.target.value })} /></div>
          <div className="space-y-1"><Label>Logo oscuro (URL)</Label><Input value={brand.logoDark || ""} onChange={(e) => setBrand({ ...brand, logoDark: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Colores</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label className="capitalize">{k}</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.colors?.[k] || "#000000"} onChange={(e) => setColor(k, e.target.value)} className="h-9 w-10 rounded border" />
                <Input value={brand.colors?.[k] || ""} onChange={(e) => setColor(k, e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tipografía y bordes</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Fuente</Label><Input value={brand.typography?.fontFamily || ""} onChange={(e) => setField("typography", "fontFamily", e.target.value)} placeholder="Arial, sans-serif" /></div>
          <div className="space-y-1"><Label>Tamaño base</Label><Input value={brand.typography?.baseSize || ""} onChange={(e) => setField("typography", "baseSize", e.target.value)} placeholder="14px" /></div>
          <div className="space-y-1"><Label>Radio de borde</Label><Input value={brand.borderRadius || ""} onChange={(e) => setBrand({ ...brand, borderRadius: e.target.value })} placeholder="8px" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Datos fiscales y contacto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Razón social</Label><Input value={brand.fiscal?.razonSocial || ""} onChange={(e) => setField("fiscal", "razonSocial", e.target.value)} /></div>
          <div className="space-y-1"><Label>RFC</Label><Input value={brand.fiscal?.rfc || ""} onChange={(e) => setField("fiscal", "rfc", e.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label>Dirección</Label><Input value={brand.fiscal?.direccion || ""} onChange={(e) => setField("fiscal", "direccion", e.target.value)} /></div>
          <div className="space-y-1"><Label>Teléfono</Label><Input value={brand.contact?.phone || ""} onChange={(e) => setField("contact", "phone", e.target.value)} /></div>
          <div className="space-y-1"><Label>Email</Label><Input value={brand.contact?.email || ""} onChange={(e) => setField("contact", "email", e.target.value)} /></div>
          <div className="space-y-1"><Label>Sitio web</Label><Input value={brand.contact?.website || ""} onChange={(e) => setField("contact", "website", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Redes sociales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Facebook</Label><Input value={brand.social?.facebook || ""} onChange={(e) => setField("social", "facebook", e.target.value)} /></div>
          <div className="space-y-1"><Label>Instagram</Label><Input value={brand.social?.instagram || ""} onChange={(e) => setField("social", "instagram", e.target.value)} /></div>
          <div className="space-y-1"><Label>WhatsApp</Label><Input value={brand.social?.whatsapp || ""} onChange={(e) => setField("social", "whatsapp", e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar branding"}</Button></div>
    </div>
  );
}
