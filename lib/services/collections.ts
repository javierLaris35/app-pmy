import { axiosConfig } from "../axios-config"
import { Collection } from "../types"

const url = '/collections'

const getCollections = async (subsidiaryId: string) => {
    const response = await axiosConfig.get<Collection[]>(`${url}/${subsidiaryId}`);
    return response.data;
}

const saveCollections = async (collections: Collection[]) => {
    const response = await axiosConfig.post<Collection[]>(url, collections);
    return response.data;
}

const validateCollection = async(trackingNumber: string) => {
    const response = await axiosConfig.get(`${url}/validate/${trackingNumber}`);
    return response.data;
}


export {
    getCollections,
    validateCollection,
    saveCollections
}