import { axiosConfig } from "../axios-config"

const url = '/auth/token';

const login = async (email: string, password: string) => {
    const response = await axiosConfig.post(url, {email, password});
    return response.data;
}


export {
    login
}