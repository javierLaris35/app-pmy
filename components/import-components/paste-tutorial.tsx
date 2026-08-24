"use client";

import * as React from "react";
import {
  ClipboardPaste, ArrowRight, Table2, Wand2, DollarSign, Diamond, CornerDownRight,
  Plane, Package, Building2, Hash, CalendarDays, ScanLine, AlertTriangle, CheckCircle2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tutorial, type TutorialStep, type SpotlightStepDef } from "@/components/shared/tutorial";

const FEDEX = "#4D148C";

/* ================================================================== *
 * Ilustraciones inline (Tailwind + SVG). Sin assets externos.
 * ================================================================== */

/** Mini hoja de Excel de ejemplo. Resalta encabezados o muestra la selección "copiar". */
function ExcelGrid({ highlightHeader = false, selecting = false }: { highlightHeader?: boolean; selecting?: boolean }) {
  const cols = ["Tracking No", "Recip Name", "Recip Addr", "City"];
  const data = [
    ["383012036065", "Juan Pérez", "Calle 1", "Hermosillo"],
    ["383011751254", "Ana López", "Av. Reforma 22", "Hermosillo"],
    ["794000112233", "Luis Díaz", "Blvd. Kino 100", "Hermosillo"],
  ];
  return (
    <div className="relative inline-block">
      {selecting && (
        <span className="absolute -top-2.5 right-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm" style={{ background: FEDEX }}>
          Ctrl/Cmd + C
        </span>
      )}
      <div
        className={cn(
          "overflow-hidden rounded-md bg-white text-[10px] font-mono leading-none",
          selecting ? "border-2 border-dashed motion-safe:animate-pulse" : "border border-slate-200",
        )}
        style={selecting ? { borderColor: FEDEX } : undefined}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
          {cols.map((c, i) => (
            <div
              key={`h-${i}`}
              className={cn(
                "whitespace-nowrap border-b border-r border-slate-200 px-2 py-1.5 font-semibold last:border-r-0",
                highlightHeader ? "text-white" : "bg-slate-50 text-slate-500",
              )}
              style={highlightHeader ? { background: FEDEX } : undefined}
            >
              {c}
            </div>
          ))}
          {data.map((row, r) =>
            row.map((cell, ci) => (
              <div key={`${r}-${ci}`} className="whitespace-nowrap border-b border-r border-slate-100 px-2 py-1.5 text-slate-700 last:border-r-0">
                {cell}
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

function PasteZone() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-5 text-center" style={{ borderColor: "#d9c8f0", background: "#faf7fe" }}>
      <ClipboardPaste className="h-6 w-6" style={{ color: FEDEX }} />
      <span className="text-[11px] font-semibold text-slate-700">Pega aquí</span>
      <span className="text-[10px] text-slate-400">Ctrl/Cmd + V</span>
    </div>
  );
}

function MapChip({ to, from }: { to: string; from: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-slate-700 ring-1 ring-slate-100">
      <strong className="font-semibold text-slate-900">{to}</strong>
      <CornerDownRight className="h-3 w-3 text-slate-400" />
      <span className="font-mono text-slate-500">{from}</span>
    </span>
  );
}

/** Tarjeta de "tipo" (Aéreo/Master vs F2). */
function TypeCard({ icon: Icon, name, desc }: { icon: typeof Plane; name: string; desc: string }) {
  return (
    <div className="flex-1 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: "#f5f0fb", color: FEDEX }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {name}
      </div>
      <p className="text-[11px] leading-snug text-slate-500">{desc}</p>
    </div>
  );
}

/** Renglón de dato obligatorio / opcional. */
function FieldRow({ icon: Icon, label, req }: { icon: typeof Hash; label: string; req: "req" | "cond" | "opt" }) {
  const tag = req === "req"
    ? { t: "Obligatorio", c: "bg-rose-100 text-rose-700" }
    : req === "cond"
      ? { t: "Solo Aéreo/Master", c: "bg-amber-100 text-amber-700" }
      : { t: "Opcional", c: "bg-slate-100 text-slate-500" };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
      <span className="flex items-center gap-2 text-[12px] text-slate-700">
        <Icon className="h-4 w-4 text-slate-400" /> {label}
      </span>
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", tag.c)}>{tag.t}</span>
    </div>
  );
}

/** Chip verde de "detectado del pegado". */
function DetectedChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> {children}
    </span>
  );
}

/** Chip de conteo (réplica compacta del header del modal). */
function CountChipMini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className={cn("flex min-w-[64px] flex-col rounded-lg px-2.5 py-1.5", cls)}>
      <span className="text-sm font-bold leading-none">{value}</span>
      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

function LegendRow({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
      <span className={cn("h-2.5 w-2.5 rounded-sm", dot)} /> {label}
    </span>
  );
}

function ErrItem({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]", tone === "red" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </div>
  );
}

/** Estado vacío del modal: guía ilustrada mientras no se ha pegado nada. */
export function PasteEmptyHint({ onOpenTutorial, onPasteExample }: { onOpenTutorial?: () => void; onPasteExample?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-8 text-center animate-in fade-in-0 duration-300">
      <div className="flex items-center gap-3">
        <ExcelGrid selecting />
        <ArrowRight className="h-5 w-5 shrink-0 text-slate-300" />
        <PasteZone />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">Aún no has pegado nada</p>
        <p className="mx-auto mt-0.5 max-w-sm text-[12px] text-slate-500">
          Copia tus filas en Excel <strong>incluyendo la fila de encabezados</strong> y pégalas en el recuadro de arriba.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onPasteExample && (
          <button
            type="button"
            onClick={onPasteExample}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D148C]/40 focus-visible:ring-offset-1"
            style={{ background: FEDEX }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Pegar ejemplo
          </button>
        )}
        {onOpenTutorial && (
          <button
            type="button"
            onClick={onOpenTutorial}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D148C]/40 focus-visible:ring-offset-1"
          >
            <ClipboardPaste className="h-3.5 w-3.5" /> Ver tutorial
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== *
 * Pasos del tutorial de PEGAR (detallados)
 * ================================================================== */

const PASTE_STEPS: TutorialStep[] = [
  {
    eyebrow: "Cómo funciona",
    title: "Pega desde Excel, sin subir archivos",
    body: "Copia tus filas en Excel y pégalas aquí. El sistema las procesa igual que el import por archivo: mismo mapeo de columnas y mismas validaciones.",
    art: (
      <div className="flex items-center justify-center gap-4">
        <ExcelGrid selecting />
        <ArrowRight className="h-6 w-6 shrink-0 text-slate-300" />
        <PasteZone />
      </div>
    ),
  },
  {
    eyebrow: "Tipos",
    title: "Aéreo/Master o F2/Cargas",
    body: (
      <>Elige el tipo arriba a la izquierda. Cada uno crea algo distinto y la pantalla se adapta.</>
    ),
    art: (
      <div className="flex w-full max-w-md gap-3">
        <TypeCard icon={Plane} name="Aéreo / Master" desc="Crea ENVÍOS (guías normales). Marca “Aéreo” si viajaron por avión. Aquí van cobros y Alto Valor." />
        <TypeCard icon={Package} name="F2 / Cargas" desc="Crea CARGAS agrupadas en un consolidado; su costo entra como ingreso. También acepta cobros." />
      </div>
    ),
  },
  {
    eyebrow: "Datos obligatorios",
    title: "Qué necesitas capturar",
    body: "Sin la sucursal no puedes procesar. El número de consolidado es obligatorio en Aéreo/Master. Cada fila necesita su guía; las filas sin guía se ignoran.",
    art: (
      <div className="flex w-full max-w-sm flex-col gap-2">
        <FieldRow icon={Building2} label="Sucursal" req="req" />
        <FieldRow icon={Hash} label="No. de consolidado" req="cond" />
        <FieldRow icon={ScanLine} label="Guía por fila (Tracking)" req="req" />
        <FieldRow icon={CalendarDays} label="Fecha del consolidado" req="opt" />
      </div>
    ),
  },
  {
    eyebrow: "Se llenan solos",
    title: "Detectamos consolidado, fecha y Aéreo",
    body: "Si tu pegado incluye la fila meta de FedEx, el No. de consolidado, la fecha y si es Aéreo se rellenan automáticamente. Siempre puedes editarlos antes de procesar.",
    art: (
      <div className="flex flex-col items-center gap-2.5">
        <span className="text-[11px] font-medium text-emerald-700">Detectado del pegado</span>
        <div className="flex flex-wrap justify-center gap-1.5">
          <DetectedChip>Consolidado CONS-123</DetectedChip>
          <DetectedChip>Aéreo</DetectedChip>
          <DetectedChip>Fecha 20/08/2026</DetectedChip>
        </div>
        <span className="text-[10px] text-slate-400">(puedes editarlos arriba)</span>
      </div>
    ),
  },
  {
    eyebrow: "Paso 1 · Copia",
    title: "Incluye la fila de encabezados",
    body: "Copia SIEMPRE la fila de títulos. Con ella reconocemos cada columna aunque cambie de orden o de nombre.",
    art: (
      <div className="flex flex-col items-center gap-3">
        <ExcelGrid highlightHeader />
        <div className="flex flex-wrap justify-center gap-1.5">
          <MapChip to="Guía" from="Tracking No" />
          <MapChip to="Nombre" from="Recip Name" />
          <MapChip to="Ciudad" from="City" />
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Paso 2 · Cobros",
    title: "Agrega cobros por guía",
    body: "En “Agregar pagos” pega guía + monto (y COD/FTC/ROD si aplica). Se cruzan por guía y aplican tanto a envíos como a cargas F2. Si un pago no trae tipo, te preguntamos si usar COD.",
    art: (
      <div className="flex w-full max-w-md flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
          <span className="font-mono text-[10px] text-slate-500">383264471120&nbsp;&nbsp;COD-COLLECT CASH 2500.0 MXP</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <DollarSign className="h-3 w-3" /> Cobro $2,500 · COD
          </span>
        </div>
        <p className="text-[11px] text-slate-500">Funciona aunque lo copies del cuerpo del correo (guía, fecha y cobro en renglones separados). Si un pago no trae tipo, te preguntamos si usar COD.</p>
      </div>
    ),
  },
  {
    eyebrow: "Paso 2 · Alto Valor",
    title: "Marca guías de Alto Valor",
    body: "Solo en Aéreo/Master. Pega las guías de alto valor (con dirección si viene); se marcan con diamante y, si no están en la tabla, se agregan.",
    art: (
      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
        <span className="font-mono text-[10px] text-slate-500">794000112233</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
          <Diamond className="h-3 w-3" /> Alto Valor
        </span>
      </div>
    ),
  },
  {
    eyebrow: "Conteos y colores",
    title: "Lee el resumen de un vistazo",
    body: "Los chips de arriba cuentan lo que traes; en la tabla cada color marca un caso a revisar.",
    art: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-1.5">
          <CountChipMini label="Guías" value="120" cls="bg-slate-100 text-slate-700" />
          <CountChipMini label="A importar" value="112" cls="bg-emerald-100 text-emerald-700" />
          <CountChipMini label="Duplicadas" value="6" cls="bg-amber-100 text-amber-700" />
          <CountChipMini label="Sin guía" value="2" cls="bg-rose-100 text-rose-700" />
          <CountChipMini label="Con pago" value="18" cls="bg-emerald-100 text-emerald-700" />
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <LegendRow dot="bg-rose-300" label="sin guía" />
          <LegendRow dot="bg-amber-300" label="duplicada / fecha / pago sin tipo" />
          <LegendRow dot="bg-emerald-300" label="cobro" />
          <LegendRow dot="bg-purple-300" label="alto valor" />
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Errores comunes",
    title: "Evita estos tropiezos, luego procesa",
    body: "Cuando el resumen se vea bien, presiona “Procesar e importar”. Verás cuántos registros se guardaron.",
    art: (
      <div className="flex w-full max-w-md flex-col gap-2">
        <ErrItem tone="red">Pegaste sin la fila de encabezados (no se detectan columnas).</ErrItem>
        <ErrItem tone="red">Falta la columna de Guía/Tracking en lo pegado.</ErrItem>
        <ErrItem tone="amber">Todas las guías ya estaban importadas (nada nuevo que subir).</ErrItem>
        <ErrItem tone="amber">Fechas en formato raro: se marcan en ámbar para que las revises.</ErrItem>
      </div>
    ),
  },
];

/* Selectores para el tour spotlight sobre los controles reales del modal. */
export const PASTE_SPOTLIGHT: SpotlightStepDef[] = [
  { el: "#paste-type", title: "Tipo de datos", description: "Elige si pegas Aéreo/Master o F2/Cargas. La pantalla se adapta al tipo." },
  { el: "#paste-fields", title: "Datos del consolidado", description: "Selecciona la sucursal y captura el número y la fecha del consolidado." },
  { el: "#paste-textarea", title: "Pega aquí", description: "Pega tus filas de Excel <strong>con la fila de encabezados</strong>. Las columnas se reconocen solas." },
  { el: "#paste-enrich", title: "Cobros y Alto Valor", description: "Agrega cobros (guía + monto) y guías de Alto Valor. Los cobros también aplican a cargas F2." },
  { el: "#paste-table", title: "Lo que se guardará", description: "Revisa el resumen: las filas con problema se resaltan por color." },
  { el: "#paste-submit", title: "Procesa", description: "Cuando todo se vea bien, importa. Verás cuántos registros se guardaron." },
];

/* ================================================================== *
 * Wrapper del tutorial de pegar (usa el motor genérico).
 * ================================================================== */
export function PasteTutorial({
  open,
  onOpenChange,
  onStartSpotlight,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStartSpotlight?: () => void;
}) {
  return (
    <Tutorial
      open={open}
      onOpenChange={onOpenChange}
      steps={PASTE_STEPS}
      icon={ClipboardPaste}
      accent={FEDEX}
      onStartSpotlight={onStartSpotlight}
    />
  );
}
