import { useState, useCallback, useRef, useEffect } from "react";
import classNames from "classnames";

interface BarcodeScannerInputProps {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onTrackingNumbersChange?: (trackingNumbers: string) => void;
}


export function BarcodeScannerInput({
  id = "trackingNumbers",
  placeholder = "Escanea o pega los códigos de seguimiento aquí...",
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
    <div className="relative">
      <textarea
        id={id}
        value={currentScan}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={6}
        disabled={disabled}
        className={classNames(
          "resize-none overflow-y-auto max-h-60 w-full p-2 border rounded-md",
          {
            "border-red-500": hasErrors,
            "bg-gray-100 cursor-not-allowed": disabled,
          }
        )}
      />
    </div>
  );
}