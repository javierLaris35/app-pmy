"use client";

import { useEffect, useRef } from "react";
import grapesjs, { Editor } from "grapesjs";
import grapesjsMjml from "grapesjs-mjml";
import "grapesjs/dist/css/grapes.min.css";

export interface GrapesEditorApi {
  insertVariable: (name: string) => void;
  getContent: () => { mjml: string; designJson: any };
}

interface GrapesEditorProps {
  initialMjml?: string | null;
  initialDesign?: any | null;
  onReady?: (api: GrapesEditorApi) => void;
}

const DEFAULT_MJML = `<mjml><mj-body><mj-section><mj-column><mj-text>Escribe tu contenido…</mj-text></mj-column></mj-section></mj-body></mjml>`;

export default function GrapesEditor({ initialMjml, initialDesign, onReady }: GrapesEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      fromElement: false,
      storageManager: false,
      plugins: [grapesjsMjml as any],
      pluginsOpts: { [grapesjsMjml as any]: {} },
    });
    editorRef.current = editor;

    // Carga inicial: preferir designJson; si no, cargar desde MJML.
    editor.on("load", () => {
      try {
        if (initialDesign) editor.loadProjectData(initialDesign);
        else editor.setComponents(initialMjml || DEFAULT_MJML);
      } catch {
        editor.setComponents(initialMjml || DEFAULT_MJML);
      }

      const api: GrapesEditorApi = {
        insertVariable: (name: string) => {
          const token = `{{${name}}}`;
          const selected = editor.getSelected();
          if (selected) {
            // Inserta el token en el componente seleccionado.
            selected.append(token);
            return;
          }
          // Sin selección: editor.getWrapper() es un contenedor genérico cuyo único
          // hijo es el componente <mjml>; appendear ahí deja el token como hermano
          // DESPUÉS de </mjml> al serializar (MJML inválido, el token se pierde al
          // compilar). Hay que insertar dentro de <mj-body>.
          // Nota: find() usa selectores CSS sobre el tag del DOM renderizado (la vista
          // de grapesjs-mjml usa <div>/<table>/<tr>, no las etiquetas mjml), así que
          // nunca matchea "mj-body". Usamos findType(), que busca por el `type` real
          // del modelo del componente (funciona sin importar el nivel de anidamiento).
          const wrapper = editor.getWrapper();
          const body = wrapper?.findType("mj-body")?.[0];
          const target = body?.findType("mj-text")?.[0] || body?.findType("mj-column")?.[0] || body || wrapper;
          target?.append(token);
        },
        // getHtml() bajo el preset grapesjs-mjml devuelve el MJML fuente.
        getContent: () => ({ mjml: editor.getHtml(), designJson: editor.getProjectData() }),
      };
      onReady?.(api);
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="h-full min-h-[500px] w-full" ref={containerRef} />;
}
