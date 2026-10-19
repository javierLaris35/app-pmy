import { PmyLoader, type LoaderMessagesKey } from "@/components/ui/pmy-loader"

interface LoaderProps {
    className?: string;
    /** Texto fijo. Si no se manda, rotan los mensajes de `messages`. */
    text?: string;
    messages?: LoaderMessagesKey | readonly string[];
    overlay?: boolean;
    transparent?: boolean;
}

export function LoaderWithOverlay({ className, text, messages, overlay = false, transparent = false }: LoaderProps) {
    if (overlay) {
        return <PmyLoader variant="overlay" text={text} messages={messages} transparent={transparent} className={className} />;
    }
    return <PmyLoader variant="block" size="sm" text={text} messages={messages} className={className} />;
}

export function Loader({ text, messages }: Pick<LoaderProps, "text" | "messages"> = {}) {
    return <PmyLoader variant="page" text={text} messages={messages} />;
}
