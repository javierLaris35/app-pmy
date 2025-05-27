import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PMY App",
  description: "Sistema de gestión financiera para Paquetería & Mensajería Del Yaqui",
  icons: {
    icon: "/logo-no-fondo.png",
    apple: "/logo-no-fondo.png",
    shortcut: "/favicon-32x32.png",
  },
  authors: [{ name: "Paquetería del Yaqui © 2025" }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
