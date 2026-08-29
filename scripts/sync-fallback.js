#!/usr/bin/env node
/* =============================================================================
   sync-fallback.js — regenera assets/js/content.js a partir do Supabase

   content.js é a cópia de reserva que o site mostra quando o banco está fora do
   ar ou pausado. Ela não se atualiza sozinha: rode este script de tempos em
   tempos (e sempre antes de um commit importante) para que a reserva reflita o
   que você editou no painel.

       node scripts/sync-fallback.js

   Usa apenas a chave publicável — só lê.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const URL = 'https://qqbmrpckbmwgyhgbtpjo.supabase.co/rest/v1';
const KEY = 'sb_publishable_1REUQdJZKqr8-qsdOk766w_prDmOvU5';

const get = async (table, query = 'select=*&order=sort_order.asc') => {
  const res = await fetch(`${URL}/${table}?${query}`, { headers: { apikey: KEY } });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
};

const js = (v) => JSON.stringify(v, null, 0);
const str = (v) => JSON.stringify(v ?? '');

(async () => {
  const [text, areas, groups, pubs, courses, software, education, links] =
    await Promise.all([
      get('site_text', 'select=key,pt,en&order=sort_order.asc'),
      get('research_areas'), get('research_groups'), get('publications'),
      get('courses'), get('software'), get('education'), get('links')
    ]);

  const pt = {}, en = {};
  text.forEach((r) => { pt[r.key] = r.pt; en[r.key] = r.en; });

  const areaKeys = areas.map((a, i) => {
    const k = `research.a${i + 1}`;
    pt[k + '.t'] = a.title_pt; en[k + '.t'] = a.title_en;
    pt[k + '.d'] = a.body_pt;  en[k + '.d'] = a.body_en;
    return k;
  });

  const groupList = groups.map((g, i) => {
    const k = `research.g${i + 1}`;
    pt[k + '.n'] = g.name_pt; en[k + '.n'] = g.name_en;
    pt[k + '.d'] = g.org_pt;  en[k + '.d'] = g.org_en;
    return { acronym: g.acronym, key: k, logo: g.logo_url || null, site: g.site_url || null };
  });

  const pubList = pubs.map((p, i) => {
    const k = `pub.v${i}`;
    pt[k] = p.venue_pt || ''; en[k] = p.venue_en || p.venue_pt || '';
    return { year: p.year, type: p.type, title: p.title, authors: p.authors || [],
             venue: p.venue_pt || '', venueKey: k, doi: p.doi, url: p.url || null,
             cites: p.cites || 0 };
  });

  const courseList = courses.map((c, i) => {
    const k = `c${i + 1}`;
    pt[k + '.t'] = c.title_pt;  en[k + '.t'] = c.title_en;
    pt[k + '.u'] = c.topics_pt || []; en[k + '.u'] = c.topics_en || [];
    return { key: k, code: c.code, hours: c.hours, url: c.url };
  });

  const softList = software.map((s, i) => {
    const k = `soft.s${i + 1}`;
    pt[k + '.d'] = s.desc_pt; en[k + '.d'] = s.desc_en;
    return { key: k, name: s.name, stars: s.stars, repo: s.repo, docs: s.docs, featured: s.featured };
  });

  const eduKeys = education.map((e, i) => {
    const k = `edu.e${i + 1}`;
    pt[k + '.w'] = e.period_pt;      en[k + '.w'] = e.period_en;
    pt[k + '.t'] = e.degree_pt;      en[k + '.t'] = e.degree_en;
    pt[k + '.i'] = e.institution_pt; en[k + '.i'] = e.institution_en;
    pt[k + '.n'] = e.note_pt;        en[k + '.n'] = e.note_en;
    return k;
  });

  const linkList = links.filter((l) => l.visible)
    .map((l) => ({ icon: l.icon, label: l.label, url: l.url }));

  const stamp = new Date().toISOString().slice(0, 10);
  const out = `/* =============================================================================
   content.js — cópia de reserva do conteúdo (pt-BR / en)

   GERADO AUTOMATICAMENTE por scripts/sync-fallback.js em ${stamp}.
   Não edite à mão: use o painel em /admin e rode o script de novo.

   O site lê o conteúdo vivo do Supabase; este arquivo é o que ele exibe se o
   banco estiver indisponível ou pausado.
   ========================================================================== */

const I18N = {
  pt: ${js(pt)},
  en: ${js(en)}
};

const ME = ${str('Leal Neto, H. B.')};

const PUBLICATIONS = ${js(pubList)};

const COURSES = ${js(courseList)};

const SOFTWARE = ${js(softList)};

const RESEARCH_GROUPS = ${js(groupList)};

const LINKS = ${js(linkList)};

const EDUCATION = ${js(eduKeys)};

const RESEARCH_AREAS = ${js(areaKeys)};
`;

  const dest = path.join(__dirname, '..', 'assets', 'js', 'content.js');
  fs.writeFileSync(dest, out);
  console.log(`content.js regenerado — ${text.length} textos, ${pubs.length} publicações, ` +
              `${courses.length} disciplinas, ${software.length} projetos.`);
})().catch((err) => { console.error('falhou:', err.message); process.exit(1); });
