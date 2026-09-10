"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { isValidCostEdit } from "@/lib/consolidador/validation";
import { ConsolidadorRow } from "@/lib/types/consolidador";
import { MoreHorizontal, PencilLine, PlusCircle, MinusCircle, Loader2 } from "lucide-react";

interface Props {
  row: ConsolidadorRow;
  onEditCost: (id: string, cost: number, reason: string) => Promise<void>;
  onToggleSecondAbord: (id: string, enabled: boolean, reason: string) => Promise<void>;
}

export function ChargeActions({ row, onEditCost, onToggleSecondAbord }: Props) {
  const [costOpen, setCostOpen] = useState(false);
  const [abordOpen, setAbordOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cost, setCost] = useState<string>(String(row.cost));
  const [costReason, setCostReason] = useState("");
  const [abordReason, setAbordReason] = useState("");

  // null o true => actualmente incluido → la acción es quitarlo.
  const isApplied = row.secondAbordApplied !== false;
  const targetEnabled = !isApplied;

  const submitCost = async () => {
    const value = Number(cost);
    if (!isValidCostEdit(value, costReason)) return;
    setSaving(true);
    try {
      await onEditCost(row.id, value, costReason.trim());
      setCostOpen(false);
      setCostReason("");
    } finally {
      setSaving(false);
    }
  };

  const submitAbord = async () => {
    if (abordReason.trim().length < 3) return;
    setSaving(true);
    try {
      await onToggleSecondAbord(row.id, targetEnabled, abordReason.trim());
      setAbordOpen(false);
      setAbordReason("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setCost(String(row.cost)); setCostOpen(true); }}>
            <PencilLine className="mr-2 h-4 w-4" /> Editar costo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAbordOpen(true)}>
            {isApplied ? (
              <><MinusCircle className="mr-2 h-4 w-4" /> Quitar 2º a bordo</>
            ) : (
              <><PlusCircle className="mr-2 h-4 w-4" /> Poner 2º a bordo</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: editar costo */}
      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar costo de la carga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Costo actual: <span className="font-semibold text-slate-900">{formatCurrency(row.originalCost ?? row.cost)}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Nuevo costo</Label>
              <Input id="cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost-reason">Motivo</Label>
              <Textarea id="cost-reason" placeholder="Ej. carga sin 2º a bordo real" value={costReason} onChange={(e) => setCostReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={submitCost} disabled={saving || !isValidCostEdit(Number(cost), costReason)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: 2º a bordo */}
      <Dialog open={abordOpen} onOpenChange={setAbordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isApplied ? "Quitar 2º a bordo" : "Poner 2º a bordo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {isApplied
                ? "Se restará el 2º a bordo del costo de esta carga."
                : "Se sumará el 2º a bordo al costo de esta carga."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="abord-reason">Motivo</Label>
              <Textarea id="abord-reason" placeholder="Motivo del ajuste" value={abordReason} onChange={(e) => setAbordReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbordOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={submitAbord} disabled={saving || abordReason.trim().length < 3}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
