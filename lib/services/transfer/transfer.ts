import { axiosConfig } from "@/lib/axios-config";
import { CreateTransferPayload, Transfer } from "@/lib/types";

const url = '/transfers';

const getTransfers = async (url: string) => {
    const response = await axiosConfig.get<Transfer[]>(url);
    return response.data;
}

const saveTransfer = async (transfer: CreateTransferPayload) => {
    const response = await axiosConfig.post<Transfer>(url, transfer);
    return response.data;
}

export {
    getTransfers,
    saveTransfer
}