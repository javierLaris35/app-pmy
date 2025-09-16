import { useState, useRef, useEffect, useCallback } from "react";

interface TrackingItem {
    codigo: string;
    fecha: string; // YYYY-MM-DD
}

interface EditableBarcodeInputProps {
    placeholder?: string;
    items?: TrackingItem[];
    onChange?: (items: TrackingItem[]) => void;
}

export default function EditableBarcodeInput({
                                                 placeholder = "Escanea o escribe códigos...",
                                                 items = [],
                                                 onChange,
                                             }: EditableBarcodeInputProps) {
    const [trackingItems, setTrackingItems] = useState<TrackingItem[]>(items);
    const editableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTrackingItems(items);
    }, [items]);

    const handleInput = useCallback(() => {
        if (!editableRef.current) return;

        // Tomamos el texto plano del contenido
        const text = editableRef.current.innerText;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

        // Mapeamos los códigos a items, si ya tenemos fechas las mantenemos
        const newItems: TrackingItem[] = lines.map(code => {
            const existing = trackingItems.find(i => i.codigo === code);
            return existing ? existing : { codigo: code, fecha: "" };
        });

        setTrackingItems(newItems);
        onChange?.(newItems);
    }, [trackingItems, onChange]);

    // Renderizamos cada línea como span con estilo según fecha
    const renderContent = () => {
        return trackingItems.map((item, index) => {
            const isToday = item.fecha === new Date().toISOString().split("T")[0];
            return (
                <div key={item.codigo + index} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{item.codigo}</span>
                    <span style={{ color: isToday ? "red" : "black", marginLeft: "10px" }}>
            {item.fecha} {isToday && "📌"}
          </span>
                </div>
            );
        });
    };

    return (
        <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            style={{
                minHeight: "100px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "8px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
            }}
            placeholder={placeholder}
        >
            {renderContent()}
        </div>
    );
}
