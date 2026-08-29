-- =============================================================================
-- 010 — configura o link da agenda de compromissos do Google Calendar
--
-- URL canônica resolvida a partir do link curto compartilhado
-- (https://calendar.app.google/rGr4rxtp5XwCWKz39), na forma com /calendar/,
-- a única que o Google permite incorporar em iframe (?gv=true).
-- =============================================================================
begin;

update public.site_text
set pt = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1hHhNQpmDFnNIKXJ9wZ90Wb7i0riiuvucmv19P8QGOJNMo2yz6JPW-54MpEucYeuGxdhnHLJz-',
    en = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1hHhNQpmDFnNIKXJ9wZ90Wb7i0riiuvucmv19P8QGOJNMo2yz6JPW-54MpEucYeuGxdhnHLJz-'
where key = 'sched.url';

commit;
