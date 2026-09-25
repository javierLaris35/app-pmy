import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";
import { RequestItem } from "@/lib/types/maintenance";

/** Renglones de la solicitud: lo que se pidió y cuánto. */
export function RequestItemsCard({ items }: { items: RequestItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lo que se pidió</CardTitle>
        <CardDescription>{items.length} {items.length === 1 ? "renglón" : "renglones"}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
