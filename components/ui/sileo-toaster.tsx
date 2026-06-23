"use client";

import { useTheme } from "next-themes";
import { Toaster as Sileo } from "sileo";
import "sileo/styles.css";

type SileoToasterProps = React.ComponentProps<typeof Sileo>;

/**
 * Host global de notificaciones (sileo). Reemplaza al Toaster de sonner.
 * Se monta una sola vez en `app-layout.tsx`.
 */
export function Toaster(props: SileoToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sileo
      position="top-right"
      theme={theme as SileoToasterProps["theme"]}
      {...props}
    />
  );
}

export default Toaster;
