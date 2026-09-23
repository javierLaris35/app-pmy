"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSignature } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { usePendingAuthorizations } from "@/hooks/services/maintenance/use-maintenance";
import { formatMoney, vehicleLabel } from "@/lib/types/maintenance";

/**
 * Órdenes de compra por autorizar (junto a la campana). Solo la ve quien puede autorizar
 * (Edgardo / superadmin) y solo muestra badge si hay pendientes.
 */
export function PoAuthorizationTray() {
  const user = useAuthStore((s) => s.user);
  const enabled = hasPermission(user, "mttoVehiculos.autorizar");
  const { items, count } = usePendingAuthorizations(enabled);
  const [open, setOpen] = useState(false);

  if (!enabled || count === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Órdenes por autorizar" title="Órdenes de compra por autorizar">
          <FileSignature className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Órdenes por autorizar</p>
          <p className="text-xs text-muted-foreground">Mantenimiento de unidades</p>
        </div>
        <ScrollArea className="max-h-96">
          <ul className="divide-y">
            {items.map((o) => (
              <li key={o.id}>
                <Link href={`/mtto/expediente?id=${o.requestId}`} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{o.folio}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(o.total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vehicleLabel(o.vehicle)} · {o.supplier?.name} · {o.subsidiary?.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
