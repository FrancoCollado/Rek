'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit2, Trash2, X } from 'lucide-react'

interface Turn {
  id: number
  patient: string
  email: string
  phone: string
  service: string
  date: string
  time: string
  professional: string
}

export default function AdminAgenda() {
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: 1,
      patient: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '341-123-4567',
      service: 'Kinesiología',
      date: '2025-06-20',
      time: '09:00',
      professional: 'Franco Busso'
    },
    {
      id: 2,
      patient: 'María García',
      email: 'maria@example.com',
      phone: '341-234-5678',
      service: 'Traumatología',
      date: '2025-06-20',
      time: '10:30',
      professional: 'Juan Manuel Grigoni'
    }
  ])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Partial<Turn>>({
    patient: '',
    email: '',
    phone: '',
    service: 'Kinesiología',
    date: '',
    time: '',
    professional: 'Franco Busso'
  })

  const handleAdd = () => {
    setFormData({
      patient: '',
      email: '',
      phone: '',
      service: 'Kinesiología',
      date: '',
      time: '',
      professional: 'Franco Busso'
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (turn: Turn) => {
    setFormData(turn)
    setEditingId(turn.id)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    setTurns(turns.filter(t => t.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      setTurns(turns.map(t => t.id === editingId ? { ...formData as Turn } : t))
    } else {
      setTurns([...turns, { ...formData, id: Math.max(...turns.map(t => t.id), 0) + 1 } as Turn])
    }
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Gestiona los turnos de los pacientes</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo turno
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-8 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {editingId ? 'Editar turno' : 'Nuevo turno'}
            </h2>
            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Paciente</label>
              <Input
                value={formData.patient || ''}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="341-123-4567"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Servicio</label>
              <select
                value={formData.service || 'Kinesiología'}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option>Kinesiología</option>
                <option>Traumatología</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hora</label>
              <Input
                type="time"
                value={formData.time || ''}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Profesional</label>
              <select
                value={formData.professional || 'Franco Busso'}
                onChange={(e) => setFormData({ ...formData, professional: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option>Franco Busso</option>
                <option>Juan Manuel Grigoni</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? 'Guardar cambios' : 'Crear turno'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Turns Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr className="text-left text-sm font-medium">
                <th className="px-6 py-3">Paciente</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Servicio</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Hora</th>
                <th className="px-6 py-3">Profesional</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turns.map((turn) => (
                <tr key={turn.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-6 py-3">{turn.patient}</td>
                  <td className="px-6 py-3 text-sm">{turn.email}</td>
                  <td className="px-6 py-3">{turn.service}</td>
                  <td className="px-6 py-3">{turn.date}</td>
                  <td className="px-6 py-3">{turn.time}</td>
                  <td className="px-6 py-3">{turn.professional}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(turn)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(turn.id)}
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
