-- ============================================
-- RESET TOTAL: limpiar todas las tablas del esquema public
-- ============================================
-- Uso:
-- 1) Ejecutar en entorno de desarrollo/testing.
-- 2) Borra TODO el contenido de tablas public.
-- 3) Reinicia identidades/secuencias y respeta FKs con CASCADE.

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
    AND tablename NOT LIKE 'sql_%';

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

COMMIT;

-- Verificacion opcional:
-- SELECT schemaname, tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
