-- =============================================================================
-- 013 — link próprio para publicações sem DOI
--
-- O título de uma publicação só virava link quando havia DOI, o que deixava
-- tese e dissertação (depositadas no repositório do INPE) sem para onde apontar.
-- A coluna `url` cobre esse caso e tem precedência sobre o DOI no título.
--
-- Aproveita para registrar a dissertação de mestrado, que existia apenas como
-- nota na linha do tempo da formação.
-- =============================================================================
begin;

alter table public.publications
  add column if not exists url text;

comment on column public.publications.url is
  'Link do título quando não há DOI (repositório institucional, PDF, etc.)';

-- Tese de doutorado (INPE).
update public.publications
set url = 'http://mtc-m12e.sid.inpe.br/rep/sid.inpe.br/mtc-m12e/2026/01.02.12.20?mirror=urlib.net/www/2025/02.16.04.07.51&metadatarepository=sid.inpe.br/mtc-m12e/2026/01.02.12.20.17'
where id = '4d55dca1-95e9-4529-8603-22b8a22d0116';

-- Abre espaço para a dissertação, que é de 2021, entre as de 2022 e a de 2020.
update public.publications set sort_order = 11 where sort_order = 10;

insert into public.publications
  (sort_order, year, type, title, authors, venue_pt, venue_en, doi, url, cites, source)
values (
  10, 2021, 'thesis',
  'Rastreio e previsão de sistemas precipitantes e convectivos na Bacia Amazônica utilizando aprendizado de máquina não-supervisionado',
  array['Leal Neto, H. B.']::text[],
  'Dissertação de Mestrado — Instituto Nacional de Pesquisas Espaciais (INPE)',
  'Master''s dissertation — National Institute for Space Research (INPE)',
  null,
  'http://mtc-m21c.sid.inpe.br/col/sid.inpe.br/mtc-m21c/2021/04.21.18.47/doc/publicacao.pdf',
  0, 'manual'
);

-- A nota da formação passa a trazer o título da dissertação, como já ocorre
-- com a tese logo acima dela.
update public.education set
  note_pt = 'Dissertação: Rastreio e previsão de sistemas precipitantes e convectivos na Bacia Amazônica utilizando aprendizado de máquina não-supervisionado.',
  note_en = 'Dissertation: Tracking and forecasting of precipitating and convective systems over the Amazon Basin using unsupervised machine learning.'
where id = 'c9fd88d5-67e8-49c9-9d9f-d3be7c0b812b';

commit;
