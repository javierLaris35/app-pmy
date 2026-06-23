"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/lib/toast";
import { getCompanySettings, updateCompanySettings, type CompanySettings } from "@/lib/services/company-settings";

const EMPTY: CompanySettings = { name: "", taxId: "", address: "", phone: "", email: "", website: "" };

const FIELDS: { key: keyof CompanySettings; label: string; full?: boolean; type?: string }[] = [
  { key: "name", label: "Nombre de la Empresa", full: true },
  { key: "taxId", label: "RFC" },
  { key: "phone", label: "Teléfono" },
  { key: "address", label: "Dirección", full: true },
  { key: "email", label: "Correo Electrónico", type: "email" },
  { key: "website", label: "Sitio Web" },
];

export function CompanyPanel() {
  const [data, setData] = useState<CompanySettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCompanySettings()
      .then((d) => setData({ ...EMPTY, ...d }))
      .catch(() => toast.error("No se pudo cargar la información de la empresa."))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof CompanySettings, v: string) => setData((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await updateCompanySettings(data);
      setData({ ...EMPTY, ...saved });
      toast.success("Información de la empresa actualizada.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información de la Empresa</CardTitle>
        <CardDescription>Estos datos se usan en encabezados, PDFs y correos del sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className={`space-y-2 ${f.full ? "md:col-span-2" : ""}`}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.type || "text"}
                  value={(data[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Cambios
        </Button>
      </CardFooter>
    </Card>
  );
}
