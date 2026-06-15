import Image from "next/image"

const profesionales = [
  {
    nombre: "Busso Franco",
    titulo: "Licenciado en Kinesiología y Fisiatría",
    matricula: "MAT 1610/2",
    especialidades: ["Terapia Manual ONM", "RPG", "Kinesiología Deportiva", "MEP"],
    desde: "2014",
    foto: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-WR6hN46glSc94sqSogqkS0Va3Eicyv.png"
  },
  {
    nombre: "Grigioni Juan Manuel",
    titulo: "Licenciado en Kinesiología y Fisiatría",
    matricula: "MAT 1556/2",
    especialidades: ["Terapia Manual ONM", "RPG", "Rehabilitación Vestibular", "MEP"],
    desde: "2014",
    foto: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dMFbQ3kYUtpQHyFvCaYDLDSvVOzZzB.png"
  }
]

export function Profesionales() {
  return (
    <section id="profesionales" className="py-20 md:py-32 px-6 bg-muted">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Nuestro equipo
          </h2>
          <p className="text-lg text-muted-foreground">
            Profesionales altamente capacitados y en constante actualización
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {profesionales.map((prof, idx) => (
            <div key={idx} className="bg-background p-8 rounded-lg border border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {prof.foto ? (
                    <Image 
                      src={prof.foto}
                      alt={prof.nombre}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{prof.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{prof.titulo}</p>
                  <p className="text-xs text-muted-foreground font-mono">{prof.matricula}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {prof.especialidades.map((esp, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {esp}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                En REK desde <span className="font-bold">{prof.desde}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
