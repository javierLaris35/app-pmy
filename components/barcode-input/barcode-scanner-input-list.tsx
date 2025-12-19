import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
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

const BarcodeScannerInputComponent = forwardRef<BarcodeScannerInputHandle, BarcodeScannerInputProps>(
    function BarcodeScannerInput({
      id = "trackingNumbers",
      placeholder = "Escanea o pega los códigos de seguimiento aquí...",
      label = "Números de Seguimiento",
      disabled = false,
      hasErrors = false,
      onPackagesChange,
      onTrackingNumbersChange,
      onHasDueTomorrow,
    }: BarcodeScannerInputProps, ref) {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const packagesListRef = useRef<HTMLUListElement>(null);
      const wasPastedRef = useRef(false);
      const [currentScan, setCurrentScan] = useState("");
      const [packages, setPackages] = useState<PackageInfo[]>([]);

      // Scroll automático al final de la lista
      useEffect(() => {
        if (packagesListRef.current) {
          packagesListRef.current.scrollTop = packagesListRef.current.scrollHeight;
        }
      }, [packages]);

      // Exponer métodos al componente padre a través del ref
      useImperativeHandle(ref, () => ({
        focus: () => {
          if (textareaRef.current && !disabled) {
            textareaRef.current.focus();
          }
        },
        getInputElement: () => {
          return textareaRef.current;
        },
        clear: () => {
          setCurrentScan("");
          setPackages([]);
          if (onTrackingNumbersChange) onTrackingNumbersChange("");
        },
        updateValidatedPackages: (validatedPackages: PackageInfo[]) => {
          setPackages(prev => prev.map(pkg => {
            const validatedInfo = validatedPackages.find(v => v.trackingNumber === pkg.trackingNumber);
            if (validatedInfo) {
              return { ...validatedInfo, isPendingValidation: false };
            }
            return pkg;
          }));
        }
      }), [disabled, onTrackingNumbersChange]);

      useEffect(() => {
        if (onPackagesChange) {
          onPackagesChange(packages);
        }
      }, [packages, onPackagesChange]);

      useEffect(() => {
        // Emitir los tracking numbers como string
        const trackingNumbers = packages.map(p => p.trackingNumber).join("\n");
        if (onTrackingNumbersChange) {
          onTrackingNumbersChange(trackingNumbers);
        }
      }, [packages, onTrackingNumbersChange]);

      // Función para procesar líneas de texto (común para paste y keydown)
      const processTrackingLines = useCallback((text: string, source: 'paste' | 'scan') => {
        const lines = text.split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map(line => line.slice(-12)); // Extraer últimos 12 dígitos

        if (lines.length === 0) return;

        setPackages(prev => {
          const newPackages: PackageInfo[] = [];
          const existingTrackings = prev.map(p => p.trackingNumber);

          lines.forEach(line => {
            // Verificar si ya existe este tracking number
            const alreadyExists = existingTrackings.includes(line);
            
            if (!alreadyExists) {
              newPackages.push({
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                trackingNumber: line,
                isValid: false,
                isPendingValidation: true
              });
            }
          });

          return newPackages.length > 0 ? [...prev, ...newPackages] : prev;
        });

        // Limpiar el área de entrada después de procesar
        if (source === 'paste') {
          setCurrentScan("");
        }
      }, []);

      const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto
        wasPastedRef.current = true;
        
        const pastedText = e.clipboardData.getData('text');
        processTrackingLines(pastedText, 'paste');
      }, [processTrackingLines]);

      // Función para verificar si un paquete vence hoy
      const isDueToday = (commitDateTime?: string | null): boolean => {
        if (!commitDateTime) return false;
        
        try {
          const commitDate = new Date(commitDateTime);
          const today = new Date();
          
          // Comparar solo día, mes y año (ignorar hora)
          return commitDate.toDateString() === today.toDateString();
        } catch (error) {
          console.error("Error parsing date:", error);
          return false;
        }
      };

      // Función para verificar si un paquete vence mañana
      const isDueTomorrow = (commitDateTime?: string | null): boolean => {
        if (!commitDateTime) return false;
        try {
          const commitDate = new Date(commitDateTime);
          const today = new Date();
          const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
          return commitDate.toDateString() === tomorrow.toDateString();
        } catch (error) {
          console.error("Error parsing date for tomorrow check:", error);
          return false;
        }
      };

      // Formatear fecha para mostrar
      const formatDate = (dateString?: string | null): string => {
        if (!dateString) return "";
        
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (error) {
          console.error("Error formatting date:", error);
          return dateString;
        }
      };

      // Sonido breve para paquetes que vencen mañana (tono naranja)
      const playTomorrowSound = () => {
        if (typeof window === "undefined") return;
        try {
          const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) return;
          const audioContext = new AudioCtx();
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(audioContext.destination);
          const now = audioContext.currentTime;
          osc.frequency.setValueAtTime(720, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.setValueAtTime(0, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.14);
        } catch (err) {
          console.warn("playTomorrowSound error:", err);
        }
      };

      const shownTomorrowRef = useRef<Set<string>>(new Set());

      // Efecto para detectar paquetes que ahora vencen mañana y reproducir un tono una sola vez
      useEffect(() => {
        try {
          const dueTomorrowNow = packages.filter(p => !p.isPendingValidation && isDueTomorrow(p.commitDateTime));

          // Si hay paquetes que vencen mañana y antes no estaban marcados, reproducir sonido una vez por paquete
          const newlyDueTomorrow = dueTomorrowNow.filter(p => !shownTomorrowRef.current.has(p.trackingNumber));
          if (newlyDueTomorrow.length > 0) {
            newlyDueTomorrow.forEach(p => shownTomorrowRef.current.add(p.trackingNumber));
            playTomorrowSound();
          }

          // Informar al padre si actualmente hay paquetes que vencen mañana
          if (typeof (arguments[0] as any) !== 'undefined') {
            // noop to satisfy TS if needed
          }

          if (typeof (onHasDueTomorrow) !== 'undefined') {
            onHasDueTomorrow(dueTomorrowNow.length > 0);
          }
        } catch (err) {
          console.error("Error detecting tomorrow expirations:", err);
        }
      }, [packages, onHasDueTomorrow]);

      const handleKeyDown = useCallback(
          (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();

              // Si fue pegado, ya lo procesamos en handlePaste
              if (wasPastedRef.current) {
                wasPastedRef.current = false;
                return;
              }

              // Procesar el texto actual
              processTrackingLines(currentScan, 'scan');
              setCurrentScan(""); // Limpiar después de procesar
            }
          },
          [currentScan, processTrackingLines]
      );

      const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentScan(e.target.value);
      }, []);

      const removePackage = (indexToRemove: number) => {
        setPackages(prev => prev.filter((_, index) => index !== indexToRemove));
      };

      return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row justify-between items-center">
              <Label className="text-base font-medium flex items-center gap-2">
                <Scan className="h-4 w-4" />
                {label}
              </Label>
              <Label htmlFor={id}>Guías Agregadas: {packages.length}</Label>
            </div>
            
            <div className={classNames(
                "border rounded-md overflow-hidden flex flex-col",
                {
                  "border-red-500": hasErrors,
                  "bg-gray-100 cursor-not-allowed": disabled,
                }
            )}>
              {/* Área de visualización de códigos (parte superior) */}
              <div className="flex-1 overflow-hidden">
                <ul 
                  ref={packagesListRef}
                  className="overflow-y-auto max-h-60 p-2 bg-white space-y-1"
                >
                  {packages.length > 0 ? (
                    packages.map((pkg, index) => {
                      const dueToday = isDueToday(pkg.commitDateTime);
                      const isValidated = !pkg.isPendingValidation;
                      const hasCommitDate = !!pkg.commitDateTime;
                      
                      return (
                        <li 
                          key={`${pkg.id}-${index}`} 
                          className={classNames(
                            "flex flex-col p-2 rounded transition-all duration-200",
                            {
                              "bg-red-50 text-red-800 border border-red-200": dueToday && isValidated,
                              "bg-amber-50 text-amber-800 border border-amber-200": isDueTomorrow(pkg.commitDateTime) && isValidated,
                              "bg-amber-50 text-amber-800 border border-amber-200": pkg.isPendingValidation,
                              "bg-white hover:bg-gray-50 border border-gray-200": !dueToday && !isDueTomorrow(pkg.commitDateTime) && isValidated,
                            }
                          )}
                        >
                          <div className="flex justify-between items-start w-full">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-mono text-sm font-medium">{pkg.trackingNumber}</span>
                              {dueToday && isValidated && (
                                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              {isDueTomorrow(pkg.commitDateTime) && isValidated && (
                                <Calendar className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              )}
                              {pkg.isPendingValidation && (
                                <span className="text-xs italic">Validando...</span>
                              )}
                            </div>
                            {!disabled && (
                              <button 
                                type="button"
                                onClick={() => removePackage(index)}
                                className={classNames(
                                  "transition-colors flex-shrink-0 ml-2",
                                  {
                                          "text-red-600 hover:text-red-800": dueToday && isValidated,
                                          "text-amber-600 hover:text-amber-800": pkg.isPendingValidation || (isDueTomorrow(pkg.commitDateTime) && isValidated),
                                          "text-gray-400 hover:text-red-500": !dueToday && !isDueTomorrow(pkg.commitDateTime) && isValidated
                                        }
                                )}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          
                          {/* Mostrar fecha de compromiso si existe */}
                          {hasCommitDate && isValidated && (
                            <div className={classNames(
                              "flex items-center gap-1 mt-1 text-xs",
                              {
                                "text-red-700 font-medium": dueToday,
                                "text-amber-700 font-medium": isDueTomorrow(pkg.commitDateTime),
                                "text-gray-500": !dueToday && !isDueTomorrow(pkg.commitDateTime)
                              }
                            )}>
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>{formatDate(pkg.commitDateTime)}</span>
                              {dueToday && (
                                <span className="ml-1 font-semibold">(Vence hoy)</span>
                              )}
                              {isDueTomorrow(pkg.commitDateTime) && (
                                <span className="ml-1 font-semibold">(Vence mañana)</span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })
                  ) : (
                    <li className="flex items-center justify-center h-16 text-gray-400 text-sm">
                      No se han escaneado códigos aún
                    </li>
                  )}
                </ul>
              </div>
              
              {/* Separador */}
              <div className="border-t"></div>
              
              {/* Área de entrada (parte inferior) */}
              <div className="p-2 bg-gray-50">
                <textarea
                    ref={textareaRef}
                    id={id}
                    value={currentScan}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={classNames(
                        "w-full p-2 border rounded resize-none bg-white",
                        {
                          "border-red-500": hasErrors,
                          "bg-gray-100 cursor-not-allowed": disabled,
                        }
                    )}
                    rows={2}
                />
              </div>
            </div>
          </div>
      );
    }
);

export { BarcodeScannerInputComponent as BarcodeScannerInput };