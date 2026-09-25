import { describe, expect, it } from "vitest";
import {
  emptyManualShipment,
  prefillFromScannedCode,
  toAddShipmentPayload,
  validateManualShipment,
} from "./manual-shipment";

const filled = (o = {}) =>
  emptyManualShipment({
    trackingNumber: "877220375691",
    recipientName: "RAUL PEREZ",
    recipientAddress: "VISTA VELA 1 COL. EL TEZAL CASA 300",
    recipientCity: "CABO SAN LUCAS",
    recipientZip: "23454",
    commitDateTime: "2026-09-24T18:00",
    ...o,
  });

describe("manual-shipment", () => {
  it("FedEx por defecto y paquete normal", () => {
    const v = emptyManualShipment();
    expect(v.carrier).toBe("fedex");
    expect(v.kind).toBe("shipment");
  });

  it("formulario completo FedEx no tiene errores", () => {
    expect(validateManualShipment(filled())).toEqual({});
  });

  it("marca cada campo obligatorio por separado", () => {
    const e = validateManualShipment(emptyManualShipment());
    expect(Object.keys(e).sort()).toEqual(
      ["commitDateTime", "recipientAddress", "recipientCity", "recipientName", "trackingNumber"].sort(),
    );
  });

  it("DHL: exige guía de 10 y explica si pegan el JD en la guía", () => {
    expect(validateManualShipment(filled({ carrier: "dhl", trackingNumber: "1234567890" }))).toEqual({});
    expect(validateManualShipment(filled({ carrier: "dhl", trackingNumber: "JD004600012672343626" })).trackingNumber).toMatch(/ID de pieza/);
    expect(validateManualShipment(filled({ carrier: "dhl", trackingNumber: "1234567890", dhlUniqueId: "XYZ" })).dhlUniqueId).toBeTruthy();
  });

  it("prellenado desde el escaneo", () => {
    expect(prefillFromScannedCode("877586517413")).toEqual({ carrier: "fedex", trackingNumber: "877586517413", dhlUniqueId: "" });
    expect(prefillFromScannedCode("JJD004600012672343626")).toEqual({ carrier: "dhl", trackingNumber: "", dhlUniqueId: "JD004600012672343626" });
  });

  it("payload separa fecha/hora y solo manda pieza en DHL", () => {
    const p = toAddShipmentPayload(filled({ dhlUniqueId: "JD004600012672343626" }), { id: "s1", name: "Cabo" });
    expect(p).toMatchObject({ shipmentType: "fedex", kind: "shipment", commitDate: "2026-09-24", commitTime: "18:00:00", dhlUniqueId: undefined });
    const d = toAddShipmentPayload(filled({ carrier: "dhl", kind: "charge", trackingNumber: "1234567890", dhlUniqueId: "JJD004600012672343626" }), { id: "s1" });
    expect(d).toMatchObject({ shipmentType: "dhl", kind: "charge", dhlUniqueId: "JD004600012672343626" });
  });
});
