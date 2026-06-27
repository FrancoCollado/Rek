-- ============================================================
-- RESET: limpiar tablas operativas (mantener usuarios y disponibilidad)
-- ============================================================
-- Este script elimina datos de todas las tablas del esquema public,
-- excepto las tablas de configuracion base:
-- - usuarios
-- - disponibilidad_profesional
-- - especialidades
--
-- Uso recomendado: entorno de desarrollo/testing.

BEGIN;

DO $$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
  INTO table_list
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
    AND tablename NOT IN (
      'usuarios',
      'disponibilidad_profesional',
      'especialidades'
    );

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

COMMIT;

-- Verificacion sugerida:
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
