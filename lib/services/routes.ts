import { axiosConfig } from "../axios-config";
import { Route } from "../types";

const url = 'routes';

const getRoutes = async () => {
    const response = await axiosConfig.get<Route[]>(url);
    return response.data;
}

const getRoutesById = async (id: string) => {
    const response = await axiosConfig.get<Route>(`${url}/${id}`);
    return response.data;
}

const getRoutesBySucursalId = async (sucursalId: string) => {
    const response = await axiosConfig.get<Route[]>(`${url}/subsidiary/${sucursalId}`);
    return response.data;
}

const saveRoute = async (route: Route) => {
    const response = await axiosConfig.post<Route>(url, route);
    return response.data;
}

const updateRoute = async (id: string, route: Partial<Route>) => {
    const response = await axiosConfig.patch<Route>(`${url}/${id}`, route);
    return response.data;
}

const deleteRoute = async (id: string) => {
    const response = await axiosConfig.delete(`${url}/${id}`);
    return response.data;
}

export {
    getRoutes,
    getRoutesById,
    getRoutesBySucursalId,
    saveRoute,
    updateRoute,
    deleteRoute
}