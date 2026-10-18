import { axiosConfig } from "../axios-config";
import type { TaskStatus, TaskStep } from "../daily-tasks-view";

export interface TaskRow {
  refType: "consolidated" | "charge" | "subsidiary";
  refId: string;
  consNumber: string | null;
  step: TaskStep;
  status: TaskStatus;
  doneCount: number;
  totalCount: number;
  dueAt: string;
  doneAt: string | null;
  doneById: string | null;
  doneByName: string | null;
}

export interface DayConsolidated {
  refType: "consolidated" | "charge";
  refId: string;
  consNumber: string;
  carrier: string;
  type: string;
  guides: number;
  tasks: TaskRow[];
}

export interface DayTasks {
  day: string;
  isToday: boolean;
  subsidiary: TaskRow[];
  consolidated: DayConsolidated[];
  carriedOver: { day: string; consNumber: string; refType: string; refId: string; lateSteps: TaskStep[] }[];
  possibleLd: { trackingNumber: string; consNumber: string; bucket: string }[];
}

export interface WeekTasks {
  weekStart: string;
  days: { day: string; total: number; done: number; late: number; pct: number }[];
}

export interface PackageDetail {
  summary: {
    delivered: number;
    inRoute: number;
    dex: Record<string, number>;
    returned: number;
    inWarehouse: number;
    inInventory: number;
    possibleLd: number;
    missingUnloading: number;
  };
  guides: { trackingNumber: string; status: string; bucket: string; ld: string }[];
}

const base = "/daily-tasks";

export const getWeekTasks = async (subsidiaryId: string, weekStart: string): Promise<WeekTasks> =>
  (await axiosConfig.get(`${base}/week`, { params: { subsidiaryId, weekStart } })).data;
export const getDayTasks = async (subsidiaryId: string, day: string): Promise<DayTasks> =>
  (await axiosConfig.get(`${base}/day`, { params: { subsidiaryId, day } })).data;
export const getPackageDetail = async (refType: string, refId: string): Promise<PackageDetail> =>
  (await axiosConfig.get(`${base}/detail/${refType}/${refId}`)).data;
export const refreshDayTasks = async (subsidiaryId: string, day: string): Promise<DayTasks> =>
  (await axiosConfig.post(`${base}/refresh`, null, { params: { subsidiaryId, day } })).data;
