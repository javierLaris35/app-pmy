"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ConsolidadorBuckets } from "@/lib/types/consolidador";
import { Package, Truck, Boxes, ArrowLeftRight, PencilLine, Wallet } from "lucide-react";

type BucketKey = keyof Omit<ConsolidadorBuckets, "total">;

const META: Record<BucketKey | "total", { label: string; icon: React.ComponentType<{ className?: string }>; accent: string; ring: string }> = {
  envios: { label: "Envíos", icon: Package, accent: "text-blue-600", ring: "bg-blue-50" },
  cargas: { label: "Cargas", icon: Truck, accent: "text-amber-600", ring: "bg-amber-50" },
  recolecciones: { label: "Recolecciones", icon: Boxes, accent: "text-violet-600", ring: "bg-violet-50" },
  traslados: { label: "Traslados", icon: ArrowLeftRight, accent: "text-cyan-600", ring: "bg-cyan-50" },
  manual: { label: "Manual", icon: PencilLine, accent: "text-rose-600", ring: "bg-rose-50" },
  total: { label: "Total", icon: Wallet, accent: "text-emerald-600", ring: "bg-emerald-50" },
};

const ORDER: (BucketKey | "total")[] = ["total", "envios", "cargas", "recolecciones", "traslados", "manual"];

export function ConsolidadorKpis({ buckets }: { buckets?: ConsolidadorBuckets }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {ORDER.map((key) => {
        const meta = META[key];
        const bucket = buckets?.[key] ?? { amount: 0, count: 0 };
        const isTotal = key === "total";
        const Icon = meta.icon;
        return (
          <Card
            key={key}
            className={`shadow-sm border-none bg-white ${isTotal ? "ring-2 ring-emerald-100" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{meta.label}</span>
                <span className={`p-1.5 rounded-full ${meta.ring}`}>
                  <Icon className={`h-3.5 w-3.5 ${meta.accent}`} />
                </span>
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(bucket.amount)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{bucket.count} registros</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
