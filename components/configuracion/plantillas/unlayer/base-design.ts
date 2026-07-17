/** Diseño Unlayer mínimo branded: encabezado + texto + pie. Para correos nuevos
 *  o los que aún no tienen diseño Unlayer (p.ej. sembrados como bloques en Fase 3). */
export const BASE_DESIGN: any = {
  body: {
    rows: [
      { cells: [1], columns: [{ contents: [
        { type: 'text', values: { text: '<h1 style="margin:0">Título</h1>' } },
        { type: 'text', values: { text: '<p>Escribe tu contenido aquí. Inserta variables desde "Merge Tags".</p>' } },
      ] }] },
    ],
    values: {},
  },
};
