import useSWR from "swr";
import { getInboxBoard, getInboxMessage, getInboxMessages, getInboxStatus, getZipCoverage, InboxListParams } from "@/lib/services/inbox";

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
