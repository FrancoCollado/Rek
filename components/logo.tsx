export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2">
      {/* Punto turquesa */}
      <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
      {/* Texto rek */}
      <span className="text-xl font-black tracking-tighter text-foreground">rek</span>
    </div>
  )
}
