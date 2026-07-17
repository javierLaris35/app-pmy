"use client";

import { useRef } from "react";
import EmailEditor, { EditorRef } from "react-email-editor";
import { BASE_DESIGN } from "./base-design";

export interface UnlayerEditorApi {
  exportDesign: () => Promise<{ design: any; html: string }>;
}

interface Props {
  initialDesign?: any | null;
  variables?: { name: string; label: string }[];
  brand?: { primary?: string } | null;
  onReady?: (api: UnlayerEditorApi) => void;
}

/** Detecta si un designJson es un diseño Unlayer (tiene body.rows) y no un doc de bloques legacy. */
function isUnlayerDesign(d: any): boolean {
  return !!d && typeof d === "object" && d.body && Array.isArray(d.body.rows);
}

export default function UnlayerEditor({ initialDesign, variables, brand, onReady }: Props) {
  const ref = useRef<EditorRef>(null);

  const mergeTags = (variables ?? []).reduce((acc, v) => {
    acc[v.name] = { name: v.label || v.name, value: `{{${v.name}}}` };
    return acc;
  }, {} as Record<string, { name: string; value: string }>);

  const onLoad = (unlayer: any) => {
    try { unlayer.setMergeTags(mergeTags); } catch { /* versión sin setMergeTags: van en options */ }
    unlayer.loadDesign(isUnlayerDesign(initialDesign) ? initialDesign : BASE_DESIGN);
    onReady?.({
      exportDesign: () =>
        new Promise((resolve) => unlayer.exportHtml((data: any) => resolve({ design: data.design, html: data.html }))),
    });
  };

  return (
    // El iframe interno de Unlayer se queda clavado en ~150px si no se fuerza.
    // Forzamos la cadena de contenedores + el iframe a llenar el alto disponible.
    <div className="pmy-unlayer" style={{ height: "100%", width: "100%" }}>
      <style>{`
        .pmy-unlayer, .pmy-unlayer > div, .pmy-unlayer > div > div { height: 100% !important; }
        .pmy-unlayer iframe { height: 100% !important; min-height: 100% !important; }
      `}</style>
      <EmailEditor
        ref={ref}
        onReady={onLoad}
        minHeight="100%"
        options={{
          mergeTags,
          appearance: { theme: "modern_light" },
          features: { textEditor: { tables: true } },
        }}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
