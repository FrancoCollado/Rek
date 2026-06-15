"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const services = [
  { id: "kinesiologia", name: "Kinesiología", duration: "45 min" },
]

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
]

const professionals = [
  { id: "1", name: "Dr. Martín García", specialty: "Traumatología" },
  { id: "2", name: "Lic. Laura Rodríguez", specialty: "Kinesiología" },
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export function Booking() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || date < today
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const supabase = createClient()
      
      // Normalizar nombre para búsqueda (minúsculas, sin espacios extra)
      const normalizedName = formData.name.toLowerCase().trim().replace(/\s+/g, ' ')
      const nameParts = normalizedName.split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ')

      // Buscar paciente existente - tolerante a mayúsculas/minúsculas y espacios
      const { data: existingPatients } = await supabase
        .from('pacientes')
        .select('*')

      // Buscar coincidencia tolerante
      let patientId: string | null = null
      if (existingPatients) {
        const matched = existingPatients.find(p => 
          p.nombre.toLowerCase().trim() === firstName &&
          p.apellido.toLowerCase().trim() === lastName &&
          p.telefono === formData.phone
        )
        if (matched) {
          patientId = matched.id
        }
      }

      // Si no existe, crear nuevo paciente
      if (!patientId) {
        const { data: pacientesData } = await supabase
          .from('pacientes')
          .insert({
            nombre: firstName.charAt(0).toUpperCase() + firstName.slice(1),
            apellido: lastName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            email: formData.email,
            telefono: formData.phone
          })
          .select()

        if (pacientesData && pacientesData[0]) {
          patientId = pacientesData[0].id
        }
      }

      // Crear turno si se encontró o creó paciente
      if (patientId) {
        // Convertir fecha a formato local YYYY-MM-DD sin considerar zona horaria
        const year = selectedDate?.getFullYear()
        const month = String(selectedDate?.getMonth()! + 1).padStart(2, '0')
        const day = String(selectedDate?.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        await supabase
          .from('turnos')
          .insert({
            paciente_id: patientId,
            servicio: 'kinesiologia',
            fecha: dateStr,
            hora: selectedTime + ':00',
            estado: 'pendiente'
          })
      }

      setIsSubmitted(true)
    } catch (error) {
      console.error('[v0] Error booking appointment:', error)
    }
  }

  if (isSubmitted) {
    return (
      <section id="turnos" className="py-24 md:py-32 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-serif text-4xl md:text-5xl mb-4">¡Turno reservado!</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Sistema de reserva de turnos. Los kinesiólogos asignarán al profesional según disponibilidad y especialidad requerida.
            </p>
            <div className="bg-card border border-border rounded-lg p-6 text-left mb-8">
              <div className="grid gap-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicio</span>
                  <span className="font-medium">{services.find(s => s.id === selectedService)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">{selectedDate?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora</span>
                  <span className="font-medium">{selectedTime} hs</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => {
                setIsSubmitted(false)
                setStep(1)
                setSelectedService(null)
                setSelectedDate(null)
                setSelectedTime(null)
                setFormData({ name: "", email: "", phone: "" })
              }}
              variant="outline"
            >
              Reservar otro turno
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="turnos" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <p className="text-sm uppercase tracking-widest text-primary font-medium mb-4">Turnos Online</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
            Reservá tu turno
          </h2>
          <p className="text-muted-foreground text-lg">
            Elegí el servicio, la fecha y el horario que mejor te convenga.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`hidden sm:block w-16 md:w-24 h-0.5 mx-2 transition-colors ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Servicio</span>
            <span className="hidden sm:inline">Fecha</span>
            <span className="hidden sm:inline">Horario</span>
            <span>Datos</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="grid gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-6 rounded-lg border text-left transition-all ${
                    selectedService === service.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedService === service.id ? "border-primary" : "border-muted-foreground"
                      }`}>
                        {selectedService === service.id && (
                          <div className="w-3 h-3 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {service.duration}
                    </span>
                  </div>
                </button>
              ))}
              <Button 
                className="mt-4"
                disabled={!selectedService}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {step === 2 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-secondary rounded-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-serif text-xl">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <button onClick={handleNextMonth} className="p-2 hover:bg-secondary rounded-lg">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const isSelected = selectedDate?.getDate() === day && 
                                     selectedDate?.getMonth() === currentMonth && 
                                     selectedDate?.getFullYear() === currentYear
                  const disabled = isDateDisabled(day)

                  return (
                    <button
                      key={day}
                      disabled={disabled}
                      onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                      className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : disabled
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "hover:bg-secondary"
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Volver
                </Button>
                <Button 
                  className="flex-1"
                  disabled={!selectedDate}
                  onClick={() => setStep(3)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Time Selection */}
          {step === 3 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {selectedDate?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>

              <h4 className="font-medium mb-4">Seleccioná un horario</h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                      selectedTime === time
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <p className="text-sm text-muted-foreground mb-6 p-4 bg-muted rounded-lg">
                Un profesional se asignará automáticamente según disponibilidad.
              </p>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Volver
                </Button>
                <Button 
                  className="flex-1"
                  disabled={!selectedTime}
                  onClick={() => setStep(4)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Contact Form */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
              <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
                <h4 className="font-medium mb-2">Resumen de tu turno</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{services.find(s => s.id === selectedService)?.name}</p>
                  <p>{selectedDate?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedTime} hs</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Nombre completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="juan@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="11 1234-5678"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Volver
                </Button>
                <Button type="submit" className="flex-1">
                  Confirmar turno
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
