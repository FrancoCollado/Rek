'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const credentials = [
      { username: 'admin', password: 'rek2025', role: 'admin' as const, redirect: '/admin' },
      { username: 'traumatologia', password: 'trauma2026', role: 'traumatologia' as const, redirect: '/admin-traumatologia' },
      { username: 'traumatologa', password: 'trauma2026', role: 'traumatologia' as const, redirect: '/admin-traumatologia' },
    ]

    setTimeout(() => {
      const matched = credentials.find(
        (item) => username === item.username && password === item.password
      )

      if (matched) {
        localStorage.setItem(
          'adminSession',
          JSON.stringify({
            username: matched.username,
            role: matched.role,
            timestamp: new Date().getTime(),
          })
        )
        router.push(matched.redirect)
      } else {
        setError('Usuario o contraseña incorrectos')
      }
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md p-8 border border-border">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center">Panel Administrativo</h1>
        <p className="text-muted-foreground text-center mb-8">Ingresá tus credenciales</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Usuario</label>
            <Input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Demo admin: <strong>admin</strong> / <strong>rek2025</strong><br />
          Demo trauma: <strong>traumatologia</strong> o <strong>traumatologa</strong> / <strong>trauma2026</strong>
        </p>
      </Card>
    </div>
  )
}
