import { ShipmentStatusType } from "@/lib/types";

export const filters = [
    /*{
        columnId: "status",
        title: "Estado",
        options: Object.values(ShipmentStatusType).map((status) => ({
        // Transformamos "en_ruta" a "EN_RUTA" para el texto visible (puedes ajustarlo a tu gusto)
        label: status.toUpperCase().replace(/_/g, ' '), 
        value: status
    })),
    },*/
    {
        columnId: "payment",
        title: "Estado de Pago",
        options: [
            { label: "Pagado", value: "paid" },
            { label: "Pendiente", value: "pending" },
            { label: "Fallido", value: "failed" },
        ],
    },
    {
        columnId: "shipmentType",
        title: "Empresa",
        options: [
            { label: "Fedex", value: "fedex" },
            { label: "DHL", value: "dhl" },
        ]
    }
]