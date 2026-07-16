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
          // Inserta el token en el componente seleccionado o al final del cuerpo.
          if (selected) selected.append(token);
          else editor.getWrapper()?.append(token);
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
