"use client"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface DetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  packages: any[]
}

/**
 * Modal de detalle (Vencen Hoy / Alto Valor / Cobros). Movido tal cual desde
 * inbound-package.tsx/outbound-package.tsx (era idéntico y estaba duplicado);
 * sin cambios de comportamiento ni de color (ya era neutral).
 */
export function DetailModal({ open, onOpenChange, title, description, packages }: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-800">{title}</DialogTitle>
          <DialogDescription className="text-slate-500">{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[450px] overflow-auto border border-slate-200 rounded-lg shadow-inner mt-2">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Guía / Piezas</TableHead>
                <TableHead className="font-bold text-slate-600">Destinatario</TableHead>
                <TableHead className="font-bold text-slate-600">Carrier</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg: any) => (
                <TableRow key={pkg.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <span className="font-mono text-sm font-bold text-slate-700">{pkg.trackingNumber}</span>
                    {pkg.pieces && pkg.pieces.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pkg.pieces.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[10px] font-mono bg-slate-100 text-slate-500">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">{pkg.recipientName || 'S/N'}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={pkg.recipientAddress}>{pkg.recipientAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell className="uppercase text-[10px] font-bold text-slate-600">{pkg.shipmentType}</TableCell>
                  <TableCell className="text-right text-[11px] font-semibold text-slate-700">
                    {pkg.hasPayment ? <span className="text-amber-600">${Number(pkg.paymentAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span> : <span className="text-green-600">OK</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
