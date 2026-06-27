-- ============================================================
-- MIGRACION: habilitar rol traumatologa en usuarios
-- Fecha: 2026-06-26
-- ============================================================

BEGIN;

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_rol_check
CHECK (rol IN ('admin', 'kinesiologo', 'traumatologa'));

COMMIT;
