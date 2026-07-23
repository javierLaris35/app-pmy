import { axiosConfig } from "../axios-config"
import { User } from "@/lib/types"

/**
 * Obtiene el perfil "pesado" del usuario autenticado (permisos, sucursales
 * adicionales, etc.). Reemplaza al payload gigante del JWT: el token ya solo
 * valida la sesión. El interceptor de axios adjunta el Bearer token, así que
 * el token debe estar ya guardado en el store antes de llamar aquí.
 */
export const getProfile = async (): Promise<User> => {
    const response = await axiosConfig.get("/auth/profile")
    return response.data as User
}
