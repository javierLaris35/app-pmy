/**
 * Feedback sonoro del escáner (inventario / bodega).
 *
 * Problemas que resuelve y por qué los sonidos "se colgaban" o "no se oían":
 *  - Antes se hacía `new AudioContext()` en CADA beep y nunca se cerraba. Los
 *    navegadores limitan los AudioContext por página (Chrome ~6, Safari similar):
 *    tras unos cuantos escaneos `new AudioContext()` fallaba y el audio moría.
 *  - El contexto nace en estado `suspended` por las autoplay policies; sin
 *    `resume()` (sobre todo en Safari/iOS con `webkitAudioContext`) no sonaba.
 *
 * Aquí usamos UN solo contexto compartido (singleton de módulo), lo desbloqueamos
 * en el primer gesto del usuario y llamamos `resume()` antes de cada sonido.
 * Así los tres sonidos quedan siempre disponibles y funcionan en cualquier navegador.
 */

let ctx: AudioContext | null = null;
let unlockBound = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    try {
      ctx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Desbloqueo por gesto del usuario (autoplay policies de Chrome/Safari/iOS). */
function ensureUnlockListener() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const unlock = () => {
    const c = getCtx();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  };
  ["pointerdown", "keydown", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, unlock, { passive: true })
  );
}

interface Tone {
  freq: number;
  /** Offset en segundos respecto al inicio de la secuencia. */
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(tones: Tone[]) {
  const c = getCtx();
  if (!c) return;

  const run = () => {
    const base = c.currentTime;
    for (const t of tones) {
      try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = t.type ?? "square";
        osc.frequency.setValueAtTime(t.freq, base + t.start);
        gain.gain.setValueAtTime(t.gain ?? 0.2, base + t.start);
        gain.gain.setValueAtTime(0, base + t.start + t.duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(base + t.start);
        osc.stop(base + t.start + t.duration + 0.02);
      } catch {
        /* ignorar errores puntuales de un tono */
      }
    }
  };

  // Reanudar si está suspendido (autoplay policy) y luego reproducir.
  if (c.state === "suspended") {
    c.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

/**
 * Inicializa el feedback sonoro: enlaza el desbloqueo por gesto y prepara el
 * contexto. Llamar una vez al montar la pantalla del escáner.
 */
export function initScannerFeedback() {
  ensureUnlockListener();
  getCtx();
}

/** VENCE HOY: doble beep agudo (square 1000 Hz). */
export function playExpiresTodaySound() {
  playTones([
    { freq: 1000, start: 0, duration: 0.1, type: "square", gain: 0.2 },
    { freq: 1000, start: 0.15, duration: 0.1, type: "square", gain: 0.2 },
  ]);
}

/** VENCE MAÑANA: un beep suave (sine 700 Hz). */
export function playExpiresTomorrowSound() {
  playTones([{ freq: 700, start: 0, duration: 0.12, type: "sine", gain: 0.12 }]);
}

/** NO ENCONTRADA en sistema: dos tonos descendentes (triangle 880 → 660 Hz). */
export function playNotFoundSound() {
  playTones([
    { freq: 880, start: 0, duration: 0.09, type: "triangle", gain: 0.15 },
    { freq: 660, start: 0.12, duration: 0.12, type: "triangle", gain: 0.15 },
  ]);
}

/** GUÍA INVÁLIDA (formato): triple buzz grave de rechazo (sawtooth 160 Hz). */
export function playInvalidSound() {
  playTones([
    { freq: 160, start: 0, duration: 0.08, type: "sawtooth", gain: 0.18 },
    { freq: 160, start: 0.11, duration: 0.08, type: "sawtooth", gain: 0.18 },
    { freq: 160, start: 0.22, duration: 0.12, type: "sawtooth", gain: 0.18 },
  ]);
}
