-- ============================================================
-- MIGRACION: apertura 08:00 y franja 12:00-16:00 con dos turnos por hora
-- ============================================================
-- Reglas nuevas:
-- - El local abre a las 08:00: no se permiten turnos antes de esa hora.
-- - Bloques en :00 => maximo 2 turnos.
-- - Bloques en :15 => maximo 1 turno.
-- - Bloques en :30 => maximo 2 turnos.
-- - EXCEPCION franja 12:00-15:59: solo :00 y :30, con 1 cupo cada uno
--   (dos turnos por hora en esa franja, sin bloque :15).

BEGIN;

CREATE OR REPLACE FUNCTION public.turnos_maximo_por_bloque(p_hora time)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hora integer := EXTRACT(HOUR FROM p_hora);
  v_minuto integer := EXTRACT(MINUTE FROM p_hora);
BEGIN
  -- El local abre a las 08:00.
  IF v_hora < 8 THEN
    RETURN 0;
  END IF;

  -- Franja 12:00-15:59: solo :00 y :30, un cupo cada uno.
  IF v_hora >= 12 AND v_hora < 16 THEN
    IF v_minuto = 0 OR v_minuto = 30 THEN
      RETURN 1;
    END IF;
    RETURN 0;
  END IF;

  IF v_minuto = 0 THEN
    RETURN 2;
  END IF;

  IF v_minuto = 15 THEN
    RETURN 1;
  END IF;

  IF v_minuto = 30 THEN
    RETURN 2;
  END IF;

  RETURN 0;
END;
$$;

-- Alinear disponibilidad de kinesiologos a la apertura 08:00.
UPDATE disponibilidad_profesional dp
SET hora_inicio = '08:00'::time,
    updated_at = CURRENT_TIMESTAMP
FROM usuarios u
WHERE dp.usuario_id = u.id
  AND u.rol = 'kinesiologo'
  AND dp.hora_inicio < '08:00'::time;

COMMIT;
