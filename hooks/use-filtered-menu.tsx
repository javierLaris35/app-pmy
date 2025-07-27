import {useAuthStore} from "@/store/auth.store";
import {NavItem, sidebarMenu} from "@/lib/constants";

export function useFilteredMenu() {
    const role = useAuthStore((state) => state.user?.role);

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

                // Not defined Roles, display for all
                if (!item.roles || item.roles.includes(role)) {
                    return item;
                }
                return null;
            })
            .filter(Boolean);
    }

    return {
        items: filterItems(sidebarMenu.items),
        secondary: filterItems(sidebarMenu.secondary),
    };
}