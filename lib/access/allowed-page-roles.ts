import {UserRoleEnum} from "@/lib/types";

export const allowedPageRoles = {
    administracion: {
        vehiculos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.SUBADMIN],
        rutas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.SUBADMIN],
        choferes: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.SUBADMIN],
        sucursales: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.SUBADMIN],
    },
    dashboard: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.AUXILIAR, UserRoleEnum.USER, UserRoleEnum.BODEGA],
    reportes: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
    operaciones: {
        cargas: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        consolidados: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        desembarques: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        devoluciones: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        envios: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        inventarios: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        monitoreo: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.AUXILIAR, UserRoleEnum.BODEGA],
        salidasARutas: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
    },
    finanzas: {
        gastos: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.AUXILIAR],
        ingresos: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.AUXILIAR],
        nominas: [UserRoleEnum.ADMIN, UserRoleEnum.SUBADMIN, UserRoleEnum.SUPERADMIN],
    },
    mttoVehiculos: {
        programacion: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        historial: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    configuracion: [UserRoleEnum.SUPERADMIN],
};