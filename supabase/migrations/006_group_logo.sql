-- =============================================================================
-- 006 — grupos de pesquisa ganham logo e endereço próprio
-- =============================================================================
alter table public.research_groups
  add column if not exists logo_url text,
  add column if not exists site_url text;

-- Bucket público para logos e demais imagens do site. Público na leitura porque
-- as imagens aparecem numa página aberta; a escrita continua restrita.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 2097152,
        array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif'];

-- Qualquer visitante lê; só quem está em `admins` envia, troca ou apaga.
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects
  for all using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
