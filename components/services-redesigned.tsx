import { Activity, Hand, Zap } from "lucide-react"

const servicios = [
  {
    title: "Kinesiología",
    description: "Tratamientos orientados a la rehabilitación incluyendo terapia manual, RPG y terapia vestibular.",
    icon: Hand
  },
  {
    title: "Entrenamiento guiado",
    description: "Trabajo de forma supervisada para mejorar rendimiento físico y complementar la recuperación.",
    icon: Activity
  },
  {
    title: "Acompañamiento personalizado",
    description: "Seguimiento constante con profesionales que adaptan cada ejercicio según tu evolución.",
    icon: Zap
  }
]

export function ServicesSection() {
  return (
    <section id="servicios" className="py-20 md:py-32 px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Servicios que transforman
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Ofrecemos un tratamiento integral que combina terapia especializada con entrenamiento guiado
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {servicios.map((servicio, idx) => {
            const Icon = servicio.icon
            return (
              <div key={idx} className="p-8 border border-border rounded-lg hover:border-primary transition-colors">
                <Icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">{servicio.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{servicio.description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-16 p-8 bg-primary/10 rounded-lg border border-primary/20">
          <h3 className="text-2xl font-bold mb-4 text-foreground">Métodos terapéuticos que utilizamos</h3>
          <ul className="grid md:grid-cols-2 gap-3">
            <li className="flex gap-2 text-foreground"><span className="text-primary font-bold">•</span> Terapia Manual ONM</li>
            <li className="flex gap-2 text-foreground"><span className="text-primary font-bold">•</span> RPG (Reeducación Postural Global)</li>
            <li className="flex gap-2 text-foreground"><span className="text-primary font-bold">•</span> Terapia Vestibular</li>
            <li className="flex gap-2 text-foreground"><span className="text-primary font-bold">•</span> MEP (Microelectrolisis Percutánea)</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
