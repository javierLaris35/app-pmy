"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import classNames from "classnames";
import { AlertCircle, Trash2 } from "lucide-react";
import { saveDevolutions, validateDevolution } from "@/lib/services/devolutions";
import { SelectStatus } from "../devoluciones/select-status";
import { DevolutionCard } from "../devoluciones/devolution-card";
import { SHIPMENT_STATUS_MAP, DEVOLUTION_REASON_MAP } from "@/lib/constants";

export type LastStatus = {
  type: string;
  exceptionCode: string | null;
};

export type Devolution = {
  id: string;
  trackingNumber: string;
  subsidiaryName: string;
  hasIncome: boolean;
  status: string;
  lastStatus: LastStatus | null;
  reason: string;
};

type Props = {
  selectedSubsidiaryId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

const VALIDATION_REGEX = /^\d{12}$/;

const DevolutionForm: React.FC<Props> = ({
  selectedSubsidiaryId,
  onClose,
  onSuccess,
}) => {
  const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devolutions, setDevolutions] = useState<Devolution[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const preventKeyZoom = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["+", "-", "=", "0"].includes(e.key)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventZoom, { passive: false });
    window.addEventListener("keydown", preventKeyZoom);
    return () => {
      window.removeEventListener("wheel", preventZoom);
      window.removeEventListener("keydown", preventKeyZoom);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTrackingNumbersRaw(e.target.value);
  };

  const checkTrackingInfo = async (trackingNumber: string): Promise<Devolution> => {
    try {
      const res = await validateDevolution(trackingNumber);
      // Priorizar exceptionCode si es válido, luego res.status, luego res.lastStatus?.type
      const status = res.lastStatus?.exceptionCode && SHIPMENT_STATUS_MAP[res.lastStatus.exceptionCode]
        ? res.lastStatus.exceptionCode
        : res.status || (res.lastStatus?.type ?? "");
      // Inicializar el motivo basado en exceptionCode si es válido
      const reason = res.lastStatus?.exceptionCode && DEVOLUTION_REASON_MAP[res.lastStatus.exceptionCode]
        ? DEVOLUTION_REASON_MAP[res.lastStatus.exceptionCode]
        : "";
      console.log('checkTrackingInfo - trackingNumber:', trackingNumber);
      console.log('checkTrackingInfo - response:', res);
      console.log('checkTrackingInfo - assigned status:', status);
      console.log('checkTrackingInfo - assigned reason:', reason);
      return {
        id: res.id,
        trackingNumber: res.trackingNumber,
        status,
        subsidiaryName: res.subsidiaryName,
        hasIncome: res.hasIncome,
        lastStatus: res.lastStatus || null,
        reason,
      };
    } catch (err) {
      console.error(`Error consultando info del tracking ${trackingNumber}`, err);
      return {
        id: "",
        trackingNumber,
        status: "",
        subsidiaryName: "",
        hasIncome: false,
        lastStatus: null,
        reason: "",
      };
    }
  };

  const handleValidate = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Error",
        description: "Selecciona una sucursal antes de validar.",
        variant: "destructive",
      });
      return;
    }

    const lines = trackingNumbersRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const uniqueLines = Array.from(new Set(lines));
    const validNumbers = uniqueLines.filter((tn) => VALIDATION_REGEX.test(tn));
    const invalids = uniqueLines.filter((tn) => !VALIDATION_REGEX.test(tn));

    if (validNumbers.length === 0) {
      toast({
        title: "Error",
        description: "No se ingresaron números válidos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    const results: Devolution[] = [];

    for (let i = 0; i < validNumbers.length; i++) {
      const tn = validNumbers[i];
      const info = await checkTrackingInfo(tn);
      results.push(info);
      setProgress(Math.round(((i + 1) / validNumbers.length) * 100));
    }

    const newDevolutions = results.filter(
      (r) => !devolutions.some((d) => d.trackingNumber === r.trackingNumber)
    );

    setDevolutions((prev) => [...prev, ...newDevolutions]);
    setInvalidNumbers(invalids);
    setHasValidated(true);
    setTrackingNumbersRaw("");
    setProgress(0);
    setIsLoading(false);

    toast({
      title: "Validación completada",
      description: `Se agregaron ${newDevolutions.length} devoluciones. Números inválidos: ${invalids.length}`,
    });
  };

  const handleRemove = useCallback((trackingNumber: string) => {
    setDevolutions((prev) =>
      prev.filter((d) => d.trackingNumber !== trackingNumber)
    );
  }, []);

  const handleChangeStatus = useCallback((index: number, newStatus: string) => {
    setDevolutions((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              status: newStatus,
              reason: "",
            }
          : item
      )
    );
  }, []);

  const handleReasonChange = useCallback((index: number, newReason: string) => {
    setDevolutions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, reason: newReason } : item))
    );
  }, []);

  const handleSave = async () => {
    if (!selectedSubsidiaryId) {
      toast({
        title: "Sucursal no seleccionada",
        description: "Por favor selecciona una sucursal antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    if (devolutions.length === 0) {
      toast({
        title: "Nada para guardar",
        description: "No hay devoluciones validadas para guardar.",
        variant: "destructive",
      });
      return;
    }

    const missingReason = devolutions.some(
      (d) =>
        d.status !== "NO_ENTREGADO" &&
        d.status !== "RECHAZADO" &&
        !(d.status === "PENDIENTE" && ["03", "07", "08"].includes(d.lastStatus?.exceptionCode ?? "")) &&
        !d.reason
    );
    if (missingReason) {
      toast({
        title: "Faltan motivos",
        description:
          "Por favor selecciona un motivo para todas las devoluciones que lo requieran.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const toSave = devolutions.map((d) => ({
        trackingNumber: d.trackingNumber,
        subsidiary: { id: selectedSubsidiaryId },
        status: d.status || undefined,
        reason: d.reason || undefined,
      }));
      await saveDevolutions(toSave);
      toast({
        title: "Devoluciones guardadas",
        description: `${devolutions.length} devoluciones fueron registradas exitosamente.`,
      });
      setDevolutions([]);
      setInvalidNumbers([]);
      setHasValidated(false);
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al enviar las devoluciones.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackingNumbers">Números de devolución</Label>
            <Textarea
              id="trackingNumbers"
              value={trackingNumbersRaw}
              onChange={handleChange}
              placeholder="Escanea los códigos aquí..."
              rows={6}
              disabled={isLoading}
              className={classNames("resize-none overflow-y-auto max-h-60", {
                "border-red-500": invalidNumbers.length > 0,
              })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleValidate}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Procesando..." : "Validar devoluciones"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasValidated || devolutions.length === 0}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Guardar devoluciones válidas
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2 mt-4">
              <Label>Progreso de validación</Label>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {invalidNumbers.length > 0 && (
            <div className="mt-4 text-red-600 font-semibold">
              <AlertCircle className="inline-block mr-2" /> Números inválidos (no se agregaron):
              <ul className="list-disc ml-6 mt-1">
                {invalidNumbers.map((tn) => (
                  <li key={tn}>{tn}</li>
                ))}
              </ul>
            </div>
          )}

          {devolutions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
              {devolutions.map((item, index) => (
                <DevolutionCard
                  key={`dev-card-${item.trackingNumber}-${index}`}
                  item={item}
                  index={index}
                  isLoading={isLoading}
                  handleChangeStatus={handleChangeStatus}
                  handleReasonChange={handleReasonChange}
                  handleRemove={handleRemove}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DevolutionForm;