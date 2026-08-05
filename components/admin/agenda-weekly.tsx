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
import { ChevronLeft, ChevronRight, Check, FileText, Lock, Palette, Plus, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TurnoCompletionModal from '@/components/admin/turno-completion-modal'

// El local abre a las 08:00. Bloques válidos: :00 (2 cupos), :15 (1 cupo), :30 (2 cupos). Sin :45.
// Franja 12:00-15:59: solo :00 y :30 (dos turnos por hora, un cupo cada uno).
const TIME_SLOTS = Array.from({ length: 13 }, (_, h) => h + 8).flatMap((h) => {
  if (h >= 20) return ['20:00']
  const minutes = h >= 12 && h < 16 ? [0, 30] : [0, 15, 30]
  return minutes.map((m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
})

function getSlotCapacity(time: string): number {
  const [h, m] = time.split(':').map((value) => parseInt(value, 10))
  // El local abre a las 08:00: no hay cupos antes.
  if (h < 8) return 0
  // Franja 12:00-15:59: solo dos turnos por hora (:00 y :30), un cupo cada uno.
  if (h >= 12 && h < 16) {
    if (m === 0 || m === 30) return 1
    return 0
  }
  if (m === 0) return 2
  if (m === 15) return 1
  if (m === 30) return 2
  return 1
}
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

type ServiceScope = 'kinesiologia' | 'traumatologia'

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
  entidad_id?: 'kinesiologia' | 'traumatologia'
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
  notas?: string | null
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
  notas: string | null
}

interface PatientOption {
  id: string
  nombre: string
  apellido: string
  dni?: string | null
}

interface TreatmentOption {
  id: string
  paciente_id: string
  servicio: 'kinesiologia' | 'traumatologia'
  estado: string
  sesiones_totales: number
  sesiones_realizadas: number
}

interface AgendaBlock {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  motivo: string | null
}

type FeriadoItem = { dia: number; mes: number; motivo: string; tipo: string }

interface CreateSlotContext {
  dayIndex: number
  time: string
  date: string
}

type ManualTurnoForm = {
  paciente_id: string
  tratamiento_id: string
  numero_sesion: string
  monto_pagado: string
  notas: string
}

type NewPatientInlineForm = {
  nombre: string
  apellido: string
  telefono: string
  obra_social: string
  dni: string
}

type NewTreatmentInlineForm = {
  tipo_plan: 'orden' | 'libre'
  sesiones_totales: string
  precio_total: string
  notas: string
}

const defaultManualTurnoForm: ManualTurnoForm = {
  paciente_id: '',
  tratamiento_id: '',
  numero_sesion: '',
  monto_pagado: '',
  notas: '',
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

function formatDateForDb(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeSearchText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function formatPatientOptionLabel(patient: PatientOption) {
  return `${patient.apellido || ''}, ${patient.nombre || ''}`.trim() + (patient.dni ? ` - DNI ${patient.dni}` : '')
}

export default function AgendaWeekly({
  serviceScope,
  baseTimeSlots,
  canCreateSlot,
}: {
  serviceScope?: ServiceScope
  baseTimeSlots?: string[]
  canCreateSlot?: (dayIndex: number, time: string) => boolean
} = {}) {
  const currentEntity: ServiceScope = serviceScope || 'kinesiologia'
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState<Appointment | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyPatientName, setHistoryPatientName] = useState('')
  const [historyEntries, setHistoryEntries] = useState<PatientHistoryEntry[]>([])
  const [historyTurnoId, setHistoryTurnoId] = useState<string | null>(null)
  const [historyTurnoNotas, setHistoryTurnoNotas] = useState('')
  const [historySaving, setHistorySaving] = useState(false)
  const [historySaveError, setHistorySaveError] = useState<string | null>(null)
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createSlot, setCreateSlot] = useState<CreateSlotContext | null>(null)
  const [manualTurnoForm, setManualTurnoForm] = useState<ManualTurnoForm>(defaultManualTurnoForm)
  const [patientSearch, setPatientSearch] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([])
  const [treatmentOptions, setTreatmentOptions] = useState<TreatmentOption[]>([])
  const [scheduledCountByTreatment, setScheduledCountByTreatment] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // Bloqueos de agenda
  const [blocks, setBlocks] = useState<AgendaBlock[]>([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockDay, setBlockDay] = useState<{ dayIndex: number; date: string } | null>(null)
  const [blockHoraInicio, setBlockHoraInicio] = useState('16:00')
  const [blockHoraFin, setBlockHoraFin] = useState('20:00')
  const [blockMotivo, setBlockMotivo] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)
  // Feriados
  const [showFeriadosModal, setShowFeriadosModal] = useState(false)
  const [feriadosList, setFeriadosList] = useState<FeriadoItem[]>([])
  const [selectedFeriados, setSelectedFeriados] = useState<Set<string>>(new Set())
  const [feriadosLoading, setFeriadosLoading] = useState(false)
  const [feriadosError, setFeriadosError] = useState<string | null>(null)
  const [feriadosSaving, setFeriadosSaving] = useState(false)
  // Inline new-patient form inside create modal
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [newPatientForm, setNewPatientForm] = useState<NewPatientInlineForm>({ nombre: '', apellido: '', telefono: '', obra_social: '', dni: '' })
  const [newPatientSaving, setNewPatientSaving] = useState(false)
  const [newPatientError, setNewPatientError] = useState<string | null>(null)
  // Inline new-treatment form inside create modal
  const [showNewTreatmentForm, setShowNewTreatmentForm] = useState(false)
  const [newTreatmentForm, setNewTreatmentForm] = useState<NewTreatmentInlineForm>({ tipo_plan: 'orden', sesiones_totales: '10', precio_total: '60000', notas: '' })
  const [newTreatmentSaving, setNewTreatmentSaving] = useState(false)
  const [newTreatmentError, setNewTreatmentError] = useState<string | null>(null)

  const cancelMessagePreview = selectedCancelTurno
    ? buildDefaultCancellationMessage(selectedCancelTurno)
    : ''

  const visibleTimeSlots = useMemo(() => {
    const set = new Set<string>(baseTimeSlots || TIME_SLOTS)
    appointments.forEach((appt) => set.add(appt.time))
    // El local abre a las 08:00: nunca mostrar horarios anteriores.
    return Array.from(set)
      .filter((time) => time >= '08:00')
      .sort((left, right) => left.localeCompare(right))
  }, [appointments, baseTimeSlots])

  useEffect(() => {
    // Inicializar con hoy (lunes de esta semana)
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    setCurrentDate(monday)

    // Cargar turnos de Supabase
    fetchAppointments(monday)
    fetchBlocks(monday)
    fetchSpecialties()
    fetchCreateFormOptions()
  }, [])

  const fetchCreateFormOptions = async () => {
    try {
      const supabase = createClient()
      const [{ data: patientsData, error: patientsError }, { data: treatmentsData, error: treatmentsError }, { data: scheduledData }] = await Promise.all([
        supabase.from('pacientes').select('id, nombre, apellido, dni').eq('entidad_id', currentEntity).order('apellido').order('nombre'),
        supabase.from('tratamientos').select('id, paciente_id, servicio, estado, sesiones_totales, sesiones_realizadas').eq('entidad_id', currentEntity).order('created_at', { ascending: false }),
        supabase.from('turnos').select('tratamiento_id').eq('entidad_id', currentEntity).neq('estado', 'cancelado').not('tratamiento_id', 'is', null),
      ])

      if (patientsError) throw patientsError
      setPatientOptions((patientsData || []) as PatientOption[])

      if (treatmentsError) {
        console.error('[v0] Error loading treatments for manual turnos:', treatmentsError)
        setTreatmentOptions([])
      } else {
        setTreatmentOptions((treatmentsData || []) as TreatmentOption[])
      }

      const countMap: Record<string, number> = {}
      for (const row of scheduledData || []) {
        if (row.tratamiento_id) {
          countMap[row.tratamiento_id] = (countMap[row.tratamiento_id] || 0) + 1
        }
      }
      setScheduledCountByTreatment(countMap)
    } catch (error) {
      console.error('[v0] Error loading options for manual turnos:', error)
      setPatientOptions([])
    }
  }

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
        .select('id, fecha, hora, estado, entidad_id, servicio, paciente_id, tratamiento_id, numero_sesion, asistido, cobrado, notas, especialidad_id, especialidades(nombre, color), pacientes(nombre, apellido, telefono), usuarios(nombre, apellido), tratamientos(sesiones_totales)')
        .eq('entidad_id', currentEntity)
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
            entidad_id: t.entidad_id,
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
            notas: t.notas || null,
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
          if (currentEntity !== 'traumatologia' && isCompleted && unattendedAndUncharged) {
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
      fetchBlocks(newDate)
    }
  }

  const handleNextWeek = () => {
    if (currentDate) {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
      fetchAppointments(newDate)
      fetchBlocks(newDate)
    }
  }

  const fetchBlocks = async (startDate: Date) => {
    try {
      const supabase = createClient()
      const startStr = formatDateForDb(startDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const endStr = formatDateForDb(endDate)
      const { data } = await supabase
        .from('bloqueos_agenda')
        .select('id, fecha, hora_inicio, hora_fin, motivo')
        .eq('entidad_id', currentEntity)
        .gte('fecha', startStr)
        .lte('fecha', endStr)
      setBlocks((data || []) as AgendaBlock[])
    } catch {
      // silently ignore
    }
  }

  const isSlotBlocked = (date: string, time: string): AgendaBlock | undefined =>
    blocks.find((b) => {
      if (b.fecha !== date) return false
      const start = b.hora_inicio.slice(0, 5)
      const end = b.hora_fin.slice(0, 5)
      return time >= start && time < end
    })

  const handleOpenBlockModal = (dayIndex: number) => {
    setBlockDay({ dayIndex, date: formatDateForDb(weekDays[dayIndex]) })
    setBlockHoraInicio('16:00')
    setBlockHoraFin('20:00')
    setBlockMotivo('')
    setBlockError(null)
    setShowBlockModal(true)
  }

  const handleCreateBlock = async () => {
    if (!blockDay) return
    if (blockHoraInicio >= blockHoraFin) {
      setBlockError('La hora de inicio debe ser anterior a la hora de fin.')
      return
    }
    try {
      setBlockSaving(true)
      setBlockError(null)
      const supabase = createClient()
      const { error } = await supabase.from('bloqueos_agenda').insert({
        entidad_id: currentEntity,
        fecha: blockDay.date,
        hora_inicio: `${blockHoraInicio}:00`,
        hora_fin: `${blockHoraFin}:00`,
        motivo: blockMotivo.trim() || null,
      })
      if (error) throw error
      setShowBlockModal(false)
      await fetchBlocks(currentDate || new Date())
    } catch (err: any) {
      setBlockError(err?.message || 'No se pudo crear el bloqueo.')
    } finally {
      setBlockSaving(false)
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const supabase = createClient()
      await supabase.from('bloqueos_agenda').delete().eq('id', blockId)
      setBlocks((current) => current.filter((b) => b.id !== blockId))
    } catch {
      // silently ignore
    }
  }

  const handleFetchFeriados = async () => {
    const year = (currentDate || new Date()).getFullYear()
    try {
      setFeriadosLoading(true)
      setFeriadosError(null)
      const res = await fetch(`/api/feriados?year=${year}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo obtener el listado de feriados.')
      const feriadoData: FeriadoItem[] = data
      setFeriadosList(feriadoData)
      setSelectedFeriados(new Set(feriadoData.map((f) => `${f.mes}-${f.dia}`)))
    } catch (err: any) {
      setFeriadosError(err?.message || 'Error al obtener feriados.')
    } finally {
      setFeriadosLoading(false)
    }
  }

  const handleImportFeriados = async () => {
    const year = (currentDate || new Date()).getFullYear()
    const toImport = feriadosList.filter((f) => selectedFeriados.has(`${f.mes}-${f.dia}`))
    if (toImport.length === 0) return
    try {
      setFeriadosSaving(true)
      setFeriadosError(null)
      const supabase = createClient()
      for (const f of toImport) {
        const fecha = `${year}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`
        await supabase.from('bloqueos_agenda').insert({
          entidad_id: currentEntity,
          fecha,
          hora_inicio: '08:00:00',
          hora_fin: '20:00:00',
          motivo: f.motivo || 'Feriado nacional',
        })
      }
      setShowFeriadosModal(false)
      await fetchBlocks(currentDate || new Date())
    } catch (err: any) {
      setFeriadosError(err?.message || 'No se pudieron importar los feriados.')
    } finally {
      setFeriadosSaving(false)
    }
  }

  const handleCompleteAppointment = (appt: Appointment) => {
    setSelectedTurno(appt)
    setShowCompletionModal(true)
  }

  const handleOpenPatientHistory = async (appt: Appointment) => {
    setHistoryTurnoId(appt.id)
    setHistoryTurnoNotas(appt.notas || '')
    setHistorySaveError(null)

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
        .select('id, fecha, hora, estado, servicio, numero_sesion, notas, usuarios(nombre, apellido)')
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
        notas: entry.notas || null,
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

  const handleSaveTurnoObservation = async () => {
    if (!historyTurnoId) return

    try {
      setHistorySaving(true)
      setHistorySaveError(null)

      const supabase = createClient()
      const observation = historyTurnoNotas.trim()
      const { error } = await supabase
        .from('turnos')
        .update({ notas: observation || null })
        .eq('id', historyTurnoId)

      if (error) throw error

      setAppointments((current) => current.map((appt) => (
        appt.id === historyTurnoId ? { ...appt, notas: observation || null } : appt
      )))

      setHistoryEntries((current) => current.map((entry) => (
        entry.id === historyTurnoId ? { ...entry, notas: observation || null } : entry
      )))
    } catch (error) {
      console.error('[v0] Error saving clinical observation:', error)
      setHistorySaveError('No se pudo guardar la observación clínica del turno.')
    } finally {
      setHistorySaving(false)
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

  const availableTreatmentsForPatient = useMemo(() => {
    if (!manualTurnoForm.paciente_id) return []
    return treatmentOptions.filter((treatment) => treatment.paciente_id === manualTurnoForm.paciente_id)
  }, [manualTurnoForm.paciente_id, treatmentOptions])

  const filteredPatientOptions = useMemo(() => {
    const term = normalizeSearchText(patientSearch)
    if (!term) return patientOptions.slice(0, 20)

    return patientOptions.filter((patient) => {
      const fullName = normalizeSearchText(`${patient.nombre || ''} ${patient.apellido || ''}`)
      const dni = normalizeSearchText(patient.dni)
      return fullName.includes(term) || dni.includes(term)
    }).slice(0, 20)
  }, [patientOptions, patientSearch])

  const handleOpenCreateModal = (dayIndex: number, time: string) => {
    const slotDate = weekDays[dayIndex]
    setCreateSlot({ dayIndex, time, date: formatDateForDb(slotDate) })
    setManualTurnoForm(defaultManualTurnoForm)
    setPatientSearch('')
    setCreateError(null)
    setShowNewPatientForm(false)
    setNewPatientForm({ nombre: '', apellido: '', telefono: '', obra_social: '', dni: '' })
    setNewPatientError(null)
    setShowNewTreatmentForm(false)
    setNewTreatmentForm({ tipo_plan: 'orden', sesiones_totales: '10', precio_total: '60000', notas: '' })
    setNewTreatmentError(null)
    setShowCreateModal(true)
  }

  const handleCreateInlinePatient = async () => {
    if (!newPatientForm.nombre.trim() || !newPatientForm.apellido.trim()) {
      setNewPatientError('Nombre y apellido son obligatorios.')
      return
    }
    try {
      setNewPatientSaving(true)
      setNewPatientError(null)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pacientes')
        .insert({
          entidad_id: currentEntity,
          nombre: newPatientForm.nombre.trim(),
          apellido: newPatientForm.apellido.trim(),
          telefono: newPatientForm.telefono.trim() || null,
          obra_social: newPatientForm.obra_social.trim() || null,
          dni: newPatientForm.dni.trim() || null,
          email: null,
        })
        .select('id, nombre, apellido, dni')
        .single()
      if (error) throw error
      const newPatient = data as PatientOption
      setPatientOptions((current) => [newPatient, ...current])
      setManualTurnoForm((current) => ({ ...current, paciente_id: newPatient.id, tratamiento_id: '' }))
      setPatientSearch(formatPatientOptionLabel(newPatient))
      setShowNewPatientForm(false)
      setNewPatientForm({ nombre: '', apellido: '', telefono: '', obra_social: '', dni: '' })
    } catch (err: any) {
      setNewPatientError(err?.message || 'No se pudo crear el paciente.')
    } finally {
      setNewPatientSaving(false)
    }
  }

  const handleCreateInlineTreatment = async () => {
    if (!manualTurnoForm.paciente_id) {
      setNewTreatmentError('Primero seleccioná un paciente.')
      return
    }
    try {
      setNewTreatmentSaving(true)
      setNewTreatmentError(null)
      const supabase = createClient()
      const totalSessions = Math.max(1, Number(newTreatmentForm.sesiones_totales || '1'))
      const totalPrice = Math.max(0, Number(newTreatmentForm.precio_total || '0'))
      const { data, error } = await supabase
        .from('tratamientos')
        .insert({
          entidad_id: currentEntity,
          paciente_id: manualTurnoForm.paciente_id,
          servicio: currentEntity,
          tipo_plan: newTreatmentForm.tipo_plan,
          sesiones_totales: totalSessions,
          sesiones_realizadas: 0,
          precio_total: totalPrice,
          monto_pagado: 0,
          notas: newTreatmentForm.notas.trim() || null,
          estado: 'activo',
        })
        .select('id, paciente_id, servicio, estado, sesiones_totales, sesiones_realizadas')
        .single()
      if (error) throw error
      const newTreatment = data as TreatmentOption
      setTreatmentOptions((current) => [newTreatment, ...current])
      setManualTurnoForm((current) => ({
        ...current,
        tratamiento_id: newTreatment.id,
        numero_sesion: '1',
      }))
      setShowNewTreatmentForm(false)
      setNewTreatmentForm({ tipo_plan: 'orden', sesiones_totales: '10', precio_total: '60000', notas: '' })
    } catch (err: any) {
      setNewTreatmentError(err?.message || 'No se pudo crear el tratamiento.')
    } finally {
      setNewTreatmentSaving(false)
    }
  }

  const handleCreateTurno = async () => {
    if (!createSlot) return

    if (!manualTurnoForm.paciente_id) {
      setCreateError('Seleccioná un paciente para crear el turno.')
      return
    }

    // Bloquear si el tratamiento ya tiene todas sus sesiones agendadas.
    if (manualTurnoForm.tratamiento_id) {
      const treatment = availableTreatmentsForPatient.find((t) => t.id === manualTurnoForm.tratamiento_id)
      if (treatment) {
        const scheduled = scheduledCountByTreatment[treatment.id] || 0
        if (scheduled >= treatment.sesiones_totales) {
          setCreateError(`Este tratamiento ya tiene todas sus ${treatment.sesiones_totales} sesiones agendadas. No se pueden agregar más.`)
          return
        }
      }
    }

    try {
      setCreateSaving(true)
      setCreateError(null)

      const supabase = createClient()
      const payload = {
        paciente_id: manualTurnoForm.paciente_id,
        tratamiento_id: manualTurnoForm.tratamiento_id || null,
        entidad_id: currentEntity,
        servicio: currentEntity,
        numero_sesion: manualTurnoForm.numero_sesion ? Number(manualTurnoForm.numero_sesion) : null,
        fecha: createSlot.date,
        hora: `${createSlot.time}:00`,
        estado: 'pendiente',
        asistido: false,
        cobrado: false,
        monto_pagado: manualTurnoForm.monto_pagado ? Math.max(0, Number(manualTurnoForm.monto_pagado)) : null,
        notas: manualTurnoForm.notas.trim() || null,
        especialidad_id: null,
      }

      const { error } = await supabase
        .from('turnos')
        .insert(payload)

      if (error) throw error

      setShowCreateModal(false)
      setCreateSlot(null)
      setManualTurnoForm(defaultManualTurnoForm)
      await Promise.all([fetchAppointments(currentDate || new Date()), fetchCreateFormOptions()])
    } catch (error: any) {
      console.error('[v0] Error creating manual turno:', error)
      setCreateError(error?.message || 'No se pudo crear el turno manualmente.')
    } finally {
      setCreateSaving(false)
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => { setShowFeriadosModal(true); handleFetchFeriados() }}
            title="Importar feriados nacionales"
          >
            <Lock className="w-3 h-3" />
            Feriados
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
                  <div className="flex items-center justify-center gap-1">
                    <span>{day}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenBlockModal(i)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Bloquear rango de horarios"
                    >
                      <Lock className="w-3 h-3" />
                    </button>
                  </div>
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
                <td className="p-2 text-xs font-medium border border-border bg-secondary text-center">
                  <div>{time}</div>
                  <div className="text-[9px] text-muted-foreground">×{getSlotCapacity(time)}</div>
                </td>
                {DAYS.map((_, dayIndex) => {
                  const slotsAppts = getAppointmentsForSlot(dayIndex, time)
                  const dateStr = formatDateForDb(weekDays[dayIndex])
                  const block = isSlotBlocked(dateStr, time)
                  return (
                    <td key={`${dayIndex}-${time}`} className="p-1 border border-border min-h-14 align-top">
                      <div className="space-y-0.5">
                        {block ? (
                          <div className="flex items-center justify-between px-1 py-0.5 rounded text-[10px] bg-destructive/10 border border-destructive/20 text-muted-foreground">
                            <span className="truncate">🔒 {block.motivo || 'Bloqueado'}</span>
                            <button type="button" onClick={() => handleDeleteBlock(block.id)} className="text-destructive ml-1 hover:opacity-70 shrink-0" title="Desbloquear">×</button>
                          </div>
                        ) : slotsAppts.length < getSlotCapacity(time) && (!canCreateSlot || canCreateSlot(dayIndex, time)) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-full justify-center text-[11px] text-muted-foreground"
                            onClick={() => handleOpenCreateModal(dayIndex, time)}
                            title="Crear turno manual"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {slotsAppts.length === 0 ? 'Crear' : `Agregar (${slotsAppts.length}/${getSlotCapacity(time)})`}
                          </Button>
                          ) : null}
                        {slotsAppts.map((appt) => {
                          const isCompleted = appt.estado === 'realizado' || appt.estado === 'completado'
                          const unattendedButCharged = appt.asistido === false && appt.cobrado === true
                          const useSpecialtyStyle = Boolean(appt.especialidad_color) && !unattendedButCharged
                          const bgColor = currentEntity === 'traumatologia' && isCompleted
                            ? 'bg-green-500/20 border border-green-500/40'
                            : appt.asistido
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
        entidadId={currentEntity}
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
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <label className="text-sm font-medium">Observaciones del turno seleccionado</label>
                <textarea
                  value={historyTurnoNotas}
                  onChange={(e) => setHistoryTurnoNotas(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-24"
                  placeholder="Escribí aquí observaciones clínicas de este turno..."
                />
                {historySaveError ? (
                  <p className="text-sm text-destructive mt-2">{historySaveError}</p>
                ) : null}
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleSaveTurnoObservation} disabled={historySaving || !historyTurnoId}>
                    {historySaving ? 'Guardando...' : 'Guardar observación'}
                  </Button>
                </div>
              </div>

              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
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
                    {entry.notas ? (
                      <div className="text-muted-foreground mt-1">Observación: {entry.notas}</div>
                    ) : null}
                  </div>
                ))}
              </div>
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

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear turno manual</DialogTitle>
            <DialogDescription>
              {createSlot
                ? `Nuevo turno para ${DAYS[createSlot.dayIndex]} ${createSlot.date} a las ${createSlot.time} hs`
                : 'Completá los datos del turno manual'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Buscar paciente</label>
                <button
                  type="button"
                  onClick={() => { setShowNewPatientForm((v) => !v); setNewPatientError(null) }}
                  className="text-xs text-primary hover:underline"
                >
                  {showNewPatientForm ? '← Volver a búsqueda' : '+ Nuevo paciente'}
                </button>
              </div>

              {showNewPatientForm ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Nombre *</label>
                      <input value={newPatientForm.nombre} onChange={(e) => setNewPatientForm((f) => ({ ...f, nombre: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Apellido *</label>
                      <input value={newPatientForm.apellido} onChange={(e) => setNewPatientForm((f) => ({ ...f, apellido: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Teléfono</label>
                      <input value={newPatientForm.telefono} onChange={(e) => setNewPatientForm((f) => ({ ...f, telefono: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Obra social</label>
                      <input value={newPatientForm.obra_social} onChange={(e) => setNewPatientForm((f) => ({ ...f, obra_social: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">DNI (opcional)</label>
                      <input value={newPatientForm.dni} onChange={(e) => setNewPatientForm((f) => ({ ...f, dni: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                  </div>
                  {newPatientError && <p className="text-xs text-destructive">{newPatientError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowNewPatientForm(false)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                    <Button size="sm" onClick={handleCreateInlinePatient} disabled={newPatientSaving}>
                      {newPatientSaving ? 'Creando...' : 'Crear paciente'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setManualTurnoForm((current) => ({ ...current, paciente_id: '', tratamiento_id: '' }))
                    }}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Escribí nombre, apellido o DNI"
                  />
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border bg-background">
                    {filteredPatientOptions.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          setManualTurnoForm((current) => ({ ...current, paciente_id: patient.id, tratamiento_id: '' }))
                          setPatientSearch(formatPatientOptionLabel(patient))
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary ${manualTurnoForm.paciente_id === patient.id ? 'bg-secondary' : ''}`}
                      >
                        {formatPatientOptionLabel(patient)}
                      </button>
                    ))}
                    {filteredPatientOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No se encontraron pacientes con ese criterio.</p>
                    ) : null}
                  </div>
                  {manualTurnoForm.paciente_id ? (
                    <p className="text-xs text-primary mt-1">Paciente seleccionado correctamente.</p>
                  ) : null}
                </>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Tratamiento</label>
                {manualTurnoForm.paciente_id && (
                  <button
                    type="button"
                    onClick={() => { setShowNewTreatmentForm((v) => !v); setNewTreatmentError(null) }}
                    className="text-xs text-primary hover:underline"
                  >
                    {showNewTreatmentForm ? '← Volver' : '+ Nuevo tratamiento'}
                  </button>
                )}
              </div>
              {showNewTreatmentForm ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Tipo</label>
                      <select value={newTreatmentForm.tipo_plan} onChange={(e) => setNewTreatmentForm((f) => ({ ...f, tipo_plan: e.target.value as 'orden' | 'libre' }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm">
                        <option value="orden">Orden médica</option>
                        <option value="libre">Sesión libre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Sesiones totales</label>
                      <input type="number" min="1" value={newTreatmentForm.sesiones_totales} onChange={(e) => setNewTreatmentForm((f) => ({ ...f, sesiones_totales: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Precio total</label>
                      <input type="number" min="0" value={newTreatmentForm.precio_total} onChange={(e) => setNewTreatmentForm((f) => ({ ...f, precio_total: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium">Notas</label>
                      <textarea value={newTreatmentForm.notas} onChange={(e) => setNewTreatmentForm((f) => ({ ...f, notas: e.target.value }))} className="w-full rounded border border-border bg-background px-2 py-1 text-sm min-h-16" />
                    </div>
                  </div>
                  {newTreatmentError && <p className="text-xs text-destructive">{newTreatmentError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowNewTreatmentForm(false)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                    <Button size="sm" onClick={handleCreateInlineTreatment} disabled={newTreatmentSaving}>
                      {newTreatmentSaving ? 'Creando...' : 'Crear tratamiento'}
                    </Button>
                  </div>
                </div>
              ) : (
                <select
                  value={manualTurnoForm.tratamiento_id}
                  onChange={(e) => {
                    const selectedTreatmentId = e.target.value
                    const selectedTreatment = availableTreatmentsForPatient.find((item) => item.id === selectedTreatmentId)
                    setManualTurnoForm((current) => ({
                      ...current,
                      tratamiento_id: selectedTreatmentId,
                      numero_sesion: selectedTreatment
                        ? String(Math.min(selectedTreatment.sesiones_totales, (scheduledCountByTreatment[selectedTreatment.id] || 0) + 1))
                        : current.numero_sesion,
                    }))
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sin tratamiento</option>
                  {availableTreatmentsForPatient.map((treatment) => {
                  const scheduled = scheduledCountByTreatment[treatment.id] || 0
                  const isFull = scheduled >= treatment.sesiones_totales
                  return (
                    <option key={treatment.id} value={treatment.id} disabled={isFull}>
                      {`${serviceLabels[treatment.servicio] || treatment.servicio} - ${treatment.estado} (${scheduled}/${treatment.sesiones_totales})${isFull ? ' — COMPLETO' : ''}`}
                    </option>
                  )
                })}
                </select>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Número de sesión</label>
              <input
                type="number"
                min="1"
                value={manualTurnoForm.numero_sesion}
                onChange={(e) => setManualTurnoForm((current) => ({ ...current, numero_sesion: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Opcional"
              />
            </div>

            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground md:col-span-2">
              El turno se crea con estado <strong>pendiente</strong> y sin especialidad. Luego podés colorearlo con el botón de paleta.
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                value={manualTurnoForm.notas}
                onChange={(e) => setManualTurnoForm((current) => ({ ...current, notas: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-24"
                placeholder="Opcional"
              />
            </div>
          </div>

          {createError ? (
            <p className="text-sm text-destructive">{createError}</p>
          ) : null}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTurno} disabled={createSaving}>
              {createSaving ? 'Guardando...' : 'Guardar turno'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal bloqueo de horario */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear horarios</DialogTitle>
            <DialogDescription>
              {blockDay
                ? `${DAYS[blockDay.dayIndex]} ${blockDay.date}`
                : 'Seleccioná el rango a bloquear'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Desde</label>
                <input
                  type="time"
                  value={blockHoraInicio}
                  onChange={(e) => setBlockHoraInicio(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hasta</label>
                <input
                  type="time"
                  value={blockHoraFin}
                  onChange={(e) => setBlockHoraFin(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <input
                type="text"
                value={blockMotivo}
                onChange={(e) => setBlockMotivo(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Ej: Feriado, Reunión, Mantenimiento"
              />
            </div>
            {blockError && <p className="text-sm text-destructive">{blockError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateBlock} disabled={blockSaving}>
                {blockSaving ? 'Bloqueando...' : 'Bloquear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal feriados */}
      <Dialog open={showFeriadosModal} onOpenChange={setShowFeriadosModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar feriados nacionales</DialogTitle>
            <DialogDescription>
              Seleccioná los feriados que querés bloquear en la agenda (día completo: 08:00–20:00)
            </DialogDescription>
          </DialogHeader>
          {feriadosLoading ? (
            <p className="text-sm text-muted-foreground">Cargando feriados...</p>
          ) : feriadosError ? (
            <p className="text-sm text-destructive">{feriadosError}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 text-xs">
                <button type="button" className="text-primary hover:underline" onClick={() => setSelectedFeriados(new Set(feriadosList.map((f) => `${f.mes}-${f.dia}`)))}>
                  Todos
                </button>
                <span className="text-muted-foreground">·</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setSelectedFeriados(new Set())}>
                  Ninguno
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {feriadosList.map((f) => {
                  const key = `${f.mes}-${f.dia}`
                  const label = `${String(f.dia).padStart(2, '0')}/${String(f.mes).padStart(2, '0')} — ${f.motivo}`
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedFeriados.has(key)}
                        onChange={(e) => {
                          setSelectedFeriados((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(key)
                            else next.delete(key)
                            return next
                          })
                        }}
                      />
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{f.tipo}</span>
                    </label>
                  )
                })}
              </div>
              {feriadosError && <p className="text-sm text-destructive">{feriadosError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFeriadosModal(false)}>Cancelar</Button>
                <Button onClick={handleImportFeriados} disabled={feriadosSaving || selectedFeriados.size === 0}>
                  {feriadosSaving ? 'Importando...' : `Importar ${selectedFeriados.size} feriado${selectedFeriados.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
