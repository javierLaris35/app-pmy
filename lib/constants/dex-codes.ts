export const DEX_CODE_MAPPINGS = {
  // Status to DEX code mappings
  STATUS_TO_DEX: {
    "03": "DEX03",
    "07": "DEX07",
    "08": "DEX08",
    "12": "DEX12",
    "GF": "GUIA FRAUDE",
    DEX03: "DEX03",
    DEX07: "DEX07",
    DEX08: "DEX08",  
    NO_ENTREGADO: "DEX03",
    RECHAZADO: "DEX07",
    PENDIENTE: "DEX08",
    ENTREGADO: "",
    "DATOS INCORRECTOS": "DEX03",
    "RECHAZO DE PAQUETES": "DEX07",
    "DOMICILIO CERRADO": "DEX08",
    "VISITA FALLIDA": "DEX08",
  },

  // DEX code descriptions
  DEX_DESCRIPTIONS: {
    DEX03: "DATOS INCORRECTOS / DOM NO EXISTE",
    DEX07: "RECHAZO DE PAQUETES POR EL CLIENTE",
    DEX08: "VISITA / DOMICILIO CERRADO",
  },
} as const

export type DexCode = keyof typeof DEX_CODE_MAPPINGS.DEX_DESCRIPTIONS