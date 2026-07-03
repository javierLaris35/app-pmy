"use client";

import { useCallback, useRef, useState } from "react";
import { MonitorCheck, Loader2, Maximize2, Power, PlugZap } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import type { UserRole } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/lib/toast";
import { allowedPageRoles } from "@/lib/access/allowed-page-roles";
import { startRemoteSession, type RemoteProtocol } from "@/lib/services/remote";
import { RemoteDesktop } from "@/components/remote/remote-desktop";

function AccesoRemotoPage() {
  const token = useAuthStore((s) => s.token);
  const [protocol, setProtocol] = useState<RemoteProtocol>("vnc");
  const [connectionToken, setConnectionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(async (p: RemoteProtocol) => {
    setLoading(true);
    setConnectionToken(null);
    try {
      const { connection } = await startRemoteSession(p);
      setConnectionToken(connection);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo iniciar la sesión remota.");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => setConnectionToken(null), []);

  const changeProtocol = (p: RemoteProtocol) => {
    setProtocol(p);
    if (connectionToken) void connect(p); // reconecta con el nuevo protocolo si ya había sesión
  };

  const goFullscreen = () => stageRef.current?.requestFullscreen?.();

  return (
    <AppLayout>
      <div className="space-y-4">
        <OperationHeader
          icon={MonitorCheck}
          title="Acceso Remoto"
          description="Escritorio (VNC) y terminal (SSH) del servidor · exclusivo superadmin"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={protocol} onValueChange={(v) => changeProtocol(v as RemoteProtocol)}>
                <TabsList>
                  <TabsTrigger value="vnc">Escritorio</TabsTrigger>
                  <TabsTrigger value="ssh">Terminal</TabsTrigger>
                </TabsList>
              </Tabs>
              {connectionToken ? (
                <>
                  <Button variant="outline" size="sm" onClick={goFullscreen} className="gap-1">
                    <Maximize2 className="h-4 w-4" /> Pantalla completa
                  </Button>
                  <Button variant="destructive" size="sm" onClick={disconnect} className="gap-1">
                    <Power className="h-4 w-4" /> Desconectar
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => connect(protocol)} disabled={loading} className="gap-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} Conectar
                </Button>
              )}
            </div>
          }
        />

        <div ref={stageRef} className="h-[calc(100vh-170px)] w-full overflow-hidden rounded-lg bg-black">
          {connectionToken && token ? (
            <RemoteDesktop
              authToken={token}
              connectionToken={connectionToken}
              protocol={protocol}
            />
          ) : (
            <Card className="grid h-full place-items-center border-dashed">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <MonitorCheck className="mx-auto mb-2 h-10 w-10 opacity-40" />
                Presiona <b className="mx-1">Conectar</b> para abrir la sesión{" "}
                {protocol === "vnc" ? "de escritorio (VNC)" : "de terminal (SSH)"} del servidor.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default withAuth(AccesoRemotoPage, allowedPageRoles.accesoRemoto as unknown as UserRole[]);
