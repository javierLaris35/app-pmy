import { axiosConfig } from "@/lib/axios-config";
import { ListParams, Paginated } from "@/lib/services/pagination";

const url = "pick-up";

/** Tipo de registro en bodega. */
export type PickUpType = "ocurre" | "entrega_bodega";

export interface PickUpItem {
  trackingNumber: string;
  type: PickUpType;
  shipmentId?: string | null;
  chargeShipmentId?: string | null;
}

export interface SavePickUpPayload {
  subsidiaryId: string;
  items: PickUpItem[];
}

export interface PickUpHistoryRow {
  id: string;
  trackingNumber: string;
  date: string;
  isCharge: boolean;
  type: PickUpType | null;
  status: string | null;
  recipientName: string | null;
  recipientCity: string | null;
  recipientZip: string | null;
  shipmentType: string | null;
}

const getTrackingNumberInfo = async (trackingNumber: string) => {
  const response = await axiosConfig.get(`${url}/tracking-info/${trackingNumber}`);
  return response.data;
};

const savePackageReception = async (payload: SavePickUpPayload) => {
  const response = await axiosConfig.post(`${url}/save`, payload);
  return response.data;
};

const getPickUpHistory = async (subsidiaryId: string, params: ListParams = {}) => {
  const response = await axiosConfig.get<Paginated<PickUpHistoryRow>>(`${url}/subsidiary/${subsidiaryId}`, { params });
  return response.data;
};

export { getTrackingNumberInfo, savePackageReception, getPickUpHistory };
