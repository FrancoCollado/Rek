'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TurnoCompletionModal from '@/components/admin/turno-completion-modal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8)
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

interface Appointment {
  id: string
  day: number
  hour: number
  patient: string
  service: string
  professional: string
  paciente_id?: string
  asistido?: boolean
  cobrado?: boolean
}

export default function AgendaWeekly() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState<Appointment | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ patient: '', service: 'Kinesiología', professional: 'Franco Busso', day: 0, hour: 9 })
  const [loading, setLoading] = useState(true)

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
      const supabase = createClient()
      
      // Usar solo la parte local de las fechas sin zona horaria
      const startYear = startDate.getFullYear()
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
      const startDay = String(startDate.getDate()).padStart(2, '0')
      const startStr = `${startYear}-${startMonth}-${startDay}`

      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 4)
      const endYear = endDate.getFullYear()
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
      const endDay = String(endDate.getDate()).padStart(2, '0')
      const endStr = `${endYear}-${endMonth}-${endDay}`

      const { data: turnos } = await supabase
        .from('turnos')
        .select('id, fecha, hora, pacientes(nombre, apellido), usuarios(nombre, apellido)')
        .gte('fecha', startStr)
        .lte('fecha', endStr)

      if (turnos) {
        const mapped = turnos.map((t: any) => {
          // Parsear la fecha como local (YYYY-MM-DD es local, no UTC)
          const [year, month, day] = t.fecha.split('-').map(Number)
          const turnDate = new Date(year, month - 1, day)
          
          // Calcular día de la semana (0=Lunes, 4=Viernes)
          let dayIndex = turnDate.getDay() - 1
          if (dayIndex === -1) dayIndex = 4 // Domingo -> Viernes
          
          const hour = parseInt(t.hora.split(':')[0])

          return {
            id: t.id,
            day: dayIndex,
            hour,
            patient: `${t.pacientes?.nombre} ${t.pacientes?.apellido}`,
            service: 'Kinesiología',
            professional: t.usuarios?.nombre || 'Sin asignar',
            paciente_id: t.paciente_id,
            asistido: t.asistido,
            cobrado: t.cobrado,
          }
        })
        setAppointments(mapped)
      }
    } catch (error) {
      console.error('[v0] Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }
  const weekStart = currentDate || new Date()
  const weekDays = Array.from({ length: 5 }, (_, i) => {
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

  const handleAddAppointment = (day: number, hour: number) => {
    setFormData({ patient: '', service: 'Kinesiología', professional: 'Franco Busso', day, hour })
    setEditingId(null)
    setShowModal(true)
  }

  const handleEditAppointment = (appt: Appointment) => {
    setFormData({...appt})
    setEditingId(appt.id)
    setShowModal(true)
  }

  const handleCompleteAppointment = (appt: Appointment) => {
    setSelectedTurno(appt)
    setShowCompletionModal(true)
  }

  const handleSaveAppointment = () => {
    if (!formData.patient.trim()) return
    if (editingId === null) {
      setAppointments([...appointments, { ...formData, id: Math.random().toString(36) }])
    } else {
      setAppointments(appointments.map(a => a.id === editingId ? { ...a, ...formData } : a))
    }
    setShowModal(false)
    setEditingId(null)
  }

  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter(a => a.id !== id))
  }

  const getAppointmentsForSlot = (day: number, hour: number) => {
    return appointments.filter(a => a.day === day && a.hour === hour)
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
            {weekStart.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} - {new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modal para agregar/editar turnos */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId === null ? 'Nuevo turno' : 'Editar turno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Paciente</label>
              <Input
                placeholder="Nombre del paciente"
                value={formData.patient}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Servicio</label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option>Kinesiología</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Profesional</label>
              <select
                value={formData.professional}
                onChange={(e) => setFormData({ ...formData, professional: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option>Franco Busso</option>
                <option>J.M. Grigoni</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveAppointment}>Guardar turno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="p-4 text-sm font-medium border border-border bg-secondary text-center">{hour}:00</td>
                {DAYS.map((_, dayIndex) => {
                  const slotsAppts = getAppointmentsForSlot(dayIndex, hour)
                  return (
                    <td key={`${dayIndex}-${hour}`} className="p-2 border border-border min-h-24 align-top">
                      <div className="space-y-1">
                        {slotsAppts.map((appt) => {
                          const bgColor = appt.asistido 
                            ? 'bg-green-500/20 border border-green-500/40'
                            : 'bg-primary/20 border border-primary/40'
                          
                          return (
                            <div key={appt.id} className={`rounded p-2 text-xs ${bgColor}`}>
                              <div className="font-medium text-foreground truncate">{appt.patient}</div>
                              <div className="text-muted-foreground text-xs">{appt.service}</div>
                              <div className="text-muted-foreground text-xs">{appt.professional}</div>
                              <div className="flex gap-1 mt-1">
                                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={() => handleCompleteAppointment(appt)}>
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={() => handleEditAppointment(appt)}>Editar</Button>
                                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs text-destructive" onClick={() => handleDeleteAppointment(appt.id)}>Borrar</Button>
                              </div>
                            </div>
                          )
                        })}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full h-8"
                          onClick={() => handleAddAppointment(dayIndex, hour)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Agregar
                        </Button>
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
