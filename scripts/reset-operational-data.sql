-- ============================================
-- RESET DE DATOS OPERATIVOS (entorno de pruebas)
-- ============================================
-- Este script borra datos de trabajo para empezar de cero:
-- - pacientes
-- - tratamientos
-- - turnos
-- - saldo_paciente
-- - movimientos_caja
--
-- NO borra estructura de tablas.
-- NO borra usuarios/profesionales ni disponibilidad por defecto.
--
-- Ejecutar solo en entorno de desarrollo/testing.

BEGIN;

-- 1) Limpiar caja y movimientos financieros
DELETE FROM movimientos_caja;

-- 2) Limpiar turnos y tratamientos
-- (turnos puede referenciar tratamientos; tratamientos puede estar ligado a pacientes)
DELETE FROM turnos;
DELETE FROM tratamientos;

-- 3) Limpiar saldos y pacientes
DELETE FROM saldo_paciente;
DELETE FROM pacientes;

COMMIT;

-- ============================================
-- OPCIONAL: RESET TOTAL (descomentar si queres limpiar todo)
-- ============================================
-- BEGIN;
-- DELETE FROM disponibilidad_profesional;
-- DELETE FROM usuarios;
-- COMMIT;
