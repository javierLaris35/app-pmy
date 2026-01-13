// app/layout.tsx (modificado)
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import HistoryTracker from "@/app/HistoryTracker";
import { Suspense } from "react"
import DashboardWelcomeClient from "@/components/welcome-dashboard/DashboardWelcomeClient"



const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PMY App",
  description: "Sistema de gestión financiera para Paquetería & Mensajería Del Yaqui",
  icons: {
    icon: "/logo-no-fondo.png",
    apple: "/logo-no-fondo.png",
    shortcut: "/logo-no-fondo.png",
  },
  authors: [{ name: "Paquetería del Yaqui © 2026" }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <TooltipProvider>
                <HistoryTracker/>
                <Suspense fallback={null}>
                  {children}
                </Suspense>
                {/* Agregar el componente cliente que manejará la lógica de auth */}
                <DashboardWelcomeClient />
            </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}