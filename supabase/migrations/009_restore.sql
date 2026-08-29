-- =============================================================================
-- 009 — restaura o conteúdo editado pelo painel, perdido quando o db push
-- reaplicou o seed (002 faz truncate). Fonte: assets/js/content.js, a cópia
-- fiel do banco gerada em 2026-08-28 por scripts/sync-fallback.js.
-- Contém apenas as diferenças entre o estado reseedado e essa cópia.
-- =============================================================================
begin;

update public.research_groups set logo_url = 'https://qqbmrpckbmwgyhgbtpjo.supabase.co/storage/v1/object/public/media/logo-labren-mtd0g068.png' where id = '605fd74a-1abb-42b8-9987-206bd622d3e1';
update public.publications set cites = 2 where id = '113e2a24-5d7b-4eb9-a47c-f3325b6b16ed';
update public.publications set cites = 5 where id = '4d839a23-0bcf-48f9-aa5a-28a1787ee0d5';
update public.publications set cites = 12 where id = 'a667c48a-d865-4d22-9a97-272b3324b70f';

commit;
