-- ============================================================
-- MIGRACION: disponibilidad solo lunes-viernes
-- Fecha: 2026-06-27
-- ============================================================
-- Objetivo:
-- 1) Eliminar disponibilidad de sabado/domingo existente
-- 2) Forzar constraint de dia_semana a 1..5

BEGIN;

-- 1) Limpiar cualquier registro fuera de lunes-viernes
DELETE FROM disponibilidad_profesional
WHERE dia_semana NOT BETWEEN 1 AND 5;

-- 2) Reemplazar cualquier check previo de dia_semana por lunes-viernes
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.disponibilidad_profesional'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%dia_semana%'
  LOOP
    EXECUTE format('ALTER TABLE public.disponibilidad_profesional DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE disponibilidad_profesional
ADD CONSTRAINT chk_disponibilidad_profesional_dia_semana_l_v
CHECK (dia_semana BETWEEN 1 AND 5);

COMMIT;

-- Verificacion sugerida:
-- SELECT dia_semana, COUNT(*)
-- FROM disponibilidad_profesional
-- GROUP BY dia_semana
-- ORDER BY dia_semana;
