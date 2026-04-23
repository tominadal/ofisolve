import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: 'OfiSolve - Inteligencia Artificial para Escribanías',
  description: 'Sistema de IA especializado para Escribanías y Notarías en Argentina',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/logo-ofisolve.png',
        type: 'image/png',
      },
    ],
    apple: '/logo-ofisolve.png',
  },
}

import { Toaster } from "sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster position="top-right" richColors />

      </body>
    </html>
  )
}
