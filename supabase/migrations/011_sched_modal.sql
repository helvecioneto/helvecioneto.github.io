-- =============================================================================
-- 011 — agendamento integrado: item na coluna de contato + modal
--
-- O bloco de agendamento deixou de ser uma faixa com iframe no fim da seção e
-- virou um item nativo da coluna de contato; a página do Google só aparece num
-- modal, ao clicar no botão. Novas chaves: rótulo do botão e do fechar.
-- =============================================================================
begin;

insert into public.site_text (key, section, label, pt, en, multiline, allows_html, sort_order) values
  ('sched.cta', 'Agendamento', 'Rótulo do botão que abre a agenda',
   'Ver horários disponíveis', 'See available times', false, false, 304),
  ('sched.close', 'Agendamento', 'Rótulo acessível do botão de fechar o modal',
   'Fechar', 'Close', false, false, 305)
on conflict (key) do nothing;

-- O texto de abertura não fica mais "acima" do calendário, e sim ao lado dos
-- demais dados de contato.
update public.site_text set
  pt = 'Prefere conversar? Escolha um horário livre na minha agenda — apenas os dias e horários que mantenho abertos para reuniões são exibidos.',
  en = 'Prefer to talk? Pick a free slot in my calendar — only the days and times I keep open for meetings are shown.'
where key = 'sched.lede';

commit;
