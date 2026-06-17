-- ============================================
-- MIGRACION: reconciliar contadores saldo/sesiones
-- Fecha: 2026-06-17
-- ============================================
-- Objetivo:
-- - Alinear sesiones_pendientes con tratamientos activos/pausados.
-- - Asegurar que saldo_deuda no quede por debajo de la deuda de tratamientos.
-- - No perder deuda extra de cuenta corriente (se conserva el mayor valor).

BEGIN;

WITH treatment_agg AS (
  SELECT
    paciente_id,
    SUM(GREATEST(sesiones_totales - sesiones_realizadas, 0))::int AS sesiones_plan,
    SUM(GREATEST(precio_total - monto_pagado, 0))::numeric(10,2) AS deuda_plan
  FROM tratamientos
  WHERE estado IN ('activo', 'pausado')
  GROUP BY paciente_id
)
INSERT INTO saldo_paciente (paciente_id, saldo_deuda, sesiones_pendientes)
SELECT
  ta.paciente_id,
  COALESCE(ta.deuda_plan, 0),
  COALESCE(ta.sesiones_plan, 0)
FROM treatment_agg ta
ON CONFLICT (paciente_id)
DO UPDATE
SET
  sesiones_pendientes = COALESCE(EXCLUDED.sesiones_pendientes, 0),
  saldo_deuda = GREATEST(COALESCE(saldo_paciente.saldo_deuda, 0), COALESCE(EXCLUDED.saldo_deuda, 0)),
  updated_at = CURRENT_TIMESTAMP;

-- Pacientes sin tratamiento activo/pausado: solo normaliza sesiones en 0.
UPDATE saldo_paciente sp
SET
  sesiones_pendientes = 0,
  updated_at = CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM tratamientos t
  WHERE t.paciente_id = sp.paciente_id
    AND t.estado IN ('activo', 'pausado')
);

COMMIT;

-- ============================================
-- QUERY DE CONTROL (opcional)
-- ============================================
-- SELECT
--   p.id,
--   p.nombre,
--   p.apellido,
--   sp.sesiones_pendientes,
--   sp.saldo_deuda
-- FROM pacientes p
-- LEFT JOIN saldo_paciente sp ON sp.paciente_id = p.id
-- ORDER BY p.apellido, p.nombre;
