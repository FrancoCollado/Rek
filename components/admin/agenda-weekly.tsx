'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Check, FileText, Palette, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TurnoCompletionModal from '@/components/admin/turno-completion-modal'

const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const minutesFromStart = i * 30
  const hour = 7 + Math.floor(minutesFromStart / 60)
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
  date: string
  estado?: string
  day: number
  time: string
  patient: string
  patientPhone?: string | null
  service: string
  professional: string
  paciente_id?: string
  tratamiento_id?: string | null
  numero_sesion?: number | null
  sesiones_totales?: number | null
  asistido?: boolean
  cobrado?: boolean
  especialidad_id?: string | null
  especialidad_nombre?: string | null
  especialidad_color?: string | null
}

interface Specialty {
  id: string
  nombre: string
  color: string
  activo: boolean
}

interface PatientHistoryEntry {
  id: string
  fecha: string
  hora: string
  estado: string
  servicio: string
  numero_sesion: number | null
  profesional: string
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

function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return `54${digits.slice(1)}`
  return `54${digits}`
}

function buildDefaultCancellationMessage(appointment: Appointment) {
  return `Hola ${appointment.patient}, te informamos que tu turno del ${appointment.date} a las ${appointment.time} hs fue cancelado. Si queres, te ayudamos a reprogramarlo en otro horario. Saludos, equipo REK.`
}

function normalizeDbBoolean(value: unknown) {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  return false
}

export default function AgendaWeekly() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState<Appointment | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyPatientName, setHistoryPatientName] = useState('')
  const [historyEntries, setHistoryEntries] = useState<PatientHistoryEntry[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false)
  const [selectedSpecialtyTurno, setSelectedSpecialtyTurno] = useState<Appointment | null>(null)
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('')
  const [specialtySaving, setSpecialtySaving] = useState(false)
  const [specialtyError, setSpecialtyError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedCancelTurno, setSelectedCancelTurno] = useState<Appointment | null>(null)
  const [sendCancelByWhatsApp, setSendCancelByWhatsApp] = useState(true)
  const [cancelSaving, setCancelSaving] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const cancelMessagePreview = selectedCancelTurno
    ? buildDefaultCancellationMessage(selectedCancelTurno)
    : ''

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
    fetchSpecialties()
  }, [])

  const fetchSpecialties = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('especialidades')
        .select('id, nombre, color, activo')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setSpecialties((data || []) as Specialty[])
    } catch (error) {
      console.error('[v0] Error loading specialties for agenda:', error)
    }
  }

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
        .select('id, fecha, hora, estado, servicio, paciente_id, tratamiento_id, numero_sesion, asistido, cobrado, especialidad_id, especialidades(nombre, color), pacientes(nombre, apellido, telefono), usuarios(nombre, apellido), tratamientos(sesiones_totales)')
        .gte('fecha', startStr)
        .lt('fecha', endExclusiveStr)
        .neq('estado', 'cancelado')
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
            date: String(t.fecha),
            estado: String(t.estado || ''),
            day: dayIndex,
            time: timeValue,
            patient: patientName,
            patientPhone: t.pacientes?.telefono || null,
            service: serviceLabels[t.servicio] || t.servicio,
            professional: professionalName || 'Sin asignar',
            paciente_id: t.paciente_id,
            tratamiento_id: t.tratamiento_id,
            numero_sesion: t.numero_sesion,
            sesiones_totales: t.tratamientos?.sesiones_totales || null,
            asistido: normalizeDbBoolean(t.asistido),
            cobrado: normalizeDbBoolean(t.cobrado),
            especialidad_id: t.especialidad_id,
            especialidad_nombre: t.especialidades?.nombre || null,
            especialidad_color: t.especialidades?.color || null,
          }
        }).filter(Boolean) as Appointment[]

        const uniqueAppointments = Array.from(
          new Map(mapped.map((appointment) => [buildAppointmentDedupKey(appointment), appointment])).values()
        )
        const filteredAppointments = uniqueAppointments.filter((appointment) => {
          const isCompleted = appointment.estado === 'realizado' || appointment.estado === 'completado'
          const unattendedAndUncharged = appointment.asistido === false && appointment.cobrado === false
          // Regla: una sesión completada sin asistido y sin cobrado desaparece de la agenda.
          if (isCompleted && unattendedAndUncharged) {
            return false
          }

          return true
        })

        if (uniqueAppointments.length !== mapped.length) {
          console.warn('[v0] Turnos duplicados ocultados en agenda semanal:', mapped.length - uniqueAppointments.length)
        }

        if (dropped.length > 0) {
          console.warn('[v0] Turnos descartados por formato de fecha/hora inválido:', dropped)
        }

        setAppointments(filteredAppointments)
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

  const handleOpenPatientHistory = async (appt: Appointment) => {
    if (!appt.paciente_id) {
      setHistoryPatientName(appt.patient)
      setHistoryEntries([])
      setHistoryError('Este turno no tiene paciente vinculado para consultar historial.')
      setShowHistoryModal(true)
      return
    }

    try {
      setShowHistoryModal(true)
      setHistoryLoading(true)
      setHistoryError(null)
      setHistoryPatientName(appt.patient)
      setHistoryEntries([])

      const supabase = createClient()
      const { data, error } = await supabase
        .from('turnos')
        .select('id, fecha, hora, estado, servicio, numero_sesion, usuarios(nombre, apellido)')
        .eq('paciente_id', appt.paciente_id)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
        .limit(30)

      if (error) throw error

      const mapped = ((data || []) as any[]).map((entry) => ({
        id: String(entry.id),
        fecha: String(entry.fecha),
        hora: String(entry.hora),
        estado: String(entry.estado),
        servicio: String(entry.servicio),
        numero_sesion: entry.numero_sesion ? Number(entry.numero_sesion) : null,
        profesional: entry.usuarios
          ? `${entry.usuarios.nombre || ''} ${entry.usuarios.apellido || ''}`.trim() || 'Sin asignar'
          : 'Sin asignar',
      }))

      setHistoryEntries(mapped)
    } catch (error) {
      console.error('[v0] Error loading patient history from agenda:', error)
      setHistoryError('No se pudo cargar el historial clínico del paciente.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleOpenSpecialtyModal = (appt: Appointment) => {
    setSelectedSpecialtyTurno(appt)
    setSelectedSpecialtyId(appt.especialidad_id || '')
    setSpecialtyError(null)
    setShowSpecialtyModal(true)
  }

  const handleSaveSpecialty = async () => {
    if (!selectedSpecialtyTurno) return

    try {
      setSpecialtySaving(true)
      setSpecialtyError(null)

      const supabase = createClient()
      const payload = {
        especialidad_id: selectedSpecialtyId || null,
      }

      const { error } = await supabase
        .from('turnos')
        .update(payload)
        .eq('id', selectedSpecialtyTurno.id)

      if (error) throw error

      const selectedSpecialty = specialties.find((item) => item.id === selectedSpecialtyId)
      setAppointments((current) => current.map((appt) => {
        if (appt.id !== selectedSpecialtyTurno.id) return appt
        return {
          ...appt,
          especialidad_id: selectedSpecialtyId || null,
          especialidad_nombre: selectedSpecialty?.nombre || null,
          especialidad_color: selectedSpecialty?.color || null,
        }
      }))

      setShowSpecialtyModal(false)
    } catch (error) {
      console.error('[v0] Error assigning specialty:', error)
      setSpecialtyError('No se pudo guardar la especialidad en el turno.')
    } finally {
      setSpecialtySaving(false)
    }
  }

  const handleOpenCancelModal = (appt: Appointment) => {
    setSelectedCancelTurno(appt)
    setSendCancelByWhatsApp(true)
    setCancelError(null)
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedCancelTurno) return

    try {
      setCancelSaving(true)
      setCancelError(null)

      const supabase = createClient()
      const { error } = await supabase
        .from('turnos')
        .update({ estado: 'cancelado' })
        .eq('id', selectedCancelTurno.id)

      if (error) throw error

      if (sendCancelByWhatsApp) {
        const rawPhone = selectedCancelTurno.patientPhone || ''
        const phone = normalizePhoneForWhatsApp(rawPhone)

        if (!phone) {
          setCancelError('Turno cancelado, pero el paciente no tiene teléfono válido para WhatsApp.')
          setAppointments((current) => current.filter((appt) => appt.id !== selectedCancelTurno.id))
          return
        }

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildDefaultCancellationMessage(selectedCancelTurno))}`
        window.open(url, '_blank', 'noopener,noreferrer')
      }

      setAppointments((current) => current.filter((appt) => appt.id !== selectedCancelTurno.id))
      setShowCancelModal(false)
    } catch (error) {
      console.error('[v0] Error canceling appointment:', error)
      setCancelError('No se pudo cancelar la sesión. Intentalo nuevamente.')
    } finally {
      setCancelSaving(false)
    }
  }

  const getAppointmentsForSlot = (day: number, time: string) => {
    return appointments.filter(a => a.day === day && a.time === time)
  }

  return (
    <div className="p-5 md:p-6">
      <Link
        href="/admin/especialidades"
        className="fixed right-3 top-1/2 z-20 -translate-y-1/2 rounded-l-lg border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm hover:bg-secondary"
      >
        Especialidades
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold">Agenda Semanal</h1>
          <p className="text-sm text-muted-foreground">Gestiona los turnos por horario</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-fit">
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
              <th className="w-16 p-2 text-left text-xs font-medium border border-border bg-secondary">Hora</th>
              {DAYS.map((day, i) => (
                <th key={day} className="min-w-40 p-2 text-center text-xs font-medium border border-border bg-secondary">
                  <div>{day}</div>
                  <div className="text-[11px] text-muted-foreground">{weekDays[i].toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={DAYS.length + 1} className="p-3 text-sm text-center text-muted-foreground border border-border">
                  Cargando turnos...
                </td>
              </tr>
            ) : visibleTimeSlots.map((time) => (
              <tr key={time}>
                <td className="p-2 text-xs font-medium border border-border bg-secondary text-center">{time}</td>
                {DAYS.map((_, dayIndex) => {
                  const slotsAppts = getAppointmentsForSlot(dayIndex, time)
                  return (
                    <td key={`${dayIndex}-${time}`} className="p-1 border border-border min-h-14 align-top">
                      <div className="space-y-0.5">
                        {slotsAppts.map((appt) => {
                          const unattendedButCharged = appt.asistido === false && appt.cobrado === true
                          const useSpecialtyStyle = Boolean(appt.especialidad_color) && !unattendedButCharged
                          const bgColor = appt.asistido
                            ? 'bg-green-500/20 border border-green-500/40'
                            : unattendedButCharged
                            ? 'bg-red-500/20 border border-red-500/40'
                            : 'bg-primary/20 border border-primary/40'
                          const specialtyStyle = useSpecialtyStyle
                            ? {
                                backgroundColor: `${appt.especialidad_color}22`,
                                borderColor: appt.especialidad_color,
                              }
                            : undefined
                          
                          return (
                            <div key={appt.id} className={`rounded p-1.5 text-[11px] border ${useSpecialtyStyle ? '' : bgColor}`} style={specialtyStyle}>
                              <div className="font-medium leading-tight text-foreground truncate">{appt.patient}</div>
                              <div className="text-muted-foreground text-[10px] leading-tight">{appt.service}</div>
                              {appt.especialidad_nombre ? (
                                <div className="text-[9px] font-medium leading-tight" style={{ color: appt.especialidad_color || undefined }}>
                                  {appt.especialidad_nombre}
                                </div>
                              ) : null}
                              {appt.numero_sesion && appt.sesiones_totales ? (
                                <div className="text-muted-foreground text-[10px] leading-tight">
                                  Sesión {appt.numero_sesion}/{appt.sesiones_totales}
                                </div>
                              ) : null}
                              <div className="text-muted-foreground text-[10px] leading-tight truncate">{appt.professional}</div>
                              <div className="flex gap-0.5 mt-0.5">
                                <Button size="sm" variant="ghost" className="h-4 px-1 text-[10px]" onClick={() => handleCompleteAppointment(appt)}>
                                  <Check className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 px-1 text-[10px]"
                                  onClick={() => handleOpenCancelModal(appt)}
                                  title="Cancelar sesión"
                                >
                                  <XCircle className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 px-1 text-[10px]"
                                  onClick={() => handleOpenSpecialtyModal(appt)}
                                  title="Asignar especialidad"
                                >
                                  <Palette className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 px-1 text-[10px]"
                                  onClick={() => handleOpenPatientHistory(appt)}
                                  title="Ver historial clínico"
                                >
                                  <FileText className="w-2.5 h-2.5" />
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

      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial clínico</DialogTitle>
            <DialogDescription>
              {historyPatientName ? `Paciente: ${historyPatientName}` : 'Historial de turnos del paciente'}
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Cargando historial...</p>
          ) : historyError ? (
            <p className="text-sm text-destructive">{historyError}</p>
          ) : historyEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial registrado.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {historyEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                  <div className="flex flex-wrap gap-3">
                    <span className="font-medium">{entry.fecha}</span>
                    <span>{String(entry.hora).slice(0, 5)} hs</span>
                    <span>{serviceLabels[entry.servicio] || entry.servicio}</span>
                    <span>Estado: {entry.estado}</span>
                  </div>
                  {entry.numero_sesion ? (
                    <div className="text-muted-foreground mt-1">Sesión planificada: #{entry.numero_sesion}</div>
                  ) : null}
                  <div className="text-muted-foreground mt-1">Profesional: {entry.profesional}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSpecialtyModal} onOpenChange={setShowSpecialtyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar especialidad</DialogTitle>
            <DialogDescription>
              {selectedSpecialtyTurno ? `Turno de ${selectedSpecialtyTurno.patient} (${selectedSpecialtyTurno.time} hs)` : 'Seleccioná una especialidad para este turno'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium">Especialidad</label>
            <select
              value={selectedSpecialtyId}
              onChange={(e) => setSelectedSpecialtyId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin especialidad</option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.nombre} ({specialty.color})
                </option>
              ))}
            </select>

            {specialtyError ? (
              <p className="text-sm text-destructive">{specialtyError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSpecialtyModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSpecialty} disabled={specialtySaving}>
                {specialtySaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar sesión</DialogTitle>
            <DialogDescription>
              {selectedCancelTurno
                ? `¿Seguro que querés cancelar el turno de ${selectedCancelTurno.patient} (${selectedCancelTurno.date} ${selectedCancelTurno.time} hs)?`
                : '¿Seguro que querés cancelar esta sesión?'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendCancelByWhatsApp}
                onChange={(e) => setSendCancelByWhatsApp(e.target.checked)}
              />
              Enviar cancelación por WhatsApp
            </label>

            {sendCancelByWhatsApp ? (
              <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Mensaje por defecto:</p>
                <p>{cancelMessagePreview}</p>
              </div>
            ) : null}

            {cancelError ? (
              <p className="text-sm text-destructive">{cancelError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={cancelSaving}>
                Volver
              </Button>
              <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelSaving}>
                {cancelSaving ? 'Cancelando...' : 'Confirmar cancelación'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
