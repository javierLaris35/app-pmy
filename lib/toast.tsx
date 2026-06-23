"use client";

/**
 * Adaptador central de notificaciones — respaldado por **sileo** (reemplaza a sonner).
 *
 * Expone un `toast` con la misma forma de llamada que veníamos usando con sonner
 * (mensaje string primero + opciones), para que migrar los módulos sea solo
 * cambiar el import. Por dentro todo se traduce a la API por-objeto de sileo.
 *
 *   import { toast } from "@/lib/toast";
 *   toast.success("Guardado");
 *   toast.error("Error", { description: "Detalle…" });
 *   toast("Mensaje neutro");
 *   toast.promise(promesa, { loading, success, error });
 *   toast.custom(() => <MiBurbuja/>);
 */

import type { ReactNode } from "react";
import { sileo } from "sileo";
import type { SileoOptions, SileoState } from "sileo";

/** Opciones aceptadas por cada toast (subconjunto de sileo + alias estilo sonner). */
export type ToastOptions = Omit<SileoOptions, "title" | "type"> & {
  /** Alias estilo sonner: { action: { label, onClick } } → botón de sileo. */
  action?: { label: string; onClick: () => void } | SileoOptions["button"];
};

type Message = ReactNode;

/** Convierte (mensaje, opciones) al objeto que espera sileo. */
function toOptions(message: Message, opts?: ToastOptions, type?: SileoState): SileoOptions {
  const { action, ...rest } = opts ?? {};
  const out: SileoOptions = { ...rest };
  if (type) out.type = type;

  // El mensaje principal: si es texto va como title; si es JSX va como description.
  if (typeof message === "string" || typeof message === "number") {
    out.title = String(message);
  } else if (message != null && out.description == null) {
    out.description = message;
  }

  // Normaliza un action estilo sonner ({label,onClick}) al button de sileo ({title,onClick}).
  if (action) {
    if ("label" in action) out.button = { title: action.label, onClick: action.onClick };
    else out.button = action;
  }
  return out;
}

type PromiseStage<T, A> = ReactNode | ((arg: A) => ReactNode);

export interface ToastPromiseOptions<T> {
  loading: ReactNode;
  success: PromiseStage<T, T>;
  error: PromiseStage<T, unknown>;
}

function toStage<A>(v: PromiseStage<unknown, A>, type: SileoState) {
  if (typeof v === "function") {
    const fn = v as (arg: A) => ReactNode;
    return (arg: A) => toOptions(fn(arg), undefined, type);
  }
  return toOptions(v, undefined, type);
}

type ToastFn = (message: Message, opts?: ToastOptions) => string;

interface Toast extends ToastFn {
  success: ToastFn;
  error: ToastFn;
  warning: ToastFn;
  info: ToastFn;
  /** Toast neutro (equivalente a sonner `toast()` / `toast.message()`). */
  message: ToastFn;
  /** Toast de carga persistente (devuelve id para luego dismiss). */
  loading: ToastFn;
  /** Contenido totalmente custom (equivalente a sonner `toast.custom`). */
  custom: (render: () => ReactNode, opts?: ToastOptions) => string;
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    opts: ToastPromiseOptions<T>,
  ) => Promise<T>;
  dismiss: (id?: string) => void;
}

const base = ((message: Message, opts?: ToastOptions) =>
  sileo.show(toOptions(message, opts))) as Toast;

base.success = (m, o) => sileo.success(toOptions(m, o));
base.error = (m, o) => sileo.error(toOptions(m, o));
base.warning = (m, o) => sileo.warning(toOptions(m, o));
base.info = (m, o) => sileo.info(toOptions(m, o));
base.message = (m, o) => sileo.show(toOptions(m, o));
base.loading = (m, o) => sileo.show(toOptions(m, { duration: null, ...o }, "loading"));
base.custom = (render, o) => sileo.show({ ...o, description: render() });
base.promise = (promise, o) =>
  sileo.promise(promise, {
    loading: toOptions(o.loading, undefined, "loading"),
    success: toStage(o.success, "success"),
    error: toStage(o.error, "error"),
  });
base.dismiss = (id) => (id ? sileo.dismiss(id) : sileo.clear());

export const toast = base;
export default toast;
