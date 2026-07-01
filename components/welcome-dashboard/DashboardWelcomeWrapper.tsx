// components/dashboard/DashboardWelcomeWrapper.tsx
"use client";

import { useState, useEffect } from "react";
import DashboardWelcome from "./DashboardWelcome";
import { useUiStore } from "@/store/ui.store";

interface DashboardWelcomeWrapperProps {
  userId: string;
}

export default function DashboardWelcomeWrapper({ userId }: DashboardWelcomeWrapperProps) {
  // El estado de apertura vive en el store de UI para poder dispararlo también
  // desde el botón del header (solo dev). El FAB flotante se eliminó.
  const showWelcome = useUiStore((s) => s.welcomeOpen);
  const setShowWelcome = useUiStore((s) => s.setWelcomeOpen);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    // Detectar si estamos en desarrollo
    const isDev = process.env.NODE_ENV === 'development';
    setIsDevelopment(isDev);

    const checkIfShouldShow = () => {
      if (isDev) {
        // En desarrollo: siempre mostrar (opcional: cada vez que se recarga)
        const shouldShowInDev = localStorage.getItem('dev_force_show_welcome') !== 'false';
        
        if (shouldShowInDev) {
          setShowWelcome(true);
          // Guardar timestamp para no mostrar demasiado seguido
          const lastShown = Date.now();
          localStorage.setItem('dev_welcome_last_shown', lastShown.toString());
        }
      } else {
        // En producción: solo una vez al día
        const today = new Date().toLocaleDateString('es-MX');
        const lastShownDate = localStorage.getItem(`dashboardWelcomeLastShown_${userId}`);
        
        if (!lastShownDate || lastShownDate !== today) {
          setShowWelcome(true);
          localStorage.setItem(`dashboardWelcomeLastShown_${userId}`, today);
        }
      }
    };

    // Pequeño delay para asegurar que todo esté listo
    const timer = setTimeout(checkIfShouldShow, 1000);
    
    return () => clearTimeout(timer);
  }, [userId]);

  const handleClose = (open: boolean) => {
    if (!open) {
      setShowWelcome(false);
      
      if (isDevelopment) {
        // Opcional: en desarrollo puedes configurar cuánto tiempo esperar
        // antes de mostrar de nuevo después de cerrar
        const cooldownMinutes = 5; // minutos de espera
        const nextAvailableTime = Date.now() + (cooldownMinutes * 60 * 1000);
        localStorage.setItem('dev_welcome_cooldown', nextAvailableTime.toString());
      }
    }
  };

  return (
    <DashboardWelcome
      open={showWelcome}
      onOpenChange={handleClose}
      userId={userId}
    />
  );
}