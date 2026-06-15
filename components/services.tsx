"use client"

import { useState } from "react"
import { Activity, Bone, Dumbbell, Heart, ChevronDown } from "lucide-react"

const services = [
  {
    id: "kinesiologia",
    title: "Kinesiología",
    icon: Activity,
    description: "Tratamientos personalizados para la rehabilitación y prevención de lesiones musculoesqueléticas.",
    details: [
      "Rehabilitación post quirúrgica",
      "Tratamiento del dolor crónico",
      "Reeducación postural",
      "Electroestimulación",
      "Terapia manual",
      "Ejercicios terapéuticos"
    ]
  },
  {
    id: "traumatologia",
    title: "Traumatología",
    icon: Bone,
    description: "Diagnóstico y tratamiento especializado de lesiones y patologías del sistema músculo-esquelético.",
    details: [
      "Evaluación de lesiones deportivas",
      "Tratamiento de fracturas",
      "Artroscopia",
      "Infiltraciones",
      "Medicina del deporte",
      "Seguimiento post operatorio"
    ]
  },
  {
    id: "pilates",
    title: "Pilates",
    icon: Heart,
    description: "Clases grupales e individuales de pilates reformer y mat para mejorar tu postura y fortalecer tu core.",
    details: [
      "Pilates reformer",
      "Pilates mat",
      "Clases grupales reducidas",
      "Sesiones individuales",
      "Pilates terapéutico",
      "Pilates para embarazadas"
    ]
  },
  {
    id: "gimnasio",
    title: "Gimnasio",
    icon: Dumbbell,
    description: "Espacio equipado con máquinas de última generación y entrenadores profesionales.",
    details: [
      "Musculación",
      "Entrenamiento funcional",
      "Cardio",
      "Entrenamiento personalizado",
      "Planes de nutrición",
      "Seguimiento de progreso"
    ]
  }
]

export function Services() {
  const [expandedService, setExpandedService] = useState<string | null>(null)

  return (
    <section id="servicios" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <p className="text-sm uppercase tracking-widest text-primary font-medium mb-4">Nuestros Servicios</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
            Cuidamos cada aspecto de tu bienestar
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ofrecemos un enfoque integral que combina diferentes disciplinas para lograr 
            resultados óptimos en tu recuperación y entrenamiento.
          </p>
        </div>

        <div className="grid gap-4">
          {services.map((service) => (
            <div 
              key={service.id}
              className="border border-border rounded-lg overflow-hidden bg-card"
            >
              <button
                onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                className="w-full px-6 py-6 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <service.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl">{service.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1 hidden sm:block">{service.description}</p>
                  </div>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    expandedService === service.id ? "rotate-180" : ""
                  }`} 
                />
              </button>
              
              {expandedService === service.id && (
                <div className="px-6 pb-6 pt-2">
                  <p className="text-muted-foreground mb-4 sm:hidden">{service.description}</p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {service.details.map((detail, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
