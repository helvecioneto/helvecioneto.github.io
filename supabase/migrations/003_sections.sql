-- =============================================================================
-- 003 — retira as métricas do topo e renomeia a seção Software para Produtos
-- =============================================================================
begin;

-- As métricas saíram da página; suas chaves não têm mais onde aparecer.
delete from public.site_text where key like 'hero.metric.%';

-- "Produtos" é o rótulo da seção na página e no painel.
update public.site_text set section = 'Produtos' where section = 'Software';
update public.site_text set pt = 'Produtos',  en = 'Products' where key = 'nav.software';
update public.site_text set pt = 'Produtos',  en = 'Products' where key = 'soft.title';
update public.site_text set pt = '05 — Produtos', en = '05 — Products' where key = 'soft.index';

-- Rótulos legíveis para os textos que o painel mostra em cada seção.
update public.site_text set label = v.label
from (values
  ('nav.about','Item de menu: Perfil'),
  ('nav.research','Item de menu: Pesquisa'),
  ('nav.publications','Item de menu: Publicações'),
  ('nav.teaching','Item de menu: Ensino'),
  ('nav.software','Item de menu: Produtos'),
  ('nav.education','Item de menu: Formação'),
  ('nav.contact','Item de menu: Contato'),
  ('nav.menu','Rótulo acessível do botão de menu'),
  ('nav.skip','Link "pular para o conteúdo"'),
  ('lang.label','Rótulo acessível do seletor de idioma'),
  ('hero.role','Cargo e titulação'),
  ('hero.dept','Unidade'),
  ('hero.program','Curso e cidade'),
  ('about.index','Etiqueta numerada da seção'),
  ('about.title','Título da seção'),
  ('about.lede','Texto de abertura'),
  ('about.panel.title','Quadro lateral: título'),
  ('about.panel.areasV','Quadro lateral: áreas de atuação'),
  ('research.index','Etiqueta numerada da seção'),
  ('research.title','Título da seção'),
  ('research.lede','Texto de abertura'),
  ('research.groups','Subtítulo dos grupos'),
  ('pubs.index','Etiqueta numerada da seção'),
  ('pubs.title','Título da seção'),
  ('pubs.lede','Texto de abertura'),
  ('pubs.all','Filtro: todas'),
  ('pubs.journal','Filtro: periódicos'),
  ('pubs.conference','Filtro: conferências'),
  ('pubs.preprint','Filtro: preprints'),
  ('pubs.thesis','Filtro: teses'),
  ('pubs.dataset','Filtro: dados'),
  ('pubs.cite','Palavra "citação" (singular)'),
  ('pubs.cites','Palavra "citações" (plural)'),
  ('pubs.thesisVenue','Instituição da tese'),
  ('teaching.index','Etiqueta numerada da seção'),
  ('teaching.title','Título da seção'),
  ('teaching.lede','Texto de abertura'),
  ('teaching.hours','Palavra "horas"'),
  ('teaching.materials','Link para o material'),
  ('soft.index','Etiqueta numerada da seção'),
  ('soft.title','Título da seção'),
  ('soft.lede','Texto de abertura'),
  ('soft.docs','Link "Documentação"'),
  ('soft.repo','Link "Repositório"'),
  ('soft.viewall','Link para todos os repositórios'),
  ('edu.index','Etiqueta numerada da seção'),
  ('edu.title','Título da seção'),
  ('edu.lede','Texto de abertura'),
  ('contact.index','Etiqueta numerada da seção'),
  ('contact.title','Título da seção'),
  ('contact.email','Rótulo: e-mail'),
  ('contact.office','Rótulo: gabinete'),
  ('contact.officeV','Sala e prédio'),
  ('contact.address','Rótulo: endereço'),
  ('contact.addressV','Endereço completo'),
  ('contact.profiles','Rótulo: perfis acadêmicos'),
  ('contact.response','Prazo de resposta'),
  ('footer.tagline','Resumo no rodapé'),
  ('footer.nav','Rodapé: título da navegação'),
  ('footer.profiles','Rodapé: título dos perfis'),
  ('footer.rights','Aviso de direitos'),
  ('footer.source','Origem dos dados'),
  ('totop','Rótulo do botão "voltar ao topo"')
) as v(key, label)
where site_text.key = v.key;

commit;
