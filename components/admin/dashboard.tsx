'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, DollarSign, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Turno {
  id: string
  pacientes?: { nombre: string; apellido: string }
  usuarios?: { nombre: string; apellido: string }
  servicio: string
  hora: string
  fecha: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    turnosHoy: 0,
    turnosPendientes: 0,
    pacientesTotales: 0,
    ingresosMes: 0,
  })
  const [upcomingTurns, setUpcomingTurns] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      try {
        // Obtener turnos de hoy
        const today = new Date().toISOString().split('T')[0]
        const { data: turnosHoy } = await supabase
          .from('turnos')
          .select('*')
          .eq('fecha', today)
        
        // Obtener turnos pendientes
        const { data: turnosPendientes } = await supabase
          .from('turnos')
          .select('*')
          .eq('estado', 'pendiente')

        // Obtener total de pacientes
        const { data: pacientes, count: pacientesCount } = await supabase
          .from('pacientes')
          .select('*', { count: 'exact' })

        // Obtener ingresos del mes
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0]
        const { data: movimientos } = await supabase
          .from('movimientos_caja')
          .select('*')
          .eq('tipo', 'ingreso')
          .gte('fecha', firstDay)

        // Obtener próximos turnos
        const { data: turnos } = await supabase
          .from('turnos')
          .select('id, fecha, hora, servicio, pacientes(nombre, apellido), usuarios(nombre, apellido)')
          .order('fecha')
          .order('hora')
          .limit(5)

        const totalIngresos = movimientos?.reduce((sum, mov) => sum + parseFloat(mov.monto), 0) || 0

        setStats({
          turnosHoy: turnosHoy?.length || 0,
          turnosPendientes: turnosPendientes?.length || 0,
          pacientesTotales: pacientesCount || 0,
          ingresosMes: totalIngresos,
        })

        setUpcomingTurns(turnos || [])
      } catch (error) {
        console.error('[v0] Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statsConfig = [
    { label: 'Turnos hoy', value: stats.turnosHoy, icon: Calendar, color: 'bg-primary/10' },
    { label: 'Turnos pendientes', value: stats.turnosPendientes, icon: Clock, color: 'bg-accent/10' },
    { label: 'Pacientes totales', value: stats.pacientesTotales, icon: Users, color: 'bg-secondary/10' },
    { label: 'Ingresos (mes)', value: `$${stats.ingresosMes.toFixed(2)}`, icon: DollarSign, color: 'bg-green-500/10' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido al panel de administración</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
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

      {/* Upcoming Turns */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Próximos turnos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Paciente</th>
                <th className="pb-3 font-medium">Servicio</th>
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Hora</th>
                <th className="pb-3 font-medium">Profesional</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : upcomingTurns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-muted-foreground">
                    No hay turnos próximos
                  </td>
                </tr>
              ) : (
                upcomingTurns.map((turn) => (
                  <tr key={turn.id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      {turn.pacientes?.nombre} {turn.pacientes?.apellido}
                    </td>
                    <td className="py-3 capitalize">{turn.servicio}</td>
                    <td className="py-3">{turn.fecha}</td>
                    <td className="py-3">{turn.hora}</td>
                    <td className="py-3">
                      {turn.usuarios?.nombre} {turn.usuarios?.apellido}
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
