export const filters = [
    {
        columnId: "status",
        title: "Estado",
        options: [
            { label: "Recolección", value: "recoleccion" },
            { label: "Pendiente", value: "pendiente" },
            { label: "En Ruta", value: "en_ruta" },
            { label: "Entregado", value: "entregado" },
            { label: "No Entregado", value: "no_entregado" },
        ],
    },
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