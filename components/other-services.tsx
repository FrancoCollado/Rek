"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const otherServices = [
  {
    title: "Pilates",
    description: "Clases grupales e individuales de pilates reformer y mat",
    items: ["Pilates reformer", "Pilates mat", "Clases grupales", "Sesiones individuales"],
  },
  {
    title: "Gimnasio",
    description: "Entrenamiento personalizado con equipos de última generación",
    items: ["Musculación", "Entrenamiento funcional", "Cardio", "Entrenamiento personalizado"],
  },
  {
    title: "Nutricionista",
    description: "Planes nutricionales personalizados según tus objetivos",
    items: ["Evaluación nutricional", "Planes dietéticos", "Seguimiento continuo", "Asesoramiento deportivo"],
  },
  {
    title: "Plantillas Deportivas",
    description: "Análisis biomecánico y confección de plantillas personalizadas",
    items: ["Análisis de la pisada", "Plantillas a medida", "Prevención de lesiones", "Optimización del rendimiento"],
  },
]

const whatsappNumber = "541234567890" // Reemplaza con tu número

export function OtherServices() {
  const handleWhatsAppClick = (service: string) => {
    const message = `Hola, me interesa conocer más sobre ${service} en rek`
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <section className="py-24 md:py-32 bg-secondary/50">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
            Otros servicios
          </h2>
          <p className="text-muted-foreground text-lg">
            Contactanos por WhatsApp para conocer más detalles sobre estos servicios
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {otherServices.map((service) => (
            <div 
              key={service.title}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-serif text-2xl mb-2">{service.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
              
              <ul className="space-y-2 mb-6">
                {service.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleWhatsAppClick(service.title)}
                className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Consultar por WhatsApp
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
