-- =============================================================================
-- 012 — o agendamento vira a seção 08, com entrada própria no menu
--
-- Substitui o modal na coluna de contato por uma seção dedicada com a agenda
-- incorporada, como na primeira versão. Seção e itens de menu aparecem juntos,
-- e somem juntos quando sched.url está vazio.
-- =============================================================================
begin;

insert into public.site_text (key, section, label, pt, en, multiline, allows_html, sort_order) values
  ('nav.schedule', 'Navegação', 'Item de menu: Agendamento',
   'Agendamento', 'Scheduling', false, false, 306),
  ('sched.index', 'Agendamento', 'Etiqueta numerada da seção',
   '08 — Agendamento', '08 — Scheduling', false, false, 307)
on conflict (key) do nothing;

-- O texto de abertura volta a apresentar o calendário logo abaixo dele.
update public.site_text set
  pt = 'Escolha um horário livre diretamente abaixo — apenas os dias e horários que mantenho abertos para reuniões são exibidos.',
  en = 'Pick a free slot directly below — only the days and times I keep open for meetings are shown.'
where key = 'sched.lede';

-- Chaves do modal, que não existe mais.
delete from public.site_text where key in ('sched.cta', 'sched.close');

commit;
