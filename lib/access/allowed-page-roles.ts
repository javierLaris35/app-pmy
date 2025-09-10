import {UserRoleEnum} from "@/lib/types";

export const allowedPageRoles = {
    administracion: {
        vehiculos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        rutas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        choferes: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        sucursales: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    dashboard: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
    reportes: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
    operaciones: {
        cargas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        consolidados: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        desembarques: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        devoluciones: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        envios: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        inventarios: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        salidasARutas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
        monitoreo: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
    },
    finanzas: {
        gastos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        ingresos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        nominas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    mttoVehiculos: {
        programacion: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        historial: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    configuracion: [UserRoleEnum.SUPERADMIN],
};