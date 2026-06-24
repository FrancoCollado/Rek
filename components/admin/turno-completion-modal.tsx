'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface TurnoCompletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turno: any
  onComplete: () => void
}

interface TratamientoInfo {
  id: string
  sesiones_totales: number
  sesiones_realizadas: number
  precio_total: number
  monto_pagado: number
  estado: string
}

const SESSION_AMOUNT = 6000

export default function TurnoCompletionModal({
  open,
  onOpenChange,
  turno,
  onComplete,
}: TurnoCompletionModalProps) {
  const normalizeBoolean = (value: unknown, fallback = false) => {
    if (value === true || value === false) return value
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim()
      if (normalized === 'true') return true
      if (normalized === 'false') return false
    }
    if (typeof value === 'number') {
      if (value === 1) return true
      if (value === 0) return false
    }
    return fallback
  }

  const [asistido, setAsistido] = useState(true)
  const [cobrado, setCobrado] = useState(true)
  const [usarImporte, setUsarImporte] = useState(false)
  const [importeDescuento, setImporteDescuento] = useState('')
  const [loading, setLoading] = useState(false)
  const [saldo, setSaldo] = useState({ deuda: 0, sesiones: 0 })
  const [tratamiento, setTratamiento] = useState<TratamientoInfo | null>(null)

  useEffect(() => {
    if (open && turno) {
      const estado = String(turno.estado || '').trim().toLowerCase()
      const isCompleted = estado === 'realizado' || estado === 'completado'

      if (isCompleted) {
        setAsistido(normalizeBoolean(turno.asistido, true))
        setCobrado(normalizeBoolean(turno.cobrado, true))
      } else {
        setAsistido(true)
        setCobrado(true)
      }
      setUsarImporte(false)
      setImporteDescuento('')
      fetchPatientBalance()
    }
  }, [open, turno])

  const fetchPatientBalance = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('saldo_paciente')
        .select('saldo_deuda, sesiones_pendientes')
        .eq('paciente_id', turno.paciente_id)
        .maybeSingle()

      if (turno.tratamiento_id) {
        const { data: treatmentData } = await supabase
          .from('tratamientos')
          .select('id, sesiones_totales, sesiones_realizadas, precio_total, monto_pagado, estado')
          .eq('id', turno.tratamiento_id)
          .maybeSingle()

        if (treatmentData) {
          setTratamiento({
            ...treatmentData,
            precio_total: Number(treatmentData.precio_total || 0),
            monto_pagado: Number(treatmentData.monto_pagado || 0),
          } as TratamientoInfo)
        } else {
          setTratamiento(null)
        }
      } else {
        setTratamiento(null)
      }

      if (data) {
        setSaldo({
          deuda: Number(data.saldo_deuda || 0),
          sesiones: Number(data.sesiones_pendientes || 0),
        })
      } else if (!data && !error) {
        setSaldo({ deuda: 0, sesiones: 0 })
      }
    } catch (error) {
      console.error('[v0] Error fetching patient balance:', error)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const isMarkedAsCharged = cobrado
      const descuentoCuentaCorriente = usarImporte
        ? Math.max(0, Number.parseFloat(importeDescuento || '0'))
        : 0
      // Solo aplicar descuento cuando el usuario especifica un importe
      // No restar de la deuda cuando simplemente marca "cobrado"
      const pagoAplicado = descuentoCuentaCorriente
      const deudaGeneradaEnTurno = 0

      await supabase
        .from('turnos')
        .update({
          asistido,
          cobrado: isMarkedAsCharged,
          monto_pagado: usarImporte && descuentoCuentaCorriente > 0 ? descuentoCuentaCorriente : null,
          estado: 'realizado',
        })
        .eq('id', turno.id)

      let nuevoSaldo = saldo.deuda
      let nuevosSesiones = asistido ? Math.max(0, saldo.sesiones - 1) : saldo.sesiones

      if (tratamiento) {
        const sesionesActualizadas = asistido
          ? Math.min(tratamiento.sesiones_realizadas + 1, tratamiento.sesiones_totales)
          : tratamiento.sesiones_realizadas

        const precioTotalActualizado = Math.max(0, tratamiento.precio_total + deudaGeneradaEnTurno)
        const montoPagadoActualizado = Math.min(
          precioTotalActualizado,
          Math.max(0, tratamiento.monto_pagado + pagoAplicado)
        )
        const sesionesPendientes = Math.max(tratamiento.sesiones_totales - sesionesActualizadas, 0)
        const estadoTratamiento = sesionesPendientes === 0
          ? 'completado'
          : tratamiento.estado === 'cancelado'
          ? 'cancelado'
          : 'activo'

        nuevoSaldo = Math.max(precioTotalActualizado - montoPagadoActualizado, 0)
        nuevosSesiones = sesionesPendientes

        await supabase
          .from('tratamientos')
          .update({
            sesiones_realizadas: sesionesActualizadas,
            precio_total: precioTotalActualizado,
            monto_pagado: montoPagadoActualizado,
            estado: estadoTratamiento,
          })
          .eq('id', tratamiento.id)
      } else {
        nuevoSaldo = Math.max(0, saldo.deuda + deudaGeneradaEnTurno - pagoAplicado)
      }

      await supabase
        .from('saldo_paciente')
        .upsert({
          paciente_id: turno.paciente_id,
          saldo_deuda: nuevoSaldo,
          sesiones_pendientes: nuevosSesiones,
        }, {
          onConflict: 'paciente_id'
        })

      onOpenChange(false)
      onComplete()
    } catch (error) {
      console.error('[v0] Error completing turno:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Completar turno</DialogTitle>
          <DialogDescription>
            Al guardar, el turno queda como realizado y se registran los cambios en asistido/cobrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Paciente: {turno?.patient}</p>
            {tratamiento ? (
              <p className="text-xs text-muted-foreground mb-2">
                Tratamiento activo: {tratamiento.sesiones_realizadas}/{tratamiento.sesiones_totales} sesiones realizadas
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Adeuda</p>
                <p className="text-xl font-bold">${saldo.deuda.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sesiones pendientes</p>
                <p className="text-xl font-bold">{saldo.sesiones}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={asistido}
                onChange={(e) => setAsistido(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Asistido</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={cobrado}
                  onChange={(e) => {
                    setCobrado(e.target.checked)
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Cobrado $6.000</span>
              </label>
            </div>

            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={usarImporte}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUsarImporte(checked)
                  if (!checked) {
                    setImporteDescuento('')
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Importe (descontar cuenta corriente)</span>
            </label>

            {usarImporte && (
              <div>
                <label className="text-sm font-medium">Monto a descontar</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={importeDescuento}
                  onChange={(e) => setImporteDescuento(e.target.value)}
                  placeholder="Ej: 2000"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? 'Guardando...' : 'Completar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
