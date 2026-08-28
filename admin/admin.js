/* =============================================================================
   admin.js — painel de edição do portfólio

   Autenticação e autorização ficam inteiramente no Supabase: a senha é
   verificada pelo servidor (nunca comparada aqui) e as políticas de RLS só
   aceitam escrita de um e-mail cadastrado em `admins`. A chave publicável
   abaixo, sozinha, não escreve nada.
   ========================================================================== */

const SUPABASE_URL = 'https://qqbmrpckbmwgyhgbtpjo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1REUQdJZKqr8-qsdOk766w_prDmOvU5';

const AUTH = SUPABASE_URL + '/auth/v1';
const REST = SUPABASE_URL + '/rest/v1';
const SESSION_KEY = 'hbln-admin-session';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = { session: null, active: null, data: {}, dirty: new Set(), open: new Set(), filter: '' };

/* Corta um texto para caber na barra do registro, sem partir palavra ao meio. */
function trunc(s, n = 68) {
  const flat = String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (flat.length <= n) return flat;
  return flat.slice(0, flat.lastIndexOf(' ', n) || n) + '…';
}

/* =============================================================================
   Definição das coleções
   ========================================================================== */

const T = {
  text:   { label: 'Texto curto',  el: 'input' },
  area:   { label: 'Texto longo',  el: 'textarea' },
  tall:   { label: 'Texto longo',  el: 'textarea', tall: true },
  num:    { label: 'Número',       el: 'input', type: 'number' },
  url:    { label: 'Endereço',     el: 'input', type: 'url', mono: true },
  list:   { label: 'Lista',        el: 'textarea', list: true },
  bool:   { label: 'Sim/não',      el: 'check' },
  choice: { label: 'Escolha',      el: 'select' }
};

const PUB_TYPES = [
  ['journal',    'Artigo em periódico'],
  ['conference', 'Trabalho em conferência'],
  ['preprint',   'Preprint'],
  ['thesis',     'Tese ou dissertação'],
  ['dataset',    'Conjunto de dados']
];

const COLLECTIONS = {
  text: {
    table: 'site_text', pk: 'key', nav: 'Textos',
    title: 'Textos da página',
    intro: 'Todo texto visível do site, com as duas línguas lado a lado. As chaves estão ligadas à estrutura da página — por isso não é possível criar nem apagar linhas aqui.',
    noAdd: true, noDelete: true, noReorder: true, groupBy: 'section',
    titleOf: (r) => r.label || trunc(r.pt) || r.key,
    metaOf:  (r) => r.key,
    fields: [
      { k: 'pt', t: 'area', label: 'Português', lang: 'PT' },
      { k: 'en', t: 'area', label: 'English',   lang: 'EN' }
    ]
  },

  publications: {
    table: 'publications', pk: 'id', nav: 'Publicações',
    title: 'Publicações',
    intro: 'Os filtros por tipo, as contagens e as métricas do topo do site são calculados a partir desta lista. Escreva seu próprio nome exatamente como "Leal Neto, H. B." para que apareça em negrito.',
    titleOf: (r) => r.title || '(sem título)',
    metaOf:  (r) => `${r.year} · ${(PUB_TYPES.find((p) => p[0] === r.type) || [, r.type])[1]}`,
    blank: () => ({ year: new Date().getFullYear(), type: 'journal', title: '', authors: [], venue_pt: '', venue_en: '', doi: null, cites: 0 }),
    fields: [
      { k: 'title', t: 'area', label: 'Título' },
      { k: 'authors', t: 'list', label: 'Autores', help: 'Um por linha, na ordem da publicação. Ex.: Leal Neto, H. B.' },
      { row: [
        { k: 'year',  t: 'num', label: 'Ano' },
        { k: 'type',  t: 'choice', label: 'Tipo', options: PUB_TYPES },
        { k: 'cites', t: 'num', label: 'Citações' }
      ] },
      { k: 'venue_pt', t: 'text', label: 'Veículo (PT)', lang: 'PT', help: 'Revista, evento ou repositório. Ex.: Remote Sensing, 14(21), 5408' },
      { k: 'venue_en', t: 'text', label: 'Veículo (EN)', lang: 'EN' },
      { k: 'doi', t: 'url', label: 'DOI', help: 'Só o identificador, sem o https://doi.org/. Deixe vazio se não houver.' }
    ]
  },

  research_areas: {
    table: 'research_areas', pk: 'id', nav: 'Linhas de pesquisa',
    title: 'Linhas de pesquisa',
    intro: 'Os cartões numerados da seção Pesquisa. A numeração acompanha a ordem automaticamente.',
    titleOf: (r) => r.title_pt || '(sem título)',
    blank: () => ({ title_pt: '', title_en: '', body_pt: '', body_en: '' }),
    fields: [
      { pair: [
        { k: 'title_pt', t: 'text', label: 'Título', lang: 'PT' },
        { k: 'title_en', t: 'text', label: 'Title',  lang: 'EN' }
      ] },
      { pair: [
        { k: 'body_pt', t: 'area', label: 'Descrição', lang: 'PT' },
        { k: 'body_en', t: 'area', label: 'Description', lang: 'EN' }
      ] }
    ]
  },

  research_groups: {
    table: 'research_groups', pk: 'id', nav: 'Grupos de pesquisa',
    title: 'Grupos de pesquisa',
    intro: 'Grupos aos quais você é vinculado, exibidos logo abaixo das linhas de pesquisa.',
    titleOf: (r) => r.acronym || r.name_pt || '(sem nome)',
    blank: () => ({ acronym: '', name_pt: '', name_en: '', org_pt: '', org_en: '' }),
    fields: [
      { k: 'acronym', t: 'text', label: 'Sigla', help: 'Aparece em destaque à esquerda. Ex.: SInApSE' },
      { pair: [
        { k: 'name_pt', t: 'area', label: 'Nome do grupo', lang: 'PT' },
        { k: 'name_en', t: 'area', label: 'Group name',    lang: 'EN' }
      ] },
      { pair: [
        { k: 'org_pt', t: 'text', label: 'Instituição', lang: 'PT' },
        { k: 'org_en', t: 'text', label: 'Institution',  lang: 'EN' }
      ] }
    ]
  },

  courses: {
    table: 'courses', pk: 'id', nav: 'Disciplinas',
    title: 'Disciplinas',
    intro: 'Componentes curriculares exibidos na seção Ensino.',
    titleOf: (r) => r.title_pt || '(sem título)',
    metaOf:  (r) => r.code || '',
    blank: () => ({ code: '', hours: 60, url: null, title_pt: '', title_en: '', topics_pt: [], topics_en: [] }),
    fields: [
      { pair: [
        { k: 'title_pt', t: 'text', label: 'Nome da disciplina', lang: 'PT' },
        { k: 'title_en', t: 'text', label: 'Course name',        lang: 'EN' }
      ] },
      { row: [
        { k: 'code',  t: 'text', label: 'Código', help: 'Ex.: PC010027' },
        { k: 'hours', t: 'num',  label: 'Carga horária' },
        { k: 'url',   t: 'url',  label: 'Link do material' }
      ] },
      { pair: [
        { k: 'topics_pt', t: 'list', label: 'Tópicos', lang: 'PT', help: 'Um por linha.' },
        { k: 'topics_en', t: 'list', label: 'Topics',  lang: 'EN', help: 'Um por linha, na mesma ordem.' }
      ] }
    ]
  },

  software: {
    table: 'software', pk: 'id', nav: 'Software',
    title: 'Software científico',
    intro: 'Projetos exibidos na seção Software. O total de estrelas alimenta a métrica do topo do site.',
    titleOf: (r) => r.name || '(sem nome)',
    metaOf:  (r) => (r.featured ? 'destaque' : ''),
    blank: () => ({ name: '', stars: 0, repo: '', docs: null, featured: false, desc_pt: '', desc_en: '' }),
    fields: [
      { row: [
        { k: 'name',  t: 'text', label: 'Nome' },
        { k: 'stars', t: 'num',  label: 'Estrelas' },
        { k: 'repo',  t: 'url',  label: 'Repositório' }
      ] },
      { k: 'docs', t: 'url', label: 'Documentação', help: 'Opcional. Aceita link externo ou caminho interno, como /gp5.html' },
      { k: 'featured', t: 'bool', label: 'Exibir em destaque, ocupando a largura toda' },
      { pair: [
        { k: 'desc_pt', t: 'area', label: 'Descrição', lang: 'PT' },
        { k: 'desc_en', t: 'area', label: 'Description', lang: 'EN' }
      ] }
    ]
  },

  education: {
    table: 'education', pk: 'id', nav: 'Formação',
    title: 'Formação acadêmica',
    intro: 'A linha do tempo da seção Formação. O primeiro item recebe o marcador preenchido.',
    titleOf: (r) => r.degree_pt || '(sem título)',
    metaOf:  (r) => r.period_pt || '',
    blank: () => ({ period_pt: '', period_en: '', degree_pt: '', degree_en: '', institution_pt: '', institution_en: '', note_pt: '', note_en: '' }),
    fields: [
      { pair: [
        { k: 'period_pt', t: 'text', label: 'Período', lang: 'PT', help: 'Ex.: 2022 — 2026' },
        { k: 'period_en', t: 'text', label: 'Period',  lang: 'EN' }
      ] },
      { pair: [
        { k: 'degree_pt', t: 'text', label: 'Titulação', lang: 'PT' },
        { k: 'degree_en', t: 'text', label: 'Degree',    lang: 'EN' }
      ] },
      { pair: [
        { k: 'institution_pt', t: 'text', label: 'Instituição', lang: 'PT' },
        { k: 'institution_en', t: 'text', label: 'Institution', lang: 'EN' }
      ] },
      { pair: [
        { k: 'note_pt', t: 'area', label: 'Observação', lang: 'PT', help: 'Opcional. Ex.: título da tese.' },
        { k: 'note_en', t: 'area', label: 'Note',       lang: 'EN' }
      ] }
    ]
  },

  links: {
    table: 'links', pk: 'id', nav: 'Links de perfil',
    title: 'Links de perfil',
    intro: 'Os botões abaixo do seu nome, no topo do site.',
    titleOf: (r) => r.label || '(sem rótulo)',
    metaOf:  (r) => (r.visible ? '' : 'oculto'),
    blank: () => ({ icon: 'link', label: '', url: '', visible: true }),
    fields: [
      { row: [
        { k: 'label', t: 'text', label: 'Rótulo' },
        { k: 'icon',  t: 'choice', label: 'Ícone', options: [
          ['mail','E-mail'], ['orcid','ORCID'], ['scholar','Scholar'], ['lattes','Lattes'],
          ['github','GitHub'], ['linkedin','LinkedIn'], ['link','Genérico']
        ] },
        { k: 'visible', t: 'bool', label: 'Visível' }
      ] },
      { k: 'url', t: 'url', label: 'Endereço' }
    ]
  }
};

/* =============================================================================
   Sessão
   ========================================================================== */

function saveSession(s) {
  state.session = s;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* modo privado */ }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) state.session = JSON.parse(raw);
  } catch (e) { state.session = null; }
}

function clearSession() {
  state.session = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* modo privado */ }
}

async function refreshIfNeeded() {
  const s = state.session;
  if (!s) throw new Error('sem sessão');
  // Renova com um minuto de folga para não perder uma requisição na virada.
  if (s.expires_at && Date.now() / 1000 < s.expires_at - 60) return;

  const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token })
  });
  if (!res.ok) { clearSession(); throw new Error('sessão expirada'); }
  saveSession(await res.json());
}

async function signIn(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Não foi possível entrar.');
  saveSession(data);
}

/* =============================================================================
   Acesso ao banco
   ========================================================================== */

async function db(path, opts = {}) {
  await refreshIfNeeded();
  const res = await fetch(REST + path, {
    ...opts,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + state.session.access_token,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(body?.message || `Erro ${res.status}`);
  }
  return body;
}

async function loadCollection(name) {
  const c = COLLECTIONS[name];
  state.data[name] = await db(`/${c.table}?select=*&order=sort_order.asc`);
  tag(state.data[name]);
}

async function loadAll() {
  await Promise.all(Object.keys(COLLECTIONS).map((n) => loadCollection(n)));
}

/* =============================================================================
   Interface
   ========================================================================== */

function toast(msg, kind = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast is-on' + (kind === 'err' ? ' toast--err' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function fieldHTML(f, rec) {
  const id = `f-${f.k}-${rec.__uid}`;
  const raw = rec[f.k];
  const val = f.t === 'list' ? (raw || []).join('\n') : (raw ?? '');
  const spec = T[f.t];
  const flag = f.lang ? `<span class="flag${f.lang === 'EN' ? ' flag--en' : ''}">${f.lang}</span>` : '';
  const help = f.help ? `<span class="help">${esc(f.help)}</span>` : '';

  if (spec.el === 'check') {
    return `<div class="check">
      <input type="checkbox" id="${id}" data-k="${f.k}" data-t="${f.t}" ${raw ? 'checked' : ''}>
      <label for="${id}">${esc(f.label)}</label>
    </div>`;
  }

  let control;
  if (spec.el === 'select') {
    const opts = f.options.map(([v, l]) =>
      `<option value="${esc(v)}"${String(raw) === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
    control = `<select id="${id}" data-k="${f.k}" data-t="${f.t}">${opts}</select>`;
  } else if (spec.el === 'textarea') {
    control = `<textarea id="${id}" data-k="${f.k}" data-t="${f.t}"${spec.tall ? ' class="tall"' : ''}>${esc(val)}</textarea>`;
  } else {
    control = `<input id="${id}" data-k="${f.k}" data-t="${f.t}" type="${spec.type || 'text'}" value="${esc(val)}">`;
  }

  return `<div class="fld${spec.mono ? ' fld--mono' : ''}">
    <label for="${id}">${esc(f.label)} ${flag}</label>
    ${control}${help}
  </div>`;
}

function fieldsHTML(c, rec) {
  return c.fields.map((f) => {
    if (f.pair) return `<div class="pair">${f.pair.map((x) => fieldHTML(x, rec)).join('')}</div>`;
    if (f.row)  return `<div class="row3">${f.row.map((x) => fieldHTML(x, rec)).join('')}</div>`;
    return fieldHTML(f, rec);
  }).join('');
}

function recordHTML(c, rec, i, total) {
  const open = state.open.has(rec.__uid);
  const dirty = state.dirty.has(rec.__uid);
  const meta = c.metaOf ? c.metaOf(rec) : '';
  return `
    <article class="rec${open ? ' rec--open' : ''}${dirty ? ' rec--dirty' : ''}" data-uid="${rec.__uid}">
      <button class="rec__bar" type="button" data-act="toggle">
        <span class="rec__caret"></span>
        <span class="rec__title">${esc(c.titleOf(rec))}</span>
        ${meta ? `<span class="rec__meta">${esc(meta)}</span>` : ''}
        ${dirty ? '<span class="rec__flag">não salvo</span>' : ''}
      </button>
      <div class="rec__body">
        ${fieldsHTML(c, rec)}
        <div class="rec__actions">
          ${c.noReorder ? '' : `
            <button class="move" type="button" data-act="up"   ${i === 0 ? 'disabled' : ''} title="Subir">&#9650;</button>
            <button class="move" type="button" data-act="down" ${i === total - 1 ? 'disabled' : ''} title="Descer">&#9660;</button>`}
          <span class="spacer"></span>
          ${c.noDelete ? '' : '<button class="btn btn--sm btn--danger" type="button" data-act="delete">Apagar</button>'}
          <button class="btn btn--sm" type="button" data-act="save">Salvar</button>
        </div>
      </div>
    </article>`;
}

function render() {
  const name = state.active;
  const c = COLLECTIONS[name];
  const rows = state.data[name] || [];

  $('#view-title').textContent = c.title;
  $('#view-intro').textContent = c.intro;
  $('#btn-add').hidden = !!c.noAdd;

  const q = state.filter.trim().toLowerCase();
  const shown = q
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
    : rows;

  const host = $('#records');
  if (!shown.length) {
    host.innerHTML = `<p class="empty">${q ? 'Nada encontrado para essa busca.' : 'Nenhum item ainda.'}</p>`;
  } else if (c.groupBy) {
    const groups = {};
    shown.forEach((r) => { (groups[r[c.groupBy] || 'Geral'] ||= []).push(r); });
    host.innerHTML = Object.entries(groups).map(([g, items]) =>
      `<h3 class="group-head">${esc(g)}</h3>` +
      items.map((r) => recordHTML(c, r, rows.indexOf(r), rows.length)).join('')
    ).join('');
  } else {
    host.innerHTML = shown.map((r) => recordHTML(c, r, rows.indexOf(r), rows.length)).join('');
  }

  $$('#side-nav button').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.col === name));
    const n = (state.data[b.dataset.col] || []).length;
    const badge = $('.count', b);
    if (badge) badge.textContent = n || '';
  });
}

/* --- Leitura dos campos de volta para o registro -------------------------- */
function collectInto(rec, el) {
  $$('[data-k]', el).forEach((input) => {
    const k = input.dataset.k, t = input.dataset.t;
    if (t === 'bool')      rec[k] = input.checked;
    else if (t === 'list') rec[k] = input.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else if (t === 'num')  rec[k] = input.value === '' ? 0 : Number(input.value);
    else                   rec[k] = input.value.trim() === '' ? (k === 'doi' || k === 'url' || k === 'docs' || k === 'code' ? null : '') : input.value;
  });
}

/* --- Gravação ------------------------------------------------------------- */
function payloadOf(c, rec) {
  const out = {};
  const walk = (f) => {
    if (f.pair) return f.pair.forEach(walk);
    if (f.row)  return f.row.forEach(walk);
    out[f.k] = rec[f.k];
  };
  c.fields.forEach(walk);
  return out;
}

async function saveRecord(uid) {
  const c = COLLECTIONS[state.active];
  const rows = state.data[state.active];
  const rec = rows.find((r) => r.__uid === uid);
  const el = $(`.rec[data-uid="${uid}"]`);
  collectInto(rec, el);

  const body = payloadOf(c, rec);

  if (rec.__new) {
    body.sort_order = rows.length ? Math.max(...rows.map((r) => r.sort_order ?? 0)) + 1 : 0;
    const [saved] = await db(`/${c.table}`, { method: 'POST', body: JSON.stringify(body) });
    Object.assign(rec, saved);
    delete rec.__new;
  } else {
    await db(`/${c.table}?${c.pk}=eq.${encodeURIComponent(rec[c.pk])}`,
      { method: 'PATCH', body: JSON.stringify(body) });
  }
  state.dirty.delete(uid);
}

async function swapOrder(uid, dir) {
  const c = COLLECTIONS[state.active];
  const rows = state.data[state.active];
  const i = rows.findIndex((r) => r.__uid === uid);
  const j = i + dir;
  if (j < 0 || j >= rows.length) return;

  const a = rows[i], b = rows[j];
  const ao = a.sort_order ?? i, bo = b.sort_order ?? j;
  a.sort_order = bo; b.sort_order = ao;
  rows[i] = b; rows[j] = a;

  await Promise.all([
    db(`/${c.table}?${c.pk}=eq.${encodeURIComponent(a[c.pk])}`, { method: 'PATCH', body: JSON.stringify({ sort_order: a.sort_order }) }),
    db(`/${c.table}?${c.pk}=eq.${encodeURIComponent(b[c.pk])}`, { method: 'PATCH', body: JSON.stringify({ sort_order: b.sort_order }) })
  ]);
}

/* =============================================================================
   Eventos
   ========================================================================== */

let uidSeq = 0;
const tag = (rows) => rows.map((r) => Object.assign(r, { __uid: 'u' + (++uidSeq) }));

async function openCollection(name) {
  if (state.dirty.size && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
  state.active = name;
  state.dirty.clear();
  state.open.clear();
  state.filter = '';
  $('#search').value = '';
  if (!state.data[name]) {
    $('#records').innerHTML = '<p class="empty">Carregando…</p>';
    render();
    try {
      await loadCollection(name);
    } catch (err) {
      $('#records').innerHTML = `<p class="empty">${esc(err.message)}</p>`;
      if (/sessão/.test(err.message)) showLogin();
      return;
    }
  }
  render();
}

function wireApp() {
  $('#side-nav').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-col]');
    if (b) openCollection(b.dataset.col);
  });

  $('#search').addEventListener('input', (ev) => {
    state.filter = ev.target.value;
    render();
  });

  $('#btn-add').addEventListener('click', () => {
    const c = COLLECTIONS[state.active];
    const rec = Object.assign(c.blank(), { __uid: 'u' + (++uidSeq), __new: true, sort_order: 9999 });
    state.data[state.active].push(rec);
    state.open.add(rec.__uid);
    state.dirty.add(rec.__uid);
    render();
    $(`.rec[data-uid="${rec.__uid}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  $('#records').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.rec');
    const uid = card.dataset.uid;
    const act = btn.dataset.act;

    if (act === 'toggle') {
      state.open.has(uid) ? state.open.delete(uid) : state.open.add(uid);
      card.classList.toggle('rec--open');
      return;
    }

    if (act === 'save') {
      btn.disabled = true;
      const label = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await saveRecord(uid);
        toast('Salvo.');
        render();
      } catch (err) {
        toast(err.message, 'err');
        btn.disabled = false;
        btn.textContent = label;
      }
      return;
    }

    if (act === 'delete') {
      const c = COLLECTIONS[state.active];
      const rows = state.data[state.active];
      const rec = rows.find((r) => r.__uid === uid);
      if (!confirm(`Apagar "${c.titleOf(rec)}"? Isso não pode ser desfeito.`)) return;
      try {
        if (!rec.__new) {
          await db(`/${c.table}?${c.pk}=eq.${encodeURIComponent(rec[c.pk])}`, { method: 'DELETE' });
        }
        rows.splice(rows.indexOf(rec), 1);
        state.dirty.delete(uid);
        toast('Apagado.');
        render();
      } catch (err) { toast(err.message, 'err'); }
      return;
    }

    if (act === 'up' || act === 'down') {
      try {
        await swapOrder(uid, act === 'up' ? -1 : 1);
        render();
      } catch (err) { toast(err.message, 'err'); }
    }
  });

  // Marca o registro como não salvo assim que algo muda.
  $('#records').addEventListener('input', (ev) => {
    const card = ev.target.closest('.rec');
    if (!card || !ev.target.dataset.k) return;
    if (!state.dirty.has(card.dataset.uid)) {
      state.dirty.add(card.dataset.uid);
      card.classList.add('rec--dirty');
      const bar = $('.rec__bar', card);
      if (!$('.rec__flag', bar)) {
        bar.insertAdjacentHTML('beforeend', '<span class="rec__flag">não salvo</span>');
      }
    }
  });

  // Ctrl/Cmd+S salva o registro em foco.
  document.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 's') {
      const card = document.activeElement?.closest?.('.rec');
      if (card) { ev.preventDefault(); $('[data-act="save"]', card)?.click(); }
    }
  });

  window.addEventListener('beforeunload', (ev) => {
    if (state.dirty.size) { ev.preventDefault(); ev.returnValue = ''; }
  });

  $('#btn-logout').addEventListener('click', () => {
    if (state.dirty.size && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    clearSession();
    location.reload();
  });
}

/* =============================================================================
   Login / boot
   ========================================================================== */

function showLogin(msg) {
  $('#login').hidden = false;
  $('#app').hidden = true;
  if (msg) { const e = $('#login-error'); e.textContent = msg; e.hidden = false; }
}

function showApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#side-user').textContent = state.session?.user?.email || '';
}

function wireLogin() {
  $('#login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = $('#login-btn');
    const err = $('#login-error');
    err.hidden = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await signIn($('#login-email').value.trim(), $('#login-pass').value);
      showApp();
      await loadAll();
      await openCollection('text');
    } catch (e) {
      err.textContent = /Invalid login/i.test(e.message)
        ? 'E-mail ou senha incorretos.' : e.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Menu lateral montado a partir da definição das coleções.
  $('#side-nav').innerHTML = Object.entries(COLLECTIONS).map(([k, c]) =>
    `<button type="button" data-col="${k}">${esc(c.nav)}<span class="count"></span></button>`).join('');

  wireLogin();
  wireApp();
  loadSession();

  if (state.session) {
    try {
      await refreshIfNeeded();
      showApp();
      await loadAll();
      await openCollection('text');
    } catch (e) {
      showLogin();
    }
  } else {
    showLogin();
  }
});
