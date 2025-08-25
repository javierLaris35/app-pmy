import { useState, useCallback, useRef, useEffect } from "react";
import classNames from "classnames";
import { Label } from "./ui/label";
import { Scan } from "lucide-react";

interface BarcodeScannerInputProps {
  id?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onTrackingNumbersChange?: (trackingNumbers: string) => void;
}


export function BarcodeScannerInput({
  id = "trackingNumbers",
  placeholder = "Escanea o pega los códigos de seguimiento aquí...",
  label= "Números de Seguimiento",
  disabled = false,
  hasErrors = false,
  onTrackingNumbersChange,
}: BarcodeScannerInputProps) {
  const wasPastedRef = useRef(false);
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("")
  const [currentScan, setCurrentScan] = useState("")

  useEffect(() => {
    if (onTrackingNumbersChange) {
      onTrackingNumbersChange(trackingNumbersRaw);
    }
  }, [trackingNumbersRaw, onTrackingNumbersChange]);

  const handlePaste = useCallback(() => {
    wasPastedRef.current = true;
  }, []);
  
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
  
        // Si fue pegado, permitimos procesar normalmente
        if (wasPastedRef.current) {
          wasPastedRef.current = false; // resetea el flag
  
          const pastedLines = currentScan.split("\n").map((line) => line.trim()).filter(Boolean);
  
          const codes = new Set(trackingNumbersRaw.split("\n").filter(Boolean));
          pastedLines.forEach(line => {
            const code = line.slice(-12); // solo lo último si es necesario
            if (code) codes.add(code);
          });
  
          setTrackingNumbersRaw(Array.from(codes).join("\n"));
          return;
        }
  
        // Procesamiento normal para escaneo (ej. pistola)
        const lines = currentScan.split("\n").map((line) => line.trim()).filter(Boolean);
        const lastLine = lines[lines.length - 1] || "";
        const newCode = lastLine.slice(-12);
  
        if (newCode) {
          const existingCodes = new Set(trackingNumbersRaw.split("\n").filter(Boolean));
          existingCodes.add(newCode);
          setTrackingNumbersRaw(Array.from(existingCodes).join("\n"));
  
          setCurrentScan((prev) => {
            const prevLines = prev.split("\n").slice(0, -1);
            return [...prevLines, newCode, ""].join("\n");
          });
        }
      }
    },
    [currentScan, trackingNumbersRaw]
  );
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentScan(e.target.value);
  }, []);

  return (
    <>
      <div className="flex flex-row justify-between">
        <Label className="text-base font-medium flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Escaneo de Paquetes
        </Label>
        <Label htmlFor="trackingNumbers">Guías Agregadas: {trackingNumbersRaw.split('\n').length}</Label>
      </div>
      <div className="relative">
        <textarea
          id={id}
          value={currentScan}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
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