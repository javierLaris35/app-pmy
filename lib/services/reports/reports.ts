import { axiosConfig } from "@/lib/axios-config";

const url = '/reports';

const getFinancialSummary = async (subsidiaryIds: string[], startDate: string, endDate: string) => {
  const params = new URLSearchParams();
  
  params.append('startDate', startDate);
  params.append('endDate', endDate);

  if (subsidiaryIds && subsidiaryIds.length > 0) {
    subsidiaryIds.forEach(id => {
      params.append('subsidiaryIds', id);
    });
  }

  // EL TRUCO ESTÁ AQUÍ: 'arraybuffer' es a prueba de balas contra interceptores.
  // Obliga a Axios a entregarte la memoria binaria intacta.
  const response = await axiosConfig.get(`${url}/income-statement`, {
    params: params,
    responseType: 'arraybuffer', 
  });

  // Retornamos la data cruda (que ahora será un ArrayBuffer puro)
  return response.data ?? response;
}

export {
  getFinancialSummary
}