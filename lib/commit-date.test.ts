import { describe, expect, it } from "vitest";
import { parseCommitDate, parseCommitTime } from "./commit-date";
import { applyCommitChecks, buildMappedTable } from "./fedex-header-map";

const H = ["Tracking No", "Recip Name", "Recip Postal", "Commit Date", "Commit Time"];

describe("lector de vencimiento (espejo del backend)", () => {
  it("fechas y horas en los formatos que llegan", () => {
    expect(parseCommitDate("10/7/2026").iso).toBe("2026-10-07");
    expect(parseCommitDate("2026-10-07").iso).toBe("2026-10-07");
    expect(parseCommitDate("7-Oct-26").iso).toBe("2026-10-07");
    expect(parseCommitDate("46302").iso).toBe("2026-10-07");
    expect(parseCommitDate("07/10/2026", "2026-10-06").iso).toBe("2026-10-07");
    expect(parseCommitTime("6:00 PM").time).toBe("18:00:00");
    expect(parseCommitTime("0.75").time).toBe("18:00:00");
  });
});

describe("applyCommitChecks", () => {
  const table = buildMappedTable([
    H,
    ["383012036065", "A", "83000", "10/7/2026", "6:00 PM"],
    ["383012036066", "B", "83000", "", ""],
    ["383012036067", "C", "83000", "pendiente", ""],
    ["383012036068", "D", "83000", "10/3/2026", "25:00"],
  ])!;

  it("normaliza, marca problemas y resume por día", () => {
    const { table: t, check } = applyCommitChecks(table, "2026-10-06");
    expect(t.rows[0].values.commitDate).toBe("2026-10-07");
    expect(t.rows[0].values.commitTime).toBe("18:00:00");
    expect(t.rows.map((r) => r.commitIssue)).toEqual([null, "sin_fecha", "fecha_invalida", "hora_invalida"]);
    expect(t.rows[3].commitWarn).toBe("antes_del_consolidado");
    expect(check).toMatchObject({ sinFecha: 1, fechaInvalida: 1, horaInvalida: 1, antesDelConsolidado: 1, bloqueantes: 2 });
    expect(check.byDay).toEqual([{ day: "2026-10-03", count: 1 }, { day: "2026-10-07", count: 1 }]);
  });

  it("las correcciones del usuario quitan el bloqueo", () => {
    const { check, table: t } = applyCommitChecks(table, "2026-10-06", {
      2: { commitDate: "2026-10-08" },
      3: { commitDate: "2026-10-08", commitTime: "18:00" },
    });
    expect(check.bloqueantes).toBe(0);
    expect(t.rows[2].values.commitDate).toBe("2026-10-08");
    expect(t.rows[3].values.commitTime).toBe("18:00:00");
  });

  it("sin columna de fecha: se avisa y capturarla agrega la columna", () => {
    const t0 = buildMappedTable([["Tracking No", "Recip Name"], ["383012036065", "A"]])!;
    expect(applyCommitChecks(t0, "2026-10-06").check.sinColumna).toBe(true);
    const { table: t1 } = applyCommitChecks(t0, "2026-10-06", { 0: { commitDate: "2026-10-07" } });
    expect(t1.fields.some((f) => f.field === "commitDate")).toBe(true);
    expect(t1.rows[0].values.commitDate).toBe("2026-10-07");
  });
});
