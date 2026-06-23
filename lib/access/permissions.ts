import type { User, UserRole } from "@/lib/types";
import { allowedPageRoles } from "@/lib/access/allowed-page-roles";

const SUPER_ROLES = ["superadmin", "superamin"];

/**
 * Mapa (referencia del array de roles) → code de permiso. Como los items del menú
 * referencian DIRECTAMENTE `allowedPageRoles.<path>` (mismo objeto), podemos
 * recuperar su code sin tocar `lib/constants`. Se construye una sola vez.
 */
const ROLES_REF_TO_CODE = new Map<readonly UserRole[], string>();
(function buildRefMap(node: any = allowedPageRoles, prefix = "") {
  for (const [key, value] of Object.entries(node)) {
    const code = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) ROLES_REF_TO_CODE.set(value as UserRole[], code);
    else if (value && typeof value === "object") buildRefMap(value, code);
  }
})();

/** Devuelve el code de permiso asociado a un array de roles del mapa (por referencia). */
export function codeForRolesRef(rolesRef: readonly UserRole[] | undefined): string | undefined {
  return rolesRef ? ROLES_REF_TO_CODE.get(rolesRef) : undefined;
}

/** Resuelve los roles legacy permitidos para un code/path (ej. "finanzas.gastos"). */
function legacyRolesForCode(code: string): UserRole[] {
  let current: any = allowedPageRoles;
  for (const key of code.split(".")) {
    current = current?.[key];
    if (!current) return [];
  }
  return Array.isArray(current) ? (current as UserRole[]) : [];
}

/**
 * ¿El usuario tiene el permiso `code` del catálogo RBAC?
 *
 * Orden de evaluación (transición de Fase C):
 * 1. superadmin (y typo 'superamin') → siempre true.
 * 2. Si el token trae permisos efectivos → se usa esa lista (fuente de verdad).
 * 3. Fallback: si NO hay permisos en el token (sesión previa a Fase C, o el seed
 *    RBAC no corrió), se cae al mapa de roles legacy `allowed-page-roles`.
 */
export function hasPermission(user: User | null | undefined, code: string): boolean {
  if (!user) return false;

  const role = (user.role || "").toString().toLowerCase();
  if (SUPER_ROLES.includes(role)) return true;

  const perms = user.permissions;
  if (Array.isArray(perms) && perms.length > 0) {
    return perms.includes(code);
  }

  // Fallback legacy por rol.
  const roles = legacyRolesForCode(code);
  return roles.length === 0 || roles.includes(user.role);
}
