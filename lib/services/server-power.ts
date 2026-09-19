import { axiosConfig } from "../axios-config";

/** Estado + config de la programación de energía del servidor (solo superadmin). */
export interface PowerSchedule {
  enabled: boolean;
  /** HH:MM en hora local del servidor. */
  suspendTime: string;
  /** HH:MM en hora local del servidor. */
  wakeTime: string;
  /** Días en que se suspende (ISO: 1=Lun … 7=Dom). */
  days: number[];
  recipients: string[];
  status: {
    nextSuspend: string | null;
    nextWake: string | null;
    timerActive: boolean;
    lastAppliedAt: string | null;
    lastApplyError: string | null;
  };
}

export interface UpdatePowerSchedulePayload {
  enabled: boolean;
  suspendTime: string;
  wakeTime: string;
  days: number[];
  recipients: string[];
}

/** Lee el horario actual y el estado (próximo apagado/encendido, timer, errores). */
export const getPowerSchedule = async (): Promise<PowerSchedule> => {
  const { data } = await axiosConfig.get<PowerSchedule>("/server/power/schedule");
  return data;
};

/** Guarda el horario y lo aplica al servidor. Devuelve el estado ya aplicado. */
export const updatePowerSchedule = async (
  payload: UpdatePowerSchedulePayload,
): Promise<PowerSchedule> => {
  const { data } = await axiosConfig.put<PowerSchedule>("/server/power/schedule", payload);
  return data;
};

/** Suspende el servidor de inmediato (arma el despertador y lo duerme). */
export const suspendServerNow = async (): Promise<{ message: string }> => {
  const { data } = await axiosConfig.post<{ message: string }>("/server/power/suspend-now");
  return data;
};

/** Envía un correo de prueba a los destinatarios configurados. */
export const sendPowerTestEmail = async (): Promise<{ ok: boolean }> => {
  const { data } = await axiosConfig.post<{ ok: boolean }>("/server/power/test-email");
  return data;
};
