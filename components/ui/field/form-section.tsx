"use client";

import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLS = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3" } as const;

/** Sección de formulario: título corto, ayuda opcional y cuadrícula de campos. Se separan con una línea fina. */
export function FormSection({
  title, description, columns = 1, actions, className, children,
}: {
  title: string;
  description?: React.ReactNode;
  columns?: 1 | 2 | 3;
  /** Acción de la sección (p. ej. "Agregar"), a la derecha del título. */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("grid gap-4 border-b border-border/70 pb-6 last:border-b-0 last:pb-0", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className={cn("grid gap-x-4 gap-y-5", COLS[columns])}>{children}</div>
    </section>
  );
}

/** Tarjeta de un renglón repetible: título, acción de borrar y colapsar. */
export function ItemCard({
  title, subtitle, aside, onRemove, removeDisabled, removeLabel = "Quitar", defaultOpen = true, className, children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Dato a la derecha del título (p. ej. importe). */
  aside?: React.ReactNode;
  onRemove?: () => void;
  removeDisabled?: boolean;
  removeLabel?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-xl border bg-muted/20", className)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={open ? "Contraer" : "Expandir"}>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{title}</div>
              {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
            </div>
          </button>
        </CollapsibleTrigger>
        {aside && <div className="shrink-0 text-sm tabular-nums">{aside}</div>}
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove} disabled={removeDisabled} aria-label={removeLabel} title={removeLabel}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <CollapsibleContent>
        <div className="grid gap-5 border-t bg-background px-3.5 pb-4 pt-5 [border-bottom-left-radius:inherit] [border-bottom-right-radius:inherit]">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Botón a lo ancho para agregar un renglón. */
export function AddItemButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={disabled}
      className="h-11 w-full rounded-xl border-dashed text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
      <Plus className="mr-1.5 h-4 w-4" /> {children}
    </Button>
  );
}
