import { axiosConfig } from "../axios-config";

const getConsolidated = async (url: string) => {        
        const response = await axiosConfig.get(url);
        return response.data;
}

const getFedexStatus = async () => {
    console.log("♻ Revisando estatus de fedex!")
    const response = await axiosConfig.get('/consolidated/update-fedex-status');
    return response.data;
}

export {
    getConsolidated,
    getFedexStatus
}