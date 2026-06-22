-- ============================================================
-- MIGRACION: especialidades para turnos de agenda
-- Fecha: 2026-06-19
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  color TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_especialidades_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_especialidades_nombre_ci
ON especialidades (LOWER(TRIM(nombre)));

ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'especialidades'
      AND policyname = 'Allow all to view especialidades'
  ) THEN
    CREATE POLICY "Allow all to view especialidades"
    ON especialidades FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'especialidades'
      AND policyname = 'Allow all to insert especialidades'
  ) THEN
    CREATE POLICY "Allow all to insert especialidades"
    ON especialidades FOR INSERT WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'especialidades'
      AND policyname = 'Allow all to update especialidades'
  ) THEN
    CREATE POLICY "Allow all to update especialidades"
    ON especialidades FOR UPDATE USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'especialidades'
      AND policyname = 'Allow all to delete especialidades'
  ) THEN
    CREATE POLICY "Allow all to delete especialidades"
    ON especialidades FOR DELETE USING (TRUE);
  END IF;
END $$;

ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS especialidad_id UUID REFERENCES especialidades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_turnos_especialidad_id
ON turnos (especialidad_id);

COMMIT;
