-- =============================================================================
-- 015 — a formação passa a exibir só o ano de titulação
--
-- A linha do tempo mostrava intervalos ("2022 — 2026", "até 2018"); passa a
-- trazer apenas o ano em que cada título foi obtido. O doutorado, em especial,
-- é de 2025.
-- =============================================================================
begin;

update public.education set period_pt = '2025', period_en = '2025'
where id = 'cdc940e4-624d-46fe-99b2-cdbfdb722a5a';  -- Doutorado

update public.education set period_pt = '2021', period_en = '2021'
where id = 'c9fd88d5-67e8-49c9-9d9f-d3be7c0b812b';  -- Mestrado

update public.education set period_pt = '2018', period_en = '2018'
where id = '1af27d16-f159-4314-8455-2a6d68934524';  -- Bacharelado

update public.education set period_pt = '2014', period_en = '2014'
where id = '0178e362-1480-4a32-83b4-62d3ccc032fc';  -- Tecnólogo

commit;
