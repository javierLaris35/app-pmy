// hooks/useLocalStorage.ts
import { useState, useEffect } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === "undefined") return initialValue;
      
      const item = window.localStorage.getItem(key);
      
      // Manejar caso especial: si el valor es la string "undefined"
      if (item === "undefined") {
        console.warn(`[useLocalStorage] Valor "undefined" encontrado para clave "${key}", usando valor inicial`);
        return initialValue;
      }
      
      // Si el item es null o string vacía
      if (item === null || item === "") {
        return initialValue;
      }
      
      // Intentar parsear el JSON
      try {
        return JSON.parse(item);
      } catch (parseError) {
        console.error(`[useLocalStorage] Error parsing JSON for key "${key}":`, parseError);
        
        // Intentar limpiar el valor corrupto
        try {
          window.localStorage.removeItem(key);
        } catch {}
        
        return initialValue;
      }
      
    } catch (error) {
      console.error(`[useLocalStorage] Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== "undefined") {
        // Evitar guardar valores undefined como string
        if (valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`[useLocalStorage] Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

export { useLocalStorage };