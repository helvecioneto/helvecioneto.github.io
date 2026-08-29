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
  choice: { label: 'Escolha',      el: 'select' },
  image:  { label: 'Imagem',       el: 'image' }
};

const STORAGE = SUPABASE_URL + '/storage/v1/object';
const PUBLIC_MEDIA = STORAGE + '/public/media/';

/* Nome de arquivo previsível e sem acentos: o caminho vira URL pública. */
function mediaPath(file) {
  const ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
  return `${base || 'imagem'}-${Date.now().toString(36)}${ext}`;
}

async function uploadImage(file) {
  if (file.size > 2 * 1024 * 1024) throw new Error('A imagem passa de 2 MB.');
  await refreshIfNeeded();
  const path = mediaPath(file);
  const res = await fetch(`${STORAGE}/media/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + state.session.access_token,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: file
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Falha no envio (${res.status}).`);
  }
  return PUBLIC_MEDIA + path;
}

const PUB_TYPES = [
  ['journal',    'Artigo em periódico'],
  ['conference', 'Trabalho em conferência'],
  ['preprint',   'Preprint'],
  ['thesis',     'Tese ou dissertação'],
  ['dataset',    'Conjunto de dados']
];

const COLLECTIONS = {
  text: {
    table: 'site_text', pk: 'key',
    noAdd: true, noDelete: true, noReorder: true,
    titleOf: (r) => r.label || trunc(r.pt) || r.key,
    metaOf:  (r) => r.key,
    fields: [
      { k: 'pt', t: 'area', label: 'Português', lang: 'PT' },
      { k: 'en', t: 'area', label: 'English',   lang: 'EN' }
    ]
  },

  publications: {
    table: 'publications', pk: 'id',
    title: 'Publicações',
    intro: 'Os filtros por tipo, as contagens e as métricas do topo do site são calculados a partir desta lista. Escreva seu próprio nome exatamente como "Leal Neto, H. B." para que apareça em negrito.',
    titleOf: (r) => r.title || '(sem título)',
    metaOf:  (r) => {
      const tipo = (PUB_TYPES.find((p) => p[0] === r.type) || [, r.type])[1];
      // Marca o que entrou pela sincronização semanal, para se distinguir do que
      // você cadastrou à mão.
      const auto = r.source === 'openalex' ? ' · importada' : '';
      return `${r.year} · ${tipo}${auto}`;
    },
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
      { k: 'doi', t: 'url', label: 'DOI', help: 'Só o identificador, sem o https://doi.org/. Deixe vazio se não houver.' },
      { k: 'url', t: 'url', label: 'Link do título', help: 'Opcional. Endereço completo para onde o título aponta — repositório, PDF. Preenchido, tem precedência sobre o DOI.' }
    ]
  },

  research_areas: {
    table: 'research_areas', pk: 'id',
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
    table: 'research_groups', pk: 'id',
    title: 'Grupos de pesquisa',
    intro: 'Grupos aos quais você é vinculado, exibidos logo abaixo das linhas de pesquisa.',
    titleOf: (r) => r.name_pt || r.acronym || '(sem nome)',
    metaOf:  (r) => [r.acronym, r.logo_url ? 'com logo' : null].filter(Boolean).join(' · '),
    blank: () => ({ acronym: '', name_pt: '', name_en: '', org_pt: '', org_en: '', logo_url: null, site_url: null }),
    fields: [
      { k: 'logo_url', t: 'image', label: 'Logo do grupo', help: 'PNG, JPG, WebP ou SVG, até 2 MB. Sem logo, a sigla aparece no lugar.' },
      { pair: [
        { k: 'acronym',  t: 'text', label: 'Sigla', help: 'Usada quando não há logo. Ex.: SInApSE' },
        { k: 'site_url', t: 'url',  label: 'Site do grupo', help: 'Opcional. Com ele, o nome do grupo vira link.' }
      ] },
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
    table: 'courses', pk: 'id',
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
    table: 'software', pk: 'id',
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
    table: 'education', pk: 'id',
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
      ] },
      { k: 'url', t: 'url', label: 'Link da observação', help: 'Opcional. Com ele, a observação vira link — por exemplo, para a tese no repositório.' }
    ]
  },

  links: {
    table: 'links', pk: 'id',
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
   Seções do painel

   A navegação segue exatamente a ordem das seções da página pública, para que
   editar seja procurar pelo mesmo nome que se vê no site. Cada seção reúne
   blocos: trechos de texto e, quando existem, as fichas daquela seção.
   ========================================================================== */

const SECTIONS = [
  {
    id: 'perfil', nav: 'Perfil',
    intro: 'Seu nome, cargo e unidade no topo da página, a biografia e o quadro lateral com o resumo.',
    blocks: [
      { kind: 'text', label: 'Topo da página', from: ['Topo'] },
      { kind: 'rec',  label: 'Links de perfil', col: 'links' },
      { kind: 'text', label: 'Perfil acadêmico', from: ['Perfil'] }
    ]
  },
  {
    id: 'pesquisa', nav: 'Pesquisa',
    intro: 'Os cartões de linhas de pesquisa e os grupos aos quais você é vinculado.',
    blocks: [
      { kind: 'text', label: 'Cabeçalho da seção', from: ['Pesquisa'] },
      { kind: 'rec',  label: 'Linhas de pesquisa', col: 'research_areas' },
      { kind: 'rec',  label: 'Grupos de pesquisa', col: 'research_groups' }
    ]
  },
  {
    id: 'publicacoes', nav: 'Publicações',
    intro: 'Sua produção científica. Toda segunda-feira uma rotina busca trabalhos novos e atualiza as citações; o que ela traz vem marcado como "importada". Suas edições de título, veículo e autores nunca são sobrescritas.',
    blocks: [
      { kind: 'rec',  label: 'Publicações', col: 'publications' },
      { kind: 'text', label: 'Cabeçalho e rótulos dos filtros', from: ['Publicações'] }
    ]
  },
  {
    id: 'ensino', nav: 'Ensino',
    intro: 'As disciplinas que você ministra, com código, carga horária e tópicos.',
    blocks: [
      { kind: 'rec',  label: 'Disciplinas', col: 'courses' },
      { kind: 'text', label: 'Cabeçalho da seção', from: ['Ensino'] }
    ]
  },
  {
    id: 'produtos', nav: 'Produtos',
    intro: 'Bibliotecas, ferramentas e demais produtos que você desenvolve e mantém.',
    blocks: [
      { kind: 'rec',  label: 'Produtos', col: 'software' },
      { kind: 'text', label: 'Cabeçalho da seção', from: ['Produtos'] }
    ]
  },
  {
    id: 'formacao', nav: 'Formação',
    intro: 'A linha do tempo da sua formação acadêmica. O item mais acima recebe o marcador preenchido.',
    blocks: [
      { kind: 'rec',  label: 'Formação', col: 'education' },
      { kind: 'text', label: 'Cabeçalho da seção', from: ['Formação'] }
    ]
  },
  {
    id: 'contato', nav: 'Contato',
    intro: 'Seus dados de contato e todos os rótulos do formulário, incluindo os motivos e as mensagens de erro.',
    blocks: [
      { kind: 'text', label: 'Dados de contato', from: ['Contato'] },
      { kind: 'text', label: 'Agendamento de reuniões (Google Calendar)', from: ['Agendamento'] },
      { kind: 'text', label: 'Formulário', from: ['Formulário'] }
    ]
  },
  {
    id: 'geral', nav: 'Geral',
    intro: 'O que não pertence a uma seção só: título da aba do navegador, descrição para buscadores, nomes do menu e rodapé.',
    blocks: [
      { kind: 'text', label: 'Buscadores e aba do navegador', from: ['Metadados'] },
      { kind: 'text', label: 'Menu de navegação', from: ['Navegação', 'Geral'] },
      { kind: 'text', label: 'Rodapé', from: ['Rodapé'] }
    ]
  }
];

const sectionById = (id) => SECTIONS.find((s) => s.id === id);

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
  tag(state.data[name], name);
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

  if (spec.el === 'image') {
    const prev = raw
      ? `<img src="${esc(raw)}" alt="">`
      : '<span>sem<br>imagem</span>';
    return `<div class="fld fld--img">
      <label for="${id}">${esc(f.label)} ${flag}</label>
      <div class="img-row">
        <div class="img-prev" data-prev="${f.k}">${prev}</div>
        <div class="img-side">
          <input id="${id}" data-k="${f.k}" data-t="${f.t}" type="url"
                 placeholder="Envie um arquivo ou cole um endereço" value="${esc(val)}">
          <div class="img-btns">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                   id="up-${id}" data-upload="${f.k}" hidden>
            <button class="btn btn--sm btn--quiet" type="button" data-pick="up-${id}">Enviar imagem</button>
            <button class="btn btn--sm btn--quiet" type="button" data-clear="${f.k}"${raw ? '' : ' disabled'}>Remover</button>
          </div>
          ${help}
        </div>
      </div>
    </div>`;
  }

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

function blockRecordsHTML(block, q) {
  const col = block.kind === 'text' ? 'text' : block.col;
  const c = COLLECTIONS[col];
  const all = state.data[col] || [];

  const inBlock = block.kind === 'text'
    ? all.filter((r) => block.from.includes(r.section))
    : all;

  const shown = q ? inBlock.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : inBlock;

  const addBtn = c.noAdd ? '' :
    `<button class="btn btn--sm btn--quiet" type="button" data-add="${col}">Adicionar</button>`;

  const body = shown.length
    ? shown.map((r) => recordHTML(c, r, inBlock.indexOf(r), inBlock.length)).join('')
    : `<p class="empty">${q ? 'Nada encontrado aqui.' : 'Nenhum item ainda.'}</p>`;

  return `<section class="block">
    <header class="block__head">
      <h3>${esc(block.label)}</h3>
      <span class="block__n">${shown.length}${q && shown.length !== inBlock.length ? ` de ${inBlock.length}` : ''}</span>
      <span class="spacer"></span>
      ${addBtn}
    </header>
    ${body}
  </section>`;
}

function render() {
  const sec = sectionById(state.active);
  if (!sec) return;

  $('#view-title').textContent = sec.nav;
  $('#view-intro').textContent = sec.intro;

  const q = state.filter.trim().toLowerCase();
  $('#records').innerHTML = sec.blocks.map((b) => blockRecordsHTML(b, q)).join('');

  $$('#side-nav button').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.sec === state.active));
  });
}

/* --- Leitura dos campos de volta para o registro -------------------------- */
function collectInto(rec, el) {
  $$('[data-k]', el).forEach((input) => {
    const k = input.dataset.k, t = input.dataset.t;
    if (t === 'bool')      rec[k] = input.checked;
    else if (t === 'list') rec[k] = input.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else if (t === 'num')  rec[k] = input.value === '' ? 0 : Number(input.value);
    else {
      // Endereço em branco grava NULL, não "". Decidido pelo tipo do campo, e
      // não por uma lista de nomes, que envelhece a cada campo novo.
      const v = input.value.trim();
      rec[k] = (v === '' && (t === 'url' || t === 'image')) ? null : input.value;
    }
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
  const rec = findRec(uid);
  const c = COLLECTIONS[rec.__col];
  const rows = state.data[rec.__col];
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
  const rec0 = findRec(uid);
  const c = COLLECTIONS[rec0.__col];
  const rows = state.data[rec0.__col];
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

/* Cada ficha carrega a coleção de onde veio: numa mesma tela convivem textos e
   registros, e salvar/apagar precisa saber em qual tabela mexer. */
const tag = (rows, col) => rows.map((r) => Object.assign(r, { __uid: 'u' + (++uidSeq), __col: col }));

const findRec = (uid) => {
  for (const col of Object.keys(state.data)) {
    const hit = (state.data[col] || []).find((r) => r.__uid === uid);
    if (hit) return hit;
  }
  return null;
};

function openSection(id) {
  if (state.dirty.size && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
  state.active = id;
  state.dirty.clear();
  state.open.clear();
  state.filter = '';
  $('#search').value = '';
  render();
  $('.main').scrollTop = 0;
  window.scrollTo(0, 0);
}

function wireApp() {
  $('#side-nav').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-sec]');
    if (b) openSection(b.dataset.sec);
  });

  $('#search').addEventListener('input', (ev) => {
    state.filter = ev.target.value;
    render();
  });

  $('#records').addEventListener('click', async (ev) => {
    const add = ev.target.closest('[data-add]');
    if (add) {
      const col = add.dataset.add;
      const c = COLLECTIONS[col];
      const rec = Object.assign(c.blank(),
        { __uid: 'u' + (++uidSeq), __col: col, __new: true, sort_order: 9999 });
      state.data[col].push(rec);
      state.open.add(rec.__uid);
      state.dirty.add(rec.__uid);
      render();
      $(`.rec[data-uid="${rec.__uid}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const pick = ev.target.closest('[data-pick]');
    if (pick) { document.getElementById(pick.dataset.pick)?.click(); return; }

    const clear = ev.target.closest('[data-clear]');
    if (clear) {
      const card = clear.closest('.rec');
      const input = card.querySelector(`[data-k="${clear.dataset.clear}"]`);
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      card.querySelector(`[data-prev="${clear.dataset.clear}"]`).innerHTML = '<span>sem<br>imagem</span>';
      clear.disabled = true;
      return;
    }

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
      const rec = findRec(uid);
      const c = COLLECTIONS[rec.__col];
      const rows = state.data[rec.__col];
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

  $('#records').addEventListener('change', async (ev) => {
    const input = ev.target.closest('[data-upload]');
    if (!input || !input.files?.length) return;
    const card = input.closest('.rec');
    const key = input.dataset.upload;
    const target = card.querySelector(`[data-k="${key}"]`);
    const prev = card.querySelector(`[data-prev="${key}"]`);
    const before = prev.innerHTML;
    prev.innerHTML = '<span class="spinner spinner--dark"></span>';
    try {
      const url = await uploadImage(input.files[0]);
      target.value = url;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      prev.innerHTML = `<img src="${esc(url)}" alt="">`;
      card.querySelector(`[data-clear="${key}"]`).disabled = false;
      toast('Imagem enviada. Salve o registro para publicá-la.');
    } catch (err) {
      prev.innerHTML = before;
      toast(err.message, 'err');
    } finally {
      input.value = '';
    }
  });

  // Colar um endereço à mão também atualiza a miniatura.
  $('#records').addEventListener('input', (ev) => {
    if (ev.target.dataset?.t !== 'image') return;
    const card = ev.target.closest('.rec');
    const prev = card.querySelector(`[data-prev="${ev.target.dataset.k}"]`);
    const v = ev.target.value.trim();
    prev.innerHTML = v ? `<img src="${esc(v)}" alt="">` : '<span>sem<br>imagem</span>';
    card.querySelector(`[data-clear="${ev.target.dataset.k}"]`).disabled = !v;
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
      openSection(SECTIONS[0].id);
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
  $('#side-nav').innerHTML = SECTIONS.map((sec) =>
    `<button type="button" data-sec="${sec.id}">${esc(sec.nav)}</button>`).join('');

  wireLogin();
  wireApp();
  loadSession();

  if (state.session) {
    try {
      await refreshIfNeeded();
      showApp();
      await loadAll();
      openSection(SECTIONS[0].id);
    } catch (e) {
      showLogin();
    }
  } else {
    showLogin();
  }
});
