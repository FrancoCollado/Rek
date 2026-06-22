"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const serviceLabels: Record<string, { name: string; duration: string }> = {
  kinesiologia: { name: "Kinesiología", duration: "30 min" },
  traumatologia: { name: "Traumatología", duration: "30 min" },
}

type AvailabilityRow = {
  id: string
  usuario_id: string
  servicio: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  intervalo_minutos: number
  duracion_minutos: number
  usuarios?: {
    nombre: string
    apellido: string
  }[] | null
}

type ServiceOption = {
  id: string
  name: string
  duration: string
}

type SlotProfessional = {
  id: string
  name: string
}

type SlotOption = {
  time: string
  capacity: number
  remaining: number
  professionals: SlotProfessional[]
}

type ActiveTreatment = {
  id: string
  sesiones_totales: number
}

type SelectedSession = {
  date: string
  time: string
}

type InsurancePreset = 'iapos' | 'swiss_medical' | 'otra'

type InsurancePolicy = {
  displayName: string
  perSessionAmount: number
  stampAmount: number
  requirements: string[]
}

function getInsurancePolicy(preset: InsurancePreset, customName?: string): InsurancePolicy {
  if (preset === 'iapos') {
    return {
      displayName: 'IAPOS',
      perSessionAmount: 6000,
      stampAmount: 5000,
      requirements: [
        'Debe presentar 3 bonos por sesión.',
        'Estampillado único: $5.000.',
        'Plus por sesión: $6.000.',
      ],
    }
  }

  if (preset === 'swiss_medical') {
    return {
      displayName: 'SWISS MEDICAL',
      perSessionAmount: 4000,
      stampAmount: 5000,
      requirements: [
        'Debe presentar orden médica vigente.',
        'Estampillado único: $5.000.',
        'Plus por sesión: $4.000.',
      ],
    }
  }

  return {
    displayName: (customName || 'Otra obra social').trim(),
    perSessionAmount: 3000,
    stampAmount: 5000,
    requirements: [
      'Debe presentar orden médica vigente.',
      'Estampillado único: $5.000.',
      'Plus por sesión: $3.000.',
    ],
  }
}

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

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeTimeSlot(time: string) {
  return time.slice(0, 5)
}

function timeToMinutes(time: string) {
  const normalized = normalizeTimeSlot(time)
  const [hours, minutes] = normalized.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0")
  const minutes = String(totalMinutes % 60).padStart(2, "0")
  return `${hours}:${minutes}`
}

function getServiceLabel(serviceId: string) {
  return serviceLabels[serviceId] || {
    name: serviceId.charAt(0).toUpperCase() + serviceId.slice(1),
    duration: "45 min",
  }
}

function getProfessionalName(row: AvailabilityRow) {
  const professional = row.usuarios?.[0]
  return professional
    ? `${professional.nombre} ${professional.apellido}`
    : "Profesional disponible"
}

function getSlotCapacityByTime(slotTime: string) {
  const minutes = timeToMinutes(slotTime)
  const noonStart = 12 * 60
  const afternoonEnd = 16 * 60

  if (minutes >= noonStart && minutes < afternoonEnd) {
    return 1
  }

  const minuteOfHour = minutes % 60
  if (minuteOfHour === 0) {
    return 3
  }

  if (minuteOfHour === 30) {
    return 2
  }

  return 0
}

function buildSlotOptions(
  rows: AvailabilityRow[],
  bookedTurnos: Array<{ hora: string; usuario_id: string | null }>
) {
  const slotMap = new Map<string, SlotOption>()
  const bookedCountByTime = new Map<string, number>()
  const bookedProfessionalIdsByTime = new Map<string, Set<string>>()

  for (const turno of bookedTurnos) {
    const slotTime = normalizeTimeSlot(turno.hora)
    bookedCountByTime.set(slotTime, (bookedCountByTime.get(slotTime) || 0) + 1)

    if (turno.usuario_id) {
      const bookedSet = bookedProfessionalIdsByTime.get(slotTime) || new Set<string>()
      bookedSet.add(turno.usuario_id)
      bookedProfessionalIdsByTime.set(slotTime, bookedSet)
    }
  }

  for (const row of rows) {
    const startMinutes = timeToMinutes(row.hora_inicio)
    const endMinutes = timeToMinutes(row.hora_fin)

    for (let current = startMinutes; current + row.duracion_minutos <= endMinutes; current += row.intervalo_minutos) {
      const slotTime = minutesToTime(current)
      const existingSlot = slotMap.get(slotTime)
      const professionalName = getProfessionalName(row)

      if (existingSlot) {
        if (!existingSlot.professionals.some((professional) => professional.id === row.usuario_id)) {
          existingSlot.professionals.push({ id: row.usuario_id, name: professionalName })
        }
      } else {
        const capacity = getSlotCapacityByTime(slotTime)
        if (capacity === 0) {
          continue
        }

        slotMap.set(slotTime, {
          time: slotTime,
          capacity,
          remaining: capacity,
          professionals: [{ id: row.usuario_id, name: professionalName }],
        })
      }
    }
  }

  return Array.from(slotMap.values())
    .map((slot) => ({
      ...slot,
      remaining: Math.max(0, slot.capacity - (bookedCountByTime.get(slot.time) || 0)),
      professionals: slot.professionals,
    }))
    .sort((first, second) => timeToMinutes(first.time) - timeToMinutes(second.time))
}

export function Booking() {
  const [step, setStep] = useState(1)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([])
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedTreatmentSessions, setSelectedTreatmentSessions] = useState<SelectedSession[]>([])
  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([])
  const [isReturningPatient, setIsReturningPatient] = useState<boolean | null>(null)
  const [appointmentMode, setAppointmentMode] = useState<'tratamiento' | 'suelta'>('suelta')
  const [insurancePreset, setInsurancePreset] = useState<InsurancePreset>('iapos')
  const [customInsuranceName, setCustomInsuranceName] = useState('')
  const [treatmentSessions, setTreatmentSessions] = useState('10')
  const [medicalOrderFile, setMedicalOrderFile] = useState<File | null>(null)
  const [dni, setDni] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [createdSessionsCount, setCreatedSessionsCount] = useState(1)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLockRef = useRef(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)
  const maxTreatmentSessions = Math.max(1, Number(treatmentSessions || "1"))
  const insurancePolicy = getInsurancePolicy(insurancePreset, customInsuranceName)
  const insuranceName = insurancePolicy.displayName

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

    if (date < today || dayOfWeek === 0 || !selectedService) {
      return true
    }

    return !availabilityRows.some(
      (row) => row.servicio === selectedService && row.dia_semana === dayOfWeek
    )
  }

  useEffect(() => {
    let isActive = true

    const fetchAvailabilityConfig = async () => {
      setIsLoadingConfig(true)
      setConfigError(null)

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('disponibilidad_profesional')
          .select('id, usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos, usuarios(nombre, apellido)')
          .eq('activo', true)
          .order('servicio')
          .order('dia_semana')
          .order('hora_inicio')

        if (error) throw error
        if (!isActive) return

        const rows = (data || []) as unknown as AvailabilityRow[]
        const serviceOptions = Array.from(new Set(rows.map((row) => row.servicio))).map((serviceId) => {
          const serviceLabel = getServiceLabel(serviceId)
          const firstRow = rows.find((row) => row.servicio === serviceId)
          return {
            id: serviceId,
            name: serviceLabel.name,
            duration: `${firstRow?.duracion_minutos || 45} min`,
          }
        })

        setAvailabilityRows(rows)
        setServices(serviceOptions)
        setSelectedService((current) => {
          if (current && serviceOptions.some((service) => service.id === current)) return current
          return serviceOptions[0]?.id || null
        })
      } catch (error) {
        console.error('[v0] Error loading availability config:', error)
        if (isActive) {
          setAvailabilityRows([])
          setServices([])
          setConfigError('No se pudo cargar la agenda desde Supabase.')
        }
      } finally {
        if (isActive) setIsLoadingConfig(false)
      }
    }

    fetchAvailabilityConfig()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!selectedService) {
      setSelectedDate(null)
      setSelectedTime(null)
      setSelectedTreatmentSessions([])
      setAvailableSlots([])
      return
    }

    if (selectedDate) {
      const selectedDayOfWeek = selectedDate.getDay()
      const hasAvailability = availabilityRows.some(
        (row) => row.servicio === selectedService && row.dia_semana === selectedDayOfWeek
      )

      if (!hasAvailability) {
        setSelectedDate(null)
        setSelectedTime(null)
        setSelectedTreatmentSessions([])
        setAvailableSlots([])
      }
    }
  }, [selectedService, selectedDate, availabilityRows])

  const addTreatmentSession = () => {
    if (!selectedDate || !selectedTime) return

    if (selectedTreatmentSessions.length >= maxTreatmentSessions) {
      setSubmitError(`Ya seleccionaste el máximo de ${maxTreatmentSessions} sesiones.`)
      return
    }

    const date = formatLocalDate(selectedDate)
    const sessionAlreadyExists = selectedTreatmentSessions.some(
      (session) => session.date === date && session.time === selectedTime
    )

    if (sessionAlreadyExists) {
      setSubmitError("Ese horario ya fue agregado a tu plan.")
      return
    }

    setSubmitError(null)
    setSelectedTreatmentSessions((current) => [...current, { date, time: selectedTime }])
    setSelectedTime(null)
  }

  const removeTreatmentSession = (sessionToRemove: SelectedSession) => {
    setSelectedTreatmentSessions((current) =>
      current.filter((session) => !(session.date === sessionToRemove.date && session.time === sessionToRemove.time))
    )
  }

  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setAvailableSlots([])
      setAvailabilityError(null)
      return
    }

    let isActive = true

    const fetchAvailableSlots = async () => {
      setIsLoadingAvailability(true)
      setAvailabilityError(null)

      try {
        const dayRows = availabilityRows.filter(
          (row) => row.servicio === selectedService && row.dia_semana === selectedDate.getDay()
        )

        if (dayRows.length === 0) {
          if (isActive) {
            setAvailableSlots([])
            setSelectedTime(null)
          }
          return
        }

        const supabase = createClient()
        const { data, error } = await supabase
          .from('turnos')
          .select('hora, usuario_id')
          .eq('fecha', formatLocalDate(selectedDate))
          .eq('servicio', selectedService)
          .neq('estado', 'cancelado')

        if (error) throw error
        if (!isActive) return

        const slots = buildSlotOptions(dayRows, (data || []) as Array<{ hora: string; usuario_id: string | null }>)
        setAvailableSlots(slots)
        setSelectedTime((current) => {
          if (!current) return current
          const selectedSlot = slots.find((slot) => slot.time === current)
          return selectedSlot && selectedSlot.remaining > 0 ? current : null
        })
      } catch (error) {
        console.error('[v0] Error loading available slots:', error)
        if (isActive) {
          setAvailableSlots([])
          setAvailabilityError('No se pudo cargar la disponibilidad en este momento.')
        }
      } finally {
        if (isActive) setIsLoadingAvailability(false)
      }
    }

    fetchAvailableSlots()
    return () => {
      isActive = false
    }
  }, [selectedDate, selectedService, availabilityRows])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (submitLockRef.current) {
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      if (!selectedService) {
        setSubmitError('Completá servicio antes de confirmar.')
        return
      }

      if (appointmentMode === 'suelta' && (!selectedDate || !selectedTime)) {
        setSubmitError('Completá fecha y horario antes de confirmar.')
        return
      }

      if (appointmentMode === 'tratamiento' && selectedTreatmentSessions.length === 0) {
        setSubmitError('Seleccioná al menos una sesión para el tratamiento.')
        setStep(4)
        return
      }

      if (insurancePreset === 'otra' && !customInsuranceName.trim()) {
        setSubmitError('Indicá tu obra social antes de continuar.')
        setStep(2)
        return
      }

      if (isReturningPatient === null) {
        setSubmitError('Indicá si ya te atendiste anteriormente.')
        setStep(5)
        return
      }

      if (!dni.trim()) {
        setSubmitError('Ingresá tu DNI para continuar.')
        setStep(5)
        return
      }

      const sessionsRequested = appointmentMode === 'tratamiento'
        ? Math.max(1, Number(treatmentSessions || '1'))
        : 1

      if (appointmentMode === 'tratamiento' && insurancePreset !== 'iapos' && !medicalOrderFile) {
        setSubmitError('Para iniciar tratamiento debés adjuntar la orden médica.')
        setStep(2)
        return
      }

      if (!isReturningPatient) {
        if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
          setSubmitError('Completá tus datos personales para crear el paciente.')
          setStep(5)
          return
        }
      }

      if (appointmentMode === 'suelta') {
        const selectedSlot = availableSlots.find((slot) => slot.time === selectedTime)
        if (!selectedSlot || selectedSlot.remaining <= 0) {
          setSubmitError('Ese horario ya no tiene disponibilidad. Elegí otro.')
          setStep(4)
          return
        }
      }

      let patientId: string | null = null
      const normalizedDni = dni.trim()

      if (isReturningPatient) {
        const { data: existingPatient, error: existingPatientError } = await supabase
          .from('pacientes')
          .select('id, obra_social')
          .eq('dni', normalizedDni)
          .maybeSingle()

        if (existingPatientError) throw existingPatientError
        if (!existingPatient) {
          setSubmitError('No encontramos un paciente con ese DNI. Verificá el dato o elegí "No" para registrarte.')
          return
        }

        patientId = existingPatient.id

        if (existingPatient.obra_social !== insuranceName.trim()) {
          await supabase
            .from('pacientes')
            .update({ obra_social: insuranceName.trim() })
            .eq('id', patientId)
        }
      } else {
        const nameParts = formData.name.toLowerCase().trim().replace(/\s+/g, ' ').split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ')

        const { data: patientByDni, error: patientByDniError } = await supabase
          .from('pacientes')
          .select('id')
          .eq('dni', normalizedDni)
          .maybeSingle()

        if (patientByDniError) throw patientByDniError

        if (patientByDni) {
          patientId = patientByDni.id
          await supabase
            .from('pacientes')
            .update({
              nombre: firstName.charAt(0).toUpperCase() + firstName.slice(1),
              apellido: lastName.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
              email: formData.email.trim(),
              telefono: formData.phone.trim(),
              obra_social: insuranceName.trim(),
            })
            .eq('id', patientId)
        } else {
          const { data: pacientesData, error: createPatientError } = await supabase
            .from('pacientes')
            .insert({
              nombre: firstName.charAt(0).toUpperCase() + firstName.slice(1),
              apellido: lastName.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
              email: formData.email.trim(),
              telefono: formData.phone.trim(),
              dni: normalizedDni,
              obra_social: insuranceName.trim(),
            })
            .select('id')
            .single()

          if (createPatientError) throw createPatientError
          patientId = pacientesData.id
        }
      }

      if (!patientId) {
        setSubmitError('No pudimos identificar al paciente para generar los turnos.')
        return
      }

      const requestedSessions: SelectedSession[] = appointmentMode === 'tratamiento'
        ? selectedTreatmentSessions
        : [{ date: formatLocalDate(selectedDate as Date), time: selectedTime as string }]

      const assignments: Array<{ fecha: string; hora: string; usuarioId: string | null }> = []

      for (const requestedSession of requestedSessions) {
        const slotTime = `${requestedSession.time}:00`

        const { data: existingTurnos, error: slotError } = await supabase
          .from('turnos')
          .select('id, hora, usuario_id')
          .eq('fecha', requestedSession.date)
          .eq('servicio', selectedService)
          .eq('hora', slotTime)
          .neq('estado', 'cancelado')

        if (slotError) throw slotError

        const sessionDate = new Date(`${requestedSession.date}T00:00:00`)
        const dayRows = availabilityRows.filter(
          (row) => row.servicio === selectedService && row.dia_semana === sessionDate.getDay()
        )

        const slots = buildSlotOptions(dayRows, (existingTurnos || []) as Array<{ hora: string; usuario_id: string | null }>)
        const slotForSession = slots.find((slot) => slot.time === requestedSession.time)

        if (!slotForSession || slotForSession.remaining <= 0) {
          setSubmitError(`No hay cupo para ${requestedSession.date} a las ${requestedSession.time}. Probá con otro horario.`)
          return
        }

        const bookedCountByProfessional = new Map<string, number>()
        for (const turno of existingTurnos || []) {
          if (!turno.usuario_id) continue
          bookedCountByProfessional.set(
            turno.usuario_id,
            (bookedCountByProfessional.get(turno.usuario_id) || 0) + 1
          )
        }

        const assignedProfessional =
          slotForSession.professionals
            .slice()
            .sort((a, b) => {
              const countA = bookedCountByProfessional.get(a.id) || 0
              const countB = bookedCountByProfessional.get(b.id) || 0
              if (countA !== countB) return countA - countB
              return a.name.localeCompare(b.name)
            })[0] || null

        if (!assignedProfessional) {
          setSubmitError(`No pudimos asignar profesional para ${requestedSession.date}. Probá otro horario.`)
          return
        }

        assignments.push({ fecha: requestedSession.date, hora: slotTime, usuarioId: assignedProfessional.id })
      }

      let tratamientoId: string | null = null

      if (appointmentMode === 'tratamiento') {
        let orderReference = medicalOrderFile?.name || 'orden_medica'
        const treatmentPrice = sessionsRequested * insurancePolicy.perSessionAmount
        const totalDebtWithStamp = treatmentPrice + insurancePolicy.stampAmount

        if (medicalOrderFile) {
          const safeFileName = medicalOrderFile.name.replace(/\s+/g, '_')
          const uploadPath = `${normalizedDni}/${Date.now()}_${safeFileName}`
          const { error: uploadError } = await supabase
            .storage
            .from('ordenes-medicas')
            .upload(uploadPath, medicalOrderFile, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('ordenes-medicas').getPublicUrl(uploadPath)
            orderReference = urlData.publicUrl
          }
        }

        const treatmentNotes = insurancePreset === 'iapos'
          ? `Obra social: ${insuranceName.trim()} | Bonos: 3 por sesión | Estampillado: $${insurancePolicy.stampAmount.toLocaleString()} (único) | Plus sesión: $${insurancePolicy.perSessionAmount.toLocaleString()}`
          : `Obra social: ${insuranceName.trim()} | Orden: ${orderReference} | Estampillado: $${insurancePolicy.stampAmount.toLocaleString()} (único) | Plus sesión: $${insurancePolicy.perSessionAmount.toLocaleString()}`

        const { data: createdTreatment, error: treatmentError } = await supabase
          .from('tratamientos')
          .insert({
            paciente_id: patientId,
            servicio: selectedService,
            tipo_plan: insurancePreset === 'iapos' ? 'bonos' : 'orden',
            sesiones_totales: sessionsRequested,
            sesiones_realizadas: 0,
            precio_total: totalDebtWithStamp,
            monto_pagado: 0,
            estado: 'activo',
            notas: treatmentNotes,
          })
          .select('id')
          .single()

        if (treatmentError) throw treatmentError
        tratamientoId = createdTreatment.id

        const { data: existingBalance, error: balanceError } = await supabase
          .from('saldo_paciente')
          .select('saldo_deuda, sesiones_pendientes')
          .eq('paciente_id', patientId)
          .maybeSingle()

        if (balanceError) throw balanceError

        const currentDebt = Number(existingBalance?.saldo_deuda || 0)
        const currentPendingSessions = Number(existingBalance?.sesiones_pendientes || 0)

        const { error: upsertBalanceError } = await supabase
          .from('saldo_paciente')
          .upsert({
            paciente_id: patientId,
            saldo_deuda: currentDebt + totalDebtWithStamp,
            sesiones_pendientes: currentPendingSessions + sessionsRequested,
          }, { onConflict: 'paciente_id' })

        if (upsertBalanceError) throw upsertBalanceError
      }

      for (let index = 0; index < assignments.length; index += 1) {
        const assignment = assignments[index]
        const payload = {
          paciente_id: patientId,
          usuario_id: assignment.usuarioId,
          tratamiento_id: tratamientoId,
          numero_sesion: appointmentMode === 'tratamiento' ? index + 1 : null,
          servicio: selectedService,
          fecha: assignment.fecha,
          hora: assignment.hora,
          estado: 'pendiente',
        }

        const { error: insertTurnoError } = await supabase.from('turnos').insert(payload)

        // Si la base tiene una regla de unicidad para evitar duplicados,
        // no cortamos el flujo cuando el turno ya existe.
        if (insertTurnoError && insertTurnoError.code !== '23505') {
          throw insertTurnoError
        }
      }

      setCreatedSessionsCount(assignments.length)
      setIsSubmitted(true)
    } catch (error) {
      console.error('[v0] Error creating booking:', error)
      setSubmitError('No se pudo completar la reserva. Revisá la configuracion de agenda y volvé a intentar.')
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
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
              {appointmentMode === 'tratamiento'
                ? `Se registraron ${createdSessionsCount} sesiones para tu plan de tratamiento.`
                : 'Se registró tu sesión suelta correctamente.'}
            </p>
            <div className="bg-card border border-border rounded-lg p-6 text-left mb-8">
              <div className="grid gap-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicio</span>
                  <span className="font-medium">{services.find(s => s.id === selectedService)?.name}</span>
                </div>
                {appointmentMode !== 'tratamiento' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hora</span>
                      <span className="font-medium">{selectedTime} hs</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modalidad</span>
                  <span className="font-medium">{appointmentMode === 'tratamiento' ? `Tratamiento — ${createdSessionsCount} sesiones` : 'Sesión suelta'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Obra social</span>
                  <span className="font-medium">{insuranceName}</span>
                </div>
                <hr className="border-border" />
                <p className="text-sm font-medium text-muted-foreground">Requisitos para tu obra social</p>
                <ul className="text-sm space-y-1">
                  {getInsurancePolicy(insurancePreset, customInsuranceName).requirements.map((req) => (
                    <li key={req} className="flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
                {appointmentMode === 'tratamiento' && (
                  <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium">Deuda registrada en tu cuenta corriente</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {createdSessionsCount} sesión{createdSessionsCount !== 1 ? 'es' : ''} × ${getInsurancePolicy(insurancePreset, customInsuranceName).perSessionAmount.toLocaleString()} + estampillado ${getInsurancePolicy(insurancePreset, customInsuranceName).stampAmount.toLocaleString()} = <strong>${(createdSessionsCount * getInsurancePolicy(insurancePreset, customInsuranceName).perSessionAmount + getInsurancePolicy(insurancePreset, customInsuranceName).stampAmount).toLocaleString()}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={() => {
                setIsSubmitted(false)
                setStep(1)
                setSelectedService(null)
                setSelectedDate(null)
                setSelectedTime(null)
                setSelectedTreatmentSessions([])
                setIsReturningPatient(null)
                setAppointmentMode('suelta')
                setInsurancePreset('iapos')
                setCustomInsuranceName('')
                setTreatmentSessions('10')
                setMedicalOrderFile(null)
                setDni('')
                setFormData({ name: '', email: '', phone: '' })
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
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {s}
                </div>
                {s < 5 && (
                  <div className={`hidden sm:block w-16 md:w-24 h-0.5 mx-2 transition-colors ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Servicio</span>
            <span className="hidden sm:inline">Modalidad</span>
            <span className="hidden sm:inline">Fecha</span>
            <span className="hidden sm:inline">Horario</span>
            <span>Paciente</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="grid gap-4">
              {isLoadingConfig && (
                <p className="text-sm text-muted-foreground">Cargando agenda desde Supabase...</p>
              )}
              {configError && (
                <p className="text-sm text-destructive">{configError}</p>
              )}
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service.id)
                    setSelectedDate(null)
                    setSelectedTime(null)
                    setSelectedTreatmentSessions([])
                    setSubmitError(null)
                  }}
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
              {!isLoadingConfig && services.length === 0 && !configError && (
                <p className="text-sm text-muted-foreground">No hay servicios configurados en Supabase.</p>
              )}
              <Button 
                className="mt-4"
                disabled={!selectedService || isLoadingConfig || services.length === 0}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </div>
          )}

          {/* Step 2: Mode + Insurance */}
          {step === 2 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-2xl mb-4">¿Cómo querés atenderte?</h3>

              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAppointmentMode('tratamiento')
                    setSelectedTime(null)
                    setSubmitError(null)
                  }}
                  className={`p-4 rounded-lg border text-left ${appointmentMode === 'tratamiento' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <p className="font-medium">Iniciar tratamiento</p>
                  <p className="text-sm text-muted-foreground">Plan de múltiples sesiones con orden médica.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppointmentMode('suelta')
                    setSelectedTreatmentSessions([])
                    setSubmitError(null)
                  }}
                  className={`p-4 rounded-lg border text-left ${appointmentMode === 'suelta' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <p className="font-medium">Sesión suelta</p>
                  <p className="text-sm text-muted-foreground">Reserva individual como hasta ahora.</p>
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Obra social</label>
                <div className="grid sm:grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setInsurancePreset('iapos')}
                    className={`px-4 py-3 rounded-lg border text-left ${insurancePreset === 'iapos' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    IAPOS
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsurancePreset('swiss_medical')}
                    className={`px-4 py-3 rounded-lg border text-left ${insurancePreset === 'swiss_medical' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    SWISS MEDICAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsurancePreset('otra')}
                    className={`px-4 py-3 rounded-lg border text-left ${insurancePreset === 'otra' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    Otra
                  </button>
                </div>

                {insurancePreset === 'otra' ? (
                  <input
                    type="text"
                    required
                    value={customInsuranceName}
                    onChange={(e) => setCustomInsuranceName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Escribí tu obra social"
                  />
                ) : null}

                <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30">
                  <p className="text-sm font-medium mb-2">Información para {insuranceName}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {insurancePolicy.requirements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {appointmentMode === 'tratamiento' && (
                <div className="space-y-4 mt-4 p-4 bg-secondary/40 rounded-lg border border-border">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cantidad de sesiones</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={treatmentSessions}
                      onChange={(e) => setTreatmentSessions(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {insurancePreset !== 'iapos' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Orden médica (archivo)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => setMedicalOrderFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Podés seleccionar manualmente las sesiones en la agenda (hasta el máximo indicado).
                    </p>
                  </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium text-primary">IAPOS: no se requiere orden médica</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Debés traer <strong>3 bonos por cada sesión</strong>. No es necesario adjuntar ningún archivo.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Volver
                </Button>
                <Button 
                  className="flex-1"
                  disabled={
                    (insurancePreset === 'otra' && !customInsuranceName.trim()) ||
                    (appointmentMode === 'tratamiento' && Number(treatmentSessions || '0') <= 0) ||
                    (appointmentMode === 'tratamiento' && insurancePreset !== 'iapos' && !medicalOrderFile)
                  }
                  onClick={() => {
                    setSubmitError(null)
                    setStep(3)
                  }}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Date Selection */}
          {step === 3 && (
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
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
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
                      onClick={() => {
                        setSelectedDate(new Date(currentYear, currentMonth, day))
                        setSelectedTime(null)
                        setSubmitError(null)
                      }}
                      className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : disabled
                          ? 'text-muted-foreground/40 cursor-not-allowed'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Solo se habilitan fechas con agenda cargada en Supabase para el servicio seleccionado.
              </p>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Volver
                </Button>
                <Button 
                  className="flex-1"
                  disabled={!selectedDate}
                  onClick={() => setStep(4)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Time Selection */}
          {step === 4 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {selectedDate?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>

              <h4 className="font-medium mb-4">Seleccioná un horario</h4>
              {isLoadingAvailability && (
                <p className="text-sm text-muted-foreground mb-4">Cargando horarios reservados...</p>
              )}
              {availabilityError && (
                <p className="text-sm text-destructive mb-4">{availabilityError}</p>
              )}
              {!isLoadingAvailability && availableSlots.length === 0 && !availabilityError && (
                <p className="text-sm text-muted-foreground mb-4">No hay horarios configurados o disponibles para esta fecha.</p>
              )}

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
                {availableSlots.map((slot) => {
                  const isBooked = slot.remaining === 0
                  return (
                    <button
                      key={slot.time}
                      disabled={isBooked || isLoadingAvailability}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                        selectedTime === slot.time
                          ? 'bg-primary text-primary-foreground'
                          : isBooked
                          ? 'bg-muted text-muted-foreground cursor-not-allowed line-through'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <div>{slot.time}</div>
                      <div className="text-[10px] opacity-80">{slot.remaining}/{slot.capacity}</div>
                    </button>
                  )
                })}
              </div>

              {appointmentMode === 'tratamiento' && (
                <div className="mb-6 p-4 border border-border rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <p className="text-sm">
                      Sesiones seleccionadas: <span className="font-medium">{selectedTreatmentSessions.length}</span> / {maxTreatmentSessions}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTreatmentSession}
                      disabled={!selectedDate || !selectedTime || selectedTreatmentSessions.length >= maxTreatmentSessions}
                    >
                      Agregar sesión
                    </Button>
                  </div>

                  {selectedTreatmentSessions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTreatmentSessions
                        .slice()
                        .sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`))
                        .map((session) => (
                          <div key={`${session.date}-${session.time}`} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                            <span>{session.date} - {session.time} hs</span>
                            <button
                              type="button"
                              onClick={() => removeTreatmentSession(session)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Todavía no agregaste sesiones al plan.</p>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-6 p-4 bg-muted rounded-lg">
                {appointmentMode === 'tratamiento'
                  ? 'Podés agregar sesiones en cualquier fecha y horario disponible, hasta el máximo indicado en tu plan.'
                  : 'Los cupos salen de la agenda configurada en Supabase y se asignan según disponibilidad real.'}
              </p>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(3)}>Volver</Button>
                <Button
                  className="flex-1"
                  disabled={appointmentMode === 'tratamiento' ? selectedTreatmentSessions.length === 0 : (!selectedTime || isLoadingAvailability)}
                  onClick={() => setStep(5)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Patient Identity */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
              <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
                <h4 className="font-medium mb-2">Resumen de tu turno</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{services.find(s => s.id === selectedService)?.name}</p>
                  {appointmentMode === 'tratamiento' ? (
                    <p>Sesiones elegidas: {selectedTreatmentSessions.length}</p>
                  ) : (
                    <p>{selectedDate?.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedTime} hs</p>
                  )}
                  {appointmentMode === 'tratamiento' ? (
                    <p>Modalidad: Tratamiento ({selectedTreatmentSessions.length} seleccionadas de {maxTreatmentSessions})</p>
                  ) : (
                    <p>Modalidad: Sesión suelta</p>
                  )}
                  <p>Condiciones: estampillado único ${insurancePolicy.stampAmount.toLocaleString()} y plus por sesión ${insurancePolicy.perSessionAmount.toLocaleString()}</p>
                  <p>Obra social: {insuranceName || 'No informada'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <div>
                  <p className="block text-sm font-medium mb-2">¿Ya te atendiste alguna vez?</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReturningPatient(true)}
                      className={`px-4 py-3 rounded-lg border text-left ${isReturningPatient === true ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      Sí, ya soy paciente
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsReturningPatient(false)}
                      className={`px-4 py-3 rounded-lg border text-left ${isReturningPatient === false ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      No, es mi primera vez
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="dni" className="block text-sm font-medium mb-2">DNI</label>
                  <input
                    id="dni"
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ej: 32123456"
                  />
                </div>

                {isReturningPatient === false && (
                  <>
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
                  </>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setStep(4)}>
                  Volver
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Confirmando...' : 'Confirmar turno'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
