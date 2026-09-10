"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal, PencilLine, PlusCircle, MinusCircle, Loader2, Trash2 } from "lucide-react";

interface Props {
  row: ConsolidadorRow;
  onEditCost: (id: string, cost: number, reason: string) => Promise<void>;
  onToggleSecondAbord: (id: string, enabled: boolean, reason: string) => Promise<void>;
  onDelete: (id: string, reason: string) => Promise<void>;
}

export function RowActions({ row, onEditCost, onToggleSecondAbord, onDelete }: Props) {
  const [costOpen, setCostOpen] = useState(false);
  const [abordOpen, setAbordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cost, setCost] = useState<string>(String(row.cost));
  const [costReason, setCostReason] = useState("");
  const [abordReason, setAbordReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const isCharge = row.sourceType === "charge";
  const isApplied = row.secondAbordApplied !== false; // null o true => incluido → acción = quitar
  const targetEnabled = !isApplied;

  const wrap = async (fn: () => Promise<void>, close: () => void) => {
    setSaving(true);
    try {
      await fn();
      close();
    } finally {
      setSaving(false);
    }
  };

  const submitCost = () => {
    const value = Number(cost);
    if (!isValidCostEdit(value, costReason)) return;
    return wrap(() => onEditCost(row.id, value, costReason.trim()), () => { setCostOpen(false); setCostReason(""); });
  };

  const submitAbord = () => {
    if (abordReason.trim().length < 3) return;
    return wrap(() => onToggleSecondAbord(row.id, targetEnabled, abordReason.trim()), () => { setAbordOpen(false); setAbordReason(""); });
  };

  const submitDelete = () => {
    if (deleteReason.trim().length < 3) return;
    return wrap(() => onDelete(row.id, deleteReason.trim()), () => { setDeleteOpen(false); setDeleteReason(""); });
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
          {isCharge && (
            <DropdownMenuItem onClick={() => setAbordOpen(true)}>
              {isApplied ? (
                <><MinusCircle className="mr-2 h-4 w-4" /> Quitar 2º a bordo</>
              ) : (
                <><PlusCircle className="mr-2 h-4 w-4" /> Poner 2º a bordo</>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: editar costo */}
      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar costo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isCharge && isApplied && row.secondAbordAmount > 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Costo de carga</span>
                  <span className="tabular-nums">{formatCurrency(Math.max(0, row.cost - row.secondAbordAmount))}</span>
                </div>
                <div className="flex justify-between text-violet-600">
                  <span>2º a bordo</span>
                  <span className="tabular-nums">{formatCurrency(row.secondAbordAmount)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                  <span>Total actual</span>
                  <span className="tabular-nums">{formatCurrency(row.cost)}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Costo actual: <span className="font-semibold text-slate-900">{formatCurrency(row.originalCost ?? row.cost)}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cost">Nuevo costo</Label>
              <Input id="cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost-reason">Motivo</Label>
              <Textarea id="cost-reason" placeholder="Motivo del ajuste" value={costReason} onChange={(e) => setCostReason(e.target.value)} />
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

      {/* Dialog: 2º a bordo (solo cargas) */}
      <Dialog open={abordOpen} onOpenChange={setAbordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isApplied ? "Quitar 2º a bordo" : "Poner 2º a bordo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {isApplied ? "Se restará el 2º a bordo del costo de esta carga." : "Se sumará el 2º a bordo al costo de esta carga."}
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

      {/* Dialog: eliminar */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar ingreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              El ingreso se eliminará y <strong>dejará de contar</strong> en los reportes. Queda registrado en el historial.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="del-reason">Motivo</Label>
              <Textarea id="del-reason" placeholder="Motivo de la eliminación" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={saving || deleteReason.trim().length < 3}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
