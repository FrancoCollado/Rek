-- ============================================================
-- SEED: servicios configurados para booking (lunes a sabado)
-- ============================================================
-- Objetivo:
-- 1) Asegurar profesionales activos (rol = kinesiologo)
-- 2) Configurar disponibilidad: lunes a viernes 07:00-20:00, sabado 09:00-13:00
-- 3) Agenda con intervalos de 15 minutos
-- 4) Script idempotente

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

-- 2) Reiniciar disponibilidad previa de kinesiologos para aplicar la nueva grilla
DELETE FROM disponibilidad_profesional dp
USING usuarios u
WHERE dp.usuario_id = u.id
  AND u.rol = 'kinesiologo';

-- 3) Disponibilidad para kinesiologia
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
  d.hora_inicio,
  d.hora_fin,
  15,
  30,
  TRUE
FROM usuarios u
CROSS JOIN (
  VALUES
    ('kinesiologia'::text)
) AS s(servicio)
CROSS JOIN (
  VALUES
    (1, '07:00'::time, '20:00'::time),
    (2, '07:00'::time, '20:00'::time),
    (3, '07:00'::time, '20:00'::time),
    (4, '07:00'::time, '20:00'::time),
    (5, '07:00'::time, '20:00'::time),
    (6, '09:00'::time, '13:00'::time)
) AS d(dia_semana, hora_inicio, hora_fin) -- 1=lunes ... 6=sabado
WHERE u.rol = 'kinesiologo'
  AND u.activo = TRUE;

COMMIT;

-- Verificacion rapida:
-- SELECT servicio, COUNT(*) AS bloques
-- FROM disponibilidad_profesional
-- WHERE activo = TRUE
-- GROUP BY servicio
-- ORDER BY servicio;
