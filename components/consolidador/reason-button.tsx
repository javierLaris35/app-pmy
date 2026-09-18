"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";

interface Props {
  label: string;
  onConfirm: (reason: string) => Promise<void>;
  disabled?: boolean;
  size?: "xs" | "sm";
  variant?: "outline" | "ghost" | "default";
  className?: string;
}

/** Botón que pide un motivo (>=3 chars) en un popover antes de ejecutar una acción. */
export function ReasonButton({ label, onConfirm, disabled, size = "sm", variant = "outline", className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const canApply = reason.trim().length >= 3 && !saving && !disabled;

  const apply = async () => {
    if (!canApply) return;
    setSaving(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
    } finally {
      setSaving(false);
    }
  };

  const h = size === "xs" ? "h-6 px-2 text-[11px]" : "h-7 px-2 text-xs";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant={variant} className={`${h} ${className ?? ""}`} disabled={disabled} onClick={(e) => e.stopPropagation()}>
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2" onClick={(e) => e.stopPropagation()}>
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
  );
}
