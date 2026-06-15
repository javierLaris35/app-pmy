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
import { Scan, X, AlertCircle, Calendar, Copy, Check, BarcodeIcon } from "lucide-react";
import { PackageInfo } from "@/lib/types";
import { normalizeScannedCode } from "@/lib/tracking/normalize-scan";

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
  /**
   * Habilita el escaneo mixto FedEx + DHL (normaliza JJD->JD, conserva el
   * dhlUniqueId completo, limpia símbolos). Por defecto (false) mantiene el
   * comportamiento histórico para no afectar a los padres existentes
   * (desembarque, etc.).
   */
  multiCarrier?: boolean;
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
    onHasDueTomorrow,
    multiCarrier = false
  },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const packagesListRef = useRef<HTMLUListElement>(null);
  const wasPastedRef = useRef(false);
  const shownTomorrowRef = useRef<Set<string>>(new Set());

  const [currentScan, setCurrentScan] = useState("");
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout>();

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

  /* ===================== Función para Copiar ===================== */

  const copyAllTrackingNumbers = useCallback(async () => {
    if (packages.length === 0) return;
    
    const trackingNumbers = packages
      .map(p => p.trackingNumber)
      .join("\n");
    
    try {
      await navigator.clipboard.writeText(trackingNumbers);
      setCopied(true);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error al copiar:", err);
      const textArea = document.createElement("textarea");
      textArea.value = trackingNumbers;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
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
          // Generamos variante JJD vs JD del paquete local
          const localCode = String(pkg.trackingNumber).trim().toUpperCase();
          let alternateLocalCode = localCode;
          if (localCode.startsWith("JJD")) {
            alternateLocalCode = localCode.substring(1);
          } else if (localCode.startsWith("JD")) {
            alternateLocalCode = "J" + localCode;
          }

          // Buscamos coincidencia tanto en trackingNumber como en dhlUniqueId
          const validated = validatedPackages.find(v => {
            const vTracking = String(v.trackingNumber || "").trim().toUpperCase();
            const vUniqueId = String((v as any).dhlUniqueId || "").trim().toUpperCase();

            return (
              vTracking === localCode || vTracking === alternateLocalCode ||
              (vUniqueId && (vUniqueId === localCode || vUniqueId === alternateLocalCode))
            );
          });

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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  /* ===================== Input ===================== */

  const processTrackingLines = useCallback((text: string) => {
    const lines = text
      .split("\n")
      .map(l => {
        if (multiCarrier) {
          // FedEx recorta a 12, DHL conserva completo (JJD->JD), limpia símbolos.
          return normalizeScannedCode(l)?.code ?? null;
        }
        // Comportamiento histórico (no tocar para padres existentes).
        const clean = l.trim().toUpperCase();
        if (!clean) return null;
        if (clean.length >= 20 && /^\d+$/.test(clean)) {
          return clean.slice(-12);
        }
        return clean;
      })
      .filter(Boolean) as string[];

    if (!lines.length) return;

    setPackages(prev => {
      // =========================================================================
      // BLOQUE DE PROTECCIÓN ANTI-DUPLICADOS (Búsqueda en Tracking y UniqueID)
      // =========================================================================
      const existingSet = new Set<string>();

      prev.forEach(p => {
        const keys = [];
        // Extraemos tracking principal
        if (p.trackingNumber) keys.push(String(p.trackingNumber).trim().toUpperCase());
        // Extraemos el sub-id de piezas (JJD/JD) devuelto por el backend
        if ((p as any).dhlUniqueId) keys.push(String((p as any).dhlUniqueId).trim().toUpperCase());

        // Metemos al Set el código base Y su variante para cubrir cualquier intento futuro
        keys.forEach(k => {
          existingSet.add(k);
          if (k.startsWith("JJD")) existingSet.add(k.substring(1));
          else if (k.startsWith("JD")) existingSet.add("J" + k);
        });
      });

      const toAdd: PackageInfo[] = [];

      lines.forEach(line => {
        let alternateLine = line;
        if (line.startsWith("JJD")) {
          alternateLine = line.substring(1);
        } else if (line.startsWith("JD")) {
          alternateLine = "J" + line;
        }

        // Solo agregamos si el Set no conoce ni el original ni su variante
        if (!existingSet.has(line) && !existingSet.has(alternateLine)) {
          // Actualizamos el Set de inmediato por si pegaron varios repetidos de un solo golpe
          existingSet.add(line);
          existingSet.add(alternateLine);
          
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
  }, [multiCarrier]);

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
      <div className="flex justify-between items-center">
        <Label className="flex items-center gap-2 text-base font-medium">
          <BarcodeIcon className="h-4 w-4" />
          {label}
        </Label>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Guías: <strong>{packages.length}</strong>
          </span>
          
          {packages.length > 0 && (
            <button
              onClick={copyAllTrackingNumbers}
              disabled={disabled}
              className={classNames(
                "flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                copied
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
              )}
              title={copied ? "¡Copiado!" : "Copiar todas las guías al portapapeles"}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{packages.length}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

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
                key={(pkg as any).dhlUniqueId ?? pkg.trackingNumber}
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
                        title="Eliminar guía"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

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
                    {isDueToday(pkg.commitDateTime) && (
                      <span className="ml-1 font-semibold">(Vence hoy)</span>
                    )}
                    {isDueTomorrow(pkg.commitDateTime) && (
                      <span className="ml-1 font-semibold">(Vence mañana)</span>
                    )}
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