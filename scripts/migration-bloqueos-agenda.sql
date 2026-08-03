-- Tabla para bloquear rangos horarios en la agenda (feriados, mantenimiento, etc.)
create table if not exists bloqueos_agenda (
  id          uuid primary key default gen_random_uuid(),
  entidad_id  text not null,
  fecha       date not null,
  hora_inicio time not null,
  hora_fin    time not null,
  motivo      text,
  created_at  timestamptz default now()
);

create index if not exists bloqueos_agenda_entidad_fecha_idx
  on bloqueos_agenda (entidad_id, fecha);
