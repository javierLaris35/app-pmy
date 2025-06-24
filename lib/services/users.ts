import { UserFormData } from "@/components/modals/user-dialog-modal";
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

const register = async (user: UserFormData) => {
    const response = await axiosConfig.post(`${url}/register`, user);
    return response.data;
}

const updateUser = async (user: UserFormData) => {
    const response = await axiosConfig.patch(`${url}/${user.id}`, user)
    return response.data;
}

const deleteUser = async (id: string) => {
    const response = await axiosConfig.delete(`${url}/${id}`);
    return response.data;
}


export {
    getUsers,
    getUserById,
    register,
    updateUser,
    deleteUser,
}