-- =============================================================================
-- 016 — a Formação sobe para logo depois do Perfil
--
-- Ordem nova das seções: Perfil, Formação, Pesquisa, Publicações, Ensino,
-- Produtos, Contato, Agendamento. Só o número da etiqueta muda; o rótulo é
-- preservado como estiver, para não desfazer edições feitas no painel.
-- =============================================================================
begin;

update public.site_text set pt = regexp_replace(pt, '^\d+', '02'),
                            en = regexp_replace(en, '^\d+', '02')
where key = 'edu.index';

update public.site_text set pt = regexp_replace(pt, '^\d+', '03'),
                            en = regexp_replace(en, '^\d+', '03')
where key = 'research.index';

update public.site_text set pt = regexp_replace(pt, '^\d+', '04'),
                            en = regexp_replace(en, '^\d+', '04')
where key = 'pubs.index';

update public.site_text set pt = regexp_replace(pt, '^\d+', '05'),
                            en = regexp_replace(en, '^\d+', '05')
where key = 'teaching.index';

update public.site_text set pt = regexp_replace(pt, '^\d+', '06'),
                            en = regexp_replace(en, '^\d+', '06')
where key = 'soft.index';

commit;
