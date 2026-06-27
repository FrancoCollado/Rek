'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminTraumatologiaSidebar from '@/components/admin-traumatologia/sidebar'
import AdminTraumatologiaDashboard from '@/components/admin-traumatologia/dashboard'

export default function AdminTraumatologiaPage() {
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
          router.push('/admin')
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
        <AdminTraumatologiaDashboard />
      </main>
    </div>
  )
}
