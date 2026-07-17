'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useHistoryStore } from '@/store/history.store';
import { UserRole } from '@/lib/types';
import { hasPermission, getLandingRoute } from '@/lib/access/permissions';

const SUPER_ROLES = ['superadmin', 'superamin'];

export function withAuth<P extends object>(
    Component: ComponentType<P>,
    access?: string | UserRole[]
) {
    return function AuthenticatedComponent(props: P) {
        const { isAuthenticated, user, hasHydrated } = useAuthStore();
        const router = useRouter();
        const pathname = usePathname();

        const previous = useHistoryStore((state) => {
            const h = state.history;
            return h.length > 1 ? h[h.length - 2] : null;
        });

        /**
         * Gateo de acceso:
         * - `access` string → es un CODE de permiso RBAC (ej. "finanzas.gastos");
         *   se evalúa con `hasPermission` (permisos del token, fallback a rol legacy).
         * - `access` array → lista de roles explícita; superadmin siempre pasa.
         * - sin `access` → cualquier autenticado.
         */
        const computeAllowed = (): boolean => {
            if (!user) return false;
            if (Array.isArray(access)) {
                const role = (user.role || '').toString().toLowerCase();
                return access.length === 0 || SUPER_ROLES.includes(role) || access.includes(user.role);
            }
            if (typeof access === 'string') return hasPermission(user, access);
            return true;
        };

        useEffect(() => {
            if (!hasHydrated) return;

            // Si no está autenticado
            if (!isAuthenticated) {
                if (pathname !== '/login') {
                    console.warn('No autenticado, redirigiendo a login');
                    router.push('/login');
                }
                return;
            }

            // Si aún no hay rol (puede tardar en hidratar)
            if (!user?.role) return;

            if (!computeAllowed()) {
                // Destino seguro: nunca regresar a una ruta que a su vez redirige
                // (`/login`, `/`, `/dashboard`), porque provoca loops de redirección.
                const landing = getLandingRoute(user);
                const REDIRECTING_ROUTES = new Set(['/login', '/', '/dashboard']);
                const canGoBack =
                    previous && previous !== pathname && !REDIRECTING_ROUTES.has(previous);
                if (canGoBack) {
                    console.warn(`Acceso no permitido (${user.role}), regresando a la página anterior`);
                    router.push(previous);
                } else {
                    console.warn(`Acceso no permitido (${user.role}), redirigiendo a ${landing}`);
                    router.push(landing);
                }
            }
        }, [hasHydrated, isAuthenticated, user, access, router, pathname, previous]);

        if (!hasHydrated || !isAuthenticated || !user?.role) return null;

        if (!computeAllowed()) return null;

        return <Component {...props} />;
    };
}
