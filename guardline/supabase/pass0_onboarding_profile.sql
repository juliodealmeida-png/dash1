-- Onboarding + perfil + aniversários + feed signals (executar no SQL Editor Supabase).

create table if not exists users (
  id                      uuid default gen_random_uuid() primary key,
  email                   text unique not null,
  first_name              text,
  last_name               text,
  birthdate               date,
  phone                   text,
  whatsapp                text,
  job_title               text,
  department              text,
  photo_url               text,
  linkedin_url            text,
  calendar_url            text,
  signature_svg           text,
  signature_id_number     text,
  signature_id_type       text,
  onboarding_completed    boolean default false,
  onboarding_completed_at timestamptz,
  role                    text default 'sdr',
  active                  boolean default true,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create table if not exists birthday_notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     text not null,
  notified_at date,
  year        int,
  created_at  timestamptz default now(),
  unique(user_id, year)
);

create table if not exists signals (
  id          uuid default gen_random_uuid() primary key,
  type        text,
  severity    text,
  title       text,
  message     text,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

do $$ declare t text;
begin
  foreach t in array array['users','birthday_notifications','signals'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'public_access') then
      execute format('create policy "public_access" on %I for all using (true)', t);
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

drop policy if exists "profiles_public_read" on storage.objects;
drop policy if exists "profiles_upload_all" on storage.objects;
drop policy if exists "profiles_update_all" on storage.objects;

create policy "profiles_public_read" on storage.objects for select using (bucket_id = 'profiles');
create policy "profiles_upload_all" on storage.objects for insert with check (bucket_id = 'profiles');
create policy "profiles_update_all" on storage.objects for update using (bucket_id = 'profiles');
