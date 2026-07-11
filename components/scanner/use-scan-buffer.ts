"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PackageInfo } from "@/lib/types";

export type ScanView = "rich" | "simple";
export interface ScanBuffer {
  packages: PackageInfo[];
  setPackages: (u: PackageInfo[] | ((prev: PackageInfo[]) => PackageInfo[])) => void;
  view: ScanView;
  setView: (v: ScanView) => void;
  clear: () => void;
  hydrated: boolean;
}

const keyFor = (storageKey: string) => `scanbuf:${storageKey}`;

export function useScanBuffer(storageKey: string, defaultView: ScanView = "rich"): ScanBuffer {
  const [packages, setPackagesState] = useState<PackageInfo[]>([]);
  const [view, setViewState] = useState<ScanView>(defaultView);
  const [hydrated, setHydrated] = useState(false);
  const loadedKey = useRef<string | null>(null);

  // Cargar desde localStorage al montar / cambiar storageKey (solo cliente).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(keyFor(storageKey));
      if (raw) {
        const parsed = JSON.parse(raw) as { packages?: PackageInfo[]; view?: ScanView };
        setPackagesState(Array.isArray(parsed.packages) ? parsed.packages : []);
        if (parsed.view === "rich" || parsed.view === "simple") setViewState(parsed.view);
      } else {
        setPackagesState([]);
        setViewState(defaultView);
      }
    } catch {
      setPackagesState([]);
    }
    loadedKey.current = storageKey;
    setHydrated(true);
  }, [storageKey]); // defaultView intencionalmente fuera: es solo valor inicial

  // Persistir en cada cambio (solo tras hidratar, para no pisar con el estado inicial).
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated || loadedKey.current !== storageKey) return;
    try {
      window.localStorage.setItem(keyFor(storageKey), JSON.stringify({ packages, view }));
    } catch {
      /* cuota llena / modo privado: persistencia best-effort */
    }
  }, [packages, view, hydrated, storageKey]);

  const setPackages = useCallback(
    (u: PackageInfo[] | ((prev: PackageInfo[]) => PackageInfo[])) => setPackagesState(u as any),
    [],
  );
  const setView = useCallback((v: ScanView) => setViewState(v), []);
  const clear = useCallback(() => {
    setPackagesState([]);
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(keyFor(storageKey));
    } catch { /* noop */ }
  }, [storageKey]);

  return { packages, setPackages, view, setView, clear, hydrated };
}
