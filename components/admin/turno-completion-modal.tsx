'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
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

export default function TurnoCompletionModal({
  open,
  onOpenChange,
  turno,
  onComplete,
}: TurnoCompletionModalProps) {
  const [asistido, setAsistido] = useState(true)
  const [cobrado, setCobrado] = useState(true)
  const [pagoCustom, setPagoCustom] = useState(false)
  const [montoCustom, setMontoCustom] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saldo, setSaldo] = useState({ deuda: 0, sesiones: 0 })

  // Cargar saldo al abrir el modal
  useEffect(() => {
    if (open && turno) {
      fetchPatientBalance()
    }
  }, [open, turno])

  const MONTO_SESION = 6000 // $6000 por sesión

  const fetchPatientBalance = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('saldo_paciente')
        .select('saldo_deuda, sesiones_pendientes')
        .eq('paciente_id', turno.paciente_id)
        .maybeSingle()

      if (data) {
        setSaldo({ deuda: data.saldo_deuda || 0, sesiones: data.sesiones_pendientes || 0 })
      } else if (!data && !error) {
        // Si no existe registro, inicializar con 0
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
      const montoAPagar = pagoCustom ? parseFloat(montoCustom) : (cobrado ? MONTO_SESION : 0)

      // Actualizar turno
      await supabase
        .from('turnos')
        .update({
          asistido,
          cobrado: cobrado || pagoCustom,
          monto_pagado: montoAPagar || null,
          estado: 'realizado',
        })
        .eq('id', turno.id)

      // Calcular nuevo saldo
      let nuevoSaldo = saldo.deuda
      const nuevosSesiones = asistido ? Math.max(0, saldo.sesiones - 1) : saldo.sesiones

      if (cobrado || pagoCustom) {
        // Si se cobra, descuenta de la deuda
        nuevoSaldo = Math.max(0, saldo.deuda - montoAPagar)
      } else if (asistido) {
        // Si asistió pero no se cobró, suma $6000 a la deuda
        nuevoSaldo = saldo.deuda + MONTO_SESION
      }

      // Actualizar saldo del paciente
      await supabase
        .from('saldo_paciente')
        .upsert({
          paciente_id: turno.paciente_id,
          saldo_deuda: nuevoSaldo,
          sesiones_pendientes: nuevosSesiones,
        }, {
          onConflict: 'paciente_id'
        })

      // Registrar movimiento en caja si se cobró
      if (cobrado || pagoCustom) {
        await supabase
          .from('movimientos_caja')
          .insert({
            tipo: 'ingreso',
            categoria: 'Kinesiología',
            monto: montoAPagar,
            descripcion: `Pago sesión ${turno.patient || 'paciente'}`,
            turno_id: turno.id,
            paciente_id: turno.paciente_id,
            fecha: new Date().toISOString().split('T')[0],
          })
      }

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
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Paciente: {turno?.patient}</p>
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

            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={cobrado}
                onChange={(e) => setCobrado(e.target.checked)}
                disabled={pagoCustom}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Cobrado ${MONTO_SESION.toLocaleString('es-AR')}</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={pagoCustom}
                onChange={(e) => setPagoCustom(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Pago personalizado</span>
            </label>

            {pagoCustom && (
              <div>
                <label className="text-sm font-medium">Monto a cobrar</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoCustom}
                  onChange={(e) => setMontoCustom(e.target.value)}
                  placeholder="$0.00"
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
