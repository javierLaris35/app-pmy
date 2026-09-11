"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ConsolidadorBuckets } from "@/lib/types/consolidador";
import { Package, Truck, Boxes, ArrowLeftRight, PencilLine, Wallet } from "lucide-react";

type BucketKey = keyof Omit<ConsolidadorBuckets, "total">;

const META: Record<BucketKey, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  envios: { label: "Envíos", icon: Package },
  cargas: { label: "Cargas", icon: Truck },
  recolecciones: { label: "Recolecciones", icon: Boxes },
  traslados: { label: "Traslados", icon: ArrowLeftRight },
  manual: { label: "Manual", icon: PencilLine },
};

const ORDER: BucketKey[] = ["envios", "cargas", "recolecciones", "traslados", "manual"];

export function ConsolidadorKpis({ buckets }: { buckets?: ConsolidadorBuckets }) {
  const total = buckets?.total ?? { amount: 0, count: 0 };

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
      <div className="grid grid-cols-2 divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x [&>*]:border-b [&>*]:border-slate-100 sm:[&>*]:border-b-0">
        {/* Total — el número que importa; único acento de color. */}
        <div className="relative px-4 py-3.5">
          <span className="absolute left-0 top-0 h-full w-0.5 bg-emerald-500" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Total
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums tracking-tight text-emerald-600">
            {formatCurrency(total.amount)}
          </div>
          <div className="text-[11px] text-slate-400">{total.count} movimientos</div>
        </div>

        {ORDER.map((key) => {
          const meta = META[key];
          const bucket = buckets?.[key] ?? { amount: 0, count: 0 };
          const Icon = meta.icon;
          return (
            <div key={key} className="px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <Icon className="h-3.5 w-3.5" /> {meta.label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-900">
                {formatCurrency(bucket.amount)}
              </div>
              <div className="text-[11px] text-slate-400">{bucket.count} registros</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
