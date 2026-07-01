import { axiosConfig } from "../axios-config"

const url = '/auth/token';

const login = async (email: string, password: string) => {
    const response = await axiosConfig.post(url, {email, password});
    return response.data;
}

/** Solicita un OTP al correo registrado. Devuelve { message, email (enmascarado) }. */
const requestPasswordOtp = async (email: string) => {
    const response = await axiosConfig.post('/auth/forgot-password', { email });
    return response.data as { message: string; email: string };
}

/** Verifica el OTP y restablece la contraseña. */
const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string) => {
    const response = await axiosConfig.post('/auth/reset-password-otp', { email, otp, newPassword });
    return response.data as { message: string };
}

export {
    login,
    requestPasswordOtp,
    resetPasswordWithOtp,
}