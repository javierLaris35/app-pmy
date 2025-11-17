import { useState, useEffect, useCallback } from 'react';

interface UseBrowserVoiceOptions {
    text?: string;
    pitch?: number;
    rate?: number;
    autoSelectVoice?: boolean;
}

interface UseBrowserVoiceReturn {
    speak: (textToSpeak?: string) => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    voices: SpeechSynthesisVoice[];
    selectedVoice: SpeechSynthesisVoice | null;
    setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
    isSpeaking: boolean;
    isPaused: boolean;
    pitch: number;
    rate: number;
    setPitch: (pitch: number) => void;
    setRate: (rate: number) => void;
}

export function useBrowserVoice(options: UseBrowserVoiceOptions = {}): UseBrowserVoiceReturn {
    const {
        text: defaultText = '',
        pitch: defaultPitch = 0.8,
        rate: defaultRate = 1.0,
        autoSelectVoice = true,
    } = options;

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [pitch, setPitch] = useState(defaultPitch);
    const [rate, setRate] = useState(defaultRate);

    // Cargar voces disponibles
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);

            // Auto-seleccionar voz si está habilitado
            if (autoSelectVoice && !selectedVoice && availableVoices.length > 0) {
                // Buscar la voz "Microsoft Alonso" o similar
                const preferredVoice = availableVoices.find(v =>
                    v.name.toLowerCase().includes('alonso') &&
                    (v.lang.includes('es-MX') || v.lang.includes('es-US'))
                );

                // Si no encuentra Alonso, buscar otras voces en español mexicano
                const fallbackVoice = preferredVoice || availableVoices.find(v =>
                    v.lang.includes('es-MX')
                ) || availableVoices.find(v =>
                    v.lang.includes('es') && (
                        v.name.toLowerCase().includes('male') ||
                        v.name.toLowerCase().includes('masculin') ||
                        v.name.toLowerCase().includes('diego') ||
                        v.name.toLowerCase().includes('juan')
                    )
                ) || availableVoices.find(v => v.lang.includes('es'));

                if (fallbackVoice) {
                    setSelectedVoice(fallbackVoice);
                }
            }
        };

        loadVoices();

        // Algunos navegadores cargan las voces de forma asíncrona
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [autoSelectVoice, selectedVoice]);

    // Monitorear el estado de la síntesis de voz
    useEffect(() => {
        const checkSpeakingStatus = setInterval(() => {
            setIsSpeaking(window.speechSynthesis.speaking);
            setIsPaused(window.speechSynthesis.paused);
        }, 100);

        return () => clearInterval(checkSpeakingStatus);
    }, []);

    const speak = useCallback((textToSpeak?: string) => {
        const finalText = textToSpeak || defaultText;

        if (!finalText) {
            console.warn('useBrowserVoice: No text provided to speak');
            return;
        }

        // Cancelar cualquier reproducción en curso
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(finalText);
        utterance.lang = 'es-MX';
        utterance.pitch = pitch;
        utterance.rate = rate;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        // Event listeners
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setIsSpeaking(false);
            setIsPaused(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [defaultText, pitch, rate, selectedVoice]);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const pause = useCallback(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    }, []);

    const resume = useCallback(() => {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    }, []);

    return {
        speak,
        stop,
        pause,
        resume,
        voices,
        selectedVoice,
        setSelectedVoice,
        isSpeaking,
        isPaused,
        pitch,
        rate,
        setPitch,
        setRate,
    };
}