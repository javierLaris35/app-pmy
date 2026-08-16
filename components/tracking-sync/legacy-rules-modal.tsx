"use client";
import { useMemo, useState } from "react";
import { BookText } from "lucide-react";
import {
  LEGACY_RULES,
  RULE_CATEGORY_LABELS,
  ENGINE_STATUS_LABELS,
  type EngineStatus,
  type RuleCategory,
} from "@/lib/tracking/legacy-rules-catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_BADGE: Record<EngineStatus, string> = {
  migrada: "border-emerald-500 text-emerald-600",
  parcial: "border-amber-500 text-amber-600",
  pendiente: "border-red-500 text-red-600",
};

type StatusFilter = "all" | EngineStatus;

export function LegacyRulesModal() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(
    () => (statusFilter === "all" ? LEGACY_RULES : LEGACY_RULES.filter((r) => r.engineStatus === statusFilter)),
    [statusFilter],
  );

  const counts = useMemo(() => {
    const c: Record<EngineStatus, number> = { migrada: 0, parcial: 0, pendiente: 0 };
    for (const r of LEGACY_RULES) c[r.engineStatus]++;
    return c;
  }, []);

  const categories = Object.keys(RULE_CATEGORY_LABELS) as RuleCategory[];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookText className="mr-2 h-4 w-4" />
          Reglas de negocio (legacy)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Reglas de negocio de processMasterFedexUpdate</DialogTitle>
          <DialogDescription>
            Extraídas del proceso legacy. Checklist de migración al motor nuevo — {counts.migrada} migradas ·{" "}
            {counts.parcial} parciales · {counts.pendiente} pendientes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {(["all", "migrada", "parcial", "pendiente"] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Todas" : ENGINE_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[55vh] pr-3">
          <div className="space-y-5">
            {categories.map((cat) => {
              const rules = filtered.filter((r) => r.category === cat);
              if (rules.length === 0) return null;
              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">{RULE_CATEGORY_LABELS[cat]}</h4>
                  {rules.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-sm">
                          {r.id}. {r.name}
                        </div>
                        <Badge variant="outline" className={STATUS_BADGE[r.engineStatus]}>
                          {ENGINE_STATUS_LABELS[r.engineStatus]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Disparador:</span> {r.trigger}
                        {r.engineNote ? (
                          <>
                            {" · "}
                            <span className="font-medium">Motor:</span> {r.engineNote}
                          </>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
