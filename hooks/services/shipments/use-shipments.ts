import { getShipments } from '@/lib/services/shipments';
import useSWR from 'swr';

//const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useShipments() {
    const { data, error, isLoading, mutate } = useSWR('/shipments', getShipments);

    return {
        shipments: data,
        isLoading,
        isError: !!error,
        mutate,
    };
}