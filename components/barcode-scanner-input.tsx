import { useState, useCallback, useRef } from "react";
import classNames from "classnames";

interface BarcodeScannerInputProps {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onTrackingNumbersChange?: (trackingNumbers: string[]) => void;
}

const VALIDATION_REGEX = /^\d{12}$/;

export function BarcodeScannerInput({
  id = "trackingNumbers",
  placeholder = "Escanea o pega los códigos de seguimiento aquí...",
  disabled = false,
  hasErrors = false,
  onTrackingNumbersChange,
}: BarcodeScannerInputProps) {
  const [textareaValue, setTextareaValue] = useState("");
  const trackingNumbersRef = useRef<string[]>([]);
  const lastKeyPressTime = useRef<number>(0);
  const isScanning = useRef<boolean>(false);

  const processTrackingNumbers = useCallback((value: string, isPaste: boolean) => {
    // Split input by newlines, spaces, tabs, or commas
    const lines = value
      .split(/[\n\s,]+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const newTrackingNumbers: string[] = [];
    const processedLines: string[] = [];

    lines.forEach((line) => {
      // For scanned input, always take last 12 digits; for pasted input, validate as-is or trim
      const code = isPaste && VALIDATION_REGEX.test(line) ? line : line.slice(-12);
      if (VALIDATION_REGEX.test(code) && !trackingNumbersRef.current.includes(code)) {
        newTrackingNumbers.push(code);
        processedLines.push(code);
      } else {
        processedLines.push(line); // Keep invalid or duplicate lines as-is
      }
    });

    if (newTrackingNumbers.length > 0) {
      trackingNumbersRef.current = [...trackingNumbersRef.current, ...newTrackingNumbers];
      if (typeof onTrackingNumbersChange === "function") {
        onTrackingNumbersChange(trackingNumbersRef.current);
      }
    }

    return processedLines.join("\n");
  }, [onTrackingNumbersChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setTextareaValue(newValue);

    // Detect paste events (multi-line or multi-token input)
    if (newValue.includes("\n") || newValue.split(/[\s,]+/).length > 1) {
      isScanning.current = false;
      const processedValue = processTrackingNumbers(newValue, true);
      setTextareaValue(processedValue);
    } else {
      // Mark as potential scan input
      isScanning.current = true;
    }
  }, [processTrackingNumbers]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const currentTime = Date.now();
      // Prevent rapid keypresses (e.g., scanner sending multiple Enter events)
      if (currentTime - lastKeyPressTime.current < 100) {
        return;
      }
      lastKeyPressTime.current = currentTime;

      if (isScanning.current) {
        setTextareaValue((prev) => {
          const lines = prev.split("\n").map((line) => line.trim()).filter(Boolean);
          const lastLine = lines[lines.length - 1] || "";
          const newCode = lastLine.slice(-12);
          if (newCode && VALIDATION_REGEX.test(newCode) && !trackingNumbersRef.current.includes(newCode)) {
            trackingNumbersRef.current = [...trackingNumbersRef.current, newCode];
            if (typeof onTrackingNumbersChange === "function") {
              onTrackingNumbersChange(trackingNumbersRef.current);
            }
            return [...lines.slice(0, -1), newCode, ""].join("\n");
          }
          return [...lines, ""].join("\n");
        });
      }
    }
  }, [onTrackingNumbersChange]);

  const handleClear = useCallback(() => {
    setTextareaValue("");
    trackingNumbersRef.current = [];
    if (typeof onTrackingNumbersChange === "function") {
      onTrackingNumbersChange([]);
    }
  }, [onTrackingNumbersChange]);

  return (
    <div className="relative">
      <textarea
        id={id}
        value={textareaValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
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