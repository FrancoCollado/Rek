'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit2, Trash2, X, ChevronDown } from 'lucide-react'

interface Patient {
  id: number
  name: string
  email: string
  phone: string
  service: string
  history: { date: string; note: string }[]
}

export default function PacientesComponent() {
  const [patients, setPatients] = useState<Patient[]>([
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '341-123-4567',
      service: 'Kinesiología',
      history: [
        { date: '2025-06-20', note: 'Primera sesión - Evaluación inicial' },
        { date: '2025-06-18', note: 'Consultó por dolor de espalda' }
      ]
    },
    {
      id: 2,
      name: 'María García',
      email: 'maria@example.com',
      phone: '341-234-5678',
      service: 'Traumatología',
      history: [
        { date: '2025-06-15', note: 'Seguimiento post-lesión' }
      ]
    }
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', service: 'Kinesiología' })

  const handleAdd = () => {
    setFormData({ name: '', email: '', phone: '', service: 'Kinesiología' })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (patient: Patient) => {
    setFormData(patient)
    setEditingId(patient.id)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    setPatients(patients.filter(p => p.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      setPatients(patients.map(p => p.id === editingId ? { ...p, ...formData } : p))
    } else {
      setPatients([...patients, { ...formData, id: Math.max(...patients.map(p => p.id), 0) + 1, history: [] } as Patient])
    }
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona el historial de pacientes</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo paciente
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-8 bg-primary/5 border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{editingId ? 'Editar paciente' : 'Nuevo paciente'}</h2>
            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="341-123-4567"
                required
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
                <option>Traumatología</option>
                <option>Pilates</option>
                <option>Gimnasio</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? 'Guardar cambios' : 'Crear paciente'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {patients.map((patient) => (
          <Card key={patient.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}>
                <div className="flex items-center gap-3">
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedId === patient.id ? 'rotate-180' : ''}`} />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{patient.name}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{patient.email}</span>
                      <span>{patient.phone}</span>
                      <span className="bg-primary/20 text-primary px-2 py-1 rounded">{patient.service}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(patient)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(patient.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {expandedId === patient.id && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-bold mb-4">Historial</h4>
                <div className="space-y-3">
                  {patient.history.length > 0 ? (
                    patient.history.map((entry, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-secondary rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{entry.date}</div>
                          <div className="text-sm text-muted-foreground">{entry.note}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Sin historial registrado</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
