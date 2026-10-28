import type { Metadata, Viewport } from "next"
import { Chakra_Petch, Exo_2, JetBrains_Mono } from "next/font/google"

import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const exo = Exo_2({ variable: "--font-exo", subsets: ["latin"] })
// Fonte do título: futurista e com acentos do português corretos (Õ, Ç).
const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["600", "700"] })
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Eleições 2026 · Maranhão",
  description: "Painel dos resultados oficiais do TSE por município do Maranhão, no 1º e 2º turno.",
}

export const viewport: Viewport = {
  themeColor: "#050913",
  colorScheme: "dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`dark ${exo.variable} ${chakra.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh">
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="fx-grade" />
        </div>
        <div aria-hidden className="fx-varredura" />
        <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
      </body>
    </html>
  )
}
