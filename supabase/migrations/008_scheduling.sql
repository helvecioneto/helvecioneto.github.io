-- =============================================================================
-- 008 — bloco de agendamento de reuniões (Google Calendar)
--
-- O site incorpora uma "agenda de compromissos" do Google Calendar, que exibe
-- apenas os horários vagos dos dias liberados na configuração da agenda —
-- nunca os eventos do calendário. O bloco fica oculto enquanto `sched.url`
-- estiver vazio; o link é colado pelo painel /admin depois de criar a agenda
-- em calendar.google.com.
-- =============================================================================
begin;

insert into public.site_text (key, section, label, pt, en, multiline, allows_html, sort_order) values
  ('sched.title', 'Agendamento', 'Título do bloco',
   'Agende uma reunião', 'Book a meeting', false, false, 300),
  ('sched.lede', 'Agendamento', 'Texto de abertura',
   'Prefere conversar? Escolha um horário livre diretamente abaixo — apenas os dias e horários que mantenho abertos para reuniões são exibidos.',
   'Prefer to talk? Pick a free slot directly below — only the days and times I keep open for meetings are shown.',
   true, false, 301),
  ('sched.open', 'Agendamento', 'Rótulo do link "abrir em nova aba"',
   'Abrir a agenda em uma nova aba', 'Open the booking page in a new tab', false, false, 302),
  ('sched.url', 'Agendamento',
   'Link da agenda de compromissos do Google Calendar. Cole aqui o link de agendamento (começa com https://calendar.google.com/calendar/appointments/). Vazio = bloco oculto no site. Preencha só o campo PT; o mesmo link vale para os dois idiomas.',
   '', '', false, false, 303)
on conflict (key) do nothing;

commit;
