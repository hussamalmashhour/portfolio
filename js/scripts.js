/*!
 * Resume template with multi-language support
 * Uses <template> cloning
 */

let currentLanguage = 'en';
let portfolioData = null;
let __renderToken = 0;              // <- prevents overlapping renders

const languageConfig = {
  en: { file: './data/portfolio.en.json', name: 'English' },
  es: { file: './data/portfolio.es.json', name: 'Español' }
};

/* -------------------- boot -------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  if (window.__resume_inited__) return;
  window.__resume_inited__ = true;

  const sideNav = document.body.querySelector('#sideNav');
  if (sideNav && window.bootstrap?.ScrollSpy) {
    new bootstrap.ScrollSpy(document.body, {
      target: '#sideNav',
      rootMargin: '0px 0px -40%',
    });
  }

  const navbarToggler = document.body.querySelector('.navbar-toggler');
  const responsiveNavItems = [].slice.call(document.querySelectorAll('#navbarResponsive .nav-link'));
  responsiveNavItems.forEach((item) => {
    item.addEventListener('click', () => {
      if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
        navbarToggler.click();
      }
    });
  });

  setupLanguageSwitcher();

  const savedLanguage = localStorage.getItem('portfolioLanguage');
  const browserLanguage = (navigator.language || 'en').split('-')[0];
  const defaultLanguage = Object.keys(languageConfig).includes(browserLanguage) ? browserLanguage : 'en';
  const initialLanguage = savedLanguage || defaultLanguage;

  await loadLanguageData(initialLanguage);
});

/* -------------------- language loading -------------------- */
async function loadLanguageData(lang) {
  try {
    if (!languageConfig[lang]) throw new Error(`Language ${lang} not supported`);
    const response = await fetch(languageConfig[lang].file, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    portfolioData = await response.json();
    currentLanguage = lang;
    localStorage.setItem('portfolioLanguage', lang);

    updateLanguageSwitcher();

    // render with a token: if a second render starts, the older one quietly stops
    const myToken = ++__renderToken;
    await renderAllContent(myToken);
  } catch (e) {
    console.error('Failed to load portfolio data:', e);
    if (lang !== 'en') await loadLanguageData('en'); else showErrorState();
  }
}

function setupLanguageSwitcher() {
  // bind once to ALL dropdown items (desktop + mobile)
  qa('.language-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation(); // avoid any parent handlers firing too
      const lang = e.currentTarget.getAttribute('data-lang');
      if (lang && lang !== currentLanguage) await loadLanguageData(lang);
    }, { passive: true });
  });
}

function updateLanguageSwitcher() {
  const name = languageConfig[currentLanguage]?.name || 'English';
  qa('.currentLanguage').forEach(el => el.textContent = name);
  const single = q('#currentLanguage'); // backward-compat if old id exists
  if (single) single.textContent = name;
}

/* -------------------- helpers -------------------- */
const q  = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clear(el) { if (el) el.replaceChildren(); }  // <- bulletproof clear

function monthYear(iso) {
  if (!iso) return '';
  if (iso === 'Present') return currentLanguage === 'es' ? 'Actual' : 'Present';
  const [y, m] = (iso + '').split('-');
  if (!m) return y;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(currentLanguage, { month: 'long', year: 'numeric' });
}

function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function applySiteMeta(site = {}) { if (site.title) document.title = site.title; }

function applyVisibilityOrder(sections) {
  const byId = Object.fromEntries((sections || []).map(s => [s.id, s]));
  const idMap = {
    about: '#about', experience: '#experience', projects: '#interests',
    skills: '#skills', education: '#education', certifications: '#awards', volunteering: '#awards'
  };

  Object.entries(idMap).forEach(([logical, css]) => {
    const meta = byId[logical]; const el = q(css); if (!el) return;
    const href = css.startsWith('#') ? css : '#' + css;
    const navItem = qa(`#navbarResponsive .nav-link[href="${href}"]`)[0]?.parentElement;
    if (meta && meta.visible === false) { el.style.display = 'none'; if (navItem) navItem.style.display = 'none'; }
    else { el.style.display = ''; if (navItem) navItem.style.display = ''; }
  });

  const navUl = q('#navbarResponsive .navbar-nav'); if (!navUl) return;
  const currentLis = qa('li.nav-item', navUl);
  const liByHref = new Map(currentLis.map(li => [li.querySelector('a')?.getAttribute('href'), li]));
  const desiredOrder = (sections || [])
    .filter(s => s.visible !== false)
    .sort((a,b) => (a.order||0)-(b.order||0))
    .map(s => liByHref.get(idMap[s.id] || `#${s.id}`))
    .filter(Boolean);

  const seen = new Set();
  desiredOrder.forEach(li => { const href = li.querySelector('a')?.getAttribute('href'); if (seen.has(href)) return; seen.add(href); navUl.appendChild(li); });
}

/* template helpers */
function $tpl(id){ const t=q(`#${id}`); return (t&&t.content&&t.content.firstElementChild)?t.content.firstElementChild:null; }
function clone(id){ const base=$tpl(id); return base?base.cloneNode(true):null; }
function set(el,key,text){ const n=el?.querySelector?.(`[data-t="${key}"]`); if(!n)return; if(text==null||text===''){n.hidden=true;return;} n.hidden=false; n.textContent=text; }
function setHTML(el,key,html){ const n=el?.querySelector?.(`[data-t="${key}"]`); if(!n)return; if(!html){n.hidden=true;return;} n.hidden=false; n.innerHTML=html; }

/* -------------------- render orchestration -------------------- */
async function renderAllContent(token) {
  if (!portfolioData) return;
  // if a newer render started, abort silently
  if (token !== __renderToken) return;

  applySiteMeta(portfolioData.site);

  renderAbout(portfolioData.about);                             if (token !== __renderToken) return;
  renderExperience(portfolioData.experience || []);            if (token !== __renderToken) return;
  renderProjects(portfolioData.projects || []);                if (token !== __renderToken) return;
  renderSkills(portfolioData.skills || {});                    if (token !== __renderToken) return;
  renderEducation(portfolioData.education || []);              if (token !== __renderToken) return;
  renderCertsAndVolunteering(
    portfolioData.certifications || [],
    portfolioData.volunteering || []
  );                                                           if (token !== __renderToken) return;
  renderLanguages(portfolioData.about?.languages || []);
}

function showErrorState() {
  const aboutLead = q('#about .lead') || q('#about');
  if (aboutLead) aboutLead.textContent = 'Unable to load profile data. Please try reloading.';
}

/* -------------------- renderers -------------------- */
function renderAbout(about = {}) {
  const host = q('#about'); if (!host) return;

  const sk = q('#about-skeleton'); if (sk) sk.remove();

  const avatar = q('#sideNav img.img-profile');
  if (avatar && about.avatar) avatar.src = about.avatar;

  const location = [about.location?.city, about.location?.country].filter(Boolean).join(', ');
  const phone = about.contacts?.find(c => c.type === 'phone')?.value;
  const email = about.contacts?.find(c => c.type === 'email')?.value;
  const sub = [location, phone, email ? `<a href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a>` : '']
    .filter(Boolean).join(' · ');

  const view = clone('tpl-about');
  if (!view) {
    const nameEl = q('#about h1'); const subEl = q('#about .subheading');
    const summaryEl = q('#about .lead'); const socialsEl = q('#about .social-icons');
    if (nameEl) nameEl.innerHTML = `${escapeHTML(about.name?.first || '')} <span class="text-primary">${escapeHTML(about.name?.last || '')}</span>`;
    if (subEl) subEl.innerHTML = sub;
    if (summaryEl) summaryEl.textContent = about.summary || '';
    if (socialsEl) socialsEl.innerHTML = buildSocialsHTML(about.contacts || []);
    const oldDl = q('#about .download-buttons-wrapper'); if (oldDl) oldDl.remove();
    injectDownloadsAfter(socialsEl, about.downloadables || []);
    return;
  }

  set(view, 'first', about.name?.first || '');
  set(view, 'last',  about.name?.last  || '');
  setHTML(view, 'sub', sub);
  set(view, 'summary', about.summary || '');

  const socialsWrap = view.querySelector('[data-t="socials"]');
  if (socialsWrap) socialsWrap.innerHTML = buildSocialsHTML(about.contacts || []);

  const dl = view.querySelector('[data-t="downloads"]');
  if (dl) {
    dl.innerHTML = (about.downloadables || [])
      .map(d => `<a class="btn btn-sm btn-outline-primary me-2" href="${escapeHTML(d.href)}" target="_blank" rel="noreferrer">${escapeHTML(d.label)}</a>`)
      .join('');
    if (!dl.innerHTML) dl.remove();
  }

  const content = host.querySelector('.resume-section-content');
  if (content) content.replaceWith(view);
}

function buildSocialsHTML(list) {
  return (list || [])
    .filter(c => ['github','gitlab','linkedin','twitter','x','facebook','website'].includes(c.type))
    .map(c => {
      const icon = c.icon || {
        github: 'fab fa-github', gitlab: 'fab fa-gitlab', linkedin: 'fab fa-linkedin-in',
        twitter: 'fab fa-twitter', x: 'fab fa-x-twitter', facebook: 'fab fa-facebook-f', website: 'fa-solid fa-globe'
      }[c.type] || 'fa-solid fa-link';
      return `<a class="social-icon" href="${escapeHTML(c.href || '#')}" target="_blank" rel="noreferrer"><i class="${icon}"></i></a>`;
    }).join('');
}

function injectDownloadsAfter(anchor, items) {
  if (!anchor || !items?.length) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'mt-3 download-buttons-wrapper';
  wrapper.innerHTML = items.map(d =>
    `<a class="btn btn-sm btn-outline-primary me-2" href="${escapeHTML(d.href)}" target="_blank" rel="noreferrer">${escapeHTML(d.label)}</a>`
  ).join('');
  anchor.after(wrapper);
}

function renderLanguages(languages = []) {
  const aboutSection = q('#about .resume-section-content'); if (!aboutSection) return;
  const existing = q('#languages-section'); if (existing) existing.remove();
  if (!languages.length) return;

  const h3 = currentLanguage === 'es' ? 'Idiomas' : 'Languages';
  const block = document.createElement('div');
  block.id = 'languages-section';
  block.className = 'mt-4';
  block.innerHTML = `
    <h3 class="mb-3">${h3}</h3>
    <ul class="list-unstyled">
      ${languages.map(lang => `<li class="mb-2"><strong>${escapeHTML(lang.name)}</strong>: ${escapeHTML(lang.level)}</li>`).join('')}
    </ul>`;
  const anchor = q('.download-buttons-wrapper', aboutSection) || q('.social-icons', aboutSection) || q('.lead', aboutSection);
  (anchor || aboutSection).insertAdjacentElement('afterend', block);
}

/* ----------- Sections (now always cleared before append) ----------- */
function renderExperience(items = []) {
  const titleEl = q('#experience-title');
  const list    = q('#experience-list') || q('#experience .resume-section-content');
  if (!list) return;

  const sectionTitle = currentLanguage === 'es' ? 'Experiencia' : 'Experience';
  if (titleEl) titleEl.textContent = sectionTitle;

  clear(list);                        // <- prevents duplicates every time
  const hasTemplate = !!$tpl('tpl-experience-item');

  items.forEach(x => {
    const when = `${monthYear(x.employment?.start)} – ${x.employment?.end ? monthYear(x.employment.end) : (currentLanguage === 'es' ? 'Actual' : 'Present')}`;
    const loc  = [x.company, x.location].filter(Boolean).join(' — ');
    const bullets = x.highlights || x.bullets || [];
    const stackLabel = currentLanguage === 'es' ? 'Tecnologías' : 'Stack';
    const stackText = x.stack?.length ? `${stackLabel}: ${x.stack.join(', ')}` : '';

    const view = hasTemplate ? clone('tpl-experience-item') : null;
    if (view) {
      const bulletsUl = view.querySelector('[data-t="bullets"]');
      if (bulletsUl) { bulletsUl.innerHTML = bullets.map(b => `<li>${b}</li>`).join(''); if (!bullets.length) bulletsUl.remove(); }
      set(view, 'role', x.role || '');
      set(view, 'companyLoc', loc);
      set(view, 'summary', x.summary || '');
      set(view, 'when', when);
      set(view, 'stack', stackText);
      list.appendChild(view);
    } else {
      const div = document.createElement('div');
      div.className = 'd-flex flex-column flex-md-row justify-content-between mb-5';
      div.innerHTML = `
        <div class="flex-grow-1">
          <h3 class="mb-0">${escapeHTML(x.role || '')}</h3>
          <div class="subheading mb-3">${escapeHTML(loc)}</div>
          ${x.summary ? `<p>${escapeHTML(x.summary)}</p>` : ''}
          ${bullets.length ? `<ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
          ${stackText ? `<div class="small text-muted mt-2">${escapeHTML(stackText)}</div>` : ''}
        </div>
        <div class="flex-shrink-0"><span class="text-primary">${when}</span></div>`;
      list.appendChild(div);
    }
  });
}

function renderProjects(items = []) {
  const titleEl = q('#projects-title');
  const list    = q('#projects-list') || q('#interests .resume-section-content');
  if (!list) return;

  const sectionTitle = currentLanguage === 'es' ? 'Proyectos' : 'Projects';
  if (titleEl) titleEl.textContent = sectionTitle;

  clear(list);
  const hasTemplate = !!$tpl('tpl-project-item');

  items.forEach(p => {
    const outcomes = (p.outcomes || []).map(o => `<li>${o}</li>`).join('');
    const links = (p.links || []).map(l =>
      `<a class="me-2" href="${escapeHTML(l.href)}" target="_blank" rel="noreferrer">${escapeHTML(l.label)}</a>`
    ).join('');

    const view = hasTemplate ? clone('tpl-project-item') : null;
    if (view) {
      const outcomesUl = view.querySelector('[data-t="outcomes"]');
      if (outcomesUl) { outcomesUl.innerHTML = outcomes; if (!outcomes) outcomesUl.remove(); }
      const linksWrap = view.querySelector('[data-t="links"]');
      if (linksWrap)  { linksWrap.innerHTML  = links;    if (!links) linksWrap.remove(); }
      const stackLabel = currentLanguage === 'es' ? 'Tecnologías' : 'Stack';
      set(view, 'name', p.name || '');
      set(view, 'subtitle', p.subtitle || '');
      set(view, 'dates', p.dates || '');
      set(view, 'summary', p.summary || '');
      set(view, 'stack', p.stack?.length ? `${stackLabel}: ${p.stack.join(', ')}` : '');
      list.appendChild(view);
    } else {
      const div = document.createElement('div');
      div.className = 'mb-4';
      div.innerHTML = `
        <h4 class="mb-1">${escapeHTML(p.name || '')}</h4>
        ${p.subtitle ? `<div class="text-muted">${escapeHTML(p.subtitle)}</div>` : ''}
        <div class="text-primary mb-2">${escapeHTML(p.dates || '')}</div>
        ${p.summary ? `<p>${escapeHTML(p.summary)}</p>` : ''}
        ${outcomes ? `<ul>${outcomes}</ul>` : ''}
        ${links}`;
      list.appendChild(div);
    }
  });
}

function renderSkills(skills = {}) {
  const titleEl = q('#skills-title');
  const list    = q('#skills-list') || q('#skills .resume-section-content');
  if (!list) return;

  const sectionTitle = currentLanguage === 'es' ? 'Habilidades' : 'Skills';
  if (titleEl) titleEl.textContent = sectionTitle;

  clear(list);

  const hasCatTpl = !!$tpl('tpl-skill-category');
  const hasBadgeTpl = !!$tpl('tpl-skill-badge');
  const hasMeterTpl = !!$tpl('tpl-skill-meter');

  (skills.categories || []).forEach(cat => {
    const catView = hasCatTpl ? clone('tpl-skill-category') : document.createElement('div');
    if (!catView.className) catView.className = 'mb-4';
    set(catView, 'name', cat.name || '');
    const itemsWrap = catView.querySelector('[data-t="items"]') || catView;

    (cat.items || []).forEach(it => {
      if (typeof it.level === 'number' && hasMeterTpl) {
        const v = Math.max(0, Math.min(5, it.level));
        const meter = clone('tpl-skill-meter');
        set(meter, 'label', it.name || '');
        set(meter, 'level', `${v}/5`);
        const bar = meter.querySelector('[data-t="bar"]');
        if (bar) bar.style.width = `${(v/5)*100}%`;
        itemsWrap.appendChild(meter);
      } else {
        const badge = hasBadgeTpl ? clone('tpl-skill-badge') : document.createElement('span');
        if (!badge.querySelector) { badge.className = 'badge bg-secondary me-2 mb-2'; badge.textContent = it.name || ''; }
        else { set(badge, 'label', it.name || ''); }
        itemsWrap.appendChild(badge);
      }
    });

    list.appendChild(catView);
  });
}

function renderEducation(items = []) {
  const titleEl = q('#education-title');
  const list    = q('#education-list') || q('#education .resume-section-content');
  if (!list) return;

  const sectionTitle = currentLanguage === 'es' ? 'Educación' : 'Education';
  if (titleEl) titleEl.textContent = sectionTitle;

  clear(list);

  const hasTemplate = !!$tpl('tpl-education-item');
  const coursesLabel = currentLanguage === 'es' ? 'Cursos seleccionados' : 'Selected courses';
  const thesisLabel  = currentLanguage === 'es' ? 'Tesis' : 'Thesis';

  items.forEach(e => {
    const view = hasTemplate ? clone('tpl-education-item') : null;
    if (view) {
      set(view, 'school', e.school || '');
      set(view, 'degreeLoc', [e.degree, e.location].filter(Boolean).join(' — '));
      set(view, 'period', `${e.start || ''} – ${e.end || ''}`);
      if (e.courses?.length) set(view, 'courses', `${coursesLabel}: ${e.courses.join(', ')}`);
      if (e.thesis) set(view, 'thesis', `${thesisLabel}: ${e.thesis}`);
      list.appendChild(view);
    } else {
      const div = document.createElement('div');
      div.className = 'mb-4';
      div.innerHTML = `
        <h3 class="mb-0">${escapeHTML(e.school || '')}</h3>
        <div class="text-muted">${escapeHTML(e.degree || '')}${e.location ? ' — ' + escapeHTML(e.location) : ''}</div>
        <div class="text-primary">${escapeHTML(e.start || '')} – ${escapeHTML(e.end || '')}</div>`;
      list.appendChild(div);
    }
  });
}

function renderCertsAndVolunteering(certs = [], volunteering = []) {
  const titleH2 = q('#awards-title'); if (titleH2) titleH2.textContent =
    currentLanguage === 'es' ? 'Certificaciones y Voluntariado' : 'Certifications & Volunteering';

  const certsH5 = q('#certs-title');
  const volH5   = q('#vol-title');
  const certsUl = q('#certs-list');
  const volUl   = q('#vol-list');
  if (!certsUl || !volUl) return;

  clear(certsUl); clear(volUl);

  const certsTitle = currentLanguage === 'es' ? 'Certificaciones' : 'Certifications';
  const volTitle   = currentLanguage === 'es' ? 'Voluntariado'   : 'Volunteering';

  if (certs.length) {
    if (certsH5) { certsH5.hidden = false; certsH5.textContent = certsTitle; }
    certs.forEach(c => {
      const li = clone('tpl-cert-item');
      if (li) {
        set(li, 'name', c.name || '');
        set(li, 'issuer', c.issuer || '');
        set(li, 'range', `${monthYear(c.start)} – ${monthYear(c.end)}`);
        certsUl.appendChild(li);
      } else {
        const basic = document.createElement('li');
        basic.innerHTML = `<strong>${escapeHTML(c.name || '')}</strong> — ${escapeHTML(c.issuer || '')} (${monthYear(c.start)} – ${monthYear(c.end)})`;
        certsUl.appendChild(basic);
      }
    });
  } else if (certsH5) certsH5.hidden = true;

  if (volunteering.length) {
    if (volH5) { volH5.hidden = false; volH5.textContent = volTitle; }
    volunteering.forEach(v => {
      const li = clone('tpl-vol-item');
      if (li) {
        set(li, 'title', v.title || '');
        set(li, 'org', v.org || '');
        set(li, 'dates', v.dates || '');
        if (v.summary) li.querySelector('[data-t="summaryWrap"]').innerHTML = `: ${escapeHTML(v.summary)}`;
        const hl = li.querySelector('[data-t="highlights"]');
        if (v.highlights?.length) { hl.hidden = false; hl.innerHTML = v.highlights.map(h => `<li>${h}</li>`).join(''); }
        volUl.appendChild(li);
      } else {
        const basic = document.createElement('li');
        basic.innerHTML = `<strong>${escapeHTML(v.title || '')}</strong> — ${escapeHTML(v.org || '')} (${escapeHTML(v.dates || '')})${v.summary ? `: ${escapeHTML(v.summary)}` : ''}`;
        volUl.appendChild(basic);
        if (v.highlights?.length) {
          const ul = document.createElement('ul');
          ul.innerHTML = v.highlights.map(h => `<li>${h}</li>`).join('');
          volUl.appendChild(ul);
        }
      }
    });
  } else if (volH5) volH5.hidden = true;
}
