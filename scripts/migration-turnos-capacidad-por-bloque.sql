-- ============================================================
-- MIGRACION: capacidad por bloque de agenda
-- Fecha: 2026-06-19
-- ============================================================
-- Reglas:
-- - Turnos solo en bloques de :00, :15 o :30
-- - Bloques en :00: maximo 2 turnos
-- - Bloques en :15: maximo 1 turno
-- - Bloques en :30: maximo 2 turnos

BEGIN;

CREATE OR REPLACE FUNCTION public.turnos_maximo_por_bloque(p_hora time)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF EXTRACT(MINUTE FROM p_hora) = 0 THEN
    RETURN 2;
  END IF;

  IF EXTRACT(MINUTE FROM p_hora) = 15 THEN
    RETURN 1;
  END IF;

  IF EXTRACT(MINUTE FROM p_hora) = 30 THEN
    RETURN 2;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_turnos_capacidad_por_bloque()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_maximo integer;
  v_existentes integer;
BEGIN
  -- Cancelados no ocupan cupo.
  IF NEW.estado = 'cancelado' THEN
    RETURN NEW;
  END IF;

  v_maximo := public.turnos_maximo_por_bloque(NEW.hora);

  IF v_maximo = 0 THEN
    RAISE EXCEPTION 'Horario invalido: % (solo se permiten bloques en punto, y cuarto o y media)', NEW.hora
      USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*)
  INTO v_existentes
  FROM turnos t
  WHERE t.fecha = NEW.fecha
    AND t.servicio = NEW.servicio
    AND t.hora = NEW.hora
    AND t.estado <> 'cancelado'
    AND (TG_OP = 'INSERT' OR t.id <> NEW.id);

  IF v_existentes >= v_maximo THEN
    RAISE EXCEPTION 'Cupo completo para % % % (maximo: %)', NEW.fecha, NEW.servicio, NEW.hora, v_maximo
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turnos_capacidad_por_bloque ON turnos;

CREATE TRIGGER trg_turnos_capacidad_por_bloque
BEFORE INSERT OR UPDATE OF fecha, servicio, hora, estado
ON turnos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_turnos_capacidad_por_bloque();

COMMIT;
