'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, X, ChevronDown, FilePlus2 } from 'lucide-react'

interface Patient {
  id: string
  nombre: string
  apellido: string
  email: string | null
  telefono: string
}

interface Treatment {
  id: string
  paciente_id: string
  servicio: string
  tipo_plan: 'orden' | 'libre'
  sesiones_totales: number
  sesiones_realizadas: number
  precio_total: number
  monto_pagado: number
  notas: string | null
  estado: 'activo' | 'pausado' | 'completado' | 'cancelado'
  fecha_inicio: string
}

interface TurnoHistory {
  id: string
  paciente_id: string
  fecha: string
  hora: string
  estado: string
  servicio: string
  numero_sesion: number | null
}

interface PatientBalance {
  paciente_id: string
  saldo_deuda: number
  sesiones_pendientes: number
}

type PatientForm = {
  nombre: string
  apellido: string
  email: string
  telefono: string
}

type TreatmentForm = {
  servicio: string
  tipo_plan: 'orden' | 'libre'
  sesiones_totales: string
  precio_total: string
  notas: string
}

type ServiceScope = 'kinesiologia' | 'traumatologia'

const defaultPatientForm: PatientForm = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
}

function buildDefaultTreatmentForm(serviceScope?: ServiceScope): TreatmentForm {
  return {
    servicio: serviceScope || 'kinesiologia',
    tipo_plan: 'orden',
    sesiones_totales: '10',
    precio_total: '60000',
    notas: '',
  }
}

const serviceLabels: Record<string, string> = {
  kinesiologia: 'Kinesiología',
  traumatologia: 'Traumatología',
}

function formatPatientName(patient: Patient) {
  return `${patient.nombre} ${patient.apellido}`.trim()
}

export default function PacientesComponent({ serviceScope }: { serviceScope?: ServiceScope } = {}) {
  const currentEntity: ServiceScope = serviceScope || 'kinesiologia'
  const [patients, setPatients] = useState<Patient[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [history, setHistory] = useState<TurnoHistory[]>([])
  const [balances, setBalances] = useState<PatientBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showPatientForm, setShowPatientForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [patientForm, setPatientForm] = useState<PatientForm>(defaultPatientForm)

  const [showTreatmentFormFor, setShowTreatmentFormFor] = useState<string | null>(null)
  const [treatmentForm, setTreatmentForm] = useState<TreatmentForm>(buildDefaultTreatmentForm(serviceScope))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPatientsData()
  }, [])

  const loadPatientsData = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const [
        { data: patientsData, error: patientsError },
        { data: treatmentsData, error: treatmentsError },
        { data: historyData, error: historyError },
        { data: balancesData, error: balancesError },
      ] = await Promise.all([
        supabase
          .from('pacientes')
          .select('id, nombre, apellido, email, telefono')
          .eq('entidad_id', currentEntity)
          .order('apellido')
          .order('nombre'),
        supabase
          .from('tratamientos')
          .select('id, paciente_id, servicio, tipo_plan, sesiones_totales, sesiones_realizadas, precio_total, monto_pagado, notas, estado, fecha_inicio')
          .eq('entidad_id', currentEntity)
          .order('created_at', { ascending: false }),
        supabase
          .from('turnos')
          .select('id, paciente_id, fecha, hora, estado, servicio, numero_sesion')
          .eq('entidad_id', currentEntity)
          .order('fecha', { ascending: false })
          .order('hora', { ascending: false })
          .limit(500),
        supabase
          .from('saldo_paciente')
          .select('paciente_id, saldo_deuda, sesiones_pendientes')
          .eq('entidad_id', currentEntity),
      ])

      if (patientsError) throw patientsError
      if (treatmentsError) throw treatmentsError
      if (historyError) throw historyError
      if (balancesError) throw balancesError

      setPatients((patientsData || []) as Patient[])
      const normalizedTreatments =
        ((treatmentsData || []) as any[]).map((t) => ({
          ...t,
          precio_total: Number(t.precio_total || 0),
          monto_pagado: Number(t.monto_pagado || 0),
        }))
      const normalizedHistory = (historyData || []) as TurnoHistory[]

      const usedPatientIds = new Set<string>()
      normalizedTreatments.forEach((t) => usedPatientIds.add(t.paciente_id))
      normalizedHistory.forEach((h) => usedPatientIds.add(h.paciente_id))

      const filteredPatients = serviceScope
        ? ((patientsData || []) as Patient[]).filter((patient) => usedPatientIds.has(patient.id))
        : ((patientsData || []) as Patient[])

      setPatients(filteredPatients)
      setTreatments(normalizedTreatments)
      setHistory(normalizedHistory)
      setBalances(
        ((balancesData || []) as any[]).map((row) => ({
          paciente_id: row.paciente_id,
          saldo_deuda: Number(row.saldo_deuda || 0),
          sesiones_pendientes: Number(row.sesiones_pendientes || 0),
        }))
      )
    } catch (loadError) {
      console.error('[v0] Error loading pacientes data:', loadError)
      setError('No se pudo cargar la información de pacientes.')
    } finally {
      setLoading(false)
    }
  }

  const treatmentByPatient = useMemo(() => {
    const map = new Map<string, Treatment[]>()
    for (const treatment of treatments) {
      const list = map.get(treatment.paciente_id) || []
      list.push(treatment)
      map.set(treatment.paciente_id, list)
    }
    return map
  }, [treatments])

  const historyByPatient = useMemo(() => {
    const map = new Map<string, TurnoHistory[]>()
    for (const item of history) {
      const list = map.get(item.paciente_id) || []
      list.push(item)
      map.set(item.paciente_id, list)
    }
    return map
  }, [history])

  const balanceByPatient = useMemo(() => {
    const map = new Map<string, PatientBalance>()
    for (const balance of balances) {
      map.set(balance.paciente_id, balance)
    }
    return map
  }, [balances])

  const handleAdd = () => {
    setPatientForm(defaultPatientForm)
    setEditingId(null)
    setShowPatientForm(true)
  }

  const handleEdit = (patient: Patient) => {
    setPatientForm({
      nombre: patient.nombre,
      apellido: patient.apellido,
      email: patient.email || '',
      telefono: patient.telefono,
    })
    setEditingId(patient.id)
    setShowPatientForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setSaving(true)
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await loadPatientsData()
    } catch (deleteFailure) {
      console.error('[v0] Error deleting patient:', deleteFailure)
      setError('No se pudo borrar el paciente.')
    } finally {
      setSaving(false)
    }
  }

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      const payload = {
        entidad_id: currentEntity,
        nombre: patientForm.nombre.trim(),
        apellido: patientForm.apellido.trim(),
        email: patientForm.email.trim() || null,
        telefono: patientForm.telefono.trim(),
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('pacientes')
          .insert(payload)

        if (insertError) throw insertError
      }

      setShowPatientForm(false)
      setEditingId(null)
      setPatientForm(defaultPatientForm)
      await loadPatientsData()
    } catch (saveError) {
      console.error('[v0] Error saving patient:', saveError)
      setError('No se pudo guardar el paciente.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTreatment = async (patientId: string) => {
    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      const totalSessions = Math.max(1, Number(treatmentForm.sesiones_totales || '1'))
      const totalPrice = Math.max(0, Number(treatmentForm.precio_total || '0'))

      const { error: insertError } = await supabase
        .from('tratamientos')
        .insert({
          entidad_id: currentEntity,
          paciente_id: patientId,
          servicio: treatmentForm.servicio,
          tipo_plan: treatmentForm.tipo_plan,
          sesiones_totales: totalSessions,
          sesiones_realizadas: 0,
          precio_total: totalPrice,
          monto_pagado: 0,
          notas: treatmentForm.notas.trim() || null,
          estado: 'activo',
        })

      if (insertError) throw insertError

      await supabase
        .from('saldo_paciente')
        .upsert({
          paciente_id: patientId,
          entidad_id: currentEntity,
          saldo_deuda: totalPrice,
          sesiones_pendientes: totalSessions,
        }, {
          onConflict: 'paciente_id,entidad_id',
        })

      setShowTreatmentFormFor(null)
      setTreatmentForm(buildDefaultTreatmentForm(serviceScope))
      await loadPatientsData()
    } catch (treatmentError) {
      console.error('[v0] Error creating treatment:', treatmentError)
      setError('No se pudo crear el tratamiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona pacientes, planes de sesiones e historial clínico</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo paciente
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </Card>
      )}

      {showPatientForm && (
        <Card className="p-6 mb-8 bg-primary/5 border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{editingId ? 'Editar paciente' : 'Nuevo paciente'}</h2>
            <button type="button" onClick={() => setShowPatientForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handlePatientSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={patientForm.nombre}
                onChange={(e) => setPatientForm({ ...patientForm, nombre: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Apellido</label>
              <Input
                value={patientForm.apellido}
                onChange={(e) => setPatientForm({ ...patientForm, apellido: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={patientForm.email}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={patientForm.telefono}
                onChange={(e) => setPatientForm({ ...patientForm, telefono: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowPatientForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear paciente'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Cargando pacientes...</Card>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => {
            const patientTreatments = treatmentByPatient.get(patient.id) || []
            const activeTreatment = patientTreatments.find((t) => t.estado === 'activo')
            const patientBalance = balanceByPatient.get(patient.id)
            const pendingSessions = patientBalance
              ? patientBalance.sesiones_pendientes
              : activeTreatment
              ? Math.max(activeTreatment.sesiones_totales - activeTreatment.sesiones_realizadas, 0)
              : 0
            const remainingDebt = patientBalance
              ? patientBalance.saldo_deuda
              : activeTreatment
              ? Math.max(activeTreatment.precio_total - activeTreatment.monto_pagado, 0)
              : 0
            const patientHistory = (historyByPatient.get(patient.id) || []).slice(0, 10)

            return (
              <Card key={patient.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandedId === patient.id ? 'rotate-180' : ''}`} />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{formatPatientName(patient)}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                          <span>{patient.email || 'Sin email'}</span>
                          <span>{patient.telefono}</span>
                          {activeTreatment ? (
                            <>
                              <span className="bg-primary/20 text-primary px-2 py-1 rounded">
                                {serviceLabels[activeTreatment.servicio] || activeTreatment.servicio}
                              </span>
                              <span>Sesiones pendientes: {pendingSessions}</span>
                              <span>Deuda: ${remainingDebt.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="bg-muted px-2 py-1 rounded">Sin tratamiento activo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(patient)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(patient.id)} disabled={saving}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {expandedId === patient.id && (
                  <div className="mt-6 pt-6 border-t border-border space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold">Tratamientos</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setShowTreatmentFormFor(showTreatmentFormFor === patient.id ? null : patient.id)
                            setTreatmentForm(buildDefaultTreatmentForm(serviceScope))
                          }}
                        >
                          <FilePlus2 className="w-4 h-4" />
                          Nuevo tratamiento
                        </Button>
                      </div>

                      {showTreatmentFormFor === patient.id && (
                        <Card className="p-4 mb-4 bg-secondary/30">
                          <div className="grid md:grid-cols-2 gap-3">
                            {!serviceScope ? (
                              <div>
                                <label className="text-sm font-medium">Servicio</label>
                                <select
                                  value={treatmentForm.servicio}
                                  onChange={(e) => setTreatmentForm({ ...treatmentForm, servicio: e.target.value })}
                                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                >
                                  <option value="kinesiologia">Kinesiología</option>
                                  <option value="traumatologia">Traumatología</option>
                                </select>
                              </div>
                            ) : (
                              <div>
                                <label className="text-sm font-medium">Servicio</label>
                                <div className="w-full px-3 py-2 border border-border rounded-lg bg-secondary/40 text-sm">
                                  {serviceLabels[serviceScope] || serviceScope}
                                </div>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium">Tipo</label>
                              <select
                                value={treatmentForm.tipo_plan}
                                onChange={(e) => setTreatmentForm({ ...treatmentForm, tipo_plan: e.target.value as 'orden' | 'libre' })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                              >
                                <option value="orden">Orden médica</option>
                                <option value="libre">Sesión libre</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Sesiones totales</label>
                              <Input
                                type="number"
                                min="1"
                                value={treatmentForm.sesiones_totales}
                                onChange={(e) => setTreatmentForm({ ...treatmentForm, sesiones_totales: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Precio total</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={treatmentForm.precio_total}
                                onChange={(e) => setTreatmentForm({ ...treatmentForm, precio_total: e.target.value })}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium">Notas</label>
                              <textarea
                                value={treatmentForm.notas}
                                onChange={(e) => setTreatmentForm({ ...treatmentForm, notas: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background min-h-24"
                                placeholder="Opcional: observaciones clínicas, condiciones del plan o indicaciones"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <Button type="button" variant="outline" onClick={() => setShowTreatmentFormFor(null)}>
                              Cancelar
                            </Button>
                            <Button type="button" onClick={() => handleCreateTreatment(patient.id)} disabled={saving}>
                              {saving ? 'Guardando...' : 'Crear plan'}
                            </Button>
                          </div>
                        </Card>
                      )}

                      <div className="space-y-2">
                        {patientTreatments.length > 0 ? (
                          patientTreatments.map((treatment) => {
                            const debt = Math.max(treatment.precio_total - treatment.monto_pagado, 0)
                            const remaining = Math.max(treatment.sesiones_totales - treatment.sesiones_realizadas, 0)

                            return (
                              <div key={treatment.id} className="p-3 bg-secondary rounded-lg text-sm">
                                <div className="flex flex-wrap gap-3">
                                  <span className="font-medium">{serviceLabels[treatment.servicio] || treatment.servicio}</span>
                                  <span>Tipo: {treatment.tipo_plan === 'orden' ? 'Orden' : 'Libre'}</span>
                                  <span>Estado: {treatment.estado}</span>
                                </div>
                                <div className="flex flex-wrap gap-3 text-muted-foreground mt-1">
                                  <span>Sesiones: {treatment.sesiones_realizadas}/{treatment.sesiones_totales}</span>
                                  <span>Pendientes: {remaining}</span>
                                  <span>Pagado: ${treatment.monto_pagado.toFixed(2)}</span>
                                  <span>Saldo: ${debt.toFixed(2)}</span>
                                </div>
                                {treatment.notas && (
                                  <div className="mt-2 text-muted-foreground">
                                    <span className="font-medium text-foreground">Notas:</span> {treatment.notas}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin tratamientos registrados</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3">Historial de turnos</h4>
                      <div className="space-y-2">
                        {patientHistory.length > 0 ? (
                          patientHistory.map((entry) => (
                            <div key={entry.id} className="p-3 bg-secondary rounded-lg text-sm">
                              <div className="flex flex-wrap gap-3">
                                <span className="font-medium">{entry.fecha}</span>
                                <span>{String(entry.hora).slice(0, 5)} hs</span>
                                <span>{serviceLabels[entry.servicio] || entry.servicio}</span>
                                <span>Estado: {entry.estado}</span>
                              </div>
                              {entry.numero_sesion ? (
                                <div className="text-muted-foreground mt-1">Sesión planificada: #{entry.numero_sesion}</div>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin historial de turnos.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
