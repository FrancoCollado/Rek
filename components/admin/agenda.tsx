'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, X } from 'lucide-react'

interface Professional {
  id: string
  nombre: string
  apellido: string
  email: string
}

interface AvailabilityRow {
  id: string
  usuario_id: string
  servicio: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  intervalo_minutos: number
  duracion_minutos: number
  activo: boolean
  usuarios?: {
    nombre: string
    apellido: string
  }[] | null
}

interface AvailabilityFormData {
  usuario_id: string
  servicio: string
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  intervalo_minutos: string
  duracion_minutos: string
  activo: boolean
}

const dayOptions = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
]

const serviceOptions = [
  { value: 'kinesiologia', label: 'Kinesiología' },
  { value: 'traumatologia', label: 'Traumatología' },
]

const defaultFormData: AvailabilityFormData = {
  usuario_id: '',
  servicio: 'kinesiologia',
  dia_semana: '1',
  hora_inicio: '08:00',
  hora_fin: '12:00',
  intervalo_minutos: '30',
  duracion_minutos: '45',
  activo: true,
}

function getProfessionalName(row: AvailabilityRow) {
  const professional = row.usuarios?.[0]
  return professional ? `${professional.nombre} ${professional.apellido}` : 'Sin asignar'
}

function getServiceLabel(service: string) {
  return serviceOptions.find((option) => option.value === service)?.label || service
}

function getDayLabel(day: number) {
  return dayOptions.find((option) => Number(option.value) === day)?.label || `Día ${day}`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default function AdminAgenda() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<AvailabilityFormData>(defaultFormData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgendaData()
  }, [])

  const fetchAgendaData = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const [{ data: users, error: usersError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nombre, apellido, email')
          .eq('activo', true)
          .eq('rol', 'kinesiologo')
          .order('nombre'),
        supabase
          .from('disponibilidad_profesional')
          .select('id, usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos, activo, usuarios(nombre, apellido)')
          .order('dia_semana')
          .order('hora_inicio')
      ])

      if (usersError) {
        throw usersError
      }

      if (rowsError) {
        throw rowsError
      }

      const professionalRows = (users || []) as Professional[]
      const availabilityRows = (rows || []) as unknown as AvailabilityRow[]

      setProfessionals(professionalRows)
      setAvailability(availabilityRows)
      setFormData((current) => ({
        ...current,
        usuario_id: current.usuario_id || professionalRows[0]?.id || '',
      }))
    } catch (fetchError: unknown) {
      console.error('[v0] Error loading availability admin:', getErrorMessage(fetchError))
      setError('No se pudo cargar la disponibilidad desde Supabase.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      ...defaultFormData,
      usuario_id: professionals[0]?.id || '',
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (row: AvailabilityRow) => {
    setFormData({
      usuario_id: row.usuario_id,
      servicio: row.servicio,
      dia_semana: String(row.dia_semana),
      hora_inicio: row.hora_inicio.slice(0, 5),
      hora_fin: row.hora_fin.slice(0, 5),
      intervalo_minutos: String(row.intervalo_minutos),
      duracion_minutos: String(row.duracion_minutos),
      activo: row.activo,
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('disponibilidad_profesional')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      setAvailability((current) => current.filter((row) => row.id !== id))
    } catch (deleteFailure: unknown) {
      console.error('[v0] Error deleting availability row:', getErrorMessage(deleteFailure))
      setError('No se pudo borrar la disponibilidad seleccionada.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()
      const payload = {
        usuario_id: formData.usuario_id,
        servicio: formData.servicio,
        dia_semana: Number(formData.dia_semana),
        hora_inicio: `${formData.hora_inicio}:00`,
        hora_fin: `${formData.hora_fin}:00`,
        intervalo_minutos: Number(formData.intervalo_minutos),
        duracion_minutos: Number(formData.duracion_minutos),
        activo: formData.activo,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('disponibilidad_profesional')
          .update(payload)
          .eq('id', editingId)

        if (updateError) {
          throw updateError
        }
      } else {
        const { error: insertError } = await supabase
          .from('disponibilidad_profesional')
          .insert(payload)

        if (insertError) {
          throw insertError
        }
      }

      await fetchAgendaData()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        ...defaultFormData,
        usuario_id: professionals[0]?.id || formData.usuario_id,
      })
    } catch (saveError: unknown) {
      console.error('[v0] Error saving availability row:', getErrorMessage(saveError))
      setError('No se pudo guardar la disponibilidad. Revisá que no exista un bloque duplicado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Disponibilidad</h1>
          <p className="text-muted-foreground">Gestiona la agenda base que booking lee desde Supabase</p>
        </div>
        <Button onClick={handleAdd} className="gap-2" disabled={professionals.length === 0}>
          <Plus className="w-4 h-4" />
          Nuevo bloque
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </Card>
      )}

      {showForm && (
        <Card className="p-6 mb-8 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {editingId ? 'Editar bloque' : 'Nuevo bloque'}
            </h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Profesional</label>
              <select
                value={formData.usuario_id}
                onChange={(e) => setFormData({ ...formData, usuario_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                required
              >
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.nombre} {professional.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Servicio</label>
              <select
                value={formData.servicio}
                onChange={(e) => setFormData({ ...formData, servicio: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                required
              >
                {serviceOptions.map((service) => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Día</label>
              <select
                value={formData.dia_semana}
                onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                required
              >
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Hora inicio</label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hora fin</label>
              <Input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Intervalo entre slots</label>
              <Input
                type="number"
                min="5"
                step="5"
                value={formData.intervalo_minutos}
                onChange={(e) => setFormData({ ...formData, intervalo_minutos: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duración del turno</label>
              <Input
                type="number"
                min="5"
                step="5"
                value={formData.duracion_minutos}
                onChange={(e) => setFormData({ ...formData, duracion_minutos: e.target.value })}
                required
              />
            </div>
            <label className="md:col-span-2 flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
              Bloque activo
            </label>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear bloque'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Availability Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr className="text-left text-sm font-medium">
                <th className="px-6 py-3">Profesional</th>
                <th className="px-6 py-3">Servicio</th>
                <th className="px-6 py-3">Día</th>
                <th className="px-6 py-3">Rango</th>
                <th className="px-6 py-3">Intervalo</th>
                <th className="px-6 py-3">Duración</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-sm text-muted-foreground">
                    Cargando disponibilidad...
                  </td>
                </tr>
              ) : availability.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-sm text-muted-foreground">
                    No hay bloques de disponibilidad cargados.
                  </td>
                </tr>
              ) : availability.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-6 py-3">{getProfessionalName(row)}</td>
                  <td className="px-6 py-3">{getServiceLabel(row.servicio)}</td>
                  <td className="px-6 py-3">{getDayLabel(row.dia_semana)}</td>
                  <td className="px-6 py-3">{row.hora_inicio.slice(0, 5)} - {row.hora_fin.slice(0, 5)}</td>
                  <td className="px-6 py-3">{row.intervalo_minutos} min</td>
                  <td className="px-6 py-3">{row.duracion_minutos} min</td>
                  <td className="px-6 py-3">{row.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(row)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
