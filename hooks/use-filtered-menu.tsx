import {useAuthStore} from "@/store/auth.store";
import {NavItem, sidebarMenu} from "@/lib/constants";
import {codeForRolesRef, hasPermission} from "@/lib/access/permissions";

export function useFilteredMenu() {
    const user = useAuthStore((state) => state.user);

    function filterItems(items: any[]): (NavItem | null)[] {
        return items
            .map((item) => {
                if (item.items) {
                    const filteredSubitems = filterItems(item.items);
                    if (filteredSubitems.length > 0) {
                        return { ...item, items: filteredSubitems };
                    }
                    return null;
                }

                // Sin roles definidos → visible para todos.
                if (!item.roles) return item;

                // Gateo por PERMISO: si el item referencia un array de roles del
                // mapa, recuperamos su code y evaluamos con hasPermission (permisos
                // del token + fallback a rol legacy). Si no hay code, cae al rol.
                const code = codeForRolesRef(item.roles);
                const allowed = code
                    ? hasPermission(user, code)
                    : item.roles.includes(user?.role);
                return allowed ? item : null;
            })
            .filter(Boolean);
    }

    return {
        items: filterItems(sidebarMenu.items),
        secondary: filterItems(sidebarMenu.secondary),
    };
}