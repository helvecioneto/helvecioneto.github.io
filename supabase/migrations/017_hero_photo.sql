-- =============================================================================
-- 017 — foto de perfil trocável pelo painel
--
-- A foto do topo era um arquivo do repositório, só substituível por commit.
-- `hero.photo` guarda o endereço da imagem enviada pelo painel (bucket `media`,
-- o mesmo dos logos dos grupos). Vazia, vale a foto que veio no deploy.
--
-- A chave é uma só, sem versão por idioma: o painel a apresenta como seletor de
-- arquivo, e o site lê o endereço de `pt`.
-- =============================================================================
begin;

insert into public.site_text (key, section, label, pt, en, multiline, allows_html, sort_order) values
  ('hero.photo', 'Topo', 'Foto de perfil', '', '', false, false, 17)
on conflict (key) do nothing;

commit;
