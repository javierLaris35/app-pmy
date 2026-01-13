// components/dashboard/DashboardWelcomeWrapper.tsx
"use client";

import { useState, useEffect } from "react";
import DashboardWelcome from "./DashboardWelcome";

interface DashboardWelcomeWrapperProps {
  userId: string;
}

export default function DashboardWelcomeWrapper({ userId }: DashboardWelcomeWrapperProps) {
  const [showWelcome, setShowWelcome] = useState(false);
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

  // Opcional: Agregar un botón/flotante en desarrollo para forzar reapertura
  if (isDevelopment && !showWelcome) {
    return (
      <>
        <DashboardWelcome
          open={showWelcome}
          onOpenChange={handleClose}
          userId={userId}
        />
        {/* Botón flotante para forzar apertura en desarrollo */}
        <button
          onClick={() => setShowWelcome(true)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          title="Forzar apertura Dashboard (solo desarrollo)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </>
    );
  }

  return (
    <DashboardWelcome
      open={showWelcome}
      onOpenChange={handleClose}
      userId={userId}
    />
  );
}