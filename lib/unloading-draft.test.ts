import { describe, expect, it } from "vitest";
import {
  emptyUnloadingDraft,
  moveLegacyUnloadingScanBuffer,
  pruneStaleDrafts,
  STALE_DRAFT_MS,
  switchUnloadingDraft,
  unloadingScanKey,
  type DraftSlots,
} from "./unloading-draft";
import type { PackageInfoForUnloading } from "@/lib/types";

const pkg = (trackingNumber: string) =>
  ({ id: trackingNumber, trackingNumber, isValid: true, priority: "media" }) as PackageInfoForUnloading;

const slots = (subsidiaryId: string | null, tns: string[], parked: DraftSlots["parked"] = {}): DraftSlots => ({
  ...emptyUnloadingDraft(),
  shipments: tns.map(pkg),
  subsidiaryId,
  parked,
});

describe("switchUnloadingDraft", () => {
  it("al cambiar de sucursal estaciona la captura y no la arrastra a la otra", () => {
    const r = switchUnloadingDraft(slots("A", ["111"]), "B", "A");
    expect(r.subsidiaryId).toBe("B");
    expect(r.shipments).toEqual([]);
    expect(r.parked.A.shipments.map((p) => p.trackingNumber)).toEqual(["111"]);
  });

  it("al volver a la sucursal recupera su captura", () => {
    const enB = switchUnloadingDraft(slots("A", ["111"]), "B", "A");
    const deVuelta = switchUnloadingDraft({ ...enB, shipments: [pkg("222")] }, "A", "A");
    expect(deVuelta.shipments.map((p) => p.trackingNumber)).toEqual(["111"]);
    expect(deVuelta.parked.B.shipments.map((p) => p.trackingNumber)).toEqual(["222"]);
    expect(deVuelta.parked.A).toBeUndefined();
  });

  it("misma sucursal: no cambia nada", () => {
    const s = slots("A", ["111"]);
    const r = switchUnloadingDraft(s, "A", "A");
    expect(r.shipments).toBe(s.shipments);
    expect(r.legacyOwner).toBeNull();
  });

  it("no estaciona capturas vacías", () => {
    const r = switchUnloadingDraft(slots("A", []), "B", "A");
    expect(r.parked).toEqual({});
  });

  it("captura vieja sin dueño: se queda si se abre la sucursal del usuario", () => {
    const r = switchUnloadingDraft(slots(null, ["111"]), "A", "A");
    expect(r.shipments.map((p) => p.trackingNumber)).toEqual(["111"]);
    expect(r.legacyOwner).toBe("A");
  });

  it("captura vieja sin dueño: si se abre otra sucursal, se estaciona en la del usuario", () => {
    const r = switchUnloadingDraft(slots(null, ["111"]), "B", "A");
    expect(r.shipments).toEqual([]);
    expect(r.parked.A.shipments.map((p) => p.trackingNumber)).toEqual(["111"]);
    expect(r.legacyOwner).toBe("A");
  });
});

describe("moveLegacyUnloadingScanBuffer", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return {
      m,
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  };

  it("mueve el buffer global a la clave de la sucursal", () => {
    const s = mem();
    s.setItem("scanbuf:scan:desembarque", "[1]");
    moveLegacyUnloadingScanBuffer("A", s);
    expect(s.getItem(`scanbuf:${unloadingScanKey("A")}`)).toBe("[1]");
    expect(s.getItem("scanbuf:scan:desembarque")).toBeNull();
  });

  it("no pisa un buffer que ya exista en la sucursal", () => {
    const s = mem();
    s.setItem("scanbuf:scan:desembarque", "[viejo]");
    s.setItem(`scanbuf:${unloadingScanKey("A")}`, "[nuevo]");
    moveLegacyUnloadingScanBuffer("A", s);
    expect(s.getItem(`scanbuf:${unloadingScanKey("A")}`)).toBe("[nuevo]");
  });
});

describe("pruneStaleDrafts", () => {
  const now = Date.UTC(2026, 10, 18, 12);
  const old = now - STALE_DRAFT_MS - 1000;

  it("borra capturas estacionadas de más de 2 días y conserva las recientes", () => {
    const st = slots("A", [], {
      B: { ...emptyUnloadingDraft(), shipments: [pkg("111")], updatedAt: old },
      C: { ...emptyUnloadingDraft(), shipments: [pkg("222")], updatedAt: now - 1000 },
    });
    const r = pruneStaleDrafts(st, now);
    expect(r.droppedIds).toEqual(["B"]);
    expect(Object.keys(r.slots.parked)).toEqual(["C"]);
    expect(r.droppedActive).toBe(false);
  });

  it("borra la captura activa vencida y avisa", () => {
    const st = { ...slots("A", ["111"]), updatedAt: old };
    const r = pruneStaleDrafts(st, now);
    expect(r.droppedActive).toBe(true);
    expect(r.droppedIds).toEqual(["A"]);
    expect(r.slots.shipments).toEqual([]);
    expect(r.slots.subsidiaryId).toBe("A");
  });

  it("no toca capturas vacías aunque sean viejas", () => {
    const st = { ...slots("A", []), updatedAt: old };
    const r = pruneStaleDrafts(st, now);
    expect(r.droppedActive).toBe(false);
    expect(r.droppedIds).toEqual([]);
  });
});
