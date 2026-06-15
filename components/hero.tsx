import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="pt-32 pb-20 md:pb-32 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="space-y-8">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-widest text-primary font-bold">
              Entrenamiento & Kinesiología
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl leading-tight font-bold text-balance tracking-tight">
              Recuperate, 
              <span className="text-primary"> Movete mejor</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              En REK acompañamos tu recuperación con un enfoque integral y personalizado. Trabajamos tanto con pacientes en proceso de rehabilitación como con personas que buscan mejorar su rendimiento y calidad de movimiento.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" asChild className="text-base">
              <Link href="#turnos">
                Reservar turno
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link href="#quienes-somos">
                Conoce más sobre nosotros
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
