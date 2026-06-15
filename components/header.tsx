"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo className="h-10 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <Link href="#quienes-somos" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Nosotros
            </Link>
            <Link href="#servicios" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Servicios
            </Link>
            <Link href="#profesionales" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Equipo
            </Link>
            <Link href="#contacto" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Contacto
            </Link>
            <Button asChild size="sm">
              <Link href="#turnos">Reservar turno</Link>
            </Button>
          </div>

          <button 
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pt-4 pb-2 flex flex-col gap-4">
            <Link 
              href="#quienes-somos" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Nosotros
            </Link>
            <Link 
              href="#servicios" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Servicios
            </Link>
            <Link 
              href="#profesionales" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Equipo
            </Link>
            <Link 
              href="#contacto" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Contacto
            </Link>
            <Button asChild className="w-fit" size="sm">
              <Link href="#turnos" onClick={() => setIsMenuOpen(false)}>Reservar turno</Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  )
}
