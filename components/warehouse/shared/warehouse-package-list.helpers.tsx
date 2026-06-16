import * as React from "react";
import { Barcode, Layers, ScanBarcode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageInfo } from "@/lib/types";

/** Paquete de bodega con piezas de remesa (Inbound/OutboundShipment). */
type WarehousePkg = {
  id?: string;
  trackingNumber: string;
  dhlUniqueId?: string;
  shipmentType?: string;
  commitDateTime?: Date | string;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  recipientZip?: string;
  isHighValue?: boolean;
  isCharge?: boolean;
  priority?: any;
  hasPayment?: boolean;
  paymentAmount?: number | string;
  paymentType?: string;
  subsidiary?: any;
  pieces?: string[];
  existingPieces?: string[];
};

export type WarehousePackageInfo = PackageInfo & {
  pieces?: string[];
  existingPieces?: string[];
};

/**
 * Adapta un paquete de bodega (entrada/salida) al `PackageInfo` estandarizado
 * que consume `PackageListItem`/`PackagesList`. Conserva las piezas de remesa
 * para el panel expandible. Estos paquetes ya pasaron validación → `isValid: true`.
 */
export function toPackageInfo(p: WarehousePkg): WarehousePackageInfo {
  return {
    id: p.id,
    trackingNumber: p.trackingNumber,
    dhlUniqueId: p.dhlUniqueId,
    shipmentType: (p.shipmentType || "").toLowerCase(),
    commitDateTime:
      p.commitDateTime instanceof Date ? p.commitDateTime.toISOString() : (p.commitDateTime as string | undefined),
    recipientName: p.recipientName,
    recipientAddress: p.recipientAddress,
    recipientPhone: p.recipientPhone,
    recipientZip: p.recipientZip,
    isHighValue: p.isHighValue,
    isCharge: p.isCharge,
    priority: p.priority,
    subsidiary: p.subsidiary,
    isValid: true,
    payment: p.hasPayment
      ? { amount: String(p.paymentAmount ?? 0), type: (p.paymentType as any) }
      : undefined,
    pieces: p.pieces,
    existingPieces: p.existingPieces,
  };
}

/** True solo si el paquete es una remesa con piezas (previas o nuevas). */
export function hasRemittancePieces(pkg: WarehousePackageInfo): boolean {
  return (pkg.pieces?.length || 0) + (pkg.existingPieces?.length || 0) > 0;
}

/**
 * Agrupa piezas de una misma remesa para la vista. Regla de negocio: en DHL,
 * varias guías que comparten `trackingNumber` con distinto `dhlUniqueId` son
 * piezas de la misma remesa. El primer miembro queda como pieza principal y el
 * resto (más cualquier pieza interna previa) se listan en el panel expandible.
 * Los paquetes no-DHL y las remesas de un solo miembro quedan intactos.
 */
export function groupRemittances(packages: WarehousePackageInfo[]): WarehousePackageInfo[] {
  const groups = new Map<string, WarehousePackageInfo[]>();
  const order: string[] = [];

  packages.forEach((p, idx) => {
    const isDhl = (p.shipmentType || "").toLowerCase() === "dhl";
    const key = isDhl && p.trackingNumber ? `dhl:${p.trackingNumber}` : `single:${idx}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(p);
  });

  return order.map((key) => {
    const members = groups.get(key)!;
    if (members.length === 1) return members[0];

    const [principal, ...rest] = members;
    const restPieces = rest.map((m) => m.dhlUniqueId || m.trackingNumber).filter(Boolean) as string[];
    const innerCurrent = members.flatMap((m) => m.pieces || []);
    const innerExisting = members.flatMap((m) => m.existingPieces || []);

    return {
      ...principal,
      pieces: [...restPieces, ...innerCurrent],
      existingPieces: innerExisting,
    };
  });
}

/**
 * Panel expandible con el contenido de una remesa DHL (piezas previas + nuevas).
 * Devuelve `null` si el paquete no tiene piezas, para que la fila no muestre toggle.
 */
export function RemittancePiecesPanel({ pkg }: { pkg: WarehousePackageInfo }) {
  const existing = pkg.existingPieces || [];
  const current = pkg.pieces || [];
  if (existing.length === 0 && current.length === 0) return null;

  const totalPieces = 1 + existing.length + current.length;

  return (
    <div className="px-4 py-4 bg-slate-50/80 w-full">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-bold text-slate-700">Contenido de la remesa</h4>
        <Badge variant="secondary" className="text-[10px] ml-2 h-5 bg-white border-slate-200 text-slate-600 shadow-sm font-semibold">
          {totalPieces} {totalPieces === 1 ? "pieza en total (incluyendo principal)" : "piezas en total (incluyendo principal)"}
        </Badge>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm max-w-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-100/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px] text-center text-xs font-bold text-slate-500">No.</TableHead>
              <TableHead className="text-xs font-bold text-slate-500">Código de seguimiento</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-500">Clasificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {existing.map((pieceId, index) => (
              <TableRow key={pieceId} className="hover:bg-slate-50/80 transition-colors">
                <TableCell className="text-center font-medium text-slate-400 text-xs">{index + 2}</TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2.5">
                    <Barcode className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-[13px] text-slate-600">{pieceId}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-3">
                  <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-50 border-slate-200">
                    Registrada
                  </Badge>
                </TableCell>
              </TableRow>
            ))}

            {current.map((pieceId, index) => (
              <TableRow key={pieceId} className="bg-green-50/30 hover:bg-green-50/50 transition-colors">
                <TableCell className="text-center font-bold text-green-600/70 text-xs">
                  {existing.length + index + 2}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2.5">
                    <ScanBarcode className="w-4 h-4 text-green-600" />
                    <span className="font-mono text-[13px] font-bold text-green-800">{pieceId}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-3">
                  <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-200 border-none shadow-sm font-bold uppercase tracking-wider">
                    Agregada
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
