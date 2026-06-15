import { Users, Award, Clock, Heart } from "lucide-react"

const stats = [
  { icon: Users, value: "+5.000", label: "Pacientes atendidos" },
  { icon: Award, value: "15", label: "Años de experiencia" },
  { icon: Clock, value: "24/7", label: "Atención online" },
  { icon: Heart, value: "98%", label: "Satisfacción" },
]

export function About() {
  return (
    <section id="nosotros" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-4">Sobre Nosotros</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
              Un equipo comprometido con tu salud
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                En <span className="text-foreground font-medium">rek</span> creemos que el bienestar 
                es un camino que se construye día a día. Por eso, nuestro equipo de profesionales 
                trabaja de manera interdisciplinaria para ofrecerte la mejor atención.
              </p>
              <p>
                Combinamos años de experiencia con tecnología de vanguardia para brindarte 
                tratamientos personalizados que se adaptan a tus necesidades específicas.
              </p>
              <p>
                Ya sea que busques rehabilitarte de una lesión, mejorar tu postura, 
                o simplemente mantenerte en forma, en rek encontrarás el acompañamiento 
                profesional que necesitás.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="bg-card border border-border rounded-lg p-6 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-serif text-3xl md:text-4xl mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
