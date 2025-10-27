import {UserRoleEnum} from "@/lib/types";

export const allowedPageRoles = {
    administracion: {
        vehiculos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        rutas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        choferes: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        sucursales: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    dashboard: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.AUXILIAR, UserRoleEnum.USER, UserRoleEnum.BODEGA],
    reportes: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER],
    operaciones: {
        cargas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        consolidados: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        desembarques: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        devoluciones: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        envios: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        inventarios: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
        monitoreo: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.AUXILIAR, UserRoleEnum.BODEGA],
        salidasARutas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.USER, UserRoleEnum.BODEGA],
    },
    finanzas: {
        gastos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.AUXILIAR],
        ingresos: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN, UserRoleEnum.AUXILIAR],
        nominas: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    mttoVehiculos: {
        programacion: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
        historial: [UserRoleEnum.ADMIN, UserRoleEnum.SUPERADMIN],
    },
    configuracion: [UserRoleEnum.SUPERADMIN],
};