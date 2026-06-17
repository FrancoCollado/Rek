-- ============================================
-- MIGRACION: limpiar turnos duplicados + prevenir reingreso
-- Fecha: 2026-06-17
-- ============================================

BEGIN;

-- 0) Retirar el indice previo (si existe) para reemplazarlo por una regla mas robusta.
DROP INDEX IF EXISTS ux_turnos_no_duplicados;

-- 0.1) Normalizar hora a precision de minuto para evitar duplicados por segundos.
UPDATE turnos
SET hora = date_trunc('minute', hora)::time
WHERE EXTRACT(SECOND FROM hora) <> 0;

-- 1) Eliminar duplicados por firma operativa real:
-- paciente_id + servicio + fecha + hora
-- Se conserva 1 fila por grupo priorizando no cancelados y mas antiguos.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY paciente_id, servicio, fecha, hora
      ORDER BY
        CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM turnos
)
DELETE FROM turnos t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- 2) Guardrail fuerte para no permitir dos turnos activos del mismo paciente
-- en mismo servicio, fecha y hora.
CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_no_duplicados
ON turnos (paciente_id, servicio, fecha, hora)
WHERE estado <> 'cancelado';

COMMIT;

-- ============================================
-- CONSULTAS DE CONTROL (opcionales)
-- ============================================
-- Duplicados remanentes (deberia devolver 0 filas):
-- SELECT paciente_id, servicio, fecha, hora, COUNT(*)
-- FROM turnos
-- GROUP BY paciente_id, servicio, fecha, hora
-- HAVING COUNT(*) > 1;

-- Validar indice:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'turnos'
--   AND indexname = 'ux_turnos_no_duplicados';
