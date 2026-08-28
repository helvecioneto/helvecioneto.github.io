-- =============================================================================
-- 007 — rastreio de origem das publicações, para a sincronização automática
-- =============================================================================
alter table public.publications
  add column if not exists source      text not null default 'manual',
  add column if not exists external_id text,
  add column if not exists synced_at   timestamptz,
  add column if not exists cites_source text;

-- Casar publicação vinda de fora com uma já existente é feito por DOI; o índice
-- torna isso barato e impede duas linhas com o mesmo DOI.
create unique index if not exists idx_publications_doi
  on public.publications (lower(doi)) where doi is not null;

create index if not exists idx_publications_external
  on public.publications (external_id) where external_id is not null;

comment on column public.publications.source is
  'manual = cadastrado no painel; openalex = trazido pela sincronização automática';
comment on column public.publications.cites_source is
  'De onde veio a contagem de citações mais recente';
