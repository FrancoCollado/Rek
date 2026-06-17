'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CajaEntry {
  id: string
  date: string
  description: string
  type: 'ingreso' | 'egreso'
  amount: number
  category: string
}

export default function AdminCaja() {
  const [entries, setEntries] = useState<CajaEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const totalIngresos = useMemo(
    () => entries.filter(e => e.type === 'ingreso').reduce((sum, e) => sum + e.amount, 0),
    [entries]
  )
  const totalEgresos = useMemo(
    () => entries.filter(e => e.type === 'egreso').reduce((sum, e) => sum + e.amount, 0),
    [entries]
  )
  const saldo = totalIngresos - totalEgresos

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('movimientos_caja')
        .select('id, tipo, categoria, monto, descripcion, fecha')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        date: row.fecha,
        description: row.descripcion || '',
        type: row.tipo,
        amount: Number(row.monto || 0),
        category: row.categoria || 'Otros',
      })) as CajaEntry[]

      setEntries(mapped)
    } catch (fetchFailure) {
      console.error('[v0] Error loading caja entries:', fetchFailure)
      setError('No se pudieron cargar los movimientos de caja.')
    } finally {
      setLoading(false)
    }
  }

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

  const handleDelete = async (id: string) => {
    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('movimientos_caja')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setEntries((current) => current.filter((entry) => entry.id !== id))
    } catch (deleteFailure) {
      console.error('[v0] Error deleting caja entry:', deleteFailure)
      setError('No se pudo borrar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.description?.trim() || !formData.amount) return

    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      const payload = {
        fecha: formData.date,
        tipo: formData.type,
        categoria: formData.category,
        monto: Number(formData.amount || 0),
        descripcion: formData.description,
      }

      if (editingId === null) {
        const { error: insertError } = await supabase
          .from('movimientos_caja')
          .insert(payload)

        if (insertError) throw insertError
      } else {
        const { error: updateError } = await supabase
          .from('movimientos_caja')
          .update(payload)
          .eq('id', editingId)

        if (updateError) throw updateError
      }

      await fetchEntries()
      setShowModal(false)
    } catch (saveFailure) {
      console.error('[v0] Error saving caja entry:', saveFailure)
      setError('No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Caja</h1>
          <p className="text-muted-foreground">Gestiona ingresos y egresos desde la base de datos</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo movimiento
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </Card>
      )}

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
            <DialogDescription>
              Completá los datos del movimiento para guardarlo en caja.
            </DialogDescription>
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
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar movimiento'}</Button>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
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
                          disabled={saving}
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
