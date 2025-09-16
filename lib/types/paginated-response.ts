export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        itemsPerPage: number;
        totalItems: number;
        currentPage: number;
        totalPages: number;
        sortBy?: [string, string][];
    };
    links: {
        current: string;
        next: string | null;
        last: string;
    };
}