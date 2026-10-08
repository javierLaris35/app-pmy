import { axiosConfig } from "../axios-config";
import { NoVanPackageDetail, PackageInfo, RouteClosure, ValidatedPackagesForClousere } from "../types";

const url = "/route-closure";


const save = async (routeClosure: RouteClosure) => {
    const response = await axiosConfig.post<RouteClosure>(url, routeClosure);
    return response.data;
}

const validateTrackingNumbers = async (trackingNumbers: string[], packageDispatchId: string) => {
    const response = await axiosConfig.post<ValidatedPackagesForClousere>(`${url}/validateTrackingsForClosure`, {
        trackingNumbers,
        packageDispatchId
    });
    
    return response.data;
}

const validateTrackinNumberNoVan = async (noVanTrackingNumbers: string[]) => {
    // El backend devuelve un arreglo de detalles (uno por guía), no un objeto envolvente.
    const response = await axiosConfig.post<NoVanPackageDetail[]>(`${url}/validateNoVanTrackings`, {
        noVanTrackingNumbers
    });
    return response.data;
}

/**
 * Se llama AL ABRIR el cierre a ruta: el backend reconcilia y PERSISTE el último estatus
 * FedEx de todas las guías del despacho (shipments + F2), para que los buckets del cierre
 * reflejen la realidad y el `en_ruta` interno no le gane al estatus real del mismo día.
 * En rutas 31.5 (is315) el backend solo toca los F2. Read-heavy: puede tardar un poco.
 */
const reconcile = async (packageDispatchId: string) => {
    const response = await axiosConfig.post<{
        packageDispatchId: string;
        is315: boolean;
        total: number;
        updated: number;
        outcomes: unknown[];
    }>(`${url}/reconcile/${packageDispatchId}`);
    return response.data;
}

export async function uploadFiles(
    pdfFile: File,
    excelFile: File,
    routeClosureId: string,
    onProgress?: (progress: number) => void
): Promise<any> { 
    const formData = new FormData();
    formData.append('files', pdfFile);
    formData.append('files', excelFile);
    formData.append('routeClosureId', routeClosureId);

    try {
        const response = await axiosConfig.post(`${url}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload Progress:', percent);
            onProgress(percent);
            }
        },
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error; // Rethrow to let the caller handle it
    }
}

// ───────────── Paquetes con problema (solo superadmin) ─────────────

export type ClosureProblemCode =
    | 'STATUS_BEHIND'
    | 'DELIVERED_BEFORE_ROUTE'
    | 'HISTORY_MISSING'
    | 'INCOME_MISSING'
    | 'CLOSURE_STALE'
    | 'WARNING';

export interface ClosurePackageDiagnosis {
    shipmentId: string;
    trackingNumber: string;
    kind: 'shipment' | 'charge';
    currentStatus: string;
    targetStatus: string | null;
    /** Cómo muestra hoy el cierre la guía. */
    closureStatus: string | null;
    fedexEventAt: string | null;
    problems: ClosureProblemCode[];
    plan: null | {
        setStatus: string | null;
        insertEvents: { occurredAt: string; status: string; exceptionCode: string | null; description: string | null }[];
        income: null | {
            type: 'create' | 'supersede';
            incomeType: string;
            nonDeliveryStatus: string | null;
            date: string;
            cost: number;
            pastWeek: boolean;
        };
        /** Estatus con el que ESTA salida cierra la guía (no toca el estatus vivo). */
        closure?: null | { status: string; occurredAt: string; exceptionCode: string | null };
    };
    explanation: string[];
    fingerprint: string | null;
}

export interface ClosureDiagnosis {
    packageDispatchId: string;
    is315: boolean;
    routeDay: string | null;
    subsidiaryName: string | null;
    total: number;
    packages: ClosurePackageDiagnosis[];
}

export interface ClosureFixResult {
    shipmentId: string;
    kind: 'shipment' | 'charge';
    trackingNumber: string | null;
    status: 'applied' | 'changed' | 'nothing' | 'error';
    message: string;
}

/** Revisa contra FedEx todas las guías de la salida sin cambiar nada. Puede tardar. */
export const diagnoseClosure = async (packageDispatchId: string) => {
    const response = await axiosConfig.post<ClosureDiagnosis>(`${url}/${packageDispatchId}/diagnose`);
    return response.data;
}

/** Aplica los arreglos confirmados; el backend vuelve a revisar cada paquete antes de escribir. */
export const applyClosureFixes = async (
    packageDispatchId: string,
    items: { shipmentId: string; kind: 'shipment' | 'charge'; fingerprint: string }[],
) => {
    const response = await axiosConfig.post<{ packageDispatchId: string; results: ClosureFixResult[] }>(
        `${url}/${packageDispatchId}/apply-fixes`,
        { items },
    );
    return response.data;
}


// ───────────── Reporte 7 pm "Rutas del día con posibles problemas" (solo superadmin) ─────────────

export interface RouteRiskReportResult {
    day: string;
    subject: string;
    html: string;
    totals: { routes: number; routesWithIssues: number; toFix: number; withoutOutcome: number; guides: number };
}

/**
 * Genera el reporte de un día (YYYY-MM-DD; vacío = hoy). `dryRun` = solo simulación, sin correo.
 * Revisa todas las salidas del día contra FedEx: puede tardar alrededor de un minuto.
 */
export const runRouteRiskReport = async (opts: { date?: string; dryRun: boolean }) => {
    const response = await axiosConfig.post<RouteRiskReportResult | { skipped: true; reason: string }>(
        `${url}/risk-report`,
        { ...(opts.date ? { date: opts.date } : {}), dryRun: opts.dryRun },
    );
    return response.data;
}

export {
    save,
    validateTrackingNumbers,
    validateTrackinNumberNoVan,
    reconcile
}