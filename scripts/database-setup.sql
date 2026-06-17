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
-- TABLA: tratamientos
-- ============================================
CREATE TABLE tratamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  servicio TEXT NOT NULL CHECK (servicio IN ('kinesiologia', 'traumatologia')),
  tipo_plan TEXT NOT NULL DEFAULT 'orden' CHECK (tipo_plan IN ('orden', 'libre')),
  sesiones_totales INTEGER NOT NULL DEFAULT 1 CHECK (sesiones_totales > 0),
  sesiones_realizadas INTEGER NOT NULL DEFAULT 0 CHECK (sesiones_realizadas >= 0),
  precio_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monto_pagado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin_estimada DATE,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view tratamientos" ON tratamientos FOR SELECT USING (TRUE);
CREATE POLICY "Allow all to insert tratamientos" ON tratamientos FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow all to update tratamientos" ON tratamientos FOR UPDATE USING (TRUE);
CREATE POLICY "Allow all to delete tratamientos" ON tratamientos FOR DELETE USING (TRUE);

-- ============================================
-- TABLA: turnos
-- ============================================
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tratamiento_id UUID REFERENCES tratamientos(id) ON DELETE SET NULL,
  servicio TEXT NOT NULL CHECK (servicio IN ('kinesiologia', 'traumatologia')),
  numero_sesion INTEGER,
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
-- TABLA: disponibilidad_profesional
-- ============================================
CREATE TABLE disponibilidad_profesional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  servicio TEXT NOT NULL CHECK (servicio IN ('kinesiologia', 'traumatologia')),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  intervalo_minutos INTEGER NOT NULL DEFAULT 30,
  duracion_minutos INTEGER NOT NULL DEFAULT 45,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (hora_inicio < hora_fin),
  CHECK (intervalo_minutos > 0),
  CHECK (duracion_minutos > 0)
);

ALTER TABLE disponibilidad_profesional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to view disponibilidad_profesional" ON disponibilidad_profesional FOR SELECT USING (TRUE);
CREATE POLICY "Allow all to insert disponibilidad_profesional" ON disponibilidad_profesional FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow all to update disponibilidad_profesional" ON disponibilidad_profesional FOR UPDATE USING (TRUE);
CREATE POLICY "Allow all to delete disponibilidad_profesional" ON disponibilidad_profesional FOR DELETE USING (TRUE);

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

-- Insert test tratamientos
INSERT INTO tratamientos (paciente_id, servicio, tipo_plan, sesiones_totales, sesiones_realizadas, precio_total, monto_pagado, fecha_inicio, estado)
SELECT id, 'kinesiologia', 'orden', 10, 2, 60000, 12000, CURRENT_DATE - INTERVAL '7 day', 'activo'
FROM pacientes WHERE nombre = 'Carlos' LIMIT 1;

-- Insert disponibilidad_profesional
INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT id, 'kinesiologia', day_number, '08:00'::time, '12:00'::time, 30, 45
FROM usuarios
CROSS JOIN generate_series(1, 5) AS day_number
WHERE email = 'franco@rek.com';

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT id, 'kinesiologia', day_number, '14:00'::time, '19:00'::time, 30, 45
FROM usuarios
CROSS JOIN generate_series(1, 5) AS day_number
WHERE email = 'franco@rek.com';

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT id, 'traumatologia', day_number, '09:00'::time, '13:00'::time, 30, 45
FROM usuarios
CROSS JOIN generate_series(1, 5) AS day_number
WHERE email = 'juan@rek.com';

INSERT INTO disponibilidad_profesional (usuario_id, servicio, dia_semana, hora_inicio, hora_fin, intervalo_minutos, duracion_minutos)
SELECT id, 'kinesiologia', day_number, '15:00'::time, '18:30'::time, 30, 45
FROM usuarios
CROSS JOIN generate_series(1, 5) AS day_number
WHERE email = 'juan@rek.com';

-- Insert test movimientos_caja
INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, fecha) VALUES
('ingreso', 'Turnos', 150.00, 'Consulta Kinesiología', CURRENT_DATE),
('ingreso', 'Turnos', 200.00, 'Consulta Traumatología', CURRENT_DATE),
('egreso', 'Gastos', 50.00, 'Suministros médicos', CURRENT_DATE);
