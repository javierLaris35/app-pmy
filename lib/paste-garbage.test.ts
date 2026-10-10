import { describe, it, expect } from "vitest";
import { buildMappedTable, parsePaymentsPaste, parseHvPaste, mergePayments, mergeHighValue, isPlausibleTracking } from "./fedex-header-map";

// Encabezado REAL del reporte FedEx (28 columnas, la guía en la 1ª).
const H = "Tracking No\tLatest Dept Location\tLatest Dept Cntry Cd\tOrigin Loc ID\tShpr Co\tShpr Name\tShpr Addr\tShpr City\tShpr State\tShpr Cntry\tShpr Postal\tDestination Loc ID\tRecip Co\tRecip Name\tRecip Addr\tRecip City\tRecip State\tRecip Cntry\tRecip Postal\tService\tCommit Date\tCommit Time\tShpr Phone\tRecip Phone\tShpr Ref\tNo Pieces\tMaster Tracking No\tSpecial Handling Codes";
const row = (t: string) => `${t}\tMXLA\tMX\tMEXA\tAURIMODA\tJULIO\tFRAY 143\tMEXICO\tDF\tMX\t6080\tCENA\tCASA LEY\tJUAN\tBLVD 501\tNAVOJOA\tSO\tMX\t85880\tExpress Saver\t10/07/2026\t21:00:00\t5257098102\t6421002746\t\t1\t\t2`;
const META1 = "305794238300\tALBERTO GUTIERREZ\tSALIDA AEREA\t05/06/2026";
const META2 = "305794239999\tALBERTO GUTIERREZ\tSALIDA AEREA\t05/06/2026";
const tsv = (lines: string[]) => lines.map((l) => l.split("\t"));
const tracks = (lines: string[]) => buildMappedTable(tsv(lines))!.rows.map((r) => r.values.trackingNumber);

describe("basura al pegar varios consolidados del mismo reporte", () => {
  it("la fila del consolidado NO entra como guía aunque el número caiga en la columna de guía", () => {
    expect(tracks([META1, H, row("383961000001"), META2, H, row("383961000003")]))
      .toEqual(["383961000001", "383961000003"]);
  });

  it("3 consolidados: con fila meta, sin fila meta y con renglón vacío entre medio", () => {
    const t = buildMappedTable(tsv([
      META1, H, row("383961000001"), row("383961000002"),
      META2, H, row("383961000003"),
      "", H, row("383961000004"),
    ]))!;
    expect(t.rows.map((r) => r.values.trackingNumber)).toEqual(["383961000001", "383961000002", "383961000003", "383961000004"]);
    expect(t.meta.consNumbers).toEqual(["305794238300", "305794239999"]);
  });

  it("fila del consolidado pegada SIN su encabezado tampoco entra", () => {
    expect(tracks([H, row("383961000001"), META2, row("383961000003")])).toEqual(["383961000001", "383961000003"]);
  });

  it("encabezados sueltos, 'trackingNumber' y totales se quitan y se avisa", () => {
    const t = buildMappedTable(tsv([
      H, row("383961000001"),
      "trackingNumber\trecipientName",
      "TOTAL\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t2",
      row("383961000002"),
    ]))!;
    expect(t.rows.map((r) => r.values.trackingNumber)).toEqual(["383961000001", "383961000002"]);
    expect(t.problems.some((p) => /no son guías/.test(p.message))).toBe(true);
  });

  it("la guía cortada (3.83961E+11) se queda para avisar, no se tira", () => {
    expect(tracks([H, row("3.83961E+11")])).toEqual(["3.83961E+11"]);
  });
});

describe("pagos y alto valor no meten encabezados como guías", () => {
  it("parsePaymentsPaste ignora encabezados repetidos", () => {
    const pays = parsePaymentsPaste(["Tracking No\tCOD", "383961000001\tCOD 100", "Tracking No\tCOD", "383961000002\tCOD 200", "trackingNumber\tcod"].join("\n"));
    expect(pays.map((p) => p.tracking)).toEqual(["383961000001", "383961000002"]);
  });

  it("merge de pagos / alto valor descarta lo que no es guía", () => {
    const base = buildMappedTable(tsv([H, row("383961000001")]))!;
    const merged = mergeHighValue(
      mergePayments(base, [{ tracking: "Tracking No", amount: 5, type: "COD", raw: "COD 5" }]),
      [...parseHvPaste(["Tracking No\tRecip Addr", "383961000009\tCALLE 9", "Tracking No\tRecip Addr"].join("\n")), { tracking: "trackingNumber", address: "" }],
    );
    expect(merged.rows.map((r) => r.values.trackingNumber)).toEqual(["383961000001", "383961000009"]);
  });

  it("isPlausibleTracking", () => {
    expect(isPlausibleTracking("383961000001")).toBe(true);
    expect(isPlausibleTracking("JD014600003926438011")).toBe(true);
    expect(isPlausibleTracking("Tracking No")).toBe(false);
    expect(isPlausibleTracking("trackingNumber")).toBe(false);
    expect(isPlausibleTracking("TOTAL")).toBe(false);
  });
});
