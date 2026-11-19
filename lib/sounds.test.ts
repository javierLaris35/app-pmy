import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pruebas del módulo de sonidos. Vitest corre en "node" (sin navegador), así que
 * se arma un `window` falso con AudioContext y speechSynthesis de mentira.
 */

type Listener = (...args: any[]) => void;

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
}

class FakeNode {
  connect = vi.fn();
}

class FakeOsc extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  start = vi.fn();
  stop = vi.fn();
}

let contexts: FakeCtx[] = [];
let resumeBehavior: "immediate" | "never" | "slow" = "immediate";

class FakeCtx {
  state: string = "suspended";
  currentTime = 0;
  destination = new FakeNode();
  oscillators: FakeOsc[] = [];
  constructor() {
    contexts.push(this);
  }
  resume = vi.fn(() => {
    if (resumeBehavior === "never") return new Promise<void>(() => {});
    if (resumeBehavior === "slow") {
      return new Promise<void>((r) =>
        setTimeout(() => {
          this.state = "running";
          r();
        }, 1000),
      );
    }
    this.state = "running";
    return Promise.resolve();
  });
  createOscillator = () => {
    const o = new FakeOsc();
    this.oscillators.push(o);
    return o;
  };
  createGain = () => Object.assign(new FakeNode(), { gain: new FakeParam() });
  createDynamicsCompressor = () => new FakeNode();
  createBuffer = () => ({});
  createBufferSource = () => Object.assign(new FakeNode(), { buffer: null, start: vi.fn() });
}

let winListeners: Record<string, Listener[]> = {};
let synth: {
  speaking: boolean;
  pending: boolean;
  paused: boolean;
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  getVoices: () => any[];
  addEventListener: ReturnType<typeof vi.fn>;
};

function installBrowser() {
  contexts = [];
  winListeners = {};
  synth = {
    speaking: false,
    pending: false,
    paused: false,
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [
      { name: "Google español", lang: "es-ES" },
      { name: "Microsoft Sabina", lang: "es-MX" },
    ],
    addEventListener: vi.fn(),
  };
  const win: any = {
    AudioContext: FakeCtx,
    speechSynthesis: synth,
    addEventListener: (evt: string, fn: Listener) => {
      (winListeners[evt] ||= []).push(fn);
    },
    document: { visibilityState: "visible", addEventListener: vi.fn() },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      pitch = 1;
      rate = 1;
      voice: any = null;
      constructor(public text: string) {}
    },
  );
}

async function loadModule() {
  vi.resetModules();
  return import("./sounds");
}

const fire = (evt: string) => (winListeners[evt] || []).forEach((fn) => fn());

beforeEach(() => {
  resumeBehavior = "immediate";
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("pickScanSound (prioridad)", () => {
  it("elige solo el más importante", async () => {
    const { pickScanSound } = await loadModule();
    expect(pickScanSound({ expiresToday: true, invalid: true, added: true })).toBe("invalid");
    expect(pickScanSound({ expiresToday: true, notFound: true })).toBe("notFound");
    expect(pickScanSound({ expiresTomorrow: true, expiresToday: true })).toBe("expiresToday");
    expect(pickScanSound({ expiresTomorrow: true, expiresMonday: true })).toBe("expiresMonday");
    expect(pickScanSound({ duplicate: true, added: true })).toBe("duplicate");
    expect(pickScanSound({ added: true })).toBe("ok");
    expect(pickScanSound({})).toBeNull();
  });
});

describe("sin navegador", () => {
  it("no truena ni suena", async () => {
    const m = await loadModule();
    expect(() => m.playSound("ok")).not.toThrow();
    expect(() => m.speak("hola")).not.toThrow();
    expect(m.playScanResult({ invalid: true })).toBe("invalid");
  });
});

describe("motor de audio", () => {
  beforeEach(() => installBrowser());

  it("engancha el desbloqueo por gesto al importar y reanuda el audio", async () => {
    await loadModule();
    expect(winListeners.keydown?.length).toBe(1);
    expect(winListeners.pointerdown?.length).toBe(1);
    fire("keydown");
    expect(contexts).toHaveLength(1);
    expect(contexts[0].resume).toHaveBeenCalled();
    expect(contexts[0].state).toBe("running");
  });

  it("usa un solo contexto de audio para todos los sonidos", async () => {
    const m = await loadModule();
    fire("pointerdown");
    m.playSound("ok");
    vi.advanceTimersByTime(100);
    m.playSound("expiresToday");
    vi.advanceTimersByTime(100);
    m.playSound("invalid");
    expect(contexts).toHaveLength(1);
    expect(contexts[0].oscillators.length).toBe(1 + 2 + 3);
  });

  it("un sonido nuevo corta al anterior (ráfagas)", async () => {
    const m = await loadModule();
    fire("keydown");
    m.playSound("expiresToday");
    const first = [...contexts[0].oscillators];
    vi.advanceTimersByTime(80);
    m.playSound("ok");
    for (const o of first) expect(o.stop).toHaveBeenCalledTimes(2); // programado + corte
  });

  it("el mismo sonido repetido en menos de 40 ms suena una vez", async () => {
    const m = await loadModule();
    fire("keydown");
    m.playSound("ok");
    vi.advanceTimersByTime(10);
    m.playSound("ok");
    expect(contexts[0].oscillators).toHaveLength(1);
    vi.advanceTimersByTime(50);
    m.playSound("ok");
    expect(contexts[0].oscillators).toHaveLength(2);
  });

  it("sin permiso de audio no acumula sonidos para después", async () => {
    resumeBehavior = "slow"; // el navegador tarda (sin gesto todavía)
    const m = await loadModule();
    m.playSound("ok");
    vi.advanceTimersByTime(60);
    m.playSound("invalid");
    await vi.advanceTimersByTimeAsync(2000);
    expect(contexts[0].state).toBe("running");
    expect(contexts[0].oscillators).toHaveLength(0);
  });

  it("si el audio arranca rápido sí suena", async () => {
    const m = await loadModule();
    m.playSound("saved");
    await vi.runAllTimersAsync();
    expect(contexts[0].oscillators).toHaveLength(2);
  });

  it("createGrowthBeeper suena solo cuando la lista crece (no al restaurar)", async () => {
    const m = await loadModule();
    fire("keydown");
    const beep = m.createGrowthBeeper("ok");
    beep(m.countLines("A\nB\n\n")); // base restaurada: 2, sin sonido
    expect(contexts[0].oscillators).toHaveLength(0);
    beep(3);
    expect(contexts[0].oscillators).toHaveLength(1);
    vi.advanceTimersByTime(100);
    beep(1); // se borraron guías: sin sonido
    expect(contexts[0].oscillators).toHaveLength(1);
  });

  it("nunca lanza aunque el navegador falle", async () => {
    const m = await loadModule();
    (window as any).AudioContext = class {
      constructor() {
        throw new Error("sin audio");
      }
    };
    expect(() => m.playSound("error")).not.toThrow();
  });
});

describe("voz", () => {
  beforeEach(() => installBrowser());

  it("habla en español de México con la voz estándar", async () => {
    const m = await loadModule();
    m.speak("Pieza agregada");
    vi.advanceTimersByTime(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const u = synth.speak.mock.calls[0][0];
    expect(u.text).toBe("Pieza agregada");
    expect(u.lang).toBe("es-MX");
    expect(u.voice?.lang).toBe("es-MX");
    expect(u.rate).toBe(1.3);
  });

  it("espera a que termine el beep antes de hablar", async () => {
    const m = await loadModule();
    fire("keydown");
    m.playSoundAndSpeak("expiresToday", "Vence hoy");
    expect(synth.speak).not.toHaveBeenCalled();
    vi.advanceTimersByTime(m.soundDurationMs("expiresToday") + 5);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("si la voz se pide ANTES que el beep, igual sale después del beep", async () => {
    const m = await loadModule();
    fire("keydown");
    m.speak("La guía no se encontró");
    m.playSound("notFound");
    vi.advanceTimersByTime(50);
    expect(synth.speak).not.toHaveBeenCalled();
    vi.advanceTimersByTime(m.soundDurationMs("notFound"));
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("si ya está hablando, cancela y deja un respiro antes de la frase nueva", async () => {
    const m = await loadModule();
    synth.speaking = true;
    m.speak("Pieza duplicada");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).not.toHaveBeenCalled();
    vi.advanceTimersByTime(70);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("la frase nueva reemplaza a la que estaba en espera", async () => {
    const m = await loadModule();
    synth.speaking = true;
    m.speak("Uno");
    m.speak("Dos");
    vi.advanceTimersByTime(100);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0].text).toBe("Dos");
  });
});
