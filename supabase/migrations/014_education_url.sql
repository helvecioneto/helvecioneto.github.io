-- =============================================================================
-- 014 — link na linha do tempo da formação
--
-- A nota de cada formação traz o título da tese/dissertação, mas era texto
-- puro. Com `url` preenchida, a nota vira link para o depósito no repositório
-- do INPE — os mesmos endereços já usados nas publicações.
-- =============================================================================
begin;

alter table public.education
  add column if not exists url text;

comment on column public.education.url is
  'Link da nota (tese, dissertação ou trabalho de conclusão). Vazio = texto puro.';

update public.education
set url = 'http://mtc-m12e.sid.inpe.br/rep/sid.inpe.br/mtc-m12e/2026/01.02.12.20?mirror=urlib.net/www/2025/02.16.04.07.51&metadatarepository=sid.inpe.br/mtc-m12e/2026/01.02.12.20.17'
where id = 'cdc940e4-624d-46fe-99b2-cdbfdb722a5a';

update public.education
set url = 'http://mtc-m21c.sid.inpe.br/col/sid.inpe.br/mtc-m21c/2021/04.21.18.47/doc/publicacao.pdf'
where id = 'c9fd88d5-67e8-49c9-9d9f-d3be7c0b812b';

commit;
