'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TurnoCompletionModal from '@/components/admin/turno-completion-modal'

const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const minutesFromStart = i * 30
  const hour = 8 + Math.floor(minutesFromStart / 60)
  const minutes = minutesFromStart % 60
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const serviceLabels: Record<string, string> = {
  kinesiologia: 'Kinesiología',
  traumatologia: 'Traumatología',
}

function parseDateValue(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) {
    return null
  }

  // Soporta formatos comunes no estrictos: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY.
  const onlyDate = raw.split('T')[0].split(' ')[0]

  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(onlyDate)) {
    const normalized = onlyDate.replace(/\//g, '-')
    const [year, month, day] = normalized.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(onlyDate)) {
    const normalized = onlyDate.replace(/\//g, '-')
    const [day, month, year] = normalized.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeTimeValue(value: unknown) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) {
    return null
  }

  const sanitized = raw
    .replace(/\u00a0/g, ' ')
    .replace(/a\.?\s*m\.?/g, 'am')
    .replace(/p\.?\s*m\.?/g, 'pm')
    .replace(/hs?\.?/g, '')
    .trim()

  const timeFromIso = sanitized.match(/(\d{1,2}):(\d{2})/)
  if (timeFromIso) {
    const hours = Number(timeFromIso[1])
    const minutes = Number(timeFromIso[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  const ampm = sanitized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)
  if (ampm) {
    let hours = Number(ampm[1])
    const minutes = Number(ampm[2] || '0')
    const period = ampm[3]

    if (period === 'pm' && hours < 12) {
      hours += 12
    }
    if (period === 'am' && hours === 12) {
      hours = 0
    }

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  const dotted = sanitized.match(/^(\d{1,2})\.(\d{2})$/)
  if (dotted) {
    const hours = Number(dotted[1])
    const minutes = Number(dotted[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  const compact = sanitized.match(/^(\d{1,2})(\d{2})$/)
  if (compact) {
    const hours = Number(compact[1])
    const minutes = Number(compact[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  const hourOnly = sanitized.match(/^(\d{1,2})$/)
  if (hourOnly) {
    const hours = Number(hourOnly[1])
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, '0')}:00`
    }
  }

  return null
}

interface Appointment {
  id: string
  day: number
  time: string
  patient: string
  service: string
  professional: string
  paciente_id?: string
  tratamiento_id?: string | null
  numero_sesion?: number | null
  sesiones_totales?: number | null
  asistido?: boolean
  cobrado?: boolean
}

function buildAppointmentDedupKey(appointment: Appointment) {
  return [
    appointment.day,
    appointment.time,
    appointment.paciente_id || appointment.patient,
    appointment.professional,
    appointment.service,
    appointment.numero_sesion || '',
  ].join('|')
}

export default function AgendaWeekly() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  const visibleTimeSlots = useMemo(() => {
    const set = new Set<string>(TIME_SLOTS)
    appointments.forEach((appt) => set.add(appt.time))
    return Array.from(set).sort((left, right) => left.localeCompare(right))
  }, [appointments])

  useEffect(() => {
    // Inicializar con hoy (lunes de esta semana)
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    setCurrentDate(monday)

    // Cargar turnos de Supabase
    fetchAppointments(monday)
  }, [])

  const fetchAppointments = async (startDate: Date) => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Rango semanal [inicio, fin_exclusivo) para soportar DATE o TIMESTAMP en Supabase.
      const startYear = startDate.getFullYear()
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
      const startDay = String(startDate.getDate()).padStart(2, '0')
      const startStr = `${startYear}-${startMonth}-${startDay}`

      const endExclusiveDate = new Date(startDate)
      endExclusiveDate.setDate(endExclusiveDate.getDate() + 6)
      const endYear = endExclusiveDate.getFullYear()
      const endMonth = String(endExclusiveDate.getMonth() + 1).padStart(2, '0')
      const endDay = String(endExclusiveDate.getDate()).padStart(2, '0')
      const endExclusiveStr = `${endYear}-${endMonth}-${endDay}`

      const { data: turnos } = await supabase
        .from('turnos')
        .select('id, fecha, hora, servicio, paciente_id, tratamiento_id, numero_sesion, asistido, cobrado, pacientes(nombre, apellido), usuarios(nombre, apellido), tratamientos(sesiones_totales)')
        .gte('fecha', startStr)
        .lt('fecha', endExclusiveStr)
        .order('fecha')
        .order('hora')
        .order('id')

      if (turnos) {
        const dropped: Array<{ id: string; fecha: unknown; hora: unknown }> = []

        const mapped = turnos.map((t: any) => {
          const turnDate = parseDateValue(t.fecha)
          const timeValue = normalizeTimeValue(t.hora)

          if (!turnDate || !timeValue) {
            dropped.push({ id: String(t.id), fecha: t.fecha, hora: t.hora })
            return null
          }
          
          // Calcular día de la semana en formato lunes(0) ... domingo(6)
          const dayIndex = (turnDate.getDay() + 6) % 7
          if (dayIndex < 0 || dayIndex >= DAYS.length) {
            return null
          }

          const professionalName = t.usuarios
            ? `${t.usuarios.nombre || ''} ${t.usuarios.apellido || ''}`.trim()
            : 'Sin asignar'

          const patientName = t.pacientes
            ? `${t.pacientes.nombre || ''} ${t.pacientes.apellido || ''}`.trim()
            : 'Paciente sin nombre'

          return {
            id: t.id,
            day: dayIndex,
            time: timeValue,
            patient: patientName,
            service: serviceLabels[t.servicio] || t.servicio,
            professional: professionalName || 'Sin asignar',
            paciente_id: t.paciente_id,
            tratamiento_id: t.tratamiento_id,
            numero_sesion: t.numero_sesion,
            sesiones_totales: t.tratamientos?.sesiones_totales || null,
            asistido: t.asistido,
            cobrado: t.cobrado,
          }
        }).filter(Boolean) as Appointment[]

        const uniqueAppointments = Array.from(
          new Map(mapped.map((appointment) => [buildAppointmentDedupKey(appointment), appointment])).values()
        )

        if (uniqueAppointments.length !== mapped.length) {
          console.warn('[v0] Turnos duplicados ocultados en agenda semanal:', mapped.length - uniqueAppointments.length)
        }

        if (dropped.length > 0) {
          console.warn('[v0] Turnos descartados por formato de fecha/hora inválido:', dropped)
        }

        setAppointments(uniqueAppointments)
      }
    } catch (error) {
      console.error('[v0] Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }
  const weekStart = currentDate || new Date()
  const weekDays = Array.from({ length: DAYS.length }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const handlePrevWeek = () => {
    if (currentDate) {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 7)
      setCurrentDate(newDate)
      fetchAppointments(newDate)
    }
  }

  const handleNextWeek = () => {
    if (currentDate) {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
      fetchAppointments(newDate)
    }
  }

  const handleCompleteAppointment = (appt: Appointment) => {
    setSelectedTurno(appt)
    setShowCompletionModal(true)
  }

  const getAppointmentsForSlot = (day: number, time: string) => {
    return appointments.filter(a => a.day === day && a.time === time)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Agenda Semanal</h1>
          <p className="text-muted-foreground">Gestiona los turnos por horario</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-fit">
            {weekStart.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} - {new Date(weekStart.getTime() + (DAYS.length - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabla semanal */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 p-4 text-left text-sm font-medium border border-border bg-secondary">Hora</th>
              {DAYS.map((day, i) => (
                <th key={day} className="min-w-xs p-4 text-center text-sm font-medium border border-border bg-secondary">
                  <div>{day}</div>
                  <div className="text-xs text-muted-foreground">{weekDays[i].toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={DAYS.length + 1} className="p-4 text-sm text-center text-muted-foreground border border-border">
                  Cargando turnos...
                </td>
              </tr>
            ) : visibleTimeSlots.map((time) => (
              <tr key={time}>
                <td className="p-4 text-sm font-medium border border-border bg-secondary text-center">{time}</td>
                {DAYS.map((_, dayIndex) => {
                  const slotsAppts = getAppointmentsForSlot(dayIndex, time)
                  return (
                    <td key={`${dayIndex}-${time}`} className="p-2 border border-border min-h-24 align-top">
                      <div className="space-y-1">
                        {slotsAppts.map((appt) => {
                          const bgColor = appt.asistido 
                            ? 'bg-green-500/20 border border-green-500/40'
                            : 'bg-primary/20 border border-primary/40'
                          
                          return (
                            <div key={appt.id} className={`rounded p-2 text-xs ${bgColor}`}>
                              <div className="font-medium text-foreground truncate">{appt.patient}</div>
                              <div className="text-muted-foreground text-xs">{appt.service}</div>
                              {appt.numero_sesion && appt.sesiones_totales ? (
                                <div className="text-muted-foreground text-xs">
                                  Sesión {appt.numero_sesion}/{appt.sesiones_totales}
                                </div>
                              ) : null}
                              <div className="text-muted-foreground text-xs">{appt.professional}</div>
                              <div className="flex gap-1 mt-1">
                                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={() => handleCompleteAppointment(appt)}>
                                  <Check className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para completar turno */}
      <TurnoCompletionModal
        open={showCompletionModal}
        onOpenChange={setShowCompletionModal}
        turno={selectedTurno}
        onComplete={() => {
          setShowCompletionModal(false)
          fetchAppointments(currentDate || new Date())
        }}
      />
    </div>
  )
}
