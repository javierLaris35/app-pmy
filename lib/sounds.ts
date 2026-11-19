/**
 * Sonidos del sistema: UN solo módulo para todas las pantallas (escáneres,
 * guardados, avisos). Mismo evento = mismo sonido en todos los módulos.
 *
 * Por qué existe (fallas que corrige respecto a lo anterior):
 *  - Sin permiso de audio todavía, los sonidos se encolaban y salían todos de
 *    golpe al primer clic. Aquí, si el audio no arranca en ~250 ms, el sonido se
 *    DESCARTA (nunca se acumula).
 *  - Escaneos rápidos encimaban tonos y saturaban el volumen. Aquí un sonido
 *    nuevo corta al anterior, todo pasa por un compresor común y el mismo sonido
 *    repetido en < 40 ms se toca una sola vez.
 *  - Lotes con varios casos tocaban dos sonidos a la vez. `playScanResult`
 *    elige UNO por prioridad.
 *  - El contexto queda "interrupted"/"suspended" al cambiar de pestaña o
 *    bloquear el iPhone: se reanuda en cada gesto y al volver a la pestaña.
 *  - La voz se perdía por `cancel()` + `speak()` inmediato (Chrome descarta la
 *    frase). Aquí la voz va en fila, después del beep, sin ese corte.
 *
 * Los tonos se generan con Web Audio (no hay archivos .mp3/.wav). Ninguna
 * función de este módulo lanza errores.
 */

export type SoundKind =
  | "ok"
  | "duplicate"
  | "notFound"
  | "invalid"
  | "expiresToday"
  | "expiresTomorrow"
  | "expiresMonday"
  | "saved"
  | "error"
  | "notify";

interface Tone {
  freq: number;
  /** Segundos desde el inicio del sonido. */
  start: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const t = (freq: number, start: number, duration: number, type: OscillatorType, gain: number): Tone => ({
  freq,
  start,
  duration,
  type,
  gain,
});

/** Catálogo. Vencimientos, no encontrada e inválida conservan los tonos de siempre. */
export const SOUND_TONES: Record<SoundKind, Tone[]> = {
  ok: [t(1320, 0, 0.05, "sine", 0.1)],
  duplicate: [t(520, 0, 0.05, "sine", 0.14), t(520, 0.09, 0.05, "sine", 0.14)],
  notFound: [t(880, 0, 0.09, "triangle", 0.15), t(660, 0.12, 0.12, "triangle", 0.15)],
  invalid: [t(160, 0, 0.08, "sawtooth", 0.18), t(160, 0.11, 0.08, "sawtooth", 0.18), t(160, 0.22, 0.12, "sawtooth", 0.18)],
  expiresToday: [t(1000, 0, 0.1, "square", 0.2), t(1000, 0.15, 0.1, "square", 0.2)],
  expiresTomorrow: [t(700, 0, 0.12, "sine", 0.12)],
  expiresMonday: [t(600, 0, 0.1, "sine", 0.15), t(800, 0.13, 0.1, "sine", 0.15), t(1000, 0.26, 0.14, "sine", 0.15)],
  saved: [t(660, 0, 0.08, "sine", 0.14), t(990, 0.1, 0.14, "sine", 0.14)],
  error: [t(330, 0, 0.16, "square", 0.12), t(220, 0.2, 0.24, "square", 0.12)],
  notify: [t(784, 0, 0.08, "sine", 0.1), t(1175, 0.1, 0.16, "sine", 0.1)],
};

/** Duración total de un sonido en ms (para que la voz espere al beep). */
export function soundDurationMs(kind: SoundKind): number {
  const tones = SOUND_TONES[kind] ?? [];
  return Math.round(Math.max(0, ...tones.map((x) => x.start + x.duration)) * 1000) + 30;
}

// ---------------------------------------------------------------------------
// Prioridad para escaneos/lotes con varios casos: suena SOLO uno.
// ---------------------------------------------------------------------------

export interface ScanResultFlags {
  invalid?: boolean;
  notFound?: boolean;
  expiresToday?: boolean;
  expiresMonday?: boolean;
  expiresTomorrow?: boolean;
  duplicate?: boolean;
  /** Se agregó al menos una guía/pieza válida. */
  added?: boolean;
}

export const SCAN_PRIORITY: (keyof ScanResultFlags)[] = [
  "invalid",
  "notFound",
  "expiresToday",
  "expiresMonday",
  "expiresTomorrow",
  "duplicate",
  "added",
];

const FLAG_TO_SOUND: Record<keyof ScanResultFlags, SoundKind> = {
  invalid: "invalid",
  notFound: "notFound",
  expiresToday: "expiresToday",
  expiresMonday: "expiresMonday",
  expiresTomorrow: "expiresTomorrow",
  duplicate: "duplicate",
  added: "ok",
};

/** Elige el sonido más importante del resultado (o null si no hay nada que avisar). */
export function pickScanSound(flags: ScanResultFlags): SoundKind | null {
  for (const key of SCAN_PRIORITY) if (flags[key]) return FLAG_TO_SOUND[key];
  return null;
}

/** Toca UN sonido según el resultado del escaneo/lote. Devuelve cuál eligió. */
export function playScanResult(flags: ScanResultFlags): SoundKind | null {
  const kind = pickScanSound(flags);
  if (kind) playSound(kind);
  return kind;
}

/**
 * Para escáneres que solo avisan la lista completa (p. ej. recolecciones del
 * cierre): suena `kind` cada vez que la cantidad CRECE. La primera lectura solo
 * fija la base (al restaurar una captura guardada no suena).
 */
export function createGrowthBeeper(kind: SoundKind = "ok") {
  let last: number | null = null;
  return (count: number) => {
    if (last !== null && count > last) playSound(kind);
    last = count;
  };
}

/** Cuenta renglones no vacíos de un texto de guías separado por saltos de línea. */
export const countLines = (raw: string) => raw.split("\n").filter((l) => l.trim()).length;

// ---------------------------------------------------------------------------
// Motor de audio (singleton de módulo).
// ---------------------------------------------------------------------------

/** Si el audio no arranca en este tiempo, el sonido se descarta (no se acumula). */
const RESUME_GRACE_MS = 250;
/** El mismo sonido repetido dentro de esta ventana se toca una vez. */
const DEDUPE_MS = 40;

let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;
let live: OscillatorNode[] = [];
const lastPlayedAt: Partial<Record<SoundKind, number>> = {};
let listenersBound = false;
/** Momento (ms, reloj de `now()`) en que termina el último beep. */
let soundEndsAt = 0;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function getWin(): (Window & typeof globalThis) | null {
  return typeof window === "undefined" ? null : window;
}

function getCtx(): AudioContext | null {
  if (ctx && (ctx.state as string) !== "closed") return ctx;
  const w = getWin();
  if (!w) return null;
  const Ctor = (w as any).AudioContext || (w as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    const c: AudioContext = new Ctor();
    // Compresor + volumen común: evita que tonos encimados saturen.
    const comp = c.createDynamicsCompressor();
    const master = c.createGain();
    master.gain.value = 0.9;
    comp.connect(master);
    master.connect(c.destination);
    ctx = c;
    bus = comp;
    live = [];
  } catch {
    ctx = null;
    bus = null;
  }
  return ctx;
}

function wake() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state !== "running") c.resume().catch(() => {});
    // iOS/Safari: un buffer silencioso dentro del gesto termina de desbloquear.
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* nunca romper la pantalla por audio */
  }
}

/**
 * Engancha el desbloqueo por gesto (clic, tecla —la pistola cuenta como tecla—,
 * toque) y la reanudación al volver a la pestaña. Idempotente; se llama sola al
 * importar el módulo en el navegador.
 */
export function initSounds() {
  const w = getWin();
  if (!w || listenersBound) return;
  listenersBound = true;
  try {
    for (const evt of ["pointerdown", "keydown", "touchstart"]) {
      w.addEventListener(evt, wake, { passive: true, capture: true });
    }
    w.document?.addEventListener?.("visibilitychange", () => {
      if (w.document.visibilityState === "visible" && ctx && ctx.state !== "running") {
        ctx.resume().catch(() => {});
      }
    });
  } catch {
    /* ignorar */
  }
}

function stopLive() {
  for (const osc of live) {
    try {
      osc.stop();
    } catch {
      /* ya terminó */
    }
  }
  live = [];
}

function render(c: AudioContext, kind: SoundKind) {
  stopLive(); // un sonido nuevo corta al anterior (ráfagas limpias)
  const base = c.currentTime + 0.005;
  const out = bus ?? c.destination;
  for (const tone of SOUND_TONES[kind]) {
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const s = base + tone.start;
      const e = s + tone.duration;
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, s);
      // Rampa corta de entrada/salida: sin "clics" al cortar.
      gain.gain.setValueAtTime(0, s);
      gain.gain.linearRampToValueAtTime(tone.gain, s + 0.005);
      gain.gain.setValueAtTime(tone.gain, e);
      gain.gain.linearRampToValueAtTime(0, e + 0.015);
      osc.connect(gain);
      gain.connect(out);
      osc.start(s);
      osc.stop(e + 0.03);
      live.push(osc);
    } catch {
      /* ignorar un tono fallido */
    }
  }
  soundEndsAt = now() + soundDurationMs(kind);
}

/** Toca un sonido del catálogo. Nunca lanza; si no se puede, no suena. */
export function playSound(kind: SoundKind): void {
  try {
    if (!SOUND_TONES[kind]) return;
    initSounds();
    const c = getCtx();
    if (!c) return;

    const at = now();
    const prev = lastPlayedAt[kind];
    if (prev !== undefined && at - prev < DEDUPE_MS) return;
    lastPlayedAt[kind] = at;

    if (c.state === "running") {
      render(c, kind);
      return;
    }
    // Suspendido: intentar reanudar, pero si tarda (sin permiso aún) se descarta.
    c.resume()
      .then(() => {
        if (now() - at <= RESUME_GRACE_MS && c.state === "running") render(c, kind);
      })
      .catch(() => {});
  } catch {
    /* nunca romper la pantalla por audio */
  }
}

// ---------------------------------------------------------------------------
// Voz (síntesis del navegador), en fila y después del beep.
// ---------------------------------------------------------------------------

export interface SpeakOptions {
  pitch?: number;
  rate?: number;
}

/** Voz estándar de los escáneres (la que ya usaban bodega y desembarque). */
const DEFAULT_SPEAK: Required<SpeakOptions> = { pitch: 0.8, rate: 1.3 };
/** Chrome descarta un `speak()` pegado a un `cancel()`; se deja este respiro. */
const AFTER_CANCEL_MS = 60;

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesHooked = false;
let pendingSpeak: ReturnType<typeof setTimeout> | null = null;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.name.toLowerCase().includes("alonso") && /es-(MX|US)/i.test(v.lang)) ||
    voices.find((v) => /es-MX/i.test(v.lang)) ||
    voices.find((v) => /^es/i.test(v.lang)) ||
    null
  );
}

function getSynth(): SpeechSynthesis | null {
  const w = getWin();
  return w && "speechSynthesis" in w ? (w as any).speechSynthesis : null;
}

function resolveVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (!cachedVoice) {
    try {
      cachedVoice = pickVoice(synth.getVoices() ?? []);
      if (!voicesHooked && typeof synth.addEventListener === "function") {
        voicesHooked = true;
        synth.addEventListener("voiceschanged", () => {
          cachedVoice = pickVoice(synth.getVoices() ?? []) ?? cachedVoice;
        });
      }
    } catch {
      /* ignorar */
    }
  }
  return cachedVoice;
}

/**
 * Dice una frase corta. La frase nueva reemplaza a la que esté sonando o en
 * espera, y si hay un beep sonando espera a que termine. Nunca lanza.
 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  try {
    const synth = getSynth();
    if (!synth || !text) return;

    if (pendingSpeak) {
      clearTimeout(pendingSpeak);
      pendingSpeak = null;
    }

    let delay = Math.max(0, soundEndsAt - now());
    if (synth.speaking || synth.pending) {
      synth.cancel();
      delay = Math.max(delay, AFTER_CANCEL_MS);
    }

    const say = () => {
      pendingSpeak = null;
      // Si en el mismo instante empezó un beep (la pantalla pidió la voz antes que
      // el sonido), se espera a que termine para no encimarlos.
      const wait = soundEndsAt - now();
      if (wait > 0) {
        pendingSpeak = setTimeout(say, wait);
        return;
      }
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "es-MX";
        u.pitch = opts.pitch ?? DEFAULT_SPEAK.pitch;
        u.rate = opts.rate ?? DEFAULT_SPEAK.rate;
        const voice = resolveVoice(synth);
        if (voice) u.voice = voice;
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch {
        /* ignorar */
      }
    };

    // Siempre diferido (aunque sea 0 ms): deja que un beep pedido en el mismo
    // instante se registre primero y la voz salga después de él.
    pendingSpeak = setTimeout(say, delay);
  } catch {
    /* nunca romper la pantalla por la voz */
  }
}

/** Toca el beep y después dice la frase (atajo para pantallas con voz). */
export function playSoundAndSpeak(kind: SoundKind, text: string, opts?: SpeakOptions): void {
  playSound(kind);
  speak(text, opts);
}

/** Solo para pruebas: reinicia el estado del módulo. */
export function __resetSoundsForTests() {
  ctx = null;
  bus = null;
  live = [];
  listenersBound = false;
  soundEndsAt = 0;
  cachedVoice = null;
  voicesHooked = false;
  if (pendingSpeak) clearTimeout(pendingSpeak);
  pendingSpeak = null;
  for (const k of Object.keys(lastPlayedAt)) delete lastPlayedAt[k as SoundKind];
}

// Engancha el desbloqueo en cuanto la pantalla importa el módulo.
initSounds();
