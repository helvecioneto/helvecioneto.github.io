-- =============================================================================
-- Portfólio acadêmico — schema de conteúdo editável
-- =============================================================================

-- Quem pode escrever. Uma tabela (e não um e-mail fixo na policy) para que
-- adicionar ou revogar um editor seja um INSERT/DELETE, sem migração nova.
create table if not exists public.admins (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Carimbo de última edição, mantido pelo banco e não pelo cliente.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Textos da página -------------------------------------------------------
-- Uma linha por chave, com as duas línguas lado a lado: é assim que o editor
-- enxerga o conteúdo, e evita ter de casar duas linhas para traduzir algo.
create table if not exists public.site_text (
  key        text primary key,
  section    text not null default 'geral',
  label      text,
  pt         text not null default '',
  en         text not null default '',
  multiline  boolean not null default false,
  allows_html boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- --- Linhas de pesquisa -----------------------------------------------------
create table if not exists public.research_areas (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  title_pt   text not null default '',
  title_en   text not null default '',
  body_pt    text not null default '',
  body_en    text not null default '',
  updated_at timestamptz not null default now()
);

-- --- Grupos de pesquisa -----------------------------------------------------
create table if not exists public.research_groups (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  acronym    text not null default '',
  name_pt    text not null default '',
  name_en    text not null default '',
  org_pt     text not null default '',
  org_en     text not null default '',
  updated_at timestamptz not null default now()
);

-- --- Publicações ------------------------------------------------------------
create table if not exists public.publications (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  year       integer not null,
  type       text not null check (type in ('journal','conference','preprint','thesis','dataset')),
  title      text not null default '',
  authors    text[] not null default '{}',
  venue_pt   text not null default '',
  venue_en   text not null default '',
  doi        text,
  cites      integer not null default 0 check (cites >= 0),
  updated_at timestamptz not null default now()
);

-- --- Disciplinas ------------------------------------------------------------
create table if not exists public.courses (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  code       text,
  hours      integer not null default 60,
  url        text,
  title_pt   text not null default '',
  title_en   text not null default '',
  topics_pt  text[] not null default '{}',
  topics_en  text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- --- Software ---------------------------------------------------------------
create table if not exists public.software (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  name       text not null default '',
  stars      integer not null default 0 check (stars >= 0),
  repo       text,
  docs       text,
  featured   boolean not null default false,
  desc_pt    text not null default '',
  desc_en    text not null default '',
  updated_at timestamptz not null default now()
);

-- --- Formação ---------------------------------------------------------------
create table if not exists public.education (
  id             uuid primary key default gen_random_uuid(),
  sort_order     integer not null default 0,
  period_pt      text not null default '',
  period_en      text not null default '',
  degree_pt      text not null default '',
  degree_en      text not null default '',
  institution_pt text not null default '',
  institution_en text not null default '',
  note_pt        text not null default '',
  note_en        text not null default '',
  updated_at     timestamptz not null default now()
);

-- --- Links de perfil --------------------------------------------------------
create table if not exists public.links (
  id         uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  icon       text not null default 'link',
  label      text not null default '',
  url        text not null default '',
  visible    boolean not null default true,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Triggers de updated_at
-- =============================================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'site_text','research_areas','research_groups','publications',
    'courses','software','education','links'
  ] loop
    execute format(
      'drop trigger if exists touch_%1$s on public.%1$s;
       create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at();', tbl);
  end loop;
end $$;

-- =============================================================================
-- Row Level Security
--   leitura: pública (o site é público)
--   escrita: apenas e-mails presentes em public.admins
-- =============================================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'site_text','research_areas','research_groups','publications',
    'courses','software','education','links'
  ] loop
    execute format('alter table public.%I enable row level security;', tbl);

    execute format('drop policy if exists "public read" on public.%I;', tbl);
    execute format(
      'create policy "public read" on public.%I for select using (true);', tbl);

    execute format('drop policy if exists "admin write" on public.%I;', tbl);
    execute format(
      'create policy "admin write" on public.%I for all
         using (public.is_admin()) with check (public.is_admin());', tbl);
  end loop;
end $$;

-- A lista de admins nunca é exposta ao cliente: sem policy de select, o RLS
-- nega tudo para anon e authenticated. Só o service_role a enxerga.
alter table public.admins enable row level security;

-- Índices de ordenação
create index if not exists idx_site_text_section on public.site_text (section, sort_order);
create index if not exists idx_publications_order on public.publications (sort_order, year desc);
