-- ============================================================
-- MIGRACION: separacion por entidad_id (kinesiologia/traumatologia)
-- Fecha: 2026-06-26
-- ============================================================

BEGIN;

-- 0) pacientes
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS entidad_id TEXT;

UPDATE pacientes p
SET entidad_id = COALESCE(
  (
    SELECT t.entidad_id
    FROM turnos t
    WHERE t.paciente_id = p.id
    ORDER BY t.created_at DESC NULLS LAST, t.fecha DESC, t.hora DESC
    LIMIT 1
  ),
  (
    SELECT tr.entidad_id
    FROM tratamientos tr
    WHERE tr.paciente_id = p.id
    ORDER BY tr.created_at DESC NULLS LAST
    LIMIT 1
  ),
  'kinesiologia'
)
WHERE p.entidad_id IS NULL;

ALTER TABLE pacientes
ALTER COLUMN entidad_id SET NOT NULL;

ALTER TABLE pacientes
DROP CONSTRAINT IF EXISTS chk_pacientes_entidad;

ALTER TABLE pacientes
ADD CONSTRAINT chk_pacientes_entidad
CHECK (entidad_id IN ('kinesiologia', 'traumatologia'));

ALTER TABLE pacientes
DROP CONSTRAINT IF EXISTS pacientes_dni_key;

ALTER TABLE pacientes
DROP CONSTRAINT IF EXISTS pacientes_email_key;

DROP INDEX IF EXISTS ux_pacientes_dni_not_null;
CREATE UNIQUE INDEX IF NOT EXISTS ux_pacientes_entidad_dni_not_null
ON pacientes (entidad_id, dni)
WHERE dni IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_pacientes_entidad_email_not_null
ON pacientes (entidad_id, email)
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_pacientes_entidad_id ON pacientes (entidad_id);

-- 1) tratamientos
ALTER TABLE tratamientos
ADD COLUMN IF NOT EXISTS entidad_id TEXT;

UPDATE tratamientos
SET entidad_id = CASE
  WHEN servicio = 'traumatologia' THEN 'traumatologia'
  ELSE 'kinesiologia'
END
WHERE entidad_id IS NULL;

ALTER TABLE tratamientos
ALTER COLUMN entidad_id SET NOT NULL;

ALTER TABLE tratamientos
DROP CONSTRAINT IF EXISTS chk_tratamientos_entidad;

ALTER TABLE tratamientos
ADD CONSTRAINT chk_tratamientos_entidad
CHECK (entidad_id IN ('kinesiologia', 'traumatologia'));

CREATE INDEX IF NOT EXISTS ix_tratamientos_entidad_id ON tratamientos (entidad_id);
CREATE INDEX IF NOT EXISTS ix_tratamientos_entidad_paciente ON tratamientos (entidad_id, paciente_id);

-- 2) turnos
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS entidad_id TEXT;

UPDATE turnos
SET entidad_id = CASE
  WHEN servicio = 'traumatologia' THEN 'traumatologia'
  ELSE 'kinesiologia'
END
WHERE entidad_id IS NULL;

ALTER TABLE turnos
ALTER COLUMN entidad_id SET NOT NULL;

ALTER TABLE turnos
DROP CONSTRAINT IF EXISTS chk_turnos_entidad;

ALTER TABLE turnos
ADD CONSTRAINT chk_turnos_entidad
CHECK (entidad_id IN ('kinesiologia', 'traumatologia'));

CREATE INDEX IF NOT EXISTS ix_turnos_entidad_id ON turnos (entidad_id);
CREATE INDEX IF NOT EXISTS ix_turnos_entidad_fecha_hora ON turnos (entidad_id, fecha, hora);

-- 3) saldo_paciente
ALTER TABLE saldo_paciente
ADD COLUMN IF NOT EXISTS entidad_id TEXT;

UPDATE saldo_paciente sp
SET entidad_id = COALESCE(
  (
    SELECT t.entidad_id
    FROM turnos t
    WHERE t.paciente_id = sp.paciente_id
    ORDER BY t.created_at DESC NULLS LAST, t.fecha DESC, t.hora DESC
    LIMIT 1
  ),
  'kinesiologia'
)
WHERE sp.entidad_id IS NULL;

ALTER TABLE saldo_paciente
ALTER COLUMN entidad_id SET NOT NULL;

ALTER TABLE saldo_paciente
DROP CONSTRAINT IF EXISTS chk_saldo_paciente_entidad;

ALTER TABLE saldo_paciente
ADD CONSTRAINT chk_saldo_paciente_entidad
CHECK (entidad_id IN ('kinesiologia', 'traumatologia'));

ALTER TABLE saldo_paciente
DROP CONSTRAINT IF EXISTS saldo_paciente_paciente_id_key;

DROP INDEX IF EXISTS ux_saldo_paciente_entidad;
CREATE UNIQUE INDEX ux_saldo_paciente_entidad
ON saldo_paciente (paciente_id, entidad_id);

CREATE INDEX IF NOT EXISTS ix_saldo_paciente_entidad_id ON saldo_paciente (entidad_id);

COMMIT;
