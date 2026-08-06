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

alter table bloqueos_agenda enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bloqueos_agenda' and policyname = 'Allow all to view bloqueos_agenda') then
    create policy "Allow all to view bloqueos_agenda" on bloqueos_agenda for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bloqueos_agenda' and policyname = 'Allow all to insert bloqueos_agenda') then
    create policy "Allow all to insert bloqueos_agenda" on bloqueos_agenda for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bloqueos_agenda' and policyname = 'Allow all to update bloqueos_agenda') then
    create policy "Allow all to update bloqueos_agenda" on bloqueos_agenda for update using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bloqueos_agenda' and policyname = 'Allow all to delete bloqueos_agenda') then
    create policy "Allow all to delete bloqueos_agenda" on bloqueos_agenda for delete using (true);
  end if;
end $$;
