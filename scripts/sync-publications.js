#!/usr/bin/env node
/* =============================================================================
   sync-publications.js — traz publicações novas e citações atualizadas

   Por que não o Google Scholar
   ----------------------------
   O Scholar não tem API pública e responde com CAPTCHA a qualquer acesso
   automatizado — verificado nesta máquina e, de um IP de datacenter como o do
   GitHub Actions, o bloqueio é ainda mais certo. Não existe forma honesta de
   raspá-lo sem serviço pago.

   O que este script usa no lugar
   ------------------------------
   · OpenAlex descobre trabalhos novos, pelo ORCID e pelos IDs de autor. É
     gratuito, sem chave, e indexa Crossref, DataCite, PubMed e repositórios.
   · Semantic Scholar fornece a contagem de citações, que costuma ser mais alta
     que a do OpenAlex e mais próxima da do Scholar. Se não conhecer o artigo,
     vale a contagem do OpenAlex.
   · SerpApi, se houver SERPAPI_KEY no ambiente, substitui as duas na contagem e
     devolve os números do próprio Google Scholar. É opcional e pago.

   Regras
   ------
   · Publicação já cadastrada só tem as citações atualizadas. Título, veículo e
     autores nunca são sobrescritos: podem ter sido corrigidos à mão.
   · Publicação nova entra marcada como `openalex`, para se distinguir no painel.
   · Nada é apagado. Um trabalho que suma do OpenAlex permanece no site.

   Uso:  SUPABASE_SERVICE_KEY=... node scripts/sync-publications.js [--dry-run]
   ========================================================================== */

const SUPABASE_URL = 'https://qqbmrpckbmwgyhgbtpjo.supabase.co';
const REST = SUPABASE_URL + '/rest/v1';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const MAILTO      = process.env.OPENALEX_MAILTO || 'helvecio.leal@ufopa.edu.br';
const DRY         = process.argv.includes('--dry-run');

const ORCID       = '0000-0002-7526-2094';
const AUTHOR_IDS  = ['A5052835164', 'A5012059624', 'A5121841472'];
const SCHOLAR_ID  = 'Qfoe7u4AAAAJ';

/* O nome que a página destaca em negrito na lista de autores. */
const ME = 'Leal Neto, H. B.';
const ME_PATTERN = /(leal\s*neto|helvecio)/i;

if (!SERVICE_KEY) {
  console.error('Faltou SUPABASE_SERVICE_KEY no ambiente.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --- Normalização usada para casar registros ------------------------------ */
const normDoi = (d) => !d ? null
  : String(d).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');

const normTitle = (t) => String(t || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/* --- Supabase -------------------------------------------------------------- */
async function db(path, opts = {}) {
  const res = await fetch(REST + path, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {})
    }
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${body.slice(0, 200)}`);
  return body ? JSON.parse(body) : null;
}

/* --- OpenAlex: descoberta -------------------------------------------------- */
const OA_TYPE = {
  article: 'journal', review: 'journal',
  'conference-paper': 'conference', 'conference-abstract': 'conference',
  proceedings: 'conference', 'proceedings-article': 'conference',
  preprint: 'preprint', 'posted-content': 'preprint',
  dissertation: 'thesis', thesis: 'thesis',
  dataset: 'dataset'
};

async function openalexWorks() {
  const filters = [
    `author.orcid:https://orcid.org/${ORCID}`,
    `author.id:${AUTHOR_IDS.join('|')}`
  ];
  const seen = new Map();

  for (const filter of filters) {
    let cursor = '*';
    while (cursor) {
      const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}` +
                  `&per-page=100&cursor=${cursor}&mailto=${encodeURIComponent(MAILTO)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OpenAlex ${res.status} para ${filter}`);
      const page = await res.json();

      for (const w of page.results || []) {
        // paratext é errata, capa, sumário — não é produção do autor.
        if (!w.title || w.type === 'paratext') continue;
        const key = normDoi(w.doi) || normTitle(w.title);
        if (!seen.has(key)) seen.set(key, w);
      }
      cursor = page.meta?.next_cursor || null;
      await sleep(120);
    }
  }
  return [...seen.values()];
}

function toRow(w) {
  const authors = (w.authorships || [])
    .map((a) => a.author?.display_name)
    .filter(Boolean)
    .map((n) => (ME_PATTERN.test(n) ? ME : n));

  const venue = w.primary_location?.source?.display_name
    || (w.type === 'dissertation' ? 'Instituto Nacional de Pesquisas Espaciais (INPE)' : '')
    || '';

  return {
    year: w.publication_year,
    type: OA_TYPE[w.type] || 'preprint',
    title: w.title,
    authors,
    venue_pt: venue,
    venue_en: venue,
    doi: normDoi(w.doi),
    cites: w.cited_by_count || 0,
    external_id: w.id
  };
}

/* --- Citações -------------------------------------------------------------- */
async function semanticScholarCites(dois) {
  const out = new Map();
  const ids = dois.filter(Boolean).map((d) => 'DOI:' + d);
  if (!ids.length) return out;

  // O endpoint em lote aceita até 500 identificadores por chamada.
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    try {
      const res = await fetch('https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: batch })
      });
      if (!res.ok) { console.warn(`  Semantic Scholar respondeu ${res.status}; usando OpenAlex nesse lote.`); continue; }
      const rows = await res.json();
      rows.forEach((r, j) => {
        if (r && typeof r.citationCount === 'number') {
          out.set(batch[j].replace(/^DOI:/, ''), r.citationCount);
        }
      });
    } catch (err) {
      console.warn('  Semantic Scholar indisponível:', err.message);
    }
    await sleep(1200);
  }
  return out;
}

/* Google Scholar de verdade, via SerpApi. Só roda se houver chave. */
async function serpapiCites() {
  const out = new Map();
  if (!SERPAPI_KEY) return out;
  let start = 0;
  while (true) {
    const url = `https://serpapi.com/search.json?engine=google_scholar_author` +
                `&author_id=${SCHOLAR_ID}&num=100&start=${start}&api_key=${SERPAPI_KEY}`;
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  SerpApi respondeu ${res.status}; seguindo sem ela.`); break; }
    const data = await res.json();
    const arts = data.articles || [];
    arts.forEach((a) => {
      const n = Number(a.cited_by?.value);
      if (Number.isFinite(n)) out.set(normTitle(a.title), n);
    });
    if (arts.length < 100) break;
    start += 100;
    await sleep(800);
  }
  return out;
}

/* --- Principal ------------------------------------------------------------- */
(async () => {
  console.log(DRY ? '— simulação, nada será gravado —\n' : '');

  const existing = await db('/publications?select=id,title,doi,cites,source,external_id,sort_order');
  const byDoi = new Map(existing.filter((p) => p.doi).map((p) => [normDoi(p.doi), p]));
  const byTitle = new Map(existing.map((p) => [normTitle(p.title), p]));
  console.log(`no banco: ${existing.length} publicações`);

  const works = await openalexWorks();
  console.log(`OpenAlex: ${works.length} trabalhos encontrados`);

  const rows = works.map(toRow).filter((r) => r.year && r.title);

  // Contagens: SerpApi (Scholar real) > Semantic Scholar > OpenAlex.
  const scholar = await serpapiCites();
  const s2 = await semanticScholarCites(rows.map((r) => r.doi));
  if (scholar.size) console.log(`SerpApi: contagens do Google Scholar para ${scholar.size} artigos`);
  if (s2.size) console.log(`Semantic Scholar: contagens para ${s2.size} artigos`);

  const citesFor = (r) => {
    const fromScholar = scholar.get(normTitle(r.title));
    if (fromScholar !== undefined) return [fromScholar, 'google-scholar'];
    const fromS2 = r.doi ? s2.get(r.doi) : undefined;
    if (fromS2 !== undefined) return [fromS2, 'semantic-scholar'];
    return [r.cites, 'openalex'];
  };

  let inserted = 0, updated = 0, unchanged = 0;
  const now = new Date().toISOString();
  const maxOrder = existing.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0);

  for (const r of rows) {
    const match = (r.doi && byDoi.get(r.doi)) || byTitle.get(normTitle(r.title));
    const [cites, citesSource] = citesFor(r);

    if (match) {
      // Só as citações. O resto pode ter sido corrigido à mão no painel.
      if (match.cites === cites) { unchanged++; continue; }
      console.log(`  ↑ ${match.cites} → ${cites} (${citesSource})  ${r.title.slice(0, 58)}`);
      if (!DRY) {
        await db(`/publications?id=eq.${match.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ cites, cites_source: citesSource, synced_at: now })
        });
      }
      updated++;
    } else {
      console.log(`  + NOVA (${r.year})  ${r.title.slice(0, 62)}`);
      if (!DRY) {
        await db('/publications', {
          method: 'POST',
          body: JSON.stringify({
            ...r, cites, cites_source: citesSource,
            source: 'openalex', synced_at: now,
            sort_order: maxOrder + 1 + inserted
          })
        });
      }
      inserted++;
    }
  }

  console.log(`\n${inserted} nova(s), ${updated} atualizada(s), ${unchanged} sem mudança.`);
  if (inserted && !DRY) console.log('As novas entram no site marcadas como "openalex" — confira no painel.');
})().catch((err) => { console.error('falhou:', err.message); process.exit(1); });
