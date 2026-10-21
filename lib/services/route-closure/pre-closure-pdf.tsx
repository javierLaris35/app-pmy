import React from "react"
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { DEVOLUCIONES_PER_PAGE, type PreClosureSheet } from "./pre-closure-sheet"

/**
 * Pre-cierre de ruta: copia de la hoja que el chofer llena a mano (Devolución / Recolección /
 * Cash / resumen / observaciones / firma). Se imprime ANTES de cerrar para revisarla con el chofer.
 */
const ink = "#111111"
const header = "#d9d9d9"
const CASH_ROWS = 12

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica", color: ink },
  top: { flexDirection: "row", justifyContent: "space-between" },
  company: { width: "60%", alignItems: "center" },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center" },
  city: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6 },
  meta: { width: "38%" },
  metaRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 6 },
  metaLabel: { fontFamily: "Helvetica-Bold", width: 70 },
  metaValue: { flex: 1, borderBottomWidth: 1, borderBottomColor: ink, fontSize: 10, paddingLeft: 4, minHeight: 13 },
  nameRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4, marginBottom: 10, borderBottomWidth: 1.5, borderBottomColor: ink, paddingBottom: 2 },
  nameLabel: { fontFamily: "Helvetica-Bold", fontSize: 11, marginRight: 6 },
  nameValue: { fontSize: 11, flex: 1 },
  tables: { flexDirection: "row", justifyContent: "space-between" },
  table: { borderWidth: 1, borderColor: ink },
  th: { backgroundColor: header, fontFamily: "Helvetica-Bold", textAlign: "center", paddingVertical: 3, borderBottomWidth: 1, borderColor: ink },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: ink, minHeight: 15, alignItems: "center" },
  num: { width: 16, textAlign: "center", fontSize: 6.5, borderRightWidth: 0.5, borderColor: ink, alignSelf: "stretch", paddingTop: 4 },
  cell: { flex: 1, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: ink, alignSelf: "stretch", paddingTop: 3 },
  /** Celda de ancho fijo (flex:0 no gana en react-pdf si se mezcla con `cell`). */
  fixed: { paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: ink, alignSelf: "stretch", paddingTop: 3, flexGrow: 0, flexShrink: 0 },
  dexCell: { width: 34, textAlign: "center", fontFamily: "Helvetica-Bold", alignSelf: "stretch", paddingTop: 3 },
  ldMark: { fontSize: 6, fontFamily: "Helvetica-Bold" },
  bottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  summary: { width: "36%", borderWidth: 1, borderColor: ink },
  sumRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: ink, minHeight: 15, alignItems: "center" },
  sumLabel: { flex: 1, fontFamily: "Helvetica-Bold", paddingLeft: 4, borderRightWidth: 0.5, borderColor: ink, alignSelf: "stretch", paddingTop: 3 },
  sumValue: { width: 40, textAlign: "center", fontSize: 9 },
  obs: { width: "60%" },
  obsBox: { borderWidth: 1, borderColor: ink, height: 60, padding: 4 },
  sign: { marginTop: 40, alignSelf: "flex-end", width: 200, borderTopWidth: 1, borderColor: ink, textAlign: "center", paddingTop: 3, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  note: { fontSize: 7, marginTop: 6 },
})

const money = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateLabel = (day: string) => {
  const [y, m, d] = day.split("-")
  return `${d}.${m}.${y.slice(2)}`
}

function Header({ sheet, page, pages }: { sheet: PreClosureSheet; page: number; pages: number }) {
  return (
    <>
      <View style={s.top}>
        <View style={s.company}>
          <Text style={s.companyName}>{sheet.companyName.toUpperCase()}</Text>
          <Text style={s.city}>{sheet.city.toUpperCase()}</Text>
          <Text style={{ marginTop: 4, fontSize: 8 }}>PRE-CIERRE DE RUTA{pages > 1 ? ` · HOJA ${page} DE ${pages}` : ""}</Text>
        </View>
        <View style={s.meta}>
          <View style={s.metaRow}><Text style={s.metaLabel}>FECHA:</Text><Text style={s.metaValue}>{dateLabel(sheet.routeDay)}</Text></View>
          <View style={s.metaRow}><Text style={s.metaLabel}>KM SALIDA</Text><Text style={s.metaValue}>{sheet.kmOut ?? ""}</Text></View>
          <View style={s.metaRow}><Text style={s.metaLabel}>KM LLEGADA</Text><Text style={s.metaValue}> </Text></View>
        </View>
      </View>
      <View style={s.nameRow}>
        <Text style={s.nameLabel}>NOMBRE</Text>
        <Text style={s.nameValue}>{sheet.driver}</Text>
        <Text style={s.nameLabel}>ECO:</Text>
        <Text style={{ fontSize: 11, width: 110, flexGrow: 0, flexShrink: 0 }}>{sheet.vehicle ?? ""}</Text>
      </View>
    </>
  )
}

function DevolucionTable({ rows, offset }: { rows: PreClosureSheet["devolucionPages"][number]; offset: number }) {
  return (
    <View style={[s.table, { width: "36%" }]}>
      <Text style={s.th}>DEVOLUCIÓN</Text>
      <View style={[s.row, { backgroundColor: header }]}>
        <Text style={s.num}> </Text>
        <Text style={[s.cell, { fontFamily: "Helvetica-Bold", textAlign: "center" }]}>NÚMERO DE GUÍA</Text>
        <Text style={[s.dexCell]}>DEX</Text>
      </View>
      {Array.from({ length: DEVOLUCIONES_PER_PAGE }, (_, i) => {
        const r = rows[i]
        return (
          <View key={i} style={s.row}>
            <Text style={s.num}>{offset + i + 1}</Text>
            <Text style={s.cell}>
              {r?.trackingNumber ?? ""}
              {r?.ld ? <Text style={s.ldMark}>  · LD</Text> : null}
            </Text>
            <Text style={s.dexCell}>{r?.dex.replace(/^DEX/, "") ?? ""}</Text>
          </View>
        )
      })}
    </View>
  )
}

function RecoleccionTable({ offset }: { offset: number }) {
  return (
    <View style={[s.table, { width: "28%" }]}>
      <Text style={s.th}>RECOLECCIÓN</Text>
      <View style={[s.row, { backgroundColor: header }]}>
        <Text style={s.num}> </Text>
        <Text style={[s.cell, { fontFamily: "Helvetica-Bold", textAlign: "center", borderRightWidth: 0 }]}>NÚMERO DE GUÍA</Text>
      </View>
      {Array.from({ length: DEVOLUCIONES_PER_PAGE }, (_, i) => (
        <View key={i} style={s.row}>
          <Text style={s.num}>{offset + i + 1}</Text>
          <Text style={[s.cell, { borderRightWidth: 0 }]}> </Text>
        </View>
      ))}
    </View>
  )
}

function CashTable({ cash }: { cash: PreClosureSheet["cash"] }) {
  return (
    <View style={{ width: "34%" }}>
      <View style={s.table}>
        <Text style={s.th}>CASH</Text>
        <View style={[s.row, { backgroundColor: header }]}>
          <Text style={[s.fixed, { width: 30, fontFamily: "Helvetica-Bold", textAlign: "center" }]}>T.C</Text>
          <Text style={[s.fixed, { width: 46, fontFamily: "Helvetica-Bold", textAlign: "center" }]}>$</Text>
          <Text style={[s.cell, { fontFamily: "Helvetica-Bold", textAlign: "center", borderRightWidth: 0 }]}>GUÍA</Text>
        </View>
        {Array.from({ length: Math.max(CASH_ROWS, cash.rows.length) }, (_, i) => {
          const r = cash.rows[i]
          return (
            <View key={i} style={s.row}>
              <Text style={[s.fixed, { width: 30, textAlign: "center" }]}>{r?.tc ?? ""}</Text>
              <Text style={[s.fixed, { width: 46, textAlign: "right" }]}>{r ? money(r.amount) : ""}</Text>
              <Text style={[s.cell, { borderRightWidth: 0, fontSize: 7 }]}>{r?.trackingNumber ?? ""}</Text>
            </View>
          )
        })}
      </View>
      <View style={[s.table, { flexDirection: "row", marginTop: 8, minHeight: 18, alignItems: "center" }]}>
        <Text style={{ width: 76, fontFamily: "Helvetica-Bold", textAlign: "center" }}>TOTAL</Text>
        <Text style={{ flex: 1, borderLeftWidth: 0.5, borderColor: ink, paddingLeft: 4, paddingTop: 4, alignSelf: "stretch" }}>
          $ {cash.rows.length ? money(cash.total) : ""}
        </Text>
      </View>
    </View>
  )
}

function Summary({ totals }: { totals: PreClosureSheet["totals"] }) {
  const rows: [string, number | null][] = [
    ["PAQUETES RECIBIDOS", totals.received],
    ["PAQUETES DEVUELTOS", totals.returned],
    ["DEX--03", totals.dex03],
    ["DEX--07", totals.dex07],
    ["DEX--08", totals.dex08],
    ["DEX--12", totals.dex12],
    ["RECOLECCIONES", totals.collections],
    ["ENTREGAS EFECTIVAS", totals.effective],
  ]
  return (
    <View style={s.summary}>
      {rows.map(([label, value]) => (
        <View key={label} style={s.sumRow}>
          <Text style={s.sumLabel}>{label}</Text>
          <Text style={s.sumValue}>{value === null ? "" : value === 0 ? "—" : String(value)}</Text>
        </View>
      ))}
    </View>
  )
}

export function PreClosurePDF({ sheet }: { sheet: PreClosureSheet }) {
  const pages = sheet.devolucionPages.length + (sheet.ldRisk.length ? 1 : 0)
  return (
    <Document title={`Pre-cierre ${sheet.routeDay}`}>
      {sheet.devolucionPages.map((rows, pageIdx) => (
        <Page key={pageIdx} size="LETTER" style={s.page}>
          <Header sheet={sheet} page={pageIdx + 1} pages={pages} />
          <View style={s.tables}>
            <DevolucionTable rows={rows} offset={pageIdx * DEVOLUCIONES_PER_PAGE} />
            <RecoleccionTable offset={pageIdx * DEVOLUCIONES_PER_PAGE} />
            {pageIdx === 0 ? <CashTable cash={sheet.cash} /> : <View style={{ width: "34%" }} />}
          </View>
          {pageIdx === 0 && (
            <>
              <View style={s.bottom}>
                <Summary totals={sheet.totals} />
                <View style={s.obs}>
                  <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>OBSERVACIONES:</Text>
                  <View style={s.obsBox} />
                </View>
              </View>
              {sheet.ldRisk.length > 0 && (
                <Text style={s.note}>
                  Las guías marcadas con "LD" están en riesgo de LD. Detalle en la hoja "Guías con riesgo de LD".
                </Text>
              )}
              <Text style={s.sign}>FIRMA DE RECIBIDO</Text>
            </>
          )}
        </Page>
      ))}

      {sheet.ldRisk.length > 0 && (
        <Page size="LETTER" style={s.page}>
          <Header sheet={sheet} page={pages} pages={pages} />
          <Text style={s.sectionTitle}>GUÍAS CON RIESGO DE LD ({sheet.ldRisk.length})</Text>
          <View style={s.table}>
            <View style={[s.row, { backgroundColor: header }]}>
              <Text style={s.num}> </Text>
              <Text style={[s.cell, { flex: 1.2, fontFamily: "Helvetica-Bold" }]}>GUÍA</Text>
              <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>DESTINATARIO</Text>
              <Text style={[s.cell, { flex: 0.8, fontFamily: "Helvetica-Bold" }]}>VENCE</Text>
              <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold", borderRightWidth: 0 }]}>SEÑALES</Text>
            </View>
            {sheet.ldRisk.map((r, i) => (
              <View key={r.trackingNumber + i} style={s.row} wrap={false}>
                <Text style={s.num}>{i + 1}</Text>
                <Text style={[s.cell, { flex: 1.2 }]}>{r.trackingNumber}</Text>
                <Text style={[s.cell, { flex: 2 }]}>{r.recipient}</Text>
                <Text style={[s.cell, { flex: 0.8 }]}>{r.due ? dateLabel(r.due) : "—"}</Text>
                <Text style={[s.cell, { flex: 2, borderRightWidth: 0 }]}>{r.signals.join(" · ")}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  )
}
