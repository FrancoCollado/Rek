'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CajaEntry {
  id: number
  date: string
  description: string
  type: 'ingreso' | 'egreso'
  amount: number
  category: string
}

export default function AdminCaja() {
  const [entries, setEntries] = useState<CajaEntry[]>([
    { id: 1, date: '2025-06-20', description: 'Turno Juan Pérez', type: 'ingreso', amount: 500, category: 'Kinesiología' },
    { id: 2, date: '2025-06-20', description: 'Pago servicios', type: 'egreso', amount: 200, category: 'Servicios' },
    { id: 3, date: '2025-06-20', description: 'Turno María García', type: 'ingreso', amount: 450, category: 'Traumatología' },
  ])

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [formData, setFormData] = useState<Partial<CajaEntry>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'ingreso',
    amount: 0,
    category: 'Kinesiología'
  })

  const predefinedCategories = {
    ingreso: ['Kinesiología', 'Traumatología', 'Gimnasio', 'Pilates', 'Nutricionista', 'Plantillas deportivas', 'Otros'],
    egreso: ['Servicios', 'Suministros', 'Personal', 'Utilidades', 'Otros']
  }

  const totalIngresos = entries.filter(e => e.type === 'ingreso').reduce((sum, e) => sum + e.amount, 0)
  const totalEgresos = entries.filter(e => e.type === 'egreso').reduce((sum, e) => sum + e.amount, 0)
  const saldo = totalIngresos - totalEgresos

  const handleAdd = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      type: 'ingreso',
      amount: 0,
      category: 'Kinesiología'
    })
    setCustomCategory('')
    setEditingId(null)
    setShowModal(true)
  }

  const handleEdit = (entry: CajaEntry) => {
    setFormData(entry)
    setCustomCategory('')
    setEditingId(entry.id)
    setShowModal(true)
  }

  const handleDelete = (id: number) => {
    setEntries(entries.filter(e => e.id !== id))
  }

  const handleSubmit = () => {
    if (!formData.description?.trim() || !formData.amount) return

    if (editingId === null) {
      setEntries([...entries, { ...formData, id: Math.max(...entries.map(e => e.id), 0) + 1 } as CajaEntry])
    } else {
      setEntries(entries.map(e => e.id === editingId ? { ...formData as CajaEntry } : e))
    }
    setShowModal(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Caja</h1>
          <p className="text-muted-foreground">Gestiona ingresos y egresos</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo movimiento
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Ingresos totales</p>
          <p className="text-3xl font-bold text-green-600">${totalIngresos.toLocaleString()}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Egresos totales</p>
          <p className="text-3xl font-bold text-red-600">${totalEgresos.toLocaleString()}</p>
        </Card>
        <Card className="p-6 bg-primary/10 border-primary">
          <p className="text-sm text-muted-foreground mb-2">Saldo</p>
          <p className="text-3xl font-bold text-primary">${saldo.toLocaleString()}</p>
        </Card>
      </div>

      {/* Modal para agregar/editar movimientos */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={formData.type || 'ingreso'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ingreso' | 'egreso' })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Categoría</label>
              <select
                value={formData.category === '' && customCategory ? '__custom__' : (formData.category || '')}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '__custom__') {
                    setCustomCategory('')
                    setFormData({ ...formData, category: '' })
                  } else {
                    setFormData({ ...formData, category: value })
                    setCustomCategory('')
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">Seleccionar categoría</option>
                {predefinedCategories[formData.type || 'ingreso'].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">+ Agregar categoría personalizada</option>
              </select>
            </div>
            {formData.category === '' && formData.type && (
              <div>
                <label className="text-sm font-medium">Nombre de la categoría</label>
                <Input
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value)
                    setFormData({ ...formData, category: e.target.value })
                  }}
                  placeholder="Ej: Consultoría, Renta, etc"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Monto</label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del movimiento"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Guardar cambios' : 'Registrar movimiento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movements Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr className="text-left text-sm font-medium">
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Monto</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-6 py-3">{entry.date}</td>
                    <td className="px-6 py-3">{entry.description}</td>
                    <td className="px-6 py-3">{entry.category}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        entry.type === 'ingreso' 
                          ? 'bg-green-500/20 text-green-700' 
                          : 'bg-red-500/20 text-red-700'
                      }`}>
                        {entry.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className={`px-6 py-3 font-bold ${entry.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'ingreso' ? '+' : '-'}${entry.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
