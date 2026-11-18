import { describe, it, expect } from "vitest";
import { adoptLegacyInventoryDraft, clearInventoryDraft, inventoryDraftKeys } from "./inventory-draft";

const memStorage = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return {
    map: m,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

const legacy = (subId: string) => ({
  inventory_packages: JSON.stringify([{ trackingNumber: "1", isValid: true, subsidiary: { id: subId } }, { trackingNumber: "x", isValid: false }]),
  inventory_scanned_packages: JSON.stringify([{ trackingNumber: "1" }, { trackingNumber: "x" }]),
  inventory_type: JSON.stringify("dex"),
  "scanbuf:scan:inventario": JSON.stringify({ packages: [{ trackingNumber: "1" }], view: "rich" }),
});

describe("inventory-draft", () => {
  it("las claves incluyen la sucursal", () => {
    expect(inventoryDraftKeys("cabo").packages).toBe("inventory:cabo:packages");
    expect(inventoryDraftKeys("cabo").scanStorageKey).toBe("scan:inventario:cabo");
  });

  it("adopta la captura vieja si es de esta sucursal", () => {
    const s = memStorage(legacy("cabo"));
    expect(adoptLegacyInventoryDraft("cabo", s)).toBe(true);
    expect(s.getItem("inventory:cabo:packages")).toContain('"1"');
    expect(s.getItem("inventory:cabo:type")).toBe('"dex"');
    expect(s.getItem("scanbuf:scan:inventario:cabo")).not.toBeNull();
    expect(s.getItem("inventory_packages")).toBeNull();
  });

  it("no toca la captura vieja si es de otra sucursal", () => {
    const s = memStorage(legacy("lapaz"));
    expect(adoptLegacyInventoryDraft("cabo", s)).toBe(false);
    expect(s.getItem("inventory_packages")).not.toBeNull();
    expect(s.getItem("inventory:cabo:packages")).toBeNull();
  });

  it("no pisa una captura nueva que ya existe", () => {
    const s = memStorage({ ...legacy("cabo"), "inventory:cabo:packages": JSON.stringify([{ trackingNumber: "9" }]) });
    expect(adoptLegacyInventoryDraft("cabo", s)).toBe(false);
    expect(s.getItem("inventory:cabo:packages")).toContain('"9"');
  });

  it("limpia solo la captura de esa sucursal", () => {
    const s = memStorage({
      "inventory:cabo:packages": "[]",
      "scanbuf:scan:inventario:cabo": "{}",
      "inventory:lapaz:packages": "[]",
    });
    clearInventoryDraft("cabo", s);
    expect(s.getItem("inventory:cabo:packages")).toBeNull();
    expect(s.getItem("scanbuf:scan:inventario:cabo")).toBeNull();
    expect(s.getItem("inventory:lapaz:packages")).toBe("[]");
  });
});
