// app/configuracion/plantillas/editor/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { withAuth } from "@/hoc/withAuth";
import { TemplateEditor } from "@/components/configuracion/plantillas/template-editor";

// Nota: el proyecto usa `output: "export"` (build estático empaquetado en Electron
// vía electron-serve, ver main/main.cjs), por lo que una ruta dinámica `[id]` no es
// viable — `next build` falla sin generateStaticParams() y los ids de plantilla no
// se conocen en build time. Se sigue el patrón ya usado por app/monitoreo-rutas/page.tsx:
// ruta estática + `useSearchParams()` (bajo Suspense) para llevar el id por query string.
function TemplateEditorContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id) return null;
  return <TemplateEditor templateId={id} />;
}

function TemplateEditorPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <TemplateEditorContent />
      </Suspense>
    </AppLayout>
  );
}

// Nota: `UserRole` (lib/types.ts) solo declara "superamin" (typo histórico), no
// "superadmin"; withAuth ya trata ambas grafías como super-rol en SUPER_ROLES
// (hoc/withAuth.tsx), así que listar "superamin" aquí basta para exigir superadmin.
export default withAuth(TemplateEditorPage, ["superamin"]);
