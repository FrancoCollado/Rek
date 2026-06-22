'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, X } from 'lucide-react'

type Specialty = {
  id: string
  nombre: string
  color: string
  activo: boolean
}

type SpecialtyForm = {
  nombre: string
  color: string
  activo: boolean
}

const defaultForm: SpecialtyForm = {
  nombre: '',
  color: '#0ea5e9',
  activo: true,
}

export default function AdminEspecialidades() {
  const [rows, setRows] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SpecialtyForm>(defaultForm)

  useEffect(() => {
    fetchRows()
  }, [])

  const fetchRows = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const { data, error: selectError } = await supabase
        .from('especialidades')
        .select('id, nombre, color, activo')
        .order('nombre')

      if (selectError) throw selectError
      setRows((data || []) as Specialty[])
    } catch (fetchError) {
      console.error('[v0] Error loading specialties:', fetchError)
      setError('No se pudieron cargar las especialidades.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const handleEdit = (row: Specialty) => {
    setEditingId(row.id)
    setForm({
      nombre: row.nombre,
      color: row.color,
      activo: row.activo,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('especialidades')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setRows((current) => current.filter((row) => row.id !== id))
    } catch (deleteFailure) {
      console.error('[v0] Error deleting specialty:', deleteFailure)
      setError('No se pudo borrar la especialidad.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()
      const payload = {
        nombre: form.nombre.trim(),
        color: form.color,
        activo: form.activo,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('especialidades')
          .update(payload)
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('especialidades')
          .insert(payload)

        if (insertError) throw insertError
      }

      setShowForm(false)
      setEditingId(null)
      setForm(defaultForm)
      await fetchRows()
    } catch (saveError: any) {
      console.error('[v0] Error saving specialty:', saveError)
      if (saveError?.code === '23505') {
        setError('Ya existe una especialidad con ese nombre.')
      } else {
        setError('No se pudo guardar la especialidad.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Especialidades</h1>
          <p className="text-muted-foreground">Categorizá turnos por especialidad y color</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva especialidad
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
            <h2 className="text-xl font-bold">{editingId ? 'Editar especialidad' : 'Nueva especialidad'}</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Denominación</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Post-operatorio"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-16 p-1"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#0ea5e9"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  required
                />
              </div>
            </div>

            <label className="md:col-span-2 flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
              Especialidad activa
            </label>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear especialidad'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr className="text-left text-sm font-medium">
                <th className="px-6 py-3">Especialidad</th>
                <th className="px-6 py-3">Color</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-muted-foreground">
                    Cargando especialidades...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-muted-foreground">
                    No hay especialidades cargadas.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-6 py-3 font-medium">{row.nombre}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: row.color }}
                        />
                        <span>{row.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">{row.activo ? 'Activa' : 'Inactiva'}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} disabled={saving}>
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
