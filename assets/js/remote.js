/* =============================================================================
   remote.js — carrega o conteúdo editável do Supabase

   O site nunca depende da rede para exibir algo: content.js já traz uma cópia
   completa do conteúdo, renderizada de imediato. Este módulo busca a versão
   viva do banco e, se conseguir, substitui os dados e redesenha. Se o Supabase
   estiver fora do ar, pausado ou bloqueado, a página simplesmente continua
   mostrando a cópia embutida.

   A chave abaixo é publicável por definição: só concede leitura, porque as
   políticas de RLS exigem um e-mail cadastrado em `admins` para qualquer
   escrita. Ela pode ficar no código do cliente sem risco.
   ========================================================================== */

const SUPABASE_URL = 'https://qqbmrpckbmwgyhgbtpjo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1REUQdJZKqr8-qsdOk766w_prDmOvU5';

const REST = SUPABASE_URL + '/rest/v1';

async function fetchTable(table, query = 'select=*&order=sort_order.asc') {
  const res = await fetch(`${REST}/${table}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

/* Substitui o conteúdo de um array const, no lugar, preservando a referência
   que os renderizadores já capturaram. */
function refill(target, rows) {
  target.splice(0, target.length, ...rows);
}

function applyRemote(data) {
  const { text, areas, groups, pubs, courses, software, education, links } = data;

  // --- textos --------------------------------------------------------------
  text.forEach((row) => {
    if (typeof row.pt === 'string') I18N.pt[row.key] = row.pt;
    if (typeof row.en === 'string') I18N.en[row.key] = row.en;
  });

  // --- linhas de pesquisa ---------------------------------------------------
  refill(RESEARCH_AREAS, areas.map((a, i) => {
    const key = `research.remote${i}`;
    I18N.pt[key + '.t'] = a.title_pt; I18N.en[key + '.t'] = a.title_en;
    I18N.pt[key + '.d'] = a.body_pt;  I18N.en[key + '.d'] = a.body_en;
    return key;
  }));

  // --- grupos de pesquisa ---------------------------------------------------
  refill(RESEARCH_GROUPS, groups.map((g, i) => {
    const key = `group.remote${i}`;
    I18N.pt[key + '.n'] = g.name_pt; I18N.en[key + '.n'] = g.name_en;
    I18N.pt[key + '.d'] = g.org_pt;  I18N.en[key + '.d'] = g.org_en;
    return { acronym: g.acronym, key, logo: g.logo_url || null, site: g.site_url || null };
  }));

  // --- publicações ----------------------------------------------------------
  refill(PUBLICATIONS, pubs.map((p, i) => {
    const key = `pub.remote${i}.venue`;
    I18N.pt[key] = p.venue_pt || '';
    I18N.en[key] = p.venue_en || p.venue_pt || '';
    return {
      year: p.year, type: p.type, title: p.title,
      authors: p.authors || [], venue: p.venue_pt || '', venueKey: key,
      doi: p.doi, url: p.url || null, cites: p.cites || 0
    };
  }));

  // --- disciplinas ----------------------------------------------------------
  refill(COURSES, courses.map((c, i) => {
    const key = `course.remote${i}`;
    I18N.pt[key + '.t'] = c.title_pt;  I18N.en[key + '.t'] = c.title_en;
    I18N.pt[key + '.u'] = c.topics_pt || []; I18N.en[key + '.u'] = c.topics_en || [];
    return { key, code: c.code, hours: c.hours, url: c.url };
  }));

  // --- software -------------------------------------------------------------
  refill(SOFTWARE, software.map((s, i) => {
    const key = `soft.remote${i}`;
    I18N.pt[key + '.d'] = s.desc_pt; I18N.en[key + '.d'] = s.desc_en;
    return { key, name: s.name, stars: s.stars, repo: s.repo, docs: s.docs, featured: s.featured };
  }));

  // --- formação -------------------------------------------------------------
  refill(EDUCATION, education.map((e, i) => {
    const key = `edu.remote${i}`;
    I18N.pt[key + '.w'] = e.period_pt;      I18N.en[key + '.w'] = e.period_en;
    I18N.pt[key + '.t'] = e.degree_pt;      I18N.en[key + '.t'] = e.degree_en;
    I18N.pt[key + '.i'] = e.institution_pt; I18N.en[key + '.i'] = e.institution_en;
    I18N.pt[key + '.n'] = e.note_pt;        I18N.en[key + '.n'] = e.note_en;
    I18N.pt[key + '.l'] = e.url || '';      I18N.en[key + '.l'] = e.url || '';
    return key;
  }));

  // --- links ----------------------------------------------------------------
  refill(LINKS, links.filter((l) => l.visible)
    .map((l) => ({ icon: l.icon, label: l.label, url: l.url })));
}

/* -----------------------------------------------------------------------------
   Cópia local da última versão vinda do banco

   content.js é gerado no momento do deploy e envelhece a cada edição feita no
   painel: até a próxima sincronização, a página pisca o conteúdo antigo antes
   de o banco responder. Guardar aqui o último conteúdo que o banco entregou faz
   a visita seguinte já abrir com ele, e não com o arquivo do deploy — e serve
   de reserva melhor que o arquivo se o Supabase estiver fora do ar.
   -------------------------------------------------------------------------- */
const CACHE_KEY = 'hbln-content';
const CACHE_MAX = 1.5 * 1024 * 1024;

function saveCache(data) {
  try {
    const raw = JSON.stringify({ at: Date.now(), data });
    if (raw.length <= CACHE_MAX) localStorage.setItem(CACHE_KEY, raw);
  } catch (e) { /* modo privado ou cota estourada */ }
}

/* Aplicada antes do primeiro desenho, então precisa ser síncrona e nunca
   derrubar a página: qualquer defeito na cópia guardada cai no content.js. */
function applyCachedContent() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { data } = JSON.parse(raw);
    if (!data || !Array.isArray(data.text) || !data.text.length) return false;
    applyRemote(data);
    return true;
  } catch (e) {
    try { localStorage.removeItem(CACHE_KEY); } catch (e2) { /* ignora */ }
    return false;
  }
}

async function loadRemoteContent() {
  const [text, areas, groups, pubs, courses, software, education, links] =
    await Promise.all([
      fetchTable('site_text', 'select=key,pt,en'),
      fetchTable('research_areas'),
      fetchTable('research_groups'),
      fetchTable('publications'),
      fetchTable('courses'),
      fetchTable('software'),
      fetchTable('education'),
      fetchTable('links')
    ]);

  // Um banco recém-criado e vazio não deve apagar a página.
  if (!text.length && !pubs.length) throw new Error('conteúdo remoto vazio');

  const data = { text, areas, groups, pubs, courses, software, education, links };
  applyRemote(data);
  saveCache(data);
}
