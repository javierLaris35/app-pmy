import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo
} from "react";
import classNames from "classnames";
import { Label } from "@/components/ui/label";
import { Scan, X, AlertCircle, Calendar } from "lucide-react";
import { PackageInfo } from "@/lib/types";

export interface BarcodeScannerInputHandle {
  focus: () => void;
  clear: () => void;
  getInputElement: () => HTMLTextAreaElement | null;
  updateValidatedPackages: (validatedPackages: PackageInfo[]) => void;
}

interface BarcodeScannerInputProps {
  id?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onPackagesChange?: (packages: PackageInfo[]) => void;
  onTrackingNumbersChange?: (trackingNumbers: string) => void;
  onHasDueTomorrow?: (has: boolean) => void;
}

const BarcodeScannerInputComponent = forwardRef<
  BarcodeScannerInputHandle,
  BarcodeScannerInputProps
>(function BarcodeScannerInput(
  {
    id = "trackingNumbers",
    placeholder = "Escanea o pega los códigos de seguimiento aquí...",
    label = "Números de Seguimiento",
    disabled = false,
    hasErrors = false,
    onPackagesChange,
    onTrackingNumbersChange,
    onHasDueTomorrow
  },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const packagesListRef = useRef<HTMLUListElement>(null);
  const wasPastedRef = useRef(false);
  const shownTomorrowRef = useRef<Set<string>>(new Set());

  const [currentScan, setCurrentScan] = useState("");
  const [packages, setPackages] = useState<PackageInfo[]>([]);

  /* ===================== Helpers ===================== */

  const isDueToday = (date?: string | null) =>
    !!date && new Date(date).toDateString() === new Date().toDateString();

  const isDueTomorrow = (date?: string | null) => {
    if (!date) return false;
    const today = new Date();
    const tomorrow = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    return new Date(date).toDateString() === tomorrow.toDateString();
  };

  const formatDate = (date?: string | null) =>
    date
      ? new Date(date).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

  /* ===================== Contadores ===================== */

  const {
    dueTodayCount,
    dueTomorrowCount,
    notFoundCount
  } = useMemo(() => {
    let today = 0;
    let tomorrow = 0;
    let notFound = 0;

    packages.forEach(p => {
      if (!p.isPendingValidation) {
        if (isDueToday(p.commitDateTime)) today++;
        else if (isDueTomorrow(p.commitDateTime)) tomorrow++;
        else if (!p.commitDateTime && !p.payment) notFound++;
      }
    });

    return { dueTodayCount: today, dueTomorrowCount: tomorrow, notFoundCount: notFound };
  }, [packages]);

  /* ===================== Imperative API ===================== */

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getInputElement: () => textareaRef.current,
    clear: () => {
      setCurrentScan("");
      setPackages([]);
      onTrackingNumbersChange?.("");
    },
    updateValidatedPackages: validatedPackages => {
      setPackages(prev =>
        prev.map(pkg => {
          const validated = validatedPackages.find(
            v => v.trackingNumber === pkg.trackingNumber
          );
          return validated
            ? { ...validated, isPendingValidation: false }
            : pkg;
        })
      );
    }
  }));

  /* ===================== Effects ===================== */

  useEffect(() => {
    packagesListRef.current?.scrollTo({
      top: packagesListRef.current.scrollHeight
    });
  }, [packages]);

  useEffect(() => {
    onPackagesChange?.(packages);
    onTrackingNumbersChange?.(
      packages.map(p => p.trackingNumber).join("\n")
    );
  }, [packages]);

  useEffect(() => {
    const dueTomorrow = packages.filter(
      p => !p.isPendingValidation && isDueTomorrow(p.commitDateTime)
    );

    dueTomorrow.forEach(p =>
      shownTomorrowRef.current.add(p.trackingNumber)
    );

    onHasDueTomorrow?.(dueTomorrow.length > 0);
  }, [packages]);

  /* ===================== Input ===================== */

  const processTrackingLines = useCallback((text: string) => {
    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.slice(-12));

    if (!lines.length) return;

    setPackages(prev => {
      const existing = prev.map(p => p.trackingNumber);
      const toAdd: PackageInfo[] = [];

      lines.forEach(line => {
        if (!existing.includes(line)) {
          toAdd.push({
            id: `tmp-${Date.now()}-${Math.random()}`,
            trackingNumber: line,
            isValid: false,
            isPendingValidation: true
          });
        }
      });

      return [...prev, ...toAdd];
    });

    setCurrentScan("");
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    wasPastedRef.current = true;
    processTrackingLines(e.clipboardData.getData("text"));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (wasPastedRef.current) {
        wasPastedRef.current = false;
        return;
      }
      processTrackingLines(currentScan);
    }
  };

  const removePackage = (index: number) => {
    setPackages(prev => prev.filter((_, i) => i !== index));
  };

  /* ===================== Render ===================== */

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Scan className="h-4 w-4" />
          {label}
        </Label>

        <span className="text-sm text-gray-600">
          Guías: <strong>{packages.length}</strong>
        </span>
      </div>

      {/* Body */}
      <div className={classNames("border rounded-md overflow-hidden", {
        "border-red-500": hasErrors,
        "bg-gray-100": disabled
      })}>
        <ul
          ref={packagesListRef}
          className="max-h-60 overflow-y-auto p-2 bg-white space-y-1"
        >
          {packages.length === 0 && (
            <li className="text-center text-gray-400 text-sm py-6">
              No se han escaneado códigos
            </li>
          )}

          {packages.map((pkg, index) => {
            const validated = !pkg.isPendingValidation;
            const isNotFound =
              validated && !pkg.commitDateTime && !pkg.payment;

            return (
              <li
                key={pkg.trackingNumber}
                className={classNames(
                  "p-2 rounded border flex flex-col gap-1",
                  {
                    "bg-red-50 text-red-600 border-red-200 font-semibold":
                      validated && isDueToday(pkg.commitDateTime),
                    "bg-amber-50 text-amber-600 border-amber-200 font-semibold":
                      validated && isDueTomorrow(pkg.commitDateTime),
                    "bg-slate-100 text-slate-600 border-slate-300 text-slate-700":
                      isNotFound,
                    "bg-cyan-50 text-cyan-600 border-cyan-200":
                      pkg.isPendingValidation
                  }
                )}
              >
                {/* Línea 1 */}
                <div className="flex justify-between items-start">
                  <span className="font-mono text-sm">
                    {pkg.trackingNumber}
                  </span>

                  <div className="flex items-center gap-2">
                    {validated && pkg.payment?.amount && (
                      <span className="text-xs text-indigo-700 font-medium">
                        💰 {pkg.payment?.type} {pkg.payment?.amount}
                      </span>
                    )}

                    {!disabled && (
                      <button
                        onClick={() => removePackage(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Línea 2 */}
                {validated && pkg.commitDateTime && (
                  <div className={classNames("flex items-center gap-1 text-xs",{
                    "bg-red-50 text-red-600 border-red-200 font-semibold":
                      validated && isDueToday(pkg.commitDateTime),
                    "bg-amber-50 text-amber-600 border-amber-200 font-semibold":
                      validated && isDueTomorrow(pkg.commitDateTime),
                    "bg-slate-100 text-slate-600 border-slate-300 text-slate-700":
                      isNotFound,
                    "bg-cyan-50 text-cyan-600 border-cyan-200":
                      pkg.isPendingValidation
                  })}>
                    <Calendar className="h-3 w-3" />
                    {formatDate(pkg.commitDateTime)}
                  </div>
                )}

                {isNotFound && (
                  <span className="text-xs italic">
                    Guía no encontrada
                  </span>
                )}

                {pkg.isPendingValidation && (
                  <span className="text-xs italic">
                    Validando…
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="border-t p-2 bg-gray-50">
          <textarea
            ref={textareaRef}
            value={currentScan}
            onChange={e => setCurrentScan(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            className="w-full resize-none border rounded p-2"
          />
        </div>
      </div>

      {/* Contadores */}
      <div className="flex flex-wrap justify-end gap-3 text-sm">
        <span className="flex items-center gap-1 text-red-700">
          <AlertCircle className="h-4 w-4" />
          Hoy: <strong>{dueTodayCount}</strong>
        </span>

        <span className="flex items-center gap-1 text-amber-700">
          <Calendar className="h-4 w-4" />
          Mañana: <strong>{dueTomorrowCount}</strong>
        </span>

        <span className="flex items-center gap-1 text-slate-700">
          ❓ No encontradas: <strong>{notFoundCount}</strong>
        </span>
      </div>
    </div>
  );
});

export { BarcodeScannerInputComponent as BarcodeScannerInput };