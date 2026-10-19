import useSWR from "swr";
import { getConsolidatedLookup, getGuideLookup, getInboxBoard, getInboxMessage, getInboxMessages, getInboxStatus, getZipCoverage, InboxListParams, searchInbox } from "@/lib/services/inbox";

export function useInboxMessages(p: InboxListParams) {
  const key = ["/inbox/messages", p.carrier, p.status, p.subsidiaryId ?? "", p.from ?? "", p.to ?? "", p.q ?? "", p.page ?? 1, p.pageSize ?? 50];
  const { data, isLoading, error, mutate } = useSWR(key, () => getInboxMessages(p), { refreshInterval: 60_000 });
  return { data, isLoading, isError: !!error, mutate };
}

export function useInboxMessage(id: string | null) {
  const { data, isLoading, error, mutate } = useSWR(id ? ["/inbox/message", id] : null, () => getInboxMessage(id as string));
  return { data, isLoading, isError: !!error, mutate };
}

export function useInboxBoard(p: { from?: string; to?: string; subsidiaryId?: string }, active = true) {
  const key = active ? ["/inbox/board", p.from ?? "", p.to ?? "", p.subsidiaryId ?? ""] : null;
  const { data, isLoading, error, mutate } = useSWR(key, () => getInboxBoard(p), { refreshInterval: 60_000 });
  return { data, isLoading, isError: !!error, mutate };
}

export function useInboxStatus() {
  const { data, isLoading, error, mutate } = useSWR("/inbox/status", getInboxStatus, { refreshInterval: 60_000 });
  return { data, isLoading, isError: !!error, mutate };
}

export function useZipCoverage(subsidiaryId: string | undefined) {
  const { data, isLoading, error, mutate } = useSWR(subsidiaryId ? ["/inbox/zip-coverage", subsidiaryId] : null, () => getZipCoverage(subsidiaryId));
  return { data, isLoading, isError: !!error, mutate };
}

export function useInboxSearch(q: string) {
  const term = q.trim();
  const { data, isLoading, error } = useSWR(term.length >= 3 ? ["/inbox/search", term] : null, () => searchInbox(term), { keepPreviousData: true });
  return { data, isLoading, error };
}

export function useConsolidatedLookup(p: { id?: string; cons?: string; type?: "paquete" | "carga" } | null) {
  const { data, isLoading, error } = useSWR(p ? ["/inbox/lookup/consolidated", p.id ?? "", p.cons ?? "", p.type ?? ""] : null, () => getConsolidatedLookup(p!));
  return { data, isLoading, error };
}

export function useGuideLookup(tracking: string | null) {
  const { data, isLoading, error } = useSWR(tracking ? ["/inbox/lookup/guide", tracking] : null, () => getGuideLookup(tracking!));
  return { data, isLoading, error };
}
