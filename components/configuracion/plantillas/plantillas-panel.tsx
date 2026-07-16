// components/configuracion/plantillas/plantillas-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listTemplates, DocumentTemplate } from "@/lib/services/document-templates";
import { CreateTemplateDialog } from "./create-template-dialog";
import { toast } from "@/lib/toast";

export function PlantillasPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<DocumentTemplate[] | null>(null);

  const load = async () => {
    try { setRows(await listTemplates()); }
    catch { toast.error?.("No se pudieron cargar las plantillas"); setRows([]); }
  };
  useEffect(() => { void load(); }, []);

  const openEditor = (id: string) => router.push(`/configuracion/plantillas/${id}`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div><CardTitle>Plantillas</CardTitle><CardDescription>Correos configurables del sistema.</CardDescription></div>
        <CreateTemplateDialog onCreated={openEditor} />
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No hay plantillas. Crea la primera.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => openEditor(t.id)}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell><Badge variant="secondary">{t.type}</Badge></TableCell>
                  <TableCell>{t.active ? <Badge>Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
