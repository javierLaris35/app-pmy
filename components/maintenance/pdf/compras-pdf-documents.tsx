/* Documentos PDF de Compras (se generan en el navegador; no dependen de Chromium en el servidor). */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ComparisonPdfData, PoPdfData, RfqPdfData } from "@/lib/compras-pdf";

export interface PdfCompany {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

const NAVY = "#1e3a5f";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const s = StyleSheet.create({
  page: { paddingVertical: 26, paddingHorizontal: 30, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2.5, borderBottomColor: NAVY, paddingBottom: 9 },
  brand: { flexDirection: "row", alignItems: "center", maxWidth: "62%" },
  logo: { width: 60, height: 44, objectFit: "contain", marginRight: 10 },
  company: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase" },
  meta: { fontSize: 8, color: "#4b5563", marginTop: 1.5 },
  box: { borderWidth: 1.2, borderColor: NAVY, borderRadius: 5, minWidth: 170, overflow: "hidden" },
  boxTitle: { backgroundColor: NAVY, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9.5, textAlign: "center", paddingVertical: 5, letterSpacing: 1 },
  boxFolio: { width: "100%", fontFamily: "Courier-Bold", fontSize: 14, color: NAVY, textAlign: "center", paddingTop: 5, paddingHorizontal: 8 },
  boxLine: { width: "100%", fontSize: 8, color: "#4b5563", textAlign: "center", paddingBottom: 2, paddingHorizontal: 8 },
  draft: { marginTop: 7, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", color: "#b91c1c", textAlign: "center", paddingVertical: 4, fontFamily: "Helvetica-Bold", borderRadius: 3 },
  grid: { flexDirection: "row", marginTop: 10 },
  card: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 5 },
  cardHead: { backgroundColor: "#eef2f7", color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 0.8, paddingVertical: 4, paddingHorizontal: 7, textTransform: "uppercase" },
  cardBody: { paddingVertical: 6, paddingHorizontal: 7 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2 },
  kv: { flexDirection: "row", marginTop: 1.5 },
  k: { width: 58, color: MUTED },
  table: { marginTop: 11 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  th: { backgroundColor: NAVY, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 5, textTransform: "uppercase" },
  td: { paddingVertical: 5, paddingHorizontal: 5 },
  zebra: { backgroundColor: "#f3f4f6" },
  num: { textAlign: "right" },
  ctr: { textAlign: "center" },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  words: { flex: 1, borderWidth: 1, borderStyle: "dashed", borderColor: "#9ca3af", borderRadius: 5, padding: 7, marginRight: 12 },
  wordsK: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 },
  totals: { width: 200 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 7 },
  totFinal: { backgroundColor: NAVY, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 11 },
  notes: { marginTop: 10, borderLeftWidth: 2.5, borderLeftColor: NAVY, backgroundColor: "#f9fafb", paddingVertical: 6, paddingHorizontal: 9 },
  terms: { marginTop: 9, fontSize: 7.5, color: "#4b5563", lineHeight: 1.45 },
  sign: { flexDirection: "row", justifyContent: "space-around", marginTop: 34 },
  signBox: { width: "38%", borderTopWidth: 1, borderTopColor: "#111827", paddingTop: 4, alignItems: "center" },
  bottom: { position: "absolute", bottom: 16, left: 30, right: 30, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5, textAlign: "center", fontSize: 7, color: MUTED },
  sub: { fontSize: 7.5, color: MUTED },
});

function Header({ company, title, folio, lines }: { company: PdfCompany; title: string; folio: string; lines: string[] }) {
  return (
    <View style={s.head}>
      <View style={s.brand}>
        {company.logoUrl ? <Image src={company.logoUrl} style={s.logo} /> : null}
        <View>
          <Text style={s.company}>{company.name}</Text>
          {company.taxId ? <Text style={s.meta}>RFC: {company.taxId}</Text> : null}
          {company.address ? <Text style={s.meta}>{company.address}</Text> : null}
          {company.phone || company.email ? <Text style={s.meta}>{[company.phone && `Tel. ${company.phone}`, company.email].filter(Boolean).join(" · ")}</Text> : null}
        </View>
      </View>
      <View style={s.box}>
        <Text style={s.boxTitle}>{title}</Text>
        <Text style={s.boxFolio}>{folio}</Text>
        {lines.filter(Boolean).map((l, i) => <Text key={i} style={s.boxLine}>{l}</Text>)}
        <View style={{ height: 3 }} />
      </View>
    </View>
  );
}

const KV = ({ k, v }: { k: string; v?: string }) => (v ? <View style={s.kv}><Text style={s.k}>{k}</Text><Text style={{ flex: 1 }}>{v}</Text></View> : null);
const Bottom = ({ company, prefix }: { company: PdfCompany; prefix?: string }) => (
  <Text style={s.bottom} fixed>{[prefix, company.name, company.website, "Documento generado por PMY App"].filter(Boolean).join(" · ")}</Text>
);

// ---------------- Orden de compra ----------------

export function PurchaseOrderDocument({ data: d, company }: { data: PoPdfData; company: PdfCompany }) {
  const cols = [
    { label: "#", w: "6%", key: "index", align: s.ctr },
    { label: "Cant.", w: "9%", key: "quantity", align: s.ctr },
    { label: "Descripción", w: "43%", key: "description", align: {} },
    { label: "P. unitario", w: "14%", key: "unitPrice", align: s.num },
    { label: "Impuestos", w: "13%", key: "taxLabel", align: s.ctr },
    { label: "Importe", w: "15%", key: "amount", align: s.num },
  ] as const;
  return (
    <Document title={`Orden de compra ${d.folio}`}>
      <Page size="LETTER" style={s.page}>
        <Header company={company} title="ORDEN DE COMPRA" folio={d.folio} lines={[d.date, `Sucursal: ${d.subsidiaryName}`]} />
        {d.isDraft && <Text style={s.draft}>BORRADOR — NO VÁLIDA SIN AUTORIZACIÓN</Text>}
        <View style={s.grid}>
          <View style={[s.card, { marginRight: 8 }]}>
            <Text style={s.cardHead}>Proveedor</Text>
            <View style={s.cardBody}>
              <Text style={s.strong}>{d.supplier.name}</Text>
              <KV k="RFC" v={d.supplier.rfc} />
              <KV k="Dirección" v={d.supplier.address} />
              <KV k="Atención" v={d.contact.name} />
              <KV k="Correo" v={d.contact.email} />
              <KV k="Teléfono" v={d.contact.phone} />
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.cardHead}>{d.vehicle.label ? "Unidad a atender" : "Solicitud"}</Text>
            <View style={s.cardBody}>
              <Text style={s.strong}>{d.vehicle.label || d.requestFolio}</Text>
              <KV k="Placas" v={d.vehicle.plates} />
              <KV k="Vehículo" v={d.vehicle.brandModel} />
              <KV k="Kilometraje" v={d.vehicle.kms} />
              <KV k="Tipo" v={d.requestType} />
              {d.vehicle.label ? <KV k="Solicitud" v={d.requestFolio} /> : <KV k="Sucursal" v={d.subsidiaryName} />}
            </View>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tr} fixed>
            {cols.map((c) => <Text key={c.key} style={[s.th, { width: c.w }, c.align]}>{c.label}</Text>)}
          </View>
          {d.rows.map((r, i) => (
            <View key={i} style={[s.tr, i % 2 === 1 ? s.zebra : {}]} wrap={false}>
              {cols.map((c) => <Text key={c.key} style={[s.td, { width: c.w }, c.align]}>{String(r[c.key])}</Text>)}
            </View>
          ))}
        </View>

        <View style={s.foot} wrap={false}>
          <View style={s.words}>
            <Text style={s.wordsK}>Importe con letra</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 3 }}>{d.totalInWords}</Text>
          </View>
          <View style={s.totals}>
            <View style={s.totRow}><Text>Subtotal</Text><Text>{d.subtotal}</Text></View>
            {d.hasIeps && <View style={s.totRow}><Text>IEPS</Text><Text>{d.ieps}</Text></View>}
            <View style={s.totRow}><Text>IVA</Text><Text>{d.tax}</Text></View>
            <View style={[s.totRow, s.totFinal]}><Text>TOTAL</Text><Text>{d.total}</Text></View>
          </View>
        </View>

        {d.notes ? <View style={s.notes}><Text style={{ fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 }}>Observaciones</Text><Text>{d.notes}</Text></View> : null}

        <Text style={s.terms}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Condiciones: </Text>
          Esta orden ampara únicamente los conceptos aquí listados. Cualquier trabajo adicional requiere una nueva autorización por escrito.
          Favor de hacer referencia al folio {d.folio} en su factura y enviarla a nombre de {company.name}{company.taxId ? ` (RFC ${company.taxId})` : ""}.
        </Text>

        <View style={s.sign} wrap={false}>
          <View style={s.signBox}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.authorizedBy || " "}</Text>
            <Text style={s.sub}>Autorizó{d.authorizedAt ? ` · ${d.authorizedAt}` : ""}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.supplier.name}</Text>
            <Text style={s.sub}>Recibido por el proveedor</Text>
          </View>
        </View>
        <Bottom company={company} />
      </Page>
    </Document>
  );
}

// ---------------- Solicitud de cotización ----------------

export function RfqDocument({ data: d, company }: { data: RfqPdfData; company: PdfCompany }) {
  return (
    <Document title={`Solicitud de cotización ${d.folio}`}>
      <Page size="LETTER" style={s.page}>
        <Header company={company} title="SOLICITUD DE COTIZACIÓN" folio={d.folio} lines={[d.date, `Sucursal: ${d.subsidiaryName}`]} />
        <View style={s.grid}>
          <View style={[s.card, { marginRight: 8 }]}>
            <Text style={s.cardHead}>Para</Text>
            <View style={s.cardBody}>
              <Text style={s.strong}>{d.supplierName || "Proveedor"}</Text>
              <KV k="Atención" v={d.contact.name} />
              <KV k="Correo" v={d.contact.email} />
              <KV k="Teléfono" v={d.contact.phone} />
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.cardHead}>{d.vehicle.label ? "Unidad" : "Detalle"}</Text>
            <View style={s.cardBody}>
              {d.vehicle.label ? <Text style={s.strong}>{d.vehicle.label}</Text> : null}
              <KV k="Vehículo" v={d.vehicle.brandModel} />
              <KV k="Placas" v={d.vehicle.plates} />
              <KV k="Tipo" v={d.requestType} />
              <KV k="Servicios" v={d.services.join(", ")} />
              <KV k="Responder a" v={[d.requestedBy, d.replyTo].filter(Boolean).join(" · ")} />
            </View>
          </View>
        </View>

        <Text style={{ marginTop: 10, lineHeight: 1.4 }}>
          Le solicitamos de la manera más atenta su cotización por los siguientes conceptos{d.description ? " — " : ""}
          {d.description ? <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.description}</Text> : null}:
        </Text>

        <View style={s.table}>
          <View style={s.tr} fixed>
            <Text style={[s.th, { width: "6%" }, s.ctr]}>#</Text>
            <Text style={[s.th, { width: "11%" }, s.ctr]}>Cant.</Text>
            <Text style={[s.th, { width: "49%" }]}>Descripción</Text>
            <Text style={[s.th, { width: "17%" }]}>P. unitario</Text>
            <Text style={[s.th, { width: "17%" }]}>Existencia</Text>
          </View>
          {d.rows.map((r, i) => (
            <View key={i} style={[s.tr, i % 2 === 1 ? s.zebra : {}]} wrap={false}>
              <Text style={[s.td, { width: "6%" }, s.ctr]}>{r.index}</Text>
              <View style={[s.td, { width: "11%" }]}><Text style={s.ctr}>{r.quantity}</Text>{r.unit ? <Text style={[s.sub, s.ctr]}>{r.unit}</Text> : null}</View>
              <View style={[s.td, { width: "49%" }]}><Text>{r.description}</Text>{r.detail ? <Text style={s.sub}>{r.detail}</Text> : null}</View>
              <Text style={[s.td, { width: "17%", borderLeftWidth: 1, borderLeftColor: LINE }]}> </Text>
              <Text style={[s.td, { width: "17%", borderLeftWidth: 1, borderLeftColor: LINE }]}> </Text>
            </View>
          ))}
        </View>

        <View style={s.notes}>
          <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 }}>Por favor indíquenos en su cotización:</Text>
          <Text>· Precio unitario de cada concepto y si incluye IVA / IEPS.</Text>
          <Text>· Si lo tiene en existencia o, si es sobre pedido, en cuántos días lo entrega.</Text>
          <Text>· Marca y número de parte cuando aplique, y vigencia de la cotización.</Text>
        </View>
        {d.notes ? <Text style={[s.terms, { fontSize: 8.5 }]}><Text style={{ fontFamily: "Helvetica-Bold" }}>Notas: </Text>{d.notes}</Text> : null}
        <Bottom company={company} prefix="Esta solicitud no es una orden de compra" />
      </Page>
    </Document>
  );
}

// ---------------- Comparativo ----------------

export function ComparisonDocument({ data: d, company }: { data: ComparisonPdfData; company: PdfCompany }) {
  const supW = d.suppliers.length ? `${Math.floor(62 / d.suppliers.length)}%` : "62%";
  return (
    <Document title={`Comparativo ${d.folio}`}>
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Header company={company} title="COMPARATIVO DE COTIZACIONES" folio={d.folio} lines={[`${d.date} · ${d.subsidiaryName}`]} />
        <Text style={{ marginTop: 7 }}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.requestType}</Text>
          {d.vehicleLabel ? ` · Unidad ${d.vehicleLabel}` : ""}{d.description ? ` · ${d.description}` : ""}
        </Text>
        <View style={s.table}>
          <View style={s.tr} fixed>
            <Text style={[s.th, { width: "4%" }, s.ctr]}>#</Text>
            <Text style={[s.th, { width: "26%" }]}>Concepto</Text>
            <Text style={[s.th, { width: "8%" }, s.ctr]}>Cant.</Text>
            {d.suppliers.map((sp, i) => (
              <View key={i} style={[s.th, { width: supW, borderLeftWidth: 1, borderLeftColor: "#3b5b85" }]}>
                <Text style={s.ctr}>{sp.name}</Text>
                <Text style={[s.ctr, { fontFamily: "Helvetica", fontSize: 7, textTransform: "none" }]}>{sp.total} · cubre {sp.covered}</Text>
              </View>
            ))}
          </View>
          {d.rows.map((r) => (
            <View key={r.index} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: "4%" }, s.ctr]}>{r.index}</Text>
              <Text style={[s.td, { width: "26%" }]}>{r.description}</Text>
              <Text style={[s.td, { width: "8%" }, s.ctr]}>{r.quantity}{r.unit ? ` ${r.unit}` : ""}</Text>
              {r.cells.map((c, i) => (
                <View key={i} style={[s.td, { width: supW, borderLeftWidth: 1, borderLeftColor: LINE }, c.best ? { backgroundColor: "#ecfdf5" } : {}, c.selected ? { borderWidth: 1.5, borderColor: NAVY } : {}]}>
                  {c.has ? (
                    <>
                      <Text style={[s.ctr, { fontFamily: "Helvetica-Bold" }]}>{c.unitPrice}{c.selected ? "  (ELEGIDO)" : ""}</Text>
                      <Text style={[s.ctr, s.sub]}>Importe {c.total}{c.quality ? ` · Calidad ${c.quality}` : ""}</Text>
                      <Text style={[s.ctr, c.noStock ? { color: "#b91c1c", fontFamily: "Helvetica-Bold", fontSize: 7.5 } : s.sub]}>{c.noStock ? "SIN EXISTENCIA" : c.availability}</Text>
                    </>
                  ) : <Text style={[s.ctr, s.sub]}>—</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>
        <Text style={[s.sub, { marginTop: 5 }]}>Fondo verde = mejor precio con existencia · Recuadro = proveedor elegido</Text>
        {d.selection.length > 0 && (
          <View style={{ marginTop: 10, width: "50%" }} wrap={false}>
            <View style={s.tr}>
              <Text style={[s.th, { width: "55%" }]}>Órdenes a generar</Text>
              <Text style={[s.th, { width: "20%" }, s.ctr]}>Conceptos</Text>
              <Text style={[s.th, { width: "25%" }, s.num]}>Total</Text>
            </View>
            {d.selection.map((x, i) => (
              <View key={i} style={s.tr}>
                <Text style={[s.td, { width: "55%" }]}>{x.name}</Text>
                <Text style={[s.td, { width: "20%" }, s.ctr]}>{x.count}</Text>
                <Text style={[s.td, { width: "25%" }, s.num]}>{x.total}</Text>
              </View>
            ))}
            <View style={[s.tr, s.totFinal]}>
              <Text style={[s.td, { width: "55%" }]}>TOTAL</Text>
              <Text style={[s.td, { width: "20%" }, s.ctr]}>{d.selectionCount}</Text>
              <Text style={[s.td, { width: "25%" }, s.num]}>{d.selectionTotal}</Text>
            </View>
          </View>
        )}
        <Bottom company={company} prefix={`Elaboró: ${d.preparedBy}`} />
      </Page>
    </Document>
  );
}
