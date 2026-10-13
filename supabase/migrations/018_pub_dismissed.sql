-- =============================================================================
-- 018 — publicação apagada não volta na sincronização seguinte
--
-- A sincronização semanal importa do OpenAlex tudo o que não encontra no banco.
-- Apagar uma publicação pelo painel, portanto, não bastava: na segunda-feira
-- seguinte ela voltava como "nova". Agora toda exclusão deixa um registro em
-- `publications_dismissed`, que scripts/sync-publications.js consulta antes de
-- importar — pelo id do OpenAlex, pelo DOI ou pelo título.
--
-- Aproveita para:
--   · apagar "Minicurso de Data Science e Machine Learning - Parte 2", material
--     de curso que o OpenAlex classificou como artigo de periódico;
--   · desfazer a queda de citações da sincronização de 2026-10-12, quando o
--     Semantic Scholar respondeu 429 e valeram as contagens menores do OpenAlex.
-- =============================================================================
begin;

create table if not exists public.publications_dismissed (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  doi          text,
  external_id  text,
  dismissed_at timestamptz not null default now()
);

comment on table public.publications_dismissed is
  'Publicações apagadas no painel; a sincronização automática não as importa de novo.';

-- Sem políticas: invisível para o cliente. A sincronização lê com a chave de
-- serviço, e o gatilho abaixo grava como dono da tabela.
alter table public.publications_dismissed enable row level security;

create or replace function public.remember_dismissed_publication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.publications_dismissed (title, doi, external_id)
  values (old.title, old.doi, old.external_id);
  return old;
end;
$$;

drop trigger if exists trg_publications_dismissed on public.publications;
create trigger trg_publications_dismissed
  after delete on public.publications
  for each row execute function public.remember_dismissed_publication();

-- O gatilho já registra a exclusão.
delete from public.publications
where external_id = 'https://openalex.org/W7209195477';  -- Minicurso … Parte 2

-- Últimas contagens do Semantic Scholar, antes da queda.
update public.publications
set cites = greatest(cites, 5), cites_source = 'semantic-scholar'
where id = '4d839a23-0bcf-48f9-aa5a-28a1787ee0d5';  -- Impact of Multi-Thresholds…

update public.publications
set cites = greatest(cites, 2), cites_source = 'semantic-scholar'
where id = '113e2a24-5d7b-4eb9-a47c-f3325b6b16ed';  -- Very Short-Term CG Lightning…

commit;
