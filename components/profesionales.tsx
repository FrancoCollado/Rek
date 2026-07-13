import Image from "next/image"

type Profesional = {
  nombre: string
  matricula?: string
  foto?: string
}

type Area = {
  area: string
  profesionales: Profesional[]
}

const areas: Area[] = [
  {
    area: "Kinesiología",
    profesionales: [
      {
        nombre: "Busso Franco",
        matricula: "MAT 1610/2",
        foto: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-WR6hN46glSc94sqSogqkS0Va3Eicyv.png"
      },
      {
        nombre: "Grigioni Juan Manuel",
        matricula: "MAT 1556/2",
        foto: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dMFbQ3kYUtpQHyFvCaYDLDSvVOzZzB.png"
      },
      {
        nombre: "Graff Valentín",
        matricula: "MAT 3301/2",
        foto: "/VALENTIN.jpeg"
      }
    ]
  },
  {
    area: "Gimnasio",
    profesionales: [
      { nombre: "Colombo Matías" },
      { nombre: "Lliera Ligia" },
      { nombre: "Serra Rocío", foto: "/ROCÍO.JPG" },
      { nombre: "Fabello Giuliano", foto: "/GIULIANO.JPG" }
    ]
  },
  {
    area: "Traumatología",
    profesionales: [
      { nombre: "Stivala Yanina", matricula: "MAT 16040" }
    ]
  },
  {
    area: "Nutrición Deportiva e Integral",
    profesionales: [
      { nombre: "Giuliato Edith", matricula: "MAT 2286/2" },
      { nombre: "Sule Fernanda" }
    ]
  },
  {
    area: "Plantillas Ortopédicas",
    profesionales: [
      { nombre: "Rodríguez Raúl" }
    ]
  },
  {
    area: "Pilates",
    profesionales: [
      { nombre: "Ruzzo Luciana" },
      { nombre: "Lorenzo Federico" }
    ]
  },
  {
    area: "Secretaría",
    profesionales: [
      { nombre: "Larrubia Jésica" }
    ]
  }
]

function getInitials(nombre: string) {
  const parts = nombre.trim().split(" ")
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

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
          {areas.map((grupo, idx) => (
            <div key={idx} className="bg-background p-8 rounded-lg border border-border">
              <h3 className="text-lg font-bold mb-5 text-primary border-b border-border pb-3">
                {grupo.area}
              </h3>
              <ul className="space-y-4">
                {grupo.profesionales.map((prof, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold">
                      {prof.foto ? (
                        <Image
                          src={prof.foto}
                          alt={prof.nombre}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(prof.nombre)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{prof.nombre}</p>
                      {prof.matricula && (
                        <p className="text-xs text-muted-foreground font-mono">{prof.matricula}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
