/* =============================================================================
   app.js — rendering, i18n and interaction
   ========================================================================== */

/* -----------------------------------------------------------------------------
   CONFIGURAÇÃO / CONFIGURATION

   Access Key do Web3Forms (https://web3forms.com). As mensagens do formulário
   chegam em CONTACT_EMAIL com o assunto "[Motivo do contato] Nome do remetente".

   A chave é um identificador público, feito para ficar visível no código do
   cliente: ela só autoriza o envio para o e-mail já cadastrado, e não dá acesso
   a nenhuma conta. Para trocá-la, gere outra em web3forms.com e substitua abaixo.

   Se o valor deixar de ser um UUID válido, o formulário passa a operar em modo de
   reserva: monta um e-mail pré-preenchido e abre o programa de e-mail do visitante.
   -------------------------------------------------------------------------- */
const WEB3FORMS_KEY = '87b161de-119a-4f6e-bdc6-5b7f086f178d';
const CONTACT_EMAIL = 'helvecio.leal@ufopa.edu.br';

const SUPPORTED = ['pt', 'en'];
const STORE_KEY = 'hbln-lang';

let lang = 'pt';

/* --- Helpers ------------------------------------------------------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const t = (key) => {
  const v = I18N[lang][key];
  return v === undefined ? (I18N.pt[key] !== undefined ? I18N.pt[key] : key) : v;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* --- Language detection & persistence ------------------------------------ */
function detectLang() {
  // An explicit ?lang= in the URL wins, so a shared link opens in the language
  // the sender intended even when the visitor has a stored preference.
  const url = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(url)) return url;

  let stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }
  if (SUPPORTED.includes(stored)) return stored;

  const nav = (navigator.languages || [navigator.language || 'pt'])[0] || 'pt';
  return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

function persistLang(value) {
  try { localStorage.setItem(STORE_KEY, value); } catch (e) { /* private mode */ }
}

/* --- Apply translations --------------------------------------------------- */
function applyI18n() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

  document.title = t('meta.title');
  const desc = $('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('meta.description'));
  const ogT = $('meta[property="og:title"]');
  if (ogT) ogT.setAttribute('content', t('meta.title'));
  const ogD = $('meta[property="og:description"]');
  if (ogD) ogD.setAttribute('content', t('meta.description'));

  $$('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

  $$('.lang button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
}

function setLang(value, rerender = true) {
  if (!SUPPORTED.includes(value)) return;
  lang = value;
  persistLang(value);
  applyI18n();
  if (rerender) renderAll();
}

/* =============================================================================
   Rendering
   ========================================================================== */

function renderResearch() {
  const host = $('#research-areas');
  if (!host) return;
  host.innerHTML = RESEARCH_AREAS.map((k, i) => `
    <article class="card">
      <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
      <h3>${t(k + '.t')}</h3>
      <p>${t(k + '.d')}</p>
    </article>`).join('');
}

function renderGroups() {
  const host = $('#research-groups');
  if (!host) return;
  host.innerHTML = RESEARCH_GROUPS.map((g) => {
    // O logo substitui a sigla quando existe; sem ele a sigla segue identificando
    // o grupo, de modo que um grupo sem marca própria não fica anônimo.
    const mark = g.logo
      ? `<img class="group__logo" src="${esc(g.logo)}" alt="${esc(g.acronym)}" loading="lazy">`
      : `<span class="group__acr">${esc(g.acronym)}</span>`;

    const name = t(g.key + '.n');
    const title = g.site
      ? `<a class="group__link" href="${esc(g.site)}" target="_blank" rel="noopener">${name}</a>`
      : name;

    return `
    <article class="group">
      ${mark}
      <div class="group__body">
        <strong>${title}</strong>
        <p>${t(g.key + '.d')}</p>
      </div>
    </article>`;
  }).join('');
}

const TYPE_LABEL = {
  journal:    'pubs.journal',
  conference: 'pubs.conference',
  preprint:   'pubs.preprint',
  thesis:     'pubs.thesis',
  dataset:    'pubs.dataset'
};

const TYPE_TAG = {
  journal: 'tag--journal', conference: 'tag--conf', preprint: 'tag--preprint',
  thesis: 'tag--thesis', dataset: 'tag--dataset'
};

/* Singularise the plural filter labels for use as a per-item badge. */
function typeBadge(type) {
  const label = t(TYPE_LABEL[type]);
  const singular = {
    'Periódicos': 'Artigo', 'Conferências': 'Conferência', 'Preprints': 'Preprint',
    'Teses': 'Tese', 'Dados': 'Dataset',
    'Journals': 'Article', 'Conferences': 'Conference', 'Theses': 'Thesis',
    'Datasets': 'Dataset'
  };
  return singular[label] || label;
}

function renderPublications(filter = 'all') {
  const host = $('#pubs-list');
  if (!host) return;

  const items = PUBLICATIONS.filter((p) => filter === 'all' || p.type === filter);

  host.innerHTML = items.map((p, i) => {
    const authors = p.authors
      .map((a) => (a === ME ? `<span class="me">${esc(a)}</span>` : esc(a)))
      .join('; ');

    // Um link próprio (repositório institucional, PDF) tem precedência sobre o
    // DOI, que segue aparecendo na linha de metadados quando existe.
    const href = p.url || (p.doi ? `https://doi.org/${p.doi}` : null);
    const title = href
      ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
      : esc(p.title);

    const doi = p.doi
      ? `<a class="pub__doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>`
      : '';

    const cites = p.cites > 0
      ? `<span class="pub__cites">${p.cites} ${t(p.cites === 1 ? 'pubs.cite' : 'pubs.cites')}</span>`
      : '';

    const venue = p.venueKey ? t(p.venueKey) : esc(p.venue);

    return `
      <article class="pub" style="animation-delay:${Math.min(i * 45, 400)}ms">
        <div class="pub__year">${p.year}</div>
        <div>
          <h3 class="pub__title">${title}</h3>
          <p class="pub__authors">${authors}</p>
          <div class="pub__meta">
            <span class="tag ${TYPE_TAG[p.type]}">${esc(typeBadge(p.type))}</span>
            <span class="pub__venue">${venue}</span>
            ${doi}
            ${cites}
          </div>
        </div>
      </article>`;
  }).join('');
}

function renderFilters() {
  const host = $('#pubs-filters');
  if (!host) return;
  const present = ['all'].concat(
    ['journal', 'conference', 'preprint', 'thesis', 'dataset']
      .filter((type) => PUBLICATIONS.some((p) => p.type === type))
  );

  const active = host.dataset.active || 'all';
  host.innerHTML = present.map((type) => {
    const label = type === 'all' ? t('pubs.all') : t(TYPE_LABEL[type]);
    const count = type === 'all'
      ? PUBLICATIONS.length
      : PUBLICATIONS.filter((p) => p.type === type).length;
    return `<button class="filter" type="button" data-filter="${type}"
              aria-pressed="${type === active}">${esc(label)} <span aria-hidden="true">(${count})</span></button>`;
  }).join('');
}

function renderCourses() {
  const host = $('#courses');
  if (!host) return;
  host.innerHTML = COURSES.map((c) => {
    const topics = t(c.key + '.u').map((u) => `<li>${esc(u)}</li>`).join('');
    const link = c.url
      ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${t('teaching.materials')} &rarr;</a>`
      : '<span></span>';
    return `
      <article class="course">
        <div class="course__code">${c.code ? esc(c.code) : '&nbsp;'}</div>
        <h3>${t(c.key + '.t')}</h3>
        <ul class="course__topics">${topics}</ul>
        <div class="course__foot">
          <span>${c.hours} ${t('teaching.hours')}</span>
          ${link}
        </div>
      </article>`;
  }).join('');
}

const ICONS = {
  mail:     '<rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 4l6 4.5L14 4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  orcid:    '<circle cx="8" cy="8" r="7.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6.2 5.2h1v5.6h-1zM8.6 5.2h2.1c1.5 0 2.5 1.1 2.5 2.8s-1 2.8-2.5 2.8H8.6zm1 1v3.6h1c1 0 1.6-.7 1.6-1.8S11.6 6.2 10.6 6.2z"/>',
  scholar:  '<path d="M8 1L.8 5.4 8 9.8l7.2-4.4z"/><path d="M3.4 8v3.3c0 1.4 2.1 2.5 4.6 2.5s4.6-1.1 4.6-2.5V8L8 10.8z"/>',
  lattes:   '<path d="M3 2h7l3 3v9H3z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9.5 2v3.5H13M5.5 8.5h5M5.5 11h5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  github:   '<path d="M8 .4a7.6 7.6 0 00-2.4 14.8c.4.1.5-.2.5-.4v-1.4c-2.1.5-2.6-1-2.6-1-.3-.9-.8-1.1-.8-1.1-.7-.5 0-.5 0-.5.8.1 1.2.8 1.2.8.7 1.2 1.8.9 2.3.7.1-.5.3-.9.5-1.1-1.7-.2-3.5-.9-3.5-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.1.8a7.2 7.2 0 013.8 0c1.4-1 2.1-.8 2.1-.8.5 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.8 3.7-3.5 3.9.3.2.5.7.5 1.5v2.2c0 .2.1.5.6.4A7.6 7.6 0 008 .4z"/>',
  linkedin: '<path d="M3.4 5.4h2.1V14H3.4zM4.5 1.9a1.3 1.3 0 110 2.5 1.3 1.3 0 010-2.5zM7.2 5.4h2v1.2h.1c.3-.6 1-1.2 2.1-1.2 2.3 0 2.7 1.5 2.7 3.4V14h-2.1V9.3c0-1.1 0-2.5-1.5-2.5s-1.7 1.2-1.7 2.4V14h-2z"/>',
  link:     '<path d="M6.5 9.5a3 3 0 004.2 0l2.1-2.1a3 3 0 00-4.2-4.2l-1 1M9.5 6.5a3 3 0 00-4.2 0L3.2 8.6a3 3 0 004.2 4.2l1-1" fill="none" stroke="currentColor" stroke-width="1.4"/>'
};

function renderLinks() {
  const host = $('#profile-links');
  if (!host) return;
  host.innerHTML = LINKS.map((l) => {
    const external = /^https?:/i.test(l.url);
    return `<a class="chip" href="${esc(l.url)}"${external ? ' target="_blank" rel="noopener"' : ''}>
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${ICONS[l.icon] || ICONS.link}</svg>
      ${esc(l.label)}
    </a>`;
  }).join('');
}

const STAR = '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M8 .8l2.2 4.5 5 .7-3.6 3.5.8 4.9L8 12.1 3.6 14.4l.8-4.9L.8 6l5-.7z"/></svg>';

function renderSoftware() {
  const host = $('#software-list');
  if (!host) return;
  host.innerHTML = SOFTWARE.map((s) => {
    const stars = s.stars > 0 ? `<span class="repo__stars">${STAR} ${s.stars}</span>` : '';
    const docs = s.docs
      ? `<a href="${esc(s.docs)}"${s.docs.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${t('soft.docs')} &rarr;</a>`
      : '';
    return `
      <article class="repo${s.featured ? ' repo--featured' : ''}">
        <div class="repo__top">
          <h3>${esc(s.name)}</h3>
          ${stars}
        </div>
        <p>${t(s.key + '.d')}</p>
        <div class="repo__links">
          <a href="${esc(s.repo)}" target="_blank" rel="noopener">${t('soft.repo')} &rarr;</a>
          ${docs}
        </div>
      </article>`;
  }).join('');
}

function renderEducation() {
  const host = $('#education-list');
  if (!host) return;
  host.innerHTML = EDUCATION.map((k, i) => {
    const note = t(k + '.n');
    // t() devolve a própria chave quando ela não existe, daí exigir um endereço
    // de verdade em vez de só testar se veio algo.
    const url = t(k + '.l');
    const linked = /^https?:\/\//.test(url)
      ? `<a href="${esc(url)}" target="_blank" rel="noopener">${note}</a>`
      : note;

    return `
      <li class="tl-item${i === 0 ? ' tl-item--current' : ''}">
        <div class="tl-item__when">${t(k + '.w')}</div>
        <h3>${t(k + '.t')}</h3>
        <div class="tl-item__where">${t(k + '.i')}</div>
        ${note ? `<p class="tl-item__note">${linked}</p>` : ''}
      </li>`;
  }).join('');
}

/* -----------------------------------------------------------------------------
   Agendamento de reuniões (Google Calendar — agenda de compromissos)

   O bloco só aparece quando a chave de texto `sched.url` traz um link de
   "agenda de compromissos" do Google Calendar (calendar.google.com/calendar/
   appointments/...). Esse tipo de página mostra apenas os horários vagos dos
   dias liberados na configuração da agenda — nunca os eventos nem o restante
   do calendário. Links de outro formato (como o embed da agenda completa) são
   ignorados de propósito, para não expor o calendário inteiro por engano.
   -------------------------------------------------------------------------- */
function renderScheduling() {
  const section = $('#agendamento');
  if (!section) return;

  const url = String(I18N.pt['sched.url'] || I18N.en['sched.url'] || '').trim();
  // O link completo pode vir com ou sem o segmento /calendar/; o curto
  // (calendar.app.google) é o que o botão "Compartilhar" do Google copia.
  const full = /^https:\/\/calendar\.google\.com\/(calendar\/)?(u\/\d+\/)?appointments\//.test(url);
  const short = /^https:\/\/calendar\.app\.google\/[A-Za-z0-9_-]+$/.test(url);
  const on = full || short;

  // A seção e as entradas de menu aparecem e somem juntas.
  section.hidden = !on;
  $$('[data-sched-nav]').forEach((el) => { el.hidden = !on; });
  if (!on) return;

  const wrap = $('.schedule__frame');
  if (full) {
    // Só a forma com /calendar/ aceita ser incorporada (a outra envia
    // X-Frame-Options); ?gv=true liga o modo de incorporação.
    const embed = url.replace('calendar.google.com/appointments/',
                              'calendar.google.com/calendar/appointments/');
    const src = embed + (embed.includes('?') ? '&' : '?') + 'gv=true';
    const frame = $('#schedule-iframe');
    if (frame && frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    if (wrap) wrap.hidden = false;
  } else if (wrap) {
    // O link curto redireciona perdendo o ?gv=true e cai na forma que recusa
    // iframe; sem como resolvê-lo no navegador, fica só o botão.
    wrap.hidden = true;
  }

  const link = $('#schedule-link');
  if (link) link.href = url;
}

/* A foto enviada pelo painel substitui a que veio no deploy. Uma só serve aos
   dois idiomas, então basta que um dos campos traga um endereço válido; o
   srcset precisa sair junto, ou o navegador seguiria escolhendo o arquivo
   antigo nas telas pequenas. */
function renderPhoto() {
  const img = $('#portrait');
  if (!img) return;

  const url = [I18N.pt['hero.photo'], I18N.en['hero.photo']]
    .find((v) => /^https?:\/\//.test(String(v || '').trim()));
  if (!url) return;

  if (img.getAttribute('src') !== url) {
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.setAttribute('src', url);
  }
}

function renderAll() {
  renderPhoto();
  renderLinks();
  renderScheduling();
  renderResearch();
  renderGroups();
  renderFilters();
  renderPublications($('#pubs-filters')?.dataset.active || 'all');
  renderCourses();
  renderSoftware();
  renderEducation();
  observeReveals();
}

/* =============================================================================
   Interaction
   ========================================================================== */

function initLangSwitch() {
  $$('.lang button').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

function initFilters() {
  const host = $('#pubs-filters');
  if (!host) return;
  host.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-filter]');
    if (!btn) return;
    host.dataset.active = btn.dataset.filter;
    $$('[data-filter]', host).forEach((b) => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    renderPublications(btn.dataset.filter);
  });
}

function initNav() {
  const masthead = $('.masthead');
  const burger = $('.burger');
  const drawer = $('.drawer');

  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drawer.classList.toggle('is-open', !open);
    });
    drawer.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('is-open');
      }
    });
  }

  const onScroll = () => {
    masthead?.classList.toggle('is-stuck', window.scrollY > 8);
    const top = $('.totop');
    top?.classList.toggle('is-visible', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $('.totop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Highlight the section currently in view.
  const links = $$('.nav a[href^="#"]');
  const sections = links
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + entry.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }
}

let revealObserver = null;
function observeReveals() {
  if (!('IntersectionObserver' in window)) {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  }
  $$('.reveal:not(.is-in)').forEach((el) => revealObserver.observe(el));
}

/* =============================================================================
   Contact form
   ========================================================================== */

function fieldError(input, messageKey) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.add('field--invalid');
  const slot = $('.field__error', field);
  if (slot) slot.textContent = t(messageKey);
}

function clearErrors(form) {
  $$('.field--invalid', form).forEach((f) => f.classList.remove('field--invalid'));
}

function validate(form) {
  clearErrors(form);
  let firstBad = null;

  const check = (name, test, key) => {
    const input = form.elements[name];
    if (!input) return;
    if (!test(input.value.trim())) {
      fieldError(input, key);
      if (!firstBad) firstBad = input;
    }
  };

  check('name', (v) => v.length > 1, 'form.eRequired');
  check('email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'form.eEmail');
  check('reason', (v) => v.length > 0, 'form.eRequired');
  check('message', (v) => v.length >= 20, 'form.eShort');

  if (firstBad) {
    firstBad.focus();
    firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  return !firstBad;
}

function showStatus(kind, messageKey) {
  const box = $('#form-status');
  if (!box) return;
  box.className = 'form__status form__status--' + kind + ' is-visible';
  box.textContent = t(messageKey);
  box.setAttribute('role', kind === 'err' ? 'alert' : 'status');
}

/* The recipient reads Portuguese, so the reason is always labelled in pt-BR —
   regardless of the language the visitor filled the form in. */
const REASON_KEY = {
  institucional: 'form.r1',
  colaboracao:   'form.r2',
  orientacao:    'form.r3',
  parceria:      'form.r4',
  outros:        'form.r5'
};

function reasonLabel(form) {
  return I18N.pt[REASON_KEY[form.elements.reason.value]] || I18N.pt['form.r5'];
}

function buildSubject(form) {
  return `[${reasonLabel(form)}] ${form.elements.name.value.trim()}`;
}

/* Built by hand rather than from FormData so the e-mail body carries readable
   labels instead of the internal field names and the reason slug. */
function buildPayload(form) {
  return {
    access_key: WEB3FORMS_KEY,
    subject: buildSubject(form),
    from_name: 'helvecioneto.github.io',
    replyto: form.elements.email.value.trim(),
    'Nome': form.elements.name.value.trim(),
    'E-mail': form.elements.email.value.trim(),
    'Instituição': form.elements.organisation.value.trim() || '—',
    'Motivo do contato': reasonLabel(form),
    'Mensagem': form.elements.message.value.trim(),
    'Idioma da página': lang === 'pt' ? 'Português (BR)' : 'English'
  };
}

function fallbackMailto(form) {
  const body = [
    `${t('form.name')}: ${form.elements.name.value.trim()}`,
    `${t('form.email')}: ${form.elements.email.value.trim()}`,
    `${t('form.org')}: ${form.elements.organisation.value.trim() || '—'}`,
    '',
    form.elements.message.value.trim()
  ].join('\n');

  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(buildSubject(form))}` +
               `&body=${encodeURIComponent(body)}`;
  window.location.href = href;
  showStatus('ok', 'form.mailto');
}

function initForm() {
  const form = $('#contact-form');
  if (!form) return;

  const keyConfigured = /^[0-9a-f-]{36}$/i.test(WEB3FORMS_KEY);

  form.addEventListener('input', (ev) => {
    ev.target.closest('.field')?.classList.remove('field--invalid');
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validate(form)) return;

    // Honeypot: bots fill hidden fields, humans do not.
    if (form.elements.botcheck && form.elements.botcheck.checked) return;

    if (!keyConfigured) { fallbackMailto(form); return; }

    const btn = $('#form-submit', form);
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('form.sending');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(buildPayload(form))
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        form.reset();
        showStatus('ok', 'form.ok');
      } else {
        showStatus('err', 'form.err');
      }
    } catch (err) {
      showStatus('err', 'form.err');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

/* =============================================================================
   Boot
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  lang = detectLang();

  // Antes de desenhar: se o navegador já viu o conteúdo do banco, é ele que
  // abre a página, não a cópia embutida no deploy.
  if (typeof applyCachedContent === 'function') applyCachedContent();

  applyI18n();
  renderAll();
  initLangSwitch();
  initFilters();
  initNav();
  initForm();

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // O conteúdo embutido já está na tela; troca pela versão viva do banco se ela
  // vier. Uma falha aqui é silenciosa de propósito: o visitante continua vendo
  // a página completa em vez de um erro.
  if (typeof loadRemoteContent === 'function') {
    loadRemoteContent()
      .then(() => { applyI18n(); renderAll(); })
      .catch((err) => console.info('conteúdo remoto indisponível, usando cópia local:', err.message));
  }
});
