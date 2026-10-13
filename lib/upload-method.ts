/**
 * Desde qué pantalla se sube un archivo. El backend guarda la clave y muestra el nombre en llano
 * (pmy-api src/import-files/upload-method.util.ts: mantener las claves en sync).
 */
export type UploadMethod = "asistente" | "pegar_fedex" | "bandeja_correo" | "subida_rapida";
