'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useHistoryStore } from '@/store/history.store';
import { UserRole } from '@/lib/types';
import { allowedPageRoles } from '@/lib/access/allowed-page-roles';

// 🔑 Helper para resolver rutas anidadas
function getRolesFromPath(path: string): UserRole[] {
    const keys = path.split('.'); // ej: ["finanzas", "ingresos"]
    let current: any = allowedPageRoles;

    for (const key of keys) {
        current = current?.[key];
        if (!current) return [];
    }

    return Array.isArray(current) ? current : [];
}

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

        // 🔒 Obtener roles permitidos
        const roles: UserRole[] = Array.isArray(access)
            ? (access as UserRole[])
            : typeof access === 'string'
                ? getRolesFromPath(access)
                : [];

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

            // Validar rol
            const roleNotAllowed = roles.length > 0 && !roles.includes(user.role);

            if (roleNotAllowed) {
                if (previous && previous !== pathname) {
                    console.warn(`Rol no permitido (${user.role}), regresando a la página anterior`);
                    router.push(previous);
                } else {
                    console.warn(`Rol no permitido (${user.role}), redirigiendo a /dashboard`);
                    router.push('/dashboard');
                }
            }
        }, [hasHydrated, isAuthenticated, user?.role, roles, router, pathname, previous]);

        if (!hasHydrated || !isAuthenticated || !user?.role) return null;

        const isAllowed = roles.length === 0 || roles.includes(user.role);
        if (!isAllowed) return null;

        return <Component {...props} />;
    };
}
