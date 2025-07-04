import { axiosConfig } from "../axios-config";

const getConsolidated = async () => {
    const response = await axiosConfig.get('/consolidated');
    return response.data;
}

export {
    getConsolidated
}