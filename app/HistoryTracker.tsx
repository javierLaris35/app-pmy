'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHistoryStore } from '@/store/history.store';

export default function RouteTracker() {
    const pathname = usePathname();
    const push = useHistoryStore((state) => state.push);

    useEffect(() => {
        push(pathname);
    }, [pathname, push]);

    return null;
}