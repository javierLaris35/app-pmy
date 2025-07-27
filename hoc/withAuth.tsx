'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useHistoryStore } from '@/store/history.store';
import { UserRole } from '@/lib/types';
import { allowedPageRoles } from '@/lib/access/allowed-page-roles';

type PageName = keyof typeof allowedPageRoles;

export function withAuth<P extends object>(Component: ComponentType<P>, access?: PageName | UserRole[]) {
    return function AuthenticatedComponent(props: P) {
        const { isAuthenticated, user, hasHydrated } = useAuthStore();
        const router = useRouter();
        const pathname = usePathname();

        const previous = useHistoryStore((state) => {
            const h = state.history;
            return h.length > 1 ? h[h.length - 2] : null;
        });

        const roles: UserRole[] = Array.isArray(access)
            ? access as UserRole[]
            : access
                ? (allowedPageRoles[access as PageName] as UserRole[]) ?? []
                : [];

        useEffect(() => {
            if (!hasHydrated) return;

            // Si no está autenticado
            if (!isAuthenticated) {
                if (pathname !== '/login') {
                    console.warn('No autenticado, redirigiendo a login');
                    router.push('/login'); // push para permitir volver
                }
                return;
            }

            // Si el usuario aún no tiene rol (por retraso en la carga)
            if (!user?.role) return;

            const roleNotAllowed = roles.length > 0 && !roles.includes(user.role);

            if (roleNotAllowed) {
                if (previous && previous !== pathname) {
                    console.warn(`Rol no permitido (${user.role}), regresando a la página anterior`);
                    router.push(previous); // intenta volver a la anterior
                } else {
                    console.warn(`Rol no permitido (${user.role}), redirigiendo a /dashboard`);
                    router.push('/dashboard'); // fallback
                }
            }
        }, [hasHydrated, isAuthenticated, user?.role, roles, router, pathname, previous]);

        if (!hasHydrated || !isAuthenticated || !user?.role) return null;

        const isAllowed = roles.length === 0 || roles.includes(user.role);
        if (!isAllowed) return null;

        return <Component {...props} />;
    };
}
