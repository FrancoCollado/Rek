-- ============================================================
-- CLEANUP: disponibilidad de traumatologia (idempotente)
-- ============================================================
-- Objetivo:
-- 1) Garantizar profesional traumatologa activa
-- 2) Eliminar disponibilidad de traumatologia de usuarios no traumatologos
-- 3) Reemplazar la agenda de la traumatologa por la franja oficial
--    - lunes 16:30-19:00
--    - miercoles 09:00-11:00
--    - jueves 16:30-19:00
-- 4) Mantener kinesiologia sin cambios

BEGIN;

-- 0) Compatibilidad: habilitar rol traumatologa si la base todavia usa el check viejo
ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_rol_check
CHECK (rol IN ('admin', 'kinesiologo', 'traumatologa'));

-- 1) Alta/actualizacion de la traumatologa oficial
INSERT INTO usuarios (email, nombre, apellido, rol, especialidades, telefono, activo)
VALUES
  ('traumatologia@rek.com', 'Lucia', 'Traumatologia', 'traumatologa', ARRAY['Traumatologia'], '3413374499', TRUE)
ON CONFLICT (email)
DO UPDATE SET
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  rol = EXCLUDED.rol,
  especialidades = EXCLUDED.especialidades,
  telefono = EXCLUDED.telefono,
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP;

-- 2) Limpiar traumatologia cargada sobre usuarios que no son traumatologos
DELETE FROM disponibilidad_profesional dp
USING usuarios u
WHERE dp.usuario_id = u.id
  AND dp.servicio = 'traumatologia'
  AND u.rol <> 'traumatologa';

-- 3) Reemplazar agenda de traumatologia de la traumatologa oficial
DELETE FROM disponibilidad_profesional dp
USING usuarios u
WHERE dp.usuario_id = u.id
  AND dp.servicio = 'traumatologia'
  AND u.email = 'traumatologia@rek.com'
  AND u.rol = 'traumatologa';

INSERT INTO disponibilidad_profesional (
  usuario_id,
  servicio,
  dia_semana,
  hora_inicio,
  hora_fin,
  intervalo_minutos,
  duracion_minutos,
  activo
)
SELECT
  u.id,
  'traumatologia',
  d.dia_semana,
  d.hora_inicio,
  d.hora_fin,
  15,
  30,
  TRUE
FROM usuarios u
CROSS JOIN (
  VALUES
    (1, '16:30'::time, '19:00'::time),
    (3, '09:00'::time, '11:00'::time),
    (4, '16:30'::time, '19:00'::time)
) AS d(dia_semana, hora_inicio, hora_fin)
WHERE u.email = 'traumatologia@rek.com'
  AND u.rol = 'traumatologa'
  AND u.activo = TRUE;

COMMIT;

-- Verificacion sugerida:
-- SELECT
--   u.email,
--   u.rol,
--   dp.servicio,
--   dp.dia_semana,
--   dp.hora_inicio,
--   dp.hora_fin,
--   dp.intervalo_minutos,
--   dp.duracion_minutos,
--   dp.activo
-- FROM disponibilidad_profesional dp
-- JOIN usuarios u ON u.id = dp.usuario_id
-- WHERE dp.servicio = 'traumatologia'
-- ORDER BY u.email, dp.dia_semana, dp.hora_inicio;
