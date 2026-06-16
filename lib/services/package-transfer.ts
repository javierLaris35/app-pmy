import { axiosConfig } from "../axios-config";

export type PackageTransferSource = "inventory" | "package_dispatch";

export interface CreatePackageTransferPayload {
  trackingNumber: string;
  destinationId: string;
  shipmentId?: string | null;
  chargeShipmentId?: string | null;
  source?: PackageTransferSource;
  reason?: string;
}

/** Traspasa un paquete mal enrutado a la sucursal destino (solo subadmin/admin/superadmin). */
export const createPackageTransfer = async (payload: CreatePackageTransferPayload) => {
  const response = await axiosConfig.post("/package-transfers", payload);
  return response.data;
};
