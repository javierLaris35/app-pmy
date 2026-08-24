"use client";

import * as React from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, MonitorPlay, type LucideIcon } from "lucide-react";

/* ================================================================== *
 * Motor de tutorial GENÉRICO y reutilizable.
 *
 * Cualquier componente arma sus pasos (eyebrow/título/cuerpo/ilustración)
 * y lo monta con <Tutorial />. Además ofrece:
 *   - useTutorialFirstView(key, open): abre el tutorial una sola vez.
 *   - runSpotlight(defs): tour driver.js sobre los controles reales
 *     (solo resalta los elementos que existen en ese momento).
 * ================================================================== */

const DEFAULT_ACCENT = "#4D148C"; // morado FedEx (default de la casa)

export interface TutorialStep {
  /** Etiqueta corta encima del título (p.ej. "Paso 1 · Copia"). */
  eyebrow?: string;
  title: string;
  /** Texto o nodos; se permite contenido enriquecido. */
  body: React.ReactNode;
  /** Ilustración del paso (Tailwind/SVG inline). */
  art?: React.ReactNode;
}

export interface TutorialProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  steps: TutorialStep[];
  /** Icono de marca en el header. */
  icon?: LucideIcon;
  /** Color de acento (hex). Default morado FedEx. */
  accent?: string;
  /** Fondo suave del acento (hex) para el chip del icono y el lienzo. */
  accentSoft?: string;
  /** Si se pasa, el último paso ofrece lanzar un tour sobre la pantalla real. */
  onStartSpotlight?: () => void;
  spotlightLabel?: string;
  doneLabel?: string;
}

export function Tutorial({
  open,
  onOpenChange,
  steps,
  icon: Icon,
  accent = DEFAULT_ACCENT,
  accentSoft = "#f5f0fb",
  onStartSpotlight,
  spotlightLabel = "Ver en pantalla",
  doneLabel = "Entendido",
}: TutorialProps) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => { if (open) setI(0); }, [open]);

  if (!steps.length) return null;
  const idx = Math.min(i, steps.length - 1);
  const step = steps[idx];
  const last = idx === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl">
        {/* Header: icono + eyebrow + título */}
        <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: accentSoft, color: accent, borderColor: "#e6dcf5" }}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              {step.eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>{step.eyebrow}</p>
              )}
              <DialogTitle className="text-left text-lg font-bold leading-tight text-slate-900">{step.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Lienzo de la ilustración */}
        {step.art && (
          <div className="flex min-h-[220px] items-center justify-center px-6 py-7" style={{ background: `linear-gradient(180deg, ${accentSoft}55, ${accentSoft})` }}>
            {step.art}
          </div>
        )}

        {/* Cuerpo */}
        <div className="px-6 pb-5 pt-4 text-sm leading-relaxed text-slate-600">{step.body}</div>

        {/* Footer: progreso + navegación */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-slate-400">{idx + 1} / {steps.length}</span>
            <div className="flex items-center gap-1.5">
              {steps.map((_, k) => (
                <button
                  key={k}
                  aria-label={`Ir al paso ${k + 1}`}
                  onClick={() => setI(k)}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: k === idx ? 20 : 8, background: k === idx ? accent : "#d9cdea" }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <Button variant="ghost" size="sm" className="text-slate-500 hover:bg-slate-100" onClick={() => setI(idx - 1)}>Atrás</Button>
            )}
            {!last ? (
              <Button size="sm" className="text-white hover:opacity-90" style={{ background: accent }} onClick={() => setI(idx + 1)}>
                Siguiente <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <>
                {onStartSpotlight && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { onOpenChange(false); onStartSpotlight(); }}>
                    <MonitorPlay className="h-4 w-4" /> {spotlightLabel}
                  </Button>
                )}
                <Button size="sm" className="text-white hover:opacity-90" style={{ background: accent }} onClick={() => onOpenChange(false)}>
                  {doneLabel} <Check className="ml-1.5 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Hook: abre el tutorial una sola vez (por `storageKey`) al abrir el host.
 * ------------------------------------------------------------------ */
export function useTutorialFirstView(storageKey: string, open: boolean, delay = 500) {
  const [tutorialOpen, setTutorialOpen] = React.useState(false);
  React.useEffect(() => {
    if (open && typeof window !== "undefined" && !localStorage.getItem(storageKey)) {
      const t = setTimeout(() => {
        setTutorialOpen(true);
        localStorage.setItem(storageKey, "1");
      }, delay);
      return () => clearTimeout(t);
    }
  }, [open, storageKey, delay]);
  return [tutorialOpen, setTutorialOpen] as const;
}

/* ------------------------------------------------------------------ *
 * Tour spotlight (driver.js) sobre los controles reales. Solo resalta
 * los elementos presentes en el DOM (evita errores por pasos ausentes).
 * ------------------------------------------------------------------ */
export interface SpotlightStepDef {
  /** Selector CSS del elemento a resaltar. */
  el: string;
  title: string;
  /** Admite HTML. */
  description: string;
}

export function runSpotlight(
  defs: SpotlightStepDef[],
  labels?: { next?: string; prev?: string; done?: string },
) {
  if (typeof document === "undefined") return;
  const steps = defs
    .filter((d) => document.querySelector(d.el))
    .map((d) => ({ element: d.el, popover: { title: d.title, description: d.description } }));
  if (!steps.length) return;
  driver({
    showProgress: true,
    nextBtnText: labels?.next ?? "Sig.",
    prevBtnText: labels?.prev ?? "Ant.",
    doneBtnText: labels?.done ?? "Listo",
    steps,
  }).drive();
}
