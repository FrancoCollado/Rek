'use client'

import AdminSidebar from '@/components/admin/sidebar'
import PacientesComponent from '@/components/admin/pacientes'

export default function PacientesPage() {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <PacientesComponent />
      </main>
    </div>
  )
}
