import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import classNames from "classnames";
import { Label } from "./ui/label";
import { Scan } from "lucide-react";
import { normalizeScannedCode } from "@/lib/tracking/normalize-scan";

export interface BarcodeScannerInputHandle {
  focus: () => void;
  clear: () => void;
  getInputElement: () => HTMLTextAreaElement | null;
}

interface BarcodeScannerInputProps {
  id?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onTrackingNumbersChange?: (trackingNumbers: string) => void;
  /**
   * Habilita el escaneo mixto FedEx + DHL. Cuando es true, los códigos DHL
   * (JJD/JD o numéricos de longitud DHL) se conservan completos y solo los
   * FedEx se recortan a los últimos 12. Por defecto (false) mantiene el
   * comportamiento histórico: recorte ciego a los últimos 12 dígitos.
   */
  multiCarrier?: boolean;
}

/** Limpia y recorta un código a los últimos 12 (comportamiento clásico FedEx). */
const legacyTrim = (line: string): string =>
  line.replace(/[^A-Za-z0-9]/g, "").trim().slice(-12);

const BarcodeScannerInputComponent = forwardRef<BarcodeScannerInputHandle, BarcodeScannerInputProps>(
    function BarcodeScannerInput({
        id = "trackingNumbers",
        placeholder = "Escanea o pega los códigos de seguimiento aquí...",
        label = "Números de Seguimiento",
        disabled = false,
        hasErrors = false,
        onTrackingNumbersChange,
        multiCarrier = false,
      }: BarcodeScannerInputProps, ref) {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("");
      const [currentScan, setCurrentScan] = useState("");

      // Exponer métodos al componente padre a través del ref
      useImperativeHandle(ref, () => ({
        focus: () => {
          if (textareaRef.current && !disabled) {
            textareaRef.current.focus();
          }
        },
          getInputElement: () => {
              return textareaRef.current; // Asegúrate de que esto devuelva el elemento DOM real
          },
        clear: () => {
          setCurrentScan("");
          setTrackingNumbersRaw("");
        }
      }), [disabled]);

      useEffect(() => {
        if (onTrackingNumbersChange) {
          onTrackingNumbersChange(trackingNumbersRaw);
        }
      }, [trackingNumbersRaw, onTrackingNumbersChange]);

      const handleKeyDown = useCallback(
          (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();

              // Normalizamos TODAS las líneas (no solo la última) y deduplicamos.
              // Esto evita el doble JJD/JD: el lector entrega "JJD..." y la
              // normalización lo vuelve "JD...", así ambas colapsan al mismo
              // código. Funciona igual para escaneo, pegado o tecleo manual.
              const codes = new Set<string>(
                trackingNumbersRaw.split("\n").filter(Boolean),
              );

              currentScan
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .forEach((line) => {
                  // FedEx -> últimos 12; DHL -> completo (solo si multiCarrier).
                  const code = multiCarrier
                    ? normalizeScannedCode(line)?.code ?? ""
                    : legacyTrim(line);
                  if (code) codes.add(code);
                });

              const merged = Array.from(codes);
              setTrackingNumbersRaw(merged.join("\n"));
              // El textarea muestra los códigos ya normalizados + una línea
              // lista para el siguiente escaneo.
              setCurrentScan(merged.length ? merged.join("\n") + "\n" : "");
            }
          },
          [currentScan, trackingNumbersRaw, multiCarrier]
      );

      const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentScan(e.target.value);
      }, []);

      return (
          <>
            <div className="flex flex-row justify-between">
              <Label className="text-base font-medium flex items-center gap-2">
                <Scan className="h-4 w-4" />
                {label}
              </Label>
              <Label htmlFor="trackingNumbers">Guías Agregadas: {trackingNumbersRaw.split('\n').filter(Boolean).length}</Label>
            </div>
            <div className="relative">
          <textarea
              ref={textareaRef}
              id={id}
              value={currentScan}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={classNames(
                  "w-full p-2 border rounded-md resize-none h-auto min-h-[225px] max-h-[400px] overflow-y-auto",
                  {
                    "border-red-500": hasErrors,
                    "bg-gray-100 cursor-not-allowed": disabled,
                  }
              )}
          />
            </div>
          </>
      );
    }
);

export { BarcodeScannerInputComponent as BarcodeScannerInput };