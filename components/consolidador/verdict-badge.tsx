"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { actionLabel, verdictTone } from "@/lib/consolidador/verdict";
import { SuggestedAction, Verdict } from "@/lib/types/consolidador";
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, Loader2 } from "lucide-react";

interface Props {
  verdict: Verdict;
  onAction?: (action: SuggestedAction, reason: string) => Promise<void>;
  busy?: boolean;
}

const LEVEL_ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: ShieldAlert,
} as const;

export function VerdictBadge({ verdict, onAction, busy }: Props) {
  const tone = verdictTone(verdict.level);
  const Icon = LEVEL_ICON[verdict.level];
  const label = actionLabel(verdict.suggestedAction);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const canApply = reason.trim().length >= 3 && !saving && !busy;

  const apply = async () => {
    if (!onAction || !canApply) return;
    setSaving(true);
    try {
      await onAction(verdict.suggestedAction, reason.trim());
      setOpen(false);
      setReason("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 whitespace-nowrap font-normal ${tone.badge}`}>
            <Icon className="h-3 w-3" />
            {verdict.title}
          </Badge>
        </TooltipTrigger>
        {verdict.evidence.length > 0 && (
          <TooltipContent className="max-w-xs">
            <ul className="space-y-1 text-xs">
              {verdict.evidence.map((e, i) => (
                <li key={i} className="flex gap-1.5">
                  <Info className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </TooltipContent>
        )}
      </Tooltip>

      {label && onAction && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]">
              {label}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-2">
            <p className="text-xs font-medium text-slate-600">{label}</p>
            <Input
              autoFocus
              className="h-8"
              placeholder="Motivo (requerido)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canApply && apply()}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-7" disabled={!canApply} onClick={apply}>
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
