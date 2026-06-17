-- ============================================
-- MIGRACION: tratamientos y turnos por plan
-- ============================================

CREATE TABLE IF NOT EXISTS tratamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  servicio TEXT NOT NULL CHECK (servicio IN ('kinesiologia', 'traumatologia')),
  tipo_plan TEXT NOT NULL DEFAULT 'orden' CHECK (tipo_plan IN ('orden', 'libre')),
  sesiones_totales INTEGER NOT NULL DEFAULT 1 CHECK (sesiones_totales > 0),
  sesiones_realizadas INTEGER NOT NULL DEFAULT 0 CHECK (sesiones_realizadas >= 0),
  precio_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monto_pagado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin_estimada DATE,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tratamientos' AND policyname = 'Allow all to view tratamientos'
  ) THEN
    CREATE POLICY "Allow all to view tratamientos" ON tratamientos FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tratamientos' AND policyname = 'Allow all to insert tratamientos'
  ) THEN
    CREATE POLICY "Allow all to insert tratamientos" ON tratamientos FOR INSERT WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tratamientos' AND policyname = 'Allow all to update tratamientos'
  ) THEN
    CREATE POLICY "Allow all to update tratamientos" ON tratamientos FOR UPDATE USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tratamientos' AND policyname = 'Allow all to delete tratamientos'
  ) THEN
    CREATE POLICY "Allow all to delete tratamientos" ON tratamientos FOR DELETE USING (TRUE);
  END IF;
END $$;

ALTER TABLE turnos ADD COLUMN IF NOT EXISTS tratamiento_id UUID REFERENCES tratamientos(id) ON DELETE SET NULL;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS numero_sesion INTEGER;

-- Opcional: crear un tratamiento activo para pacientes sin plan y con sesiones pendientes.
INSERT INTO tratamientos (
  paciente_id,
  servicio,
  tipo_plan,
  sesiones_totales,
  sesiones_realizadas,
  precio_total,
  monto_pagado,
  fecha_inicio,
  estado,
  notas
)
SELECT
  sp.paciente_id,
  'kinesiologia',
  'orden',
  GREATEST(sp.sesiones_pendientes, 1),
  0,
  sp.sesiones_pendientes * 6000,
  GREATEST((sp.sesiones_pendientes * 6000) - sp.saldo_deuda, 0),
  CURRENT_DATE,
  CASE WHEN sp.sesiones_pendientes > 0 THEN 'activo' ELSE 'completado' END,
  'Migrado desde saldo_paciente'
FROM saldo_paciente sp
WHERE sp.sesiones_pendientes > 0
  AND NOT EXISTS (
    SELECT 1 FROM tratamientos t
    WHERE t.paciente_id = sp.paciente_id
      AND t.estado IN ('activo', 'pausado')
  );
