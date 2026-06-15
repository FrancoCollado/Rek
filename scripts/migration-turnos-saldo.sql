-- ============================================
-- MIGRACIONES: Turnos Completación y Saldo
-- ============================================
-- Script para agregar funcionalidad de marca de turnos 
-- como "asistido" y "cobrado", junto con saldo de paciente

-- ============================================
-- 1. Agregar columnas a tabla: turnos
-- ============================================
ALTER TABLE turnos ADD COLUMN asistido BOOLEAN DEFAULT FALSE;
ALTER TABLE turnos ADD COLUMN cobrado BOOLEAN DEFAULT FALSE;
ALTER TABLE turnos ADD COLUMN monto_pagado DECIMAL(10, 2);

-- ============================================
-- 2. Crear tabla: saldo_paciente
-- ============================================
CREATE TABLE saldo_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
  saldo_deuda DECIMAL(10, 2) DEFAULT 0,
  sesiones_pendientes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE saldo_paciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view saldo_paciente" ON saldo_paciente FOR SELECT USING (TRUE);
CREATE POLICY "Allow all to insert saldo_paciente" ON saldo_paciente FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow all to update saldo_paciente" ON saldo_paciente FOR UPDATE USING (TRUE);
CREATE POLICY "Allow all to delete saldo_paciente" ON saldo_paciente FOR DELETE USING (TRUE);

-- ============================================
-- 3. Actualizar tabla: movimientos_caja
-- ============================================
-- Agregar columna paciente_id a movimientos_caja para trackear pagos por paciente
ALTER TABLE movimientos_caja ADD COLUMN paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL;

-- ============================================
-- 4. Datos de prueba: saldo_paciente
-- ============================================
-- Insertar saldos para los pacientes de prueba
INSERT INTO saldo_paciente (paciente_id, saldo_deuda, sesiones_pendientes)
SELECT id, 1500.00, 5 FROM pacientes WHERE nombre = 'Carlos' AND apellido = 'Martínez'
ON CONFLICT (paciente_id) DO NOTHING;

INSERT INTO saldo_paciente (paciente_id, saldo_deuda, sesiones_pendientes)
SELECT id, 0, 0 FROM pacientes WHERE nombre = 'Laura' AND apellido = 'García'
ON CONFLICT (paciente_id) DO NOTHING;

INSERT INTO saldo_paciente (paciente_id, saldo_deuda, sesiones_pendientes)
SELECT id, 2000.00, 8 FROM pacientes WHERE nombre = 'Diego' AND apellido = 'López'
ON CONFLICT (paciente_id) DO NOTHING;
