'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminTraumatologiaSidebar from '@/components/admin-traumatologia/sidebar'
import AgendaWeekly from '@/components/admin/agenda-weekly'

const TRAUMA_TIME_SLOTS = [
  '09:00', '09:15', '09:30',
  '10:00', '10:15', '10:30',
  '16:30',
  '17:00', '17:15', '17:30',
  '18:00', '18:15', '18:30',
]

function canCreateTraumaSlot(dayIndex: number, time: string) {
  const slotMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

  // Lunes (0) y Jueves (3): 16:30 a 19:00
  if (dayIndex === 0 || dayIndex === 3) {
    return slotMinutes >= 16 * 60 + 30 && slotMinutes < 19 * 60
  }

  // Miercoles (2): 09:00 a 11:00
  if (dayIndex === 2) {
    return slotMinutes >= 9 * 60 && slotMinutes < 11 * 60
  }

  return false
}

export default function AgendaTraumatologiaPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const sessionRaw = localStorage.getItem('adminSession')
    if (!sessionRaw) {
      router.push('/admin/login')
    } else {
      try {
        const session = JSON.parse(sessionRaw)
        if (session.role === 'traumatologia') {
          setIsAuthenticated(true)
        } else {
          router.push('/admin/agenda')
        }
      } catch {
        router.push('/admin/login')
      }
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) return null
  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-background">
      <AdminTraumatologiaSidebar />
      <main className="flex-1 overflow-auto">
        <AgendaWeekly
          serviceScope="traumatologia"
          baseTimeSlots={TRAUMA_TIME_SLOTS}
          canCreateSlot={canCreateTraumaSlot}
        />
      </main>
    </div>
  )
}
