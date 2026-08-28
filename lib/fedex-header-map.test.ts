import { describe, it, expect } from "vitest";
import {
  buildMappedTable,
  mergePayments,
  mergeHighValue,
  parsePaymentsPaste,
  parseHvPaste,
  isBadDate,
  parsePaymentCell,
  normalizeTrackingValue,
  normalizePhoneValue,
} from "./fedex-header-map";

describe("buildMappedTable (pegar FedEx)", () => {
  it("mapea columnas FedEx, ignora las irrelevantes y marca duplicados/faltantes", () => {
    const rows = [
      ["Tracking No", "Origin Loc ID", "Shpr Name", "Recip Name", "Recip Addr", "Recip City", "Recip Postal", "Commit Date", "COD"],
      ["875824020332", "MUGA", "COSTCO", "JAIME ARENAS", "ALLENDE 123", "HERMOSILLO", "83000", "8/20/2026", "COD 1500.50"],
      ["875824020332", "MUGA", "COSTCO", "OTRO", "CALLE 2", "HERMOSILLO", "83001", "8/20/2026", ""], // duplicada
      ["", "MUGA", "COSTCO", "SIN GUIA", "CALLE 3", "HERMOSILLO", "83002", "fecha-mala", ""], // sin guía + fecha mala
    ];
    const t = buildMappedTable(rows)!;
    expect(t.hasTracking).toBe(true);
    expect(t.fields.map((f) => f.field)).not.toContain("recipientName2");
    expect(t.counts.total).toBe(3);
    expect(t.counts.withTracking).toBe(2);
    expect(t.counts.missingTracking).toBe(1);
    expect(t.counts.duplicates).toBe(2); // ambas filas con la misma guía
    expect(t.counts.withPayment).toBe(1);
    expect(t.rows[0].hasPayment).toBe(true);
    expect(t.rows[0].paymentNoType).toBe(false);
    expect(t.rows[2].missingTracking).toBe(true);
    expect(t.rows[2].badDate).toBe(true);
  });

  it("null si no hay encabezados reconocibles", () => {
    expect(buildMappedTable([["875824020332", "CUAH"], ["875827166531", "CUAH"]])).toBeNull();
  });

  it("detecta meta (consNumber, aéreo, fecha) y respeta columna # inicial", () => {
    const rows = [
      ["305794238300", "ALBERTO GUTIERREZ", "SALIDA AEREA", "", "", "05/06/2026"],
      ["", "Tracking No", "Recip Name", "Recip Addr", "Recip Postal", "Commit Date", "Commit Time", "Recip Phone"],
      ["1", "381432222844", "LAITA OLIMON", "SALOMON 512", "23454", "06/08/2026", "21:00:00", "9848060497"],
      ["2", "381634876530", "JORGE ARANA", "AV LOS CABOS", "23473", "06/09/2026", "22:00:00", "526241719517"],
    ];
    const t = buildMappedTable(rows)!;
    expect(t.meta.consNumber).toBe("305794238300");
    expect(t.meta.aereo).toBe(true);
    expect(t.meta.date).toBe("2026-05-06"); // 05/06 → MM/DD (FedEx)
    expect(t.counts.total).toBe(2);
    expect(t.rows[0].values.trackingNumber).toBe("381432222844"); // ignoró la columna #
    expect(t.rows[0].values.recipientName).toBe("LAITA OLIMON");
    expect(t.rows[0].values.recipientZip).toBe("23454");
  });

  it("detecta meta aunque la fila meta venga como una sola celda (sin tabs)", () => {
    const rows = [
      ["305794238300 ALBERTO GUTIERREZ SALIDA AEREA 05/06/2026"], // 1 sola celda
      ["", "Tracking No", "Recip Name", "Recip Addr", "Recip Postal", "Commit Date"],
      ["1", "381432222844", "LAITA OLIMON", "SALOMON 512", "23454", "06/08/2026"],
    ];
    const t = buildMappedTable(rows)!;
    expect(t.meta.consNumber).toBe("305794238300");
    expect(t.meta.aereo).toBe(true);
    expect(t.meta.date).toBe("2026-05-06"); // MM/DD (FedEx)
  });
});

describe("resolutor inteligente contra formatos reales", () => {
  it("CartaPorte (CCP GUIAS): mapea DEST y NUNCA el remitente", () => {
    const rows = [
      ["NUMERO_GUIA", "RFC_REMITENTE", "NOMBRE_REMITENTE", "CALLE_REM", "CODIGO_POSTAL_REM", "RFC_DESTINATARIO", "NOMBRE_DEST", "CALLE_DEST", "MUNICIPIO_DEST", "ESTADO_DEST", "CODIGO_POSTAL_DEST"],
      ["381767587441", "XAXX010101000", "BLANCA ESTELA SANCHEZ", "AND LIBRA 3", "40040", "XAXX010101000", "JUAN CARLOS CRUZ", "MZA 15 LOTE 21", "", "BS", "23477"],
    ];
    const t = buildMappedTable(rows)!;
    expect(t.rows[0].values.trackingNumber).toBe("381767587441");
    expect(t.rows[0].values.recipientName).toBe("JUAN CARLOS CRUZ"); // DEST, no REM
    expect(t.rows[0].values.recipientAddress).toBe("MZA 15 LOTE 21");
    expect(t.rows[0].values.recipientZip).toBe("23477"); // CP DEST, no 40040 del REM
    expect(t.problems.find((p) => p.level === "error")).toBeUndefined();
  });

  it("PREALERTA con Recip Co. extra y COD; fecha MM/DD", () => {
    const rows = [
      ["Tracking Number", "Recip Co.", "Recip Name", "Recip Addr", "Commit Date", "Recip Phone", "", "COD"],
      ["383106795314", "", "MARIA INES ZEPEDA", "AVENIDA FLORENCIA 7", "08/17/2026", "6624135396", "", ""],
    ];
    const t = buildMappedTable(rows)!;
    expect(t.rows[0].values.trackingNumber).toBe("383106795314");
    expect(t.rows[0].values.recipientName).toBe("MARIA INES ZEPEDA"); // no Recip Co.
    expect(t.rows[0].values.recipientPhone).toBe("6624135396");
    expect(t.rows[0].badDate).toBe(false); // 08/17/2026 válida (MM/DD)
    expect(t.sources.recipientName?.toLowerCase()).toContain("name");
  });

  it("COBROS LASTCOMM: tracking + Last COMM Scan Update como cod, ignora filas vacías", () => {
    const rows = [
      ["Tracking Number", "Last COMM Scan Date", "Last COMM Scan Update"],
      ["", "", ""],
      ["875288390033", "", "ROD-COLLECT CASH 3,102.00"],
    ];
    const t = buildMappedTable(rows)!;
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].values.trackingNumber).toBe("875288390033");
    expect(t.rows[0].hasPayment).toBe(true);
    expect(t.rows[0].values.cod).toContain("3,102.00");
  });

  it("infiere la columna de guía por contenido cuando no hay encabezado", () => {
    const rows = [
      ["JUAN PEREZ", "381432222844", "CALLE 1", "23454"],
      ["MARIA LOPEZ", "381634876530", "CALLE 2", "23473"],
      ["PEDRO GOMEZ", "381695180557", "CALLE 3", "23405"],
    ];
    const t = buildMappedTable(rows);
    expect(t).not.toBeNull();
    expect(t!.rows[0].values.trackingNumber).toBe("381432222844");
    expect(t!.rows.length).toBe(3); // sin encabezado, todas son datos
  });
});

describe("parsePaymentCell / isBadDate", () => {
  it("extrae type y monto", () => {
    expect(parsePaymentCell("COD 1,500.50")).toEqual({ type: "COD", amount: 1500.5 });
    expect(parsePaymentCell("1500")).toEqual({ type: null, amount: 1500 });
    expect(parsePaymentCell("")).toEqual({ type: null, amount: null });
  });
  it("detecta fechas malas pero acepta vacías y seriales", () => {
    expect(isBadDate("")).toBe(false);
    expect(isBadDate("8/20/2026")).toBe(false);
    expect(isBadDate("45900")).toBe(false);
    expect(isBadDate("fecha-mala")).toBe(true);
  });
});

describe("enriquecimiento de pagos", () => {
  it("marca filas existentes, flaggea pago sin type y agrega guías faltantes", () => {
    const base = buildMappedTable([
      ["Tracking No", "Recip Name"],
      ["111111111", "A"],
      ["222222222", "B"],
    ])!;
    const payments = parsePaymentsPaste("111111111\tCOD 500\n999999999\t1200"); // 2ª guía no está en la tabla, sin type
    const merged = mergePayments(base, payments);
    expect(merged.counts.withPayment).toBe(2);
    expect(merged.counts.total).toBe(3); // se agregó 999999999
    const added = merged.rows.find((r) => r.values.trackingNumber === "999999999")!;
    expect(added.manual).toBe(true);
    expect(added.paymentNoType).toBe(true); // 1200 sin COD/FTC/ROD
    expect(merged.fields.some((f) => f.field === "cod")).toBe(true);
  });

  it("parsePaymentsPaste con texto libre del correo", () => {
    const parsed = parsePaymentsPaste("Guia 383012036065 pago COD $1,250.00 recibido\nnada aqui");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].tracking).toBe("383012036065");
    expect(parsed[0].type).toBe("COD");
    expect(parsed[0].amount).toBe(1250);
  });

  it("el monto no se contamina con la guía aunque el importe venga antes", () => {
    const parsed = parsePaymentsPaste("COD $980.50 guia 383011751254");
    expect(parsed[0].tracking).toBe("383011751254");
    expect(parsed[0].amount).toBe(980.5);
    expect(parsed[0].type).toBe("COD");
  });

  it("formato VERTICAL del cuerpo del correo (guía, fecha y cobro en líneas separadas)", () => {
    // Tal cual se pega desde el cuerpo del correo (no es tabla ni viene de Excel).
    const raw = [
      "Tracking Number",
      "Last COMM Scan Date",
      "Last COMM Scan Update",
      "383264471120",
      "08/20/2026",
      "COD-COLLECT CASH 2500.0 MXP",
    ].join("\n");
    const parsed = parsePaymentsPaste(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].tracking).toBe("383264471120");
    expect(parsed[0].type).toBe("COD");
    expect(parsed[0].amount).toBe(2500);
  });

  it("formato vertical con VARIOS cobros seguidos", () => {
    const raw = [
      "383264471120",
      "08/20/2026",
      "COD-COLLECT CASH 2500.0 MXP",
      "383011751254",
      "08/21/2026",
      "FTC 980 MXP",
    ].join("\n");
    const parsed = parsePaymentsPaste(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed.find((p) => p.tracking === "383264471120")).toMatchObject({ type: "COD", amount: 2500 });
    expect(parsed.find((p) => p.tracking === "383011751254")).toMatchObject({ type: "FTC", amount: 980 });
  });

  it("tabla del correo copiada como TSV (guía + cobro alineados) sigue funcionando", () => {
    const raw = "Tracking Number\tLast COMM Scan Date\tLast COMM Scan Update\n383264471120\t08/20/2026\tCOD-COLLECT CASH 2500.0 MXP";
    const parsed = parsePaymentsPaste(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ tracking: "383264471120", type: "COD", amount: 2500 });
  });

  // --- Robustez: el mismo algoritmo tolera CUALQUIER formato de pegado ---

  it("Excel con muchas columnas + encabezados (usa la columna de cobro exacta)", () => {
    const raw =
      "Tracking No\tRecip Name\tRecip Addr\tRecip Postal\tLast COMM Scan Update\n" +
      "383264471120\tJUAN\tCALLE 1\t83000\tCOD-COLLECT CASH 2500.0 MXP\n" +
      "383011751254\tANA\tAV 22\t83100\tFTC 980 MXP";
    const parsed = parsePaymentsPaste(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed.find((p) => p.tracking === "383264471120")).toMatchObject({ type: "COD", amount: 2500 });
    expect(parsed.find((p) => p.tracking === "383011751254")).toMatchObject({ type: "FTC", amount: 980 });
  });

  it("Excel SIN encabezados, varias columnas alineadas (segmenta por guía)", () => {
    const raw = "383264471120\tJUAN\tCALLE 1\t83000\tCOD-COLLECT CASH 2500.0 MXP";
    const parsed = parsePaymentsPaste(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ tracking: "383264471120", type: "COD", amount: 2500 });
  });

  it("varias líneas, una por registro (space-separated)", () => {
    const raw =
      "383264471120 08/20/2026 COD-COLLECT CASH 2500.0 MXP\n" +
      "383011751254 08/21/2026 FTC 980 MXP";
    const parsed = parsePaymentsPaste(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed.find((p) => p.tracking === "383264471120")).toMatchObject({ type: "COD", amount: 2500 });
    expect(parsed.find((p) => p.tracking === "383011751254")).toMatchObject({ type: "FTC", amount: 980 });
  });

  it("montos con separador de miles ($1,250.00)", () => {
    const parsed = parsePaymentsPaste("383264471120\tCOD $1,250.00");
    expect(parsed[0]).toMatchObject({ tracking: "383264471120", type: "COD", amount: 1250 });
  });

  it("la fecha nunca se confunde con el monto (aunque el año sea un número grande)", () => {
    const parsed = parsePaymentsPaste("383264471120\t2026-08-20\tCOD 2500");
    expect(parsed[0]).toMatchObject({ tracking: "383264471120", type: "COD", amount: 2500 });
  });
});

describe("enriquecimiento de high value", () => {
  it("marca filas HV y agrega las que falten, con conteo", () => {
    const base = buildMappedTable([
      ["Tracking No", "Recip Name"],
      ["111111111", "A"],
      ["222222222", "B"],
    ])!;
    const hv = parseHvPaste("111111111\n555555555");
    const merged = mergeHighValue(base, hv);
    expect(merged.counts.highValue).toBe(2);
    expect(merged.rows.find((r) => r.values.trackingNumber === "111111111")!.isHighValue).toBe(true);
    expect(merged.rows.find((r) => r.values.trackingNumber === "555555555")!.manual).toBe(true);
  });
});

describe("normalizeTrackingValue / normalizePhoneValue (limpieza automática)", () => {
  it("quita '.0' de guías que Excel trajo como float", () => {
    expect(normalizeTrackingValue("383012036065.0")).toBe("383012036065");
  });
  it("quita espacios y guiones cuando el resto es numérico", () => {
    expect(normalizeTrackingValue("3830 1203 6065")).toBe("383012036065");
    expect(normalizeTrackingValue("383-012-036-065")).toBe("383012036065");
  });
  it("expande notación científica (best-effort)", () => {
    expect(normalizeTrackingValue("3.83E+11")).toBe("383000000000");
  });
  it("no toca IDs alfanuméricos (DHL JD…)", () => {
    expect(normalizeTrackingValue("JD014600003926438011")).toBe("JD014600003926438011");
  });
  it("teléfono: deja solo dígitos y conserva '+' inicial", () => {
    expect(normalizePhoneValue("(662) 123-4567")).toBe("6621234567");
    expect(normalizePhoneValue("+52 662 123 4567")).toBe("+526621234567");
    expect(normalizePhoneValue("")).toBe("");
  });
  it("buildMappedTable normaliza la guía del pegado", () => {
    const t = buildMappedTable([
      ["Tracking No", "Recip Name", "Phone"],
      ["383012036065.0", "Juan", "(662) 123-4567"],
    ]);
    expect(t).not.toBeNull();
    expect(t!.rows[0].values.trackingNumber).toBe("383012036065");
    expect(t!.rows[0].values.recipientPhone).toBe("6621234567");
  });
});
