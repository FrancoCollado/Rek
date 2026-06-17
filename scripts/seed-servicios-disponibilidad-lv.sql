-- ============================================================
-- SEED: servicios configurados para booking (lunes a viernes)
-- ============================================================
-- Objetivo:
-- 1) Asegurar profesionales activos (rol = kinesiologo)
-- 2) Cargar disponibilidad_profesional en dias habiles (1..5)
-- 3) Evitar duplicados (script idempotente)

BEGIN;

-- 1) Profesionales minimos para que exista agenda
INSERT INTO usuarios (email, nombre, apellido, rol, especialidades, telefono, activo)
VALUES
  ('franco@rek.com', 'Franco', 'Busso', 'kinesiologo', ARRAY['RPG', 'Terapia Manual ONM'], '3413374446', TRUE),
  ('juan@rek.com', 'Juan Manuel', 'Grigioni', 'kinesiologo', ARRAY['Rehabilitacion Vestibular', 'RPG'], '3413374447', TRUE)
ON CONFLICT (email)
DO UPDATE SET
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  rol = EXCLUDED.rol,
  especialidades = EXCLUDED.especialidades,
  telefono = EXCLUDED.telefono,
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP;

-- 2) Disponibilidad para kinesiologia (manana y tarde) y traumatologia
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
  s.servicio,
  d.dia_semana,
  s.hora_inicio,
  s.hora_fin,
  30,
  45,
  TRUE
FROM usuarios u
CROSS JOIN (
  VALUES
    ('kinesiologia'::text, '08:00'::time, '12:00'::time),
    ('kinesiologia'::text, '14:00'::time, '19:00'::time),
    ('traumatologia'::text, '09:00'::time, '13:00'::time)
) AS s(servicio, hora_inicio, hora_fin)
CROSS JOIN generate_series(1, 5) AS d(dia_semana) -- 1=lunes ... 5=viernes
WHERE u.rol = 'kinesiologo'
  AND u.activo = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM disponibilidad_profesional dp
    WHERE dp.usuario_id = u.id
      AND dp.servicio = s.servicio
      AND dp.dia_semana = d.dia_semana
      AND dp.hora_inicio = s.hora_inicio
      AND dp.hora_fin = s.hora_fin
  );

COMMIT;

-- Verificacion rapida:
-- SELECT servicio, COUNT(*) AS bloques
-- FROM disponibilidad_profesional
-- WHERE activo = TRUE
-- GROUP BY servicio
-- ORDER BY servicio;
