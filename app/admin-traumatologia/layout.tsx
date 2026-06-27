import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Traumatologia | rek',
  description: 'Panel independiente de traumatologia',
}

export default function AdminTraumatologiaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div>{children}</div>
}
