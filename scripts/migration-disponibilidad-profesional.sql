-- ============================================
-- MIGRACION: disponibilidad_profesional
-- ============================================

CREATE TABLE IF NOT EXISTS disponibilidad_profesional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  servicio TEXT NOT NULL CHECK (servicio IN ('kinesiologia', 'traumatologia')),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  intervalo_minutos INTEGER NOT NULL DEFAULT 30,
  duracion_minutos INTEGER NOT NULL DEFAULT 45,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (hora_inicio < hora_fin),
  CHECK (intervalo_minutos > 0),
  CHECK (duracion_minutos > 0)
);

ALTER TABLE disponibilidad_profesional ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'disponibilidad_profesional'
      AND policyname = 'Allow all to view disponibilidad_profesional'
  ) THEN
    CREATE POLICY "Allow all to view disponibilidad_profesional"
    ON disponibilidad_profesional FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'disponibilidad_profesional'
      AND policyname = 'Allow all to insert disponibilidad_profesional'
  ) THEN
    CREATE POLICY "Allow all to insert disponibilidad_profesional"
    ON disponibilidad_profesional FOR INSERT WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'disponibilidad_profesional'
      AND policyname = 'Allow all to update disponibilidad_profesional'
  ) THEN
    CREATE POLICY "Allow all to update disponibilidad_profesional"
    ON disponibilidad_profesional FOR UPDATE USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'disponibilidad_profesional'
      AND policyname = 'Allow all to delete disponibilidad_profesional'
  ) THEN
    CREATE POLICY "Allow all to delete disponibilidad_profesional"
    ON disponibilidad_profesional FOR DELETE USING (TRUE);
  END IF;
END $$;

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT u.id, 'kinesiologia', d.day_number, '08:00'::time, '12:00'::time, 30, 45
FROM usuarios u
CROSS JOIN generate_series(1, 5) AS d(day_number)
WHERE u.email = 'franco@rek.com'
  AND NOT EXISTS (
    SELECT 1
    FROM disponibilidad_profesional dp
    WHERE dp.usuario_id = u.id
      AND dp.servicio = 'kinesiologia'
      AND dp.dia_semana = d.day_number
      AND dp.hora_inicio = '08:00'::time
      AND dp.hora_fin = '12:00'::time
  );

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT u.id, 'kinesiologia', d.day_number, '14:00'::time, '19:00'::time, 30, 45
FROM usuarios u
CROSS JOIN generate_series(1, 5) AS d(day_number)
WHERE u.email = 'franco@rek.com'
  AND NOT EXISTS (
    SELECT 1
    FROM disponibilidad_profesional dp
    WHERE dp.usuario_id = u.id
      AND dp.servicio = 'kinesiologia'
      AND dp.dia_semana = d.day_number
      AND dp.hora_inicio = '14:00'::time
      AND dp.hora_fin = '19:00'::time
  );

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT u.id, 'traumatologia', d.day_number, '09:00'::time, '13:00'::time, 30, 45
FROM usuarios u
CROSS JOIN generate_series(1, 5) AS d(day_number)
WHERE u.email = 'juan@rek.com'
  AND NOT EXISTS (
    SELECT 1
    FROM disponibilidad_profesional dp
    WHERE dp.usuario_id = u.id
      AND dp.servicio = 'traumatologia'
      AND dp.dia_semana = d.day_number
      AND dp.hora_inicio = '09:00'::time
      AND dp.hora_fin = '13:00'::time
  );

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT u.id, 'kinesiologia', d.day_number, '15:00'::time, '18:30'::time, 30, 45
FROM usuarios u
CROSS JOIN generate_series(1, 5) AS d(day_number)
WHERE u.email = 'juan@rek.com'
  AND NOT EXISTS (
    SELECT 1
    FROM disponibilidad_profesional dp
    WHERE dp.usuario_id = u.id
      AND dp.servicio = 'kinesiologia'
      AND dp.dia_semana = d.day_number
      AND dp.hora_inicio = '15:00'::time
      AND dp.hora_fin = '18:30'::time
  );