import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks, Package } from "lucide-react";
import { RequestItem } from "@/lib/types/maintenance";

/** Lo que se pidió: servicios predefinidos + lo que contó quien pide + renglones (compras o solicitudes viejas). */
export function RequestItemsCard({ items, services = [], description }: {
  items: RequestItem[];
  services?: Array<{ id: string; name: string }>;
  description?: string;
}) {
  const parts = [
    services.length ? `${services.length} ${services.length === 1 ? "servicio" : "servicios"}` : null,
    items.length ? `${items.length} ${items.length === 1 ? "renglón" : "renglones"}` : null,
  ].filter(Boolean);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lo que se pidió</CardTitle>
        <CardDescription>{parts.join(" · ") || "Descripción libre"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <Badge key={s.id} variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm font-normal">
                <ListChecks className="h-3.5 w-3.5" /> {s.name}
              </Badge>
            ))}
          </div>
        )}
        {description && (
          <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Qué necesita o qué le pasa</span>
            {description}
          </p>
        )}
        {items.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="w-28 text-right">Cantidad</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i, idx) => (
                  <TableRow key={i.id ?? idx}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{i.description}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {i.product && <Badge variant="outline" className="gap-1 text-[10px]"><Package className="h-3 w-3" /> Del catálogo</Badge>}
                        {i.category && <span>{i.category.name}</span>}
                        {i.product?.brand && <span>· {i.product.brand}</span>}
                        {i.product?.partNumber && <span>· No. {i.product.partNumber}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(i.quantity)} <span className="text-muted-foreground">{i.unit?.abbreviation ?? i.unit?.name ?? ""}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
