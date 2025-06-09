import { axiosConfig } from "../axios-config"
import { User } from "../types"

const url = '/users';

const getUsers = async() => {
    const response = await axiosConfig.get<User[]>(url);
    return response.data;
}

const getUserById  = async (id: string) => {
    const response = await axiosConfig.get(`${url}/${id}`); 
    return response.data;
}

const register = async (user: User) => {
    const response = await axiosConfig.post(url, user);
    return response.data;
}

const update = async () => {
    const response = await axiosConfig.put(url, {});
    return response.data;
}


export {
    getUsers,
    getUserById,
    register,
    update
}