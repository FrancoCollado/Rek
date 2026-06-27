-- ============================================================
-- SEED: traumatologia (cuenta y agenda independiente)
-- ============================================================
-- Objetivo:
-- 1) Crear/actualizar profesional traumatologa
-- 2) Cargar disponibilidad solo de traumatologia
-- 3) Franja: lunes y jueves 16:30-19:00, miercoles 09:00-11:00
-- 4) Intervalo de 15 minutos

BEGIN;

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

DELETE FROM disponibilidad_profesional dp
USING usuarios u
WHERE dp.usuario_id = u.id
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

-- Verificacion rapida:
-- SELECT u.email, dp.servicio, dp.dia_semana, dp.hora_inicio, dp.hora_fin, dp.intervalo_minutos
-- FROM disponibilidad_profesional dp
-- JOIN usuarios u ON u.id = dp.usuario_id
-- WHERE u.rol = 'traumatologa'
-- ORDER BY dp.dia_semana, dp.hora_inicio;
