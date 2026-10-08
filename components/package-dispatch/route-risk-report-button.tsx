"use client";

// Simulación del correo de las 7 pm "Rutas del día con posibles problemas" (SOLO superadmin).
// "Ver simulación" arma el correo con datos reales sin enviarlo; "Enviar de prueba" lo manda
// a los destinatarios de siempre (Javier, copia a sistemas) tras confirmar.

import { useState, type ReactNode } from "react";
import { AlertTriangle, Eye, Loader2, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateField } from "@/components/ui/field";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { runRouteRiskReport, RouteRiskReportResult } from "@/lib/services/route-closure";

/** Hoy en Hermosillo como YYYY-MM-DD. */
const todayHermosillo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(new Date());

export function RouteRiskReportButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayHermosillo);
  const [report, setReport] = useState<RouteRiskReportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? "preview" : "send");
    setError(null);
    try {
      const res = await runRouteRiskReport({ date, dryRun });
      if ("skipped" in res) {
        setError("Ya se está generando un reporte. Espera un momento y vuelve a intentar.");
        return;
      }
      setReport(res);
      if (!dryRun) {
        toast({ title: "Correo de prueba enviado", description: res.subject });
        setConfirmOpen(false);
      }
    } catch (e) {
      const msg = apiError(e, dryRun ? "No se pudo generar la simulación" : "No se pudo enviar el correo");
      setError(msg);
      if (!dryRun) toast({ title: "No se envió el correo", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const t = report?.totals;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            onClick={() => setOpen(true)}
            aria-label="Simular correo de rutas con posibles problemas"
          >
            <MailCheck className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Simular correo de las 7 pm</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
          <DialogHeader className="space-y-1 px-5 pt-5 pb-3 text-left">
            <DialogTitle className="flex items-center gap-2.5 pr-8 text-base">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <MailCheck className="h-4 w-4 text-primary" />
              </span>
              Correo de las 7 pm: rutas con posibles problemas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sale solo todos los días a las 7 pm. Aquí puedes ver cómo quedaría con los datos de cualquier día, o mandarlo de prueba.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 border-b px-5 pb-3">
            <DateField label="Día de las rutas" size="sm" value={date} onChange={setDate} className="w-60" disabled={!!busy} />
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => run(true)} disabled={!!busy || !date}>
                {busy === "preview" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                Ver simulación
              </Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!!busy || !date}>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Enviar de prueba
              </Button>
            </div>
          </div>

          <div className="min-h-[50vh] bg-slate-50/60 p-4">
            {busy && (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Revisando todas las rutas del día con FedEx… tarda alrededor de un minuto.
              </div>
            )}

            {!busy && error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {!busy && !error && !report && (
              <div className="flex h-[50vh] items-center justify-center text-sm text-slate-500">
                Elige el día y presiona “Ver simulación”. No se envía nada.
              </div>
            )}

            {!busy && report && t && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-700">Asunto:</span>
                  <span className="text-slate-600">{report.subject}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill>{t.routes} rutas</Pill>
                  <Pill className={t.routesWithIssues ? "border-red-200 bg-red-50 text-red-800" : undefined}>
                    {t.routesWithIssues} con posibles problemas
                  </Pill>
                  <Pill className={t.toFix ? "border-amber-200 bg-amber-50 text-amber-800" : undefined}>{t.toFix} guías por corregir</Pill>
                  <Pill>{t.withoutOutcome} sin resultado aún</Pill>
                  <Pill>{t.guides} guías revisadas</Pill>
                </div>
                <iframe
                  title="Simulación del correo"
                  srcDoc={report.html}
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  className="h-[60vh] w-full rounded-md border bg-white"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(v) => busy !== "send" && setConfirmOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar el correo de prueba?</AlertDialogTitle>
            <AlertDialogDescription>
              Se revisan las rutas del día elegido y se manda el correo a los destinatarios de siempre (Javier, con copia a sistemas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "send"}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                run(false);
              }}
              disabled={busy === "send"}
            >
              {busy === "send" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600",
        className,
      )}
    >
      {children}
    </span>
  );
}
