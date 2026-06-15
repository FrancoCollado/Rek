-- ============================================
-- REK - Scripts de Base de Datos
-- ============================================

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'kinesiologo')),
  especialidades TEXT[] DEFAULT ARRAY[]::TEXT[],
  telefono TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view usuarios" ON usuarios FOR SELECT USING (TRUE);
CREATE POLICY "Allow admins to insert" ON usuarios FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow admins to update" ON usuarios FOR UPDATE USING (TRUE);
CREATE POLICY "Allow admins to delete" ON usuarios FOR DELETE USING (TRUE);

-- ============================================
-- TABLA: pacientes
-- ============================================
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT NOT NULL,
  fecha_nacimiento DATE,
  dni TEXT UNIQUE,
  direccion TEXT,
  obra_social TEXT,
  numero_afiliado TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view pacientes" ON pacientes FOR SELECT USING (TRUE);
CREATE POLICY "Allow all to insert pacientes" ON pacientes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow all to update pacientes" ON pacientes FOR UPDATE USING (TRUE);
CREATE POLICY "Allow all to delete pacientes" ON pacientes FOR DELETE USING (TRUE);

-- ============================================
-- TABLA: turnos
-- ============================================
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  servicio TEXT NOT NULL CHECK (servicio IN ('kinesiologia', 'traumatologia')),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  duracion_minutos INTEGER DEFAULT 45,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'realizado', 'cancelado')),
  asistido BOOLEAN DEFAULT FALSE,
  cobrado BOOLEAN DEFAULT FALSE,
  monto_pagado DECIMAL(10, 2),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view turnos" ON turnos FOR SELECT USING (TRUE);
CREATE POLICY "Allow all to insert turnos" ON turnos FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow all to update turnos" ON turnos FOR UPDATE USING (TRUE);
CREATE POLICY "Allow all to delete turnos" ON turnos FOR DELETE USING (TRUE);

-- ============================================
-- TABLA: movimientos_caja
-- ============================================
CREATE TABLE movimientos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria TEXT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view movimientos_caja" ON movimientos_caja FOR SELECT USING (TRUE);
CREATE POLICY "Allow all to insert movimientos_caja" ON movimientos_caja FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow all to update movimientos_caja" ON movimientos_caja FOR UPDATE USING (TRUE);
CREATE POLICY "Allow all to delete movimientos_caja" ON movimientos_caja FOR DELETE USING (TRUE);

-- ============================================
-- TABLA: saldo_paciente
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
-- DATOS DE PRUEBA
-- ============================================

-- Insert test usuarios
INSERT INTO usuarios (email, nombre, apellido, rol, especialidades, telefono) VALUES
('franco@rek.com', 'Franco', 'Busso', 'kinesiologo', ARRAY['RPG', 'Terapia Manual ONM'], '3413374446'),
('juan@rek.com', 'Juan Manuel', 'Grigioni', 'kinesiologo', ARRAY['Rehabilitación Vestibular', 'RPG'], '3413374447'),
('admin@rek.com', 'Admin', 'Centro', 'admin', ARRAY[]::TEXT[], '3413374448');

-- Insert test pacientes
INSERT INTO pacientes (nombre, apellido, email, telefono, dni, obra_social) VALUES
('Carlos', 'Martínez', 'carlos@email.com', '3412223344', '12345678', 'OSDE'),
('Laura', 'García', 'laura@email.com', '3412223345', '87654321', 'Swiss Medical'),
('Diego', 'López', 'diego@email.com', '3412223346', '11223344', 'Obra Social');

-- Insert test turnos
INSERT INTO turnos (paciente_id, usuario_id, servicio, fecha, hora, estado) 
SELECT p.id, u.id, 'kinesiologia', CURRENT_DATE + INTERVAL '1 day', '09:00'::time, 'pendiente'
FROM pacientes p, usuarios u WHERE u.email = 'franco@rek.com' AND p.nombre = 'Carlos' LIMIT 1;

INSERT INTO turnos (paciente_id, usuario_id, servicio, fecha, hora, estado) 
SELECT p.id, u.id, 'traumatologia', CURRENT_DATE + INTERVAL '2 days', '10:30'::time, 'confirmado'
FROM pacientes p, usuarios u WHERE u.email = 'juan@rek.com' AND p.nombre = 'Laura' LIMIT 1;

-- Insert test movimientos_caja
INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, fecha) VALUES
('ingreso', 'Turnos', 150.00, 'Consulta Kinesiología', CURRENT_DATE),
('ingreso', 'Turnos', 200.00, 'Consulta Traumatología', CURRENT_DATE),
('egreso', 'Gastos', 50.00, 'Suministros médicos', CURRENT_DATE);
