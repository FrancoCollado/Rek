import { Check } from "lucide-react"

export function QuienesSomos() {
  return (
    <section id="quienes-somos" className="py-20 md:py-32 px-6 bg-muted">
      <div className="container mx-auto max-w-5xl">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Somos un espacio integral de rehabilitación y bienestar
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              En REK integramos kinesiología y entrenamiento, orientados tanto a la rehabilitación como al bienestar físico general. Trabajamos con pacientes en proceso de recuperación y también con personas que buscan mejorar su rendimiento o calidad de movimiento.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Nuestro enfoque es personalizado: cada persona es acompañada según sus necesidades, objetivos y etapa de recuperación.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">Enfoque personalizado</h3>
                <p className="text-muted-foreground">Cada persona es evaluada según sus necesidades y objetivos específicos</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">Terapia integral</h3>
                <p className="text-muted-foreground">Combinamos terapia manual con trabajo activo para resultados óptimos</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">Profesionales presentes</h3>
                <p className="text-muted-foreground">Durante cada sesión, nuestros profesionales están guiando y adaptando el tratamiento</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">Espacios equipados</h3>
                <p className="text-muted-foreground">Disponemos de áreas específicas para rehabilitación y entrenamiento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
