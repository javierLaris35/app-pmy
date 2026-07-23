"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { remoteWsBaseUrl, type RemoteProtocol } from "@/lib/services/remote";

type Status = "connecting" | "connected" | "disconnected" | "error";

interface RemoteDesktopProps {
  authToken: string;
  connectionToken: string;
  protocol: RemoteProtocol;
  wsBaseUrl?: string;
}

const CONNECTED = 3;
const DISCONNECTED = 5;

export function RemoteDesktop({ authToken, connectionToken, protocol, wsBaseUrl }: RemoteDesktopProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const guacRef = useRef<any>(null);
  const clientRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  
  const isConnectingRef = useRef(false);
  const retry = useRef<{ attempts: number; timer?: any; dead?: boolean }>({ attempts: 0 });
  const [status, setStatus] = useState<Status>("connecting");

  const cleanup = useCallback(() => {
    isConnectingRef.current = false;
    roRef.current?.disconnect();
    roRef.current = null;
    keyboardRef.current?.reset?.();
    keyboardRef.current = null;
    try {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    } catch {
      /* noop */
    }
    clientRef.current = null;
  }, []);

  const scheduleReconnect = useCallback((connectFn: () => void) => {
    const st = retry.current;
    if (st.dead || st.attempts >= 6) {
      setStatus("error");
      return;
    }
    const delay = Math.min(1000 * 2 ** st.attempts, 15_000);
    st.attempts += 1;
    st.timer = setTimeout(() => {
      setStatus("connecting");
      connectFn();
    }, delay);
  }, []);

  const connect = useCallback(async () => {
    // Evita ejecuciones duplicadas simultáneas por StrictMode o montajes rápidos
    if (isConnectingRef.current || retry.current.dead) return;
    isConnectingRef.current = true;

    const viewport = viewportRef.current;
    if (!viewport) {
      isConnectingRef.current = false;
      return;
    }

    cleanup();

    try {
      const mod: any = await import("guacamole-common-js");
      const Guacamole = mod.default ?? mod;
      guacRef.current = Guacamole;

      // El upgrade WS NO vive bajo /api (el global prefix de Nest no aplica al
      // servidor HTTP raw). Tomamos el ORIGEN del API (https→wss), quitamos el
      // sufijo /api si lo trae, y colgamos /ws/guacamole. Así funciona contra el
      // backend actual y detrás de Cloudflare Tunnel, sin IPs hardcodeadas.
      const wsBase = (wsBaseUrl ?? remoteWsBaseUrl())
        .replace(/\/api\/?$/i, "")
        .replace(/\/+$/, "");
      const tunnelUrl = `${wsBase}/ws/guacamole`;

      const params = new URLSearchParams({
        token: authToken,
        connection: connectionToken,
        width: String(Math.max(640, Math.floor(viewport.clientWidth))),
        height: String(Math.max(480, Math.floor(viewport.clientHeight))),
        dpi: "96",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const tunnel = new Guacamole.WebSocketTunnel(tunnelUrl);
      const client = new Guacamole.Client(tunnel);
      clientRef.current = client;

      const displayEl = client.getDisplay().getElement();
      viewport.replaceChildren(displayEl);

      client.onstatechange = (s: number) => {
        if (s === CONNECTED) {
          setStatus("connected");
          retry.current.attempts = 0;
          isConnectingRef.current = false;
          viewport.focus(); // el teclado sólo captura si el div tiene foco
        }
        if (s === DISCONNECTED) {
          setStatus("disconnected");
          isConnectingRef.current = false;
          scheduleReconnect(connect);
        }
      };

      tunnel.onerror = () => {
        setStatus("disconnected");
        isConnectingRef.current = false;
        scheduleReconnect(connect);
      };

      // ===== TECLADO =====
      const keyboard = new Guacamole.Keyboard(viewport);
      keyboard.onkeydown = (keysym: number) => {
        client.sendKeyEvent(1, keysym);
        return false;
      };
      keyboard.onkeyup = (keysym: number) => {
        client.sendKeyEvent(0, keysym);
        return false;
      };
      keyboardRef.current = keyboard;

      // ===== MOUSE + TOUCH =====
      // `true` = applyDisplayScale: convierte coords del display escalado a las
      // del remoto (sin esto el puntero "se queda corto" y no llega a los bordes).
      const sendMouse = (state: any) => client.sendMouseState(state, true);
      // Enfocamos el viewport en cada click: Guacamole.Mouse hace preventDefault
      // y le roba el foco al div, dejando el teclado muerto.
      const focusAndSend = (state: any) => {
        viewport.focus();
        sendMouse(state);
      };
      const mouse = new Guacamole.Mouse(displayEl);
      mouse.onmousedown = focusAndSend;
      mouse.onmouseup = mouse.onmousemove = sendMouse;
      const touch = new Guacamole.Mouse.Touchpad(displayEl);
      touch.onmousedown = focusAndSend;
      touch.onmouseup = touch.onmousemove = sendMouse;

      // ===== PORTAPAPELES remoto → local =====
      client.onclipboard = (stream: any, mimetype: string) => {
        if (!mimetype.startsWith("text/")) return;
        const reader = new Guacamole.StringReader(stream);
        let buf = "";
        reader.ontext = (t: string) => (buf += t);
        reader.onend = () => navigator.clipboard?.writeText(buf).catch(() => {});
      };

      // ===== Escalado automático =====
      const rescale = () => {
        const d = client.getDisplay();
        if (!d.getWidth() || !d.getHeight() || !viewport.clientWidth) return;
        d.scale(Math.min(viewport.clientWidth / d.getWidth(), viewport.clientHeight / d.getHeight()));
      };
      client.getDisplay().onresize = rescale;
      roRef.current = new ResizeObserver(rescale);
      roRef.current.observe(viewport);

      client.connect(params.toString());
    } catch {
      isConnectingRef.current = false;
      setStatus("disconnected");
      scheduleReconnect(connect);
    }
  }, [authToken, connectionToken, wsBaseUrl, cleanup, scheduleReconnect]);

  const pushLocalClipboard = useCallback(async () => {
    const Guacamole = guacRef.current;
    const client = clientRef.current;
    if (!Guacamole || !client) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const stream = client.createClipboardStream("text/plain");
      const writer = new Guacamole.StringWriter(stream);
      writer.sendText(text);
      writer.sendEnd();
    } catch {
      /* permisos denegados */
    }
  }, []);

  useEffect(() => {
    retry.current = { attempts: 0, dead: false };
    void connect();

    return () => {
      retry.current.dead = true;
      clearTimeout(retry.current.timer);
      cleanup();
    };
  }, [connect, cleanup]);

  return (
    <Card className="relative h-full w-full overflow-hidden bg-black">
      <div
        ref={viewportRef}
        tabIndex={0}
        onFocus={pushLocalClipboard}
        className="h-full w-full outline-none [&_canvas]:mx-auto [&_canvas]:block"
        style={{ cursor: protocol === "vnc" ? "none" : "default" }}
      />
      {status !== "connected" && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 text-sm text-white">
          {status === "connecting" && "Conectando…"}
          {status === "disconnected" && "Reconectando…"}
          {status === "error" && "No se pudo establecer la sesión."}
        </div>
      )}
    </Card>
  );
}