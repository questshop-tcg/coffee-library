-- Coffee Library: database setup.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to re-run.

-- ---------- tables ----------
create table if not exists public.coffees (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  roaster      text,
  country      text,
  region       text,
  farm         text,
  producer     text,
  variety      text,
  altitude     text,
  process      text,
  roast_level  text,
  roast_date   date,
  bag_notes    text,
  weight_g     numeric(7, 1),
  price        numeric(8, 2),
  notes        text,
  photo_url    text,
  status       text not null default 'active' check (status in ('active', 'finished')),
  created_at   timestamptz not null default now()
);

create table if not exists public.recipes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  dose_g         numeric(5, 1),
  water_g        numeric(6, 1),
  grinder        text,
  grind_setting  text,
  temp_c         numeric(4, 1),
  filter         text,
  water          text,
  bloom_water_g  numeric(5, 1),
  bloom_time_s   integer,
  pours          text,
  target_time_s  integer,
  notes          text,
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists public.brews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coffee_id      uuid not null references public.coffees (id) on delete cascade,
  recipe_id      uuid references public.recipes (id) on delete set null,
  brewed_at      timestamptz not null default now(),
  dose_g         numeric(5, 1),
  water_g        numeric(6, 1),
  grinder        text,
  grind_setting  text,
  temp_c         numeric(4, 1),
  filter         text,
  water          text,
  bloom_water_g  numeric(5, 1),
  bloom_time_s   integer,
  pours          text,
  total_time_s   integer,
  rating         numeric(3, 1) check (rating >= 1 and rating <= 10),
  tags           text[] not null default '{}',
  notes          text,
  next_time      text,
  created_at     timestamptz not null default now()
);

-- Your own keywords (the built-in ones live in the app).
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null,
  category    text not null default 'other',
  created_at  timestamptz not null default now(),
  unique (user_id, label)
);

create index if not exists brews_user_brewed_idx on public.brews (user_id, brewed_at desc);
create index if not exists brews_coffee_idx on public.brews (coffee_id);
create index if not exists brews_recipe_idx on public.brews (recipe_id);

-- ---------- row-level security: everyone only sees their own rows ----------
do $$
declare t text;
begin
  foreach t in array array['coffees', 'recipes', 'brews', 'tags'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------- storage for bag photos ----------
-- Public bucket: photos are readable by URL (random, unguessable names);
-- only you can upload, change or delete files in your own folder.
insert into storage.buckets (id, name, public)
values ('coffee-photos', 'coffee-photos', true)
on conflict (id) do nothing;

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "update own photos" on storage.objects;
create policy "update own photos" on storage.objects for update to authenticated
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
