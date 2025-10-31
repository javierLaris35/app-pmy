import { axiosConfig } from "../axios-config";

const getConsolidated = async (url: string) => {        
        const response = await axiosConfig.get(url);
        return response.data;
}

const getFedexStatus = async (subsidiaryId?: string, fromDate?: string, toDate?: string) => {
  console.log("♻ Revisando estatus de fedex!", { subsidiaryId, fromDate, toDate });
  
  const params = new URLSearchParams();
  
  if (subsidiaryId) params.append('subsidiaryId', subsidiaryId);
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  
  const queryString = params.toString();
  const url = queryString 
    ? `/consolidated/update-fedex-status?${queryString}`
    : '/consolidated/update-fedex-status';

  const response = await axiosConfig.get(url);
  return response.data;
}

const getShipmentsByConsolidatedId = async (consolidatedId: string) => {
    const response = await axiosConfig.get(`/consolidated/shipments/${consolidatedId}`);
    return response.data;
}

export {
    getConsolidated,
    getFedexStatus,
    getShipmentsByConsolidatedId
}