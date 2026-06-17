import type { Metadata } from 'next'
import { DM_Serif_Display, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const dmSerif = DM_Serif_Display({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: 'rek | Centro de Kinesiología, Traumatología, Pilates y Gimnasio',
  description: 'Centro integral de rehabilitación y bienestar. Kinesiología, traumatología, pilates y gimnasio en un solo lugar.',
  icons: {
    icon: [
      {
        url: '/icon.png',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${dmSerif.variable} light`} style={{ colorScheme: 'light' }}>
      <body className="font-sans antialiased bg-background" style={{ colorScheme: 'light' }}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
