'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/sidebar'
import PacientesComponent from '@/components/admin/pacientes'

export default function PacientesPage() {
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
          router.push('/admin-traumatologia/pacientes')
        } else {
          setIsAuthenticated(true)
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
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <PacientesComponent serviceScope="kinesiologia" />
      </main>
    </div>
  )
}
