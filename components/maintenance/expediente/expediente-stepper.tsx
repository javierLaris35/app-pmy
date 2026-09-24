import { Check, Gavel, ArrowRight, Undo2, Ban, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpedienteProgress, STEPS } from "@/lib/types/maintenance";

/** Pasos del expediente + banner con lo que sigue. */
export function ExpedienteStepper({ progress }: { progress: ExpedienteProgress }) {
  const activeIdx = progress.step === "terminado" ? STEPS.length : STEPS.findIndex((s) => s.key === progress.step);
  const cancelled = progress.stage === "cancelado";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <ol className="flex flex-wrap items-center gap-y-3">
        {STEPS.map((s, i) => {
          const done = !cancelled && i < activeIdx;
          const active = !cancelled && i === activeIdx;
          return (
            <li key={s.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    active && (progress.rejected ? "border-rose-500 bg-rose-50 text-rose-700" : "border-primary bg-primary text-primary-foreground"),
                    !done && !active && "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("text-sm", active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <span className={cn("mx-3 h-px w-8 sm:w-12", i < activeIdx && !cancelled ? "bg-emerald-500" : "bg-border")} />}
            </li>
          );
        })}
      </ol>

      <div
        className={cn(
          "mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
          cancelled ? "bg-muted text-muted-foreground"
            : progress.stage === "terminado" ? "bg-emerald-50 text-emerald-800"
            : progress.rejected ? "bg-rose-50 text-rose-800"
            : progress.waitingOn === "autorizador" ? "bg-amber-50 text-amber-900"
            : "bg-primary/5 text-primary",
        )}
      >
        {cancelled ? <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          : progress.stage === "terminado" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          : progress.rejected ? <Undo2 className="mt-0.5 h-4 w-4 shrink-0" />
          : progress.waitingOn === "autorizador" ? <Gavel className="mt-0.5 h-4 w-4 shrink-0" />
          : <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>
          <span className="font-semibold">{progress.stage === "terminado" || cancelled ? "Estado: " : "Siguiente paso: "}</span>
          {progress.nextStep}
        </div>
      </div>
    </div>
  );
}
