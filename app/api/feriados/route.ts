import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get('year') ?? new Date().getFullYear()
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AR`, {
      next: { revalidate: 86400 }, // cache 24 h
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el listado de feriados.' }, { status: res.status })
    }
    const data: { date: string; localName: string; types: string[] }[] = await res.json()
    // Map to { dia, mes, motivo, tipo } expected by the component
    const mapped = data.map((f) => {
      const [, month, day] = f.date.split('-')
      return {
        dia: Number(day),
        mes: Number(month),
        motivo: f.localName,
        tipo: f.types?.[0] ?? 'Public',
      }
    })
    return NextResponse.json(mapped)
  } catch {
    return NextResponse.json({ error: 'Error al conectar con el servicio de feriados.' }, { status: 502 })
  }
}
