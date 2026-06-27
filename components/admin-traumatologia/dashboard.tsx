'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Calendar, Users, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Turno {
  id: string
  pacientes?: { nombre: string; apellido: string }
  servicio: string
  hora: string
  fecha: string
}

export default function AdminTraumatologiaDashboard() {
  const [stats, setStats] = useState({
    turnosHoy: 0,
    turnosPendientes: 0,
    pacientesTotales: 0,
  })
  const [upcomingTurns, setUpcomingTurns] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      try {
        const today = new Date().toISOString().split('T')[0]

        const { data: turnosHoy } = await supabase
          .from('turnos')
          .select('id')
          .eq('entidad_id', 'traumatologia')
          .eq('fecha', today)
          .neq('estado', 'cancelado')

        const { data: turnosPendientes } = await supabase
          .from('turnos')
          .select('id, paciente_id')
          .eq('entidad_id', 'traumatologia')
          .eq('estado', 'pendiente')

        const { data: turnosPacientes } = await supabase
          .from('turnos')
          .select('paciente_id')
          .eq('entidad_id', 'traumatologia')

        const uniquePatients = new Set<string>()
        ;(turnosPacientes || []).forEach((row: any) => {
          if (row.paciente_id) uniquePatients.add(row.paciente_id)
        })

        const { data: turnos } = await supabase
          .from('turnos')
          .select('id, fecha, hora, servicio, pacientes(nombre, apellido)')
          .eq('entidad_id', 'traumatologia')
          .neq('estado', 'cancelado')
          .order('fecha')
          .order('hora')
          .limit(8)

        setStats({
          turnosHoy: turnosHoy?.length || 0,
          turnosPendientes: turnosPendientes?.length || 0,
          pacientesTotales: uniquePatients.size,
        })

        setUpcomingTurns((turnos || []) as Turno[])
      } catch (error) {
        console.error('[v0] Error fetching traumatologia dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statsConfig = [
    { label: 'Turnos hoy', value: stats.turnosHoy, icon: Calendar, color: 'bg-primary/10' },
    { label: 'Turnos pendientes', value: stats.turnosPendientes, icon: Clock, color: 'bg-accent/10' },
    { label: 'Pacientes trauma', value: stats.pacientesTotales, icon: Users, color: 'bg-secondary/10' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Dashboard Traumatologia</h1>
        <p className="text-muted-foreground">Panel independiente de traumatologia</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {statsConfig.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold">{loading ? '-' : stat.value}</p>
            </Card>
          )
        })}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Proximos turnos de traumatologia</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Paciente</th>
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : upcomingTurns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-muted-foreground">No hay turnos proximos</td>
                </tr>
              ) : (
                upcomingTurns.map((turn) => (
                  <tr key={turn.id} className="border-b border-border last:border-0">
                    <td className="py-3">{turn.pacientes?.nombre} {turn.pacientes?.apellido}</td>
                    <td className="py-3">{turn.fecha}</td>
                    <td className="py-3">{String(turn.hora).slice(0, 5)}</td>
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
