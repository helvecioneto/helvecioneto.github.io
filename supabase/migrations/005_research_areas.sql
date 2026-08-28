-- =============================================================================
-- 005 — ajustes nas linhas de pesquisa
-- =============================================================================
begin;

delete from public.research_areas where title_pt = 'Redes complexas e agrupamento';

-- O título deixa de restringir a atuação a uma área; a descrição acompanha,
-- senão prometeria menos do que o título.
update public.research_areas set
  title_pt = 'Inteligência artificial aplicada',
  title_en = 'Applied artificial intelligence',
  body_pt  = 'Modelos de aprendizado profundo e de máquina aplicados a problemas reais, da previsão probabilística de eventos severos à análise de dados ambientais, industriais e institucionais.',
  body_en  = 'Deep learning and machine learning models applied to real problems, from probabilistic forecasting of severe weather events to the analysis of environmental, industrial and institutional data.'
where title_pt = 'Inteligência artificial aplicada à atmosfera';

-- Fecha o buraco deixado na numeração pela linha removida.
with ranked as (
  select id, row_number() over (order by sort_order) - 1 as pos
  from public.research_areas
)
update public.research_areas a set sort_order = r.pos from ranked r where a.id = r.id;

commit;
