/**
 * Catálogo de reglas de negocio extraídas de `processMasterFedexUpdate` (pmy-api,
 * shipments.service.ts) y `generateIncomes`. Sirve como referencia/checklist de
 * migración al motor nuevo (tracking-sync). NO ejecuta nada — es documentación viva.
 *
 * `engineStatus`:
 *  - migrada:  ya vive en el motor nuevo.
 *  - parcial:  cubierta en parte; falta afinar.
 *  - pendiente: aún solo en el legacy.
 */
export type RuleCategory = "estatus" | "od" | "financiera" | "infra";
export type EngineStatus = "migrada" | "parcial" | "pendiente";

export interface LegacyRule {
  id: number;
  name: string;
  category: RuleCategory;
  description: string;
  trigger: string;
  engineStatus: EngineStatus;
  engineNote?: string;
}

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  estatus: "Estatus / último evento",
  od: "Entrega por terceros (OD)",
  financiera: "Financieras (dinero)",
  infra: "Infraestructura / integridad",
};

export const ENGINE_STATUS_LABELS: Record<EngineStatus, string> = {
  migrada: "Migrada",
  parcial: "Parcial",
  pendiente: "Pendiente",
};

export const LEGACY_RULES: LegacyRule[] = [
  // --- Estatus / último evento ---
  {
    id: 1,
    name: "Selector de generación",
    category: "estatus",
    description: "Guías recicladas: elige el trackingNumberUniqueId de mayor secuencia (desempate por fecha del último scan).",
    trigger: "FedEx devuelve varios trackResults para una guía",
    engineStatus: "migrada",
    engineNote: "FedexTrackingSource.pickGeneration",
  },
  {
    id: 2,
    name: "Consenso cronológico",
    category: "estatus",
    description: "El último evento es el de fecha más reciente, no el primero del arreglo.",
    trigger: "Siempre al normalizar",
    engineStatus: "migrada",
    engineNote: "TrackingNormalizer (orden asc por occurredAt)",
  },
  {
    id: 3,
    name: "Precedencia de header terminal",
    category: "estatus",
    description: "Si latestStatusDetail.code ∈ {DL,DE,SE} o no hay scanEvents, confía en el header por encima del último scan.",
    trigger: "Header terminal o sin scans",
    engineStatus: "pendiente",
  },
  {
    id: 4,
    name: "Prioridad de entrega absoluta",
    category: "estatus",
    description: "Cualquier DL (header o scan) fuerza ENTREGADO.",
    trigger: "derivedCode/eventType = DL",
    engineStatus: "migrada",
    engineNote: "resolveCanonicalStatus (DL manda)",
  },
  {
    id: 5,
    name: "Escudo terminal",
    category: "estatus",
    description: "Si en DB ya es terminal (entregado/entregado_fedex/devuelto/retorno) no se permite retroceder a un estatus operativo.",
    trigger: "Estatus actual terminal + propuesto operativo",
    engineStatus: "migrada",
    engineNote: "TerminalLockRule",
  },
  {
    id: 6,
    name: "Time Shield",
    category: "estatus",
    description: "Solo acepta el estatus de FedEx si su evento más reciente es posterior a la última operación INTERNA (pendiente/bodega/ruta). Excepción: ENTREGADO siempre pisa.",
    trigger: "Evento FedEx vs. última operación interna",
    engineStatus: "pendiente",
  },
  // --- OD ---
  {
    id: 7,
    name: "OD por sucursal",
    category: "od",
    description: "Evento OD: si la sucursal tiene trackFedexExternalDelivery ⇒ ACARGO_DE_FEDEX; si no ⇒ EN_RUTA (no DESCONOCIDO).",
    trigger: "Evento OD + config de sucursal",
    engineStatus: "parcial",
    engineNote: "ExternalDeliveryRule",
  },
  {
    id: 8,
    name: "OD fantasma",
    category: "od",
    description: "Solo cuenta el OD posterior a la última operación interna (ignora OD viejos).",
    trigger: "OD con fecha > última operación interna",
    engineStatus: "pendiente",
  },
  {
    id: 9,
    name: "Válvula de escape OD",
    category: "od",
    description: "Si FedEx retoma el control (OD) desde ruta/bodega/pendiente, permite pasar a ACARGO_DE_FEDEX.",
    trigger: "Transición operativa → OD",
    engineStatus: "parcial",
  },
  // --- Financieras ---
  {
    id: 10,
    name: "Cobro por ENTREGADO",
    category: "financiera",
    description: "DL genera un Income tipo ENTREGADO.",
    trigger: "Estatus = ENTREGADO",
    engineStatus: "pendiente",
    engineNote: "IncomeRule (inactivo)",
  },
  {
    id: 11,
    name: "Cobro por rechazo",
    category: "financiera",
    description: "exceptionCode 07 / RECHAZADO genera Income NO_ENTREGADO.",
    trigger: "eCode 07 o estatus RECHAZADO",
    engineStatus: "pendiente",
  },
  {
    id: 12,
    name: "3ra visita (08 acumulado)",
    category: "financiera",
    description: "Al tercer exceptionCode 08 acumulado se cobra como CLIENTE_NO_DISPONIBLE.",
    trigger: "count(08) ≥ 3",
    engineStatus: "pendiente",
  },
  {
    id: 13,
    name: "Un cobro por semana ISO",
    category: "financiera",
    description: "Máximo 1 Income por (guía, tipo) por semana lun–dom; guard anti-duplicado consultando Income existente.",
    trigger: "Ventana semanal del evento",
    engineStatus: "pendiente",
  },
  {
    id: 14,
    name: "Safety net (header backup)",
    category: "financiera",
    description: "Si el header dice DL, no hubo OD y existe ACTUAL_DELIVERY, se genera un cobro de respaldo si no existe en esa semana.",
    trigger: "Header DL + ACTUAL_DELIVERY + no-OD",
    engineStatus: "pendiente",
  },
  {
    id: 15,
    name: "Blindaje anti-cobro falso",
    category: "financiera",
    description: "Si hubo OD y llega DL / eCode 005 ⇒ ENTREGADO_POR_FEDEX (NO genera cobro).",
    trigger: "OD previo + entrega",
    engineStatus: "pendiente",
  },
  {
    id: 16,
    name: "Costo por sucursal + carrier",
    category: "financiera",
    description: "Usa fedexCostPackage o dhlCostPackage según el carrier; costo 0 ⇒ FINANCE_ERROR y no cobra.",
    trigger: "Al crear el Income",
    engineStatus: "pendiente",
  },
  // --- Infra / integridad ---
  {
    id: 17,
    name: "Anti-duplicados de historial",
    category: "infra",
    description: "Firma por evento para no reinsertar estatus repetidos.",
    trigger: "Siempre al persistir",
    engineStatus: "migrada",
    engineNote: "eventKey / shadowKey (más robusto que timestamp_exceptionCode)",
  },
  {
    id: 18,
    name: "Circuit breaker de conectividad",
    category: "infra",
    description: "Si hay muchos errores de red y cero éxitos, aborta la corrida en vez de marcar miles de guías como error.",
    trigger: "Errores de red sin éxitos",
    engineStatus: "migrada",
    engineNote: "TrackingSyncOrchestrator",
  },
  {
    id: 19,
    name: "Dead-letter",
    category: "infra",
    description: "Las guías que fallan van a dead-letter para reproceso.",
    trigger: "Fallo por guía",
    engineStatus: "migrada",
  },
  {
    id: 20,
    name: "Persistencia en cascada",
    category: "infra",
    description: "Además del status actualiza fedexUniqueId, carrierCode y receivedByName cuando cambian.",
    trigger: "Al guardar el shipment",
    engineStatus: "parcial",
    engineNote: "Motor nuevo hoy solo escribe status",
  },
];
