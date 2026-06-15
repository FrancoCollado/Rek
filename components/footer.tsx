import Link from "next/link"
import { MapPin, Phone, Instagram, Mail } from "lucide-react"
import { Logo } from "@/components/logo"

export function Footer() {
  return (
    <footer id="contacto" className="bg-primary/10 border-t border-border py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <Link href="/" className="inline-block">
              <Logo className="h-12 w-auto" />
            </Link>
            <p className="mt-4 text-foreground/70 leading-relaxed">
              Centro integral de rehabilitación y bienestar. Recuperate, movete mejor.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">Ubicación</h4>
            <div className="flex items-start gap-3 text-foreground/70">
              <MapPin className="w-5 h-5 shrink-0 mt-0.5 flex-shrink-0" />
              <span>Martín Fierro 669, Rosario, Argentina</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">Contacto</h4>
            <div className="space-y-3 text-foreground/70">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 shrink-0" />
                <span>341 337 7446</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 shrink-0" />
                <a href="mailto:info@rekcentro.com.ar" className="hover:text-foreground transition-colors">
                  info@rekcentro.com.ar
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">Síguenos</h4>
            <a 
              href="https://instagram.com/rekcentrokinesico"
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/80 transition-colors inline-flex"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-foreground/60">
          <p>© {new Date().getFullYear()} rek. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
