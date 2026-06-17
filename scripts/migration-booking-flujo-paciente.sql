-- ============================================
-- MIGRACION: flujo de paciente y orden medica
-- ============================================
-- Objetivo:
-- 1) Asegurar que pacientes tenga DNI util para identificar recurrentes.
-- 2) Mantener unicidad de DNI (permitiendo NULL para registros antiguos).
-- 3) Recomendar bucket para ordenes medicas (crear en panel Supabase Storage).

BEGIN;

-- Asegurar columna dni en pacientes.
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS dni TEXT;

-- Normalizar DNI vacio a NULL para no romper unicidad.
UPDATE pacientes
SET dni = NULL
WHERE dni IS NOT NULL AND trim(dni) = '';

-- Crear indice unico para DNI no nulo (idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS ux_pacientes_dni_not_null
ON pacientes (dni)
WHERE dni IS NOT NULL;

COMMIT;

-- ============================================
-- STORAGE: ordenes medicas
-- ============================================
-- La app sube ordenes al bucket: 'ordenes-medicas'.
-- Crear manualmente en Supabase Dashboard:
-- Storage -> New bucket -> Name: ordenes-medicas -> Public: true (o privado con policies)
--
-- Si preferis privado, luego definimos policies y usamos signed URLs.
