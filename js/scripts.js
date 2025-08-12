/*!
 * Resume template with multi-language support
 * Loads either portfolio.en.json or portfolio.es.json
 */

// Current language and data
let currentLanguage = 'en';
let portfolioData = null;

// Language configuration
const languageConfig = {
  en: {
    file: './data/portfolio.en.json',
    name: 'English'
  },
  es: {
    file: './data/portfolio.es.json',
    name: 'Español'
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  // Initialize scrollspy and responsive navbar
  const sideNav = document.body.querySelector('#sideNav');
  if (sideNav) {
    new bootstrap.ScrollSpy(document.body, {
      target: '#sideNav',
      rootMargin: '0px 0px -40%',
    });
  }
  
  const navbarToggler = document.body.querySelector('.navbar-toggler');
  const responsiveNavItems = [].slice.call(
    document.querySelectorAll('#navbarResponsive .nav-link')
  );
  responsiveNavItems.map((responsiveNavItem) => {
    responsiveNavItem.addEventListener('click', () => {
      if (window.getComputedStyle(navbarToggler).display !== 'none') {
        navbarToggler.click();
      }
    });
  });

  // Initialize language switcher
  setupLanguageSwitcher();

  // Load data based on saved language preference or browser language
  const savedLanguage = localStorage.getItem('portfolioLanguage');
  const browserLanguage = navigator.language.split('-')[0];
  const defaultLanguage = Object.keys(languageConfig).includes(browserLanguage) ? browserLanguage : 'en';
  const initialLanguage = savedLanguage || defaultLanguage;
  
  await loadLanguageData(initialLanguage);
});

async function loadLanguageData(lang) {
  try {
    if (!languageConfig[lang]) {
      throw new Error(`Language ${lang} not supported`);
    }
    
    const response = await fetch(languageConfig[lang].file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    portfolioData = await response.json();
    currentLanguage = lang;
    localStorage.setItem('portfolioLanguage', lang);
    
    // Update UI
    updateLanguageSwitcher();
    renderAllContent();
  } catch (error) {
    console.error('Failed to load portfolio data:', error);
    
    // Fallback to English if preferred language fails
    if (lang !== 'en') {
      await loadLanguageData('en');
    } else {
      showErrorState();
    }
  }
}

function setupLanguageSwitcher() {
  const languageOptions = qa('.language-option');
  languageOptions.forEach(option => {
    option.addEventListener('click', async (e) => {
      e.preventDefault();
      const lang = e.target.getAttribute('data-lang');
      if (lang !== currentLanguage) {
        await loadLanguageData(lang);
      }
    });
  });
}

function updateLanguageSwitcher() {
  const currentLangEl = q('#currentLanguage');
  if (currentLangEl) {
    currentLangEl.textContent = languageConfig[currentLanguage]?.name || 'English';
  }
}

function renderAllContent() {
  if (!portfolioData) return;
  
  applySiteMeta(portfolioData.site);
  applyVisibilityOrder(portfolioData.site?.sections || []);
  
  renderAbout(portfolioData.about);
  renderExperience(portfolioData.experience || []);
  renderProjects(portfolioData.projects || []);
  renderSkills(portfolioData.skills || {});
  renderEducation(portfolioData.education || []);
  renderCertsAndVolunteering(
    portfolioData.certifications || [],
    portfolioData.volunteering || []
  );
  renderLanguages(portfolioData.about?.languages || []);
}

function showErrorState() {
  const aboutLead = q('#about .lead') || q('#about');
  if (aboutLead) {
    aboutLead.textContent = 'Unable to load profile data. Please try reloading.';
  }
}

/* ------------------------ helpers ------------------------ */
const q  = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function monthYear(iso) {
  if (!iso) return '';
  if (iso === 'Present') return currentLanguage === 'es' ? 'Actual' : 'Present';
  
  const [y, m] = (iso + '').split('-');
  if (!m) return y;
  
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(currentLanguage, { 
    month: 'long', 
    year: 'numeric' 
  });
}

function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[s]);
}

function applySiteMeta(site = {}) {
  if (site.title) document.title = site.title;
  // Feature flags would be read here if needed
}

/** Hide sections marked visible:false in site.sections and reorder nav items */
function applyVisibilityOrder(sections) {
  const byId = Object.fromEntries(sections.map(s => [s.id, s]));
  // Map logical IDs to template section IDs
  const idMap = {
    about: '#about',
    experience: '#experience',
    projects: '#interests',
    skills: '#skills',
    education: '#education',
    certifications: '#awards',
    volunteering: '#awards'
  };

  // Visibility
  Object.entries(idMap).forEach(([logical, css]) => {
    const meta = byId[logical];
    const el = q(css);
    if (!el) return;
    if (meta && meta.visible === false) {
      el.style.display = 'none';
      // also hide corresponding nav item
      const href = css.startsWith('#') ? css : '#' + css;
      const navItem = qa(`#navbarResponsive .nav-link[href="${href}"]`)[0];
      if (navItem) navItem.parentElement.style.display = 'none';
    }
  });

  // Navbar order (de-duplicate anchors like #awards)
  const navUl = q('#navbarResponsive .navbar-nav');
  if (!navUl) return;
  const currentLis = qa('li.nav-item', navUl);
  const liByHref = new Map(currentLis.map(li => [li.querySelector('a')?.getAttribute('href'), li]));

  const desiredOrder = sections
    .filter(s => s.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(s => liByHref.get(idMap[s.id] || `#${s.id}`))
    .filter(Boolean);

  const seen = new Set();
  desiredOrder.forEach(li => {
    const href = li.querySelector('a')?.getAttribute('href');
    if (seen.has(href)) return;
    seen.add(href);
    navUl.appendChild(li);
  });
}

/* ------------------------ renderers ------------------------ */

function renderAbout(about = {}) {
  const nameEl = q('#about h1');
  const subEl = q('#about .subheading');
  const summaryEl = q('#about .lead');
  const socialsEl = q('#about .social-icons');
  const avatar = q('#sideNav img.img-profile');

  // remove loading skeleton if present
  const sk = document.getElementById('about-skeleton');
  if (sk) sk.remove();

  if (nameEl) {
    const first = escapeHTML(about.name?.first || '');
    const last = escapeHTML(about.name?.last || '');
    nameEl.innerHTML = `${first} <span class="text-primary">${last}</span>`;
  }

  const location = [about.location?.city, about.location?.country].filter(Boolean).join(', ');
  const phone = about.contacts?.find(c => c.type === 'phone')?.value;
  const email = about.contacts?.find(c => c.type === 'email')?.value;

  if (subEl) {
    subEl.innerHTML = [
      location,
      phone,
      email ? `<a href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a>` : ''
    ].filter(Boolean).join(' · ');
  }

  if (summaryEl) summaryEl.textContent = about.summary || '';

  if (avatar && about.avatar) avatar.src = about.avatar;

  if (socialsEl) {
    socialsEl.innerHTML = (about.contacts || [])
      .filter(c => ['github','gitlab','linkedin','twitter','x','facebook','website'].includes(c.type))
      .map(c => {
        const icon = c.icon || {
          github: 'fab fa-github',
          gitlab: 'fab fa-gitlab',
          linkedin: 'fab fa-linkedin-in',
          twitter: 'fab fa-twitter',
          x: 'fab fa-x-twitter',
          facebook: 'fab fa-facebook-f',
          website: 'fa-solid fa-globe'
        }[c.type] || 'fa-solid fa-link';
        return `<a class="social-icon" href="${escapeHTML(c.href || '#')}" target="_blank" rel="noreferrer"><i class="${icon}"></i></a>`;
      })
      .join('');
  }

  // Handle download buttons - more robust solution
  const downloadButtonsContainerId = 'download-buttons-container';
  let downloadContainer = q(`#${downloadButtonsContainerId}`);
  
  // If container doesn't exist, create it
  if (!downloadContainer && about.downloadables?.length) {
    downloadContainer = document.createElement('div');
    downloadContainer.id = downloadButtonsContainerId;
    downloadContainer.className = 'mt-3';
    socialsEl?.after(downloadContainer);
  }
  
  // Update content if container exists
  if (downloadContainer) {
    downloadContainer.innerHTML = about.downloadables?.length 
      ? about.downloadables.map(d =>
          `<a class="btn btn-sm btn-outline-primary me-2" href="${escapeHTML(d.href)}" target="_blank" rel="noreferrer">${escapeHTML(d.label)}</a>`
        ).join('')
      : '';
  }
}

function renderLanguages(languages = []) {
  const aboutSection = q('#about .resume-section-content');
  if (!aboutSection || !languages.length) return;
  
  // Remove existing languages section if present
  const existingSection = q('#languages-section');
  if (existingSection) existingSection.remove();
  
  const languagesHtml = `
    <div id="languages-section" class="mt-4">
      <h3 class="mb-3">${currentLanguage === 'es' ? 'Idiomas' : 'Languages'}</h3>
      <ul class="list-unstyled">
        ${languages.map(lang => `
          <li class="mb-2">
            <strong>${escapeHTML(lang.name)}</strong>: ${escapeHTML(lang.level)}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  
  // Append after social icons or download buttons
  const lastElement = q('.social-icons', aboutSection) || 
                     q('.btn-outline-primary:last-child', aboutSection) || 
                     q('.lead', aboutSection);
  
  if (lastElement) {
    lastElement.insertAdjacentHTML('afterend', languagesHtml);
  }
}

function renderExperience(items = []) {
  const wrap = q('#experience .resume-section-content');
  if (!wrap) return;

  const sectionTitle = currentLanguage === 'es' ? 'Experiencia' : 'Experience';
  const stackLabel = currentLanguage === 'es' ? 'Tecnologías' : 'Stack';

  const blocks = items.map(x => {
    const bullets = (x.highlights || x.bullets || []).map(b => `<li>${b}</li>`).join('');
    const stack = x.stack?.length ? `<div class="small text-muted mt-2">${stackLabel}: ${x.stack.join(', ')}</div>` : '';
    const when = `${monthYear(x.employment?.start)} – ${x.employment?.end ? monthYear(x.employment.end) : currentLanguage === 'es' ? 'Actual' : 'Present'}`;
    const loc = [x.company, x.location].filter(Boolean).join(' — ');

    return `
      <div class="d-flex flex-column flex-md-row justify-content-between mb-5">
        <div class="flex-grow-1">
          <h3 class="mb-0">${escapeHTML(x.role || '')}</h3>
          <div class="subheading mb-3">${escapeHTML(loc)}</div>
          ${x.summary ? `<p>${escapeHTML(x.summary)}</p>` : ''}
          ${bullets ? `<ul>${bullets}</ul>` : ''}
          ${stack}
        </div>
        <div class="flex-shrink-0"><span class="text-primary">${when}</span></div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `<h2 class="mb-5">${sectionTitle}</h2>${blocks}`;
}

function renderProjects(items = []) {
  const wrap = q('#interests .resume-section-content');
  if (!wrap) return;

  const sectionTitle = currentLanguage === 'es' ? 'Proyectos' : 'Projects';
  const stackLabel = currentLanguage === 'es' ? 'Tecnologías' : 'Stack';

  const blocks = items.map(p => {
    const links = (p.links || []).map(l =>
      `<a class="me-2" href="${escapeHTML(l.href)}" target="_blank" rel="noreferrer">${escapeHTML(l.label)}</a>`
    ).join('');
    const outcomes = (p.outcomes || []).map(o => `<li>${o}</li>`).join('');
    const stack = p.stack?.length ? `<div class="small text-muted mt-1">${stackLabel}: ${p.stack.join(', ')}</div>` : '';

    return `
      <div class="mb-4">
        <h4 class="mb-1">${escapeHTML(p.name || '')}</h4>
        ${p.subtitle ? `<div class="text-muted">${escapeHTML(p.subtitle)}</div>` : ''}
        <div class="text-primary mb-2">${escapeHTML(p.dates || '')}</div>
        ${p.summary ? `<p>${escapeHTML(p.summary)}</p>` : ''}
        ${outcomes ? `<ul>${outcomes}</ul>` : ''}
        ${links}
        ${stack}
      </div>
    `;
  }).join('');

  wrap.innerHTML = `<h2 class="mb-5">${sectionTitle}</h2>${blocks}`;
}

function renderSkills(skills = {}) {
  const wrap = q('#skills .resume-section-content');
  if (!wrap) return;

  const sectionTitle = currentLanguage === 'es' ? 'Habilidades' : 'Skills';

  const categoryBlocks = (skills.categories || []).map(cat => {
    const items = (cat.items || []).map(it => {
      const label = escapeHTML(it.name || '');
      if (typeof it.level === 'number') {
        const pct = Math.max(0, Math.min(100, (it.level / 5) * 100));
        return `
          <div class="mb-2">
            <div class="d-flex justify-content-between"><span>${label}</span><span class="small text-muted">${it.level}/5</span></div>
            <div class="progress" style="height:6px;"><div class="progress-bar" role="progressbar" style="width:${pct}%"></div></div>
          </div>
        `;
      } else {
        return `<span class="badge bg-secondary me-2 mb-2">${label}</span>`;
      }
    }).join('');

    return `
      <div class="mb-4">
        <div class="subheading mb-2">${escapeHTML(cat.name || '')}</div>
        ${items}
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <h2 class="mb-5">${sectionTitle}</h2>
    ${categoryBlocks}
  `;
}

function renderEducation(items = []) {
  const wrap = q('#education .resume-section-content');
  if (!wrap) return;

  const sectionTitle = currentLanguage === 'es' ? 'Educación' : 'Education';
  const coursesLabel = currentLanguage === 'es' ? 'Cursos seleccionados' : 'Selected courses';
  const thesisLabel = currentLanguage === 'es' ? 'Tesis' : 'Thesis';

  const blocks = items.map(e => `
    <div class="d-flex flex-column flex-md-row justify-content-between mb-5">
      <div class="flex-grow-1">
        <h3 class="mb-0">${escapeHTML(e.school || '')}</h3>
        <div class="subheading mb-3">${escapeHTML(e.degree || '')}${e.location ? ' — ' + escapeHTML(e.location) : ''}</div>
        ${e.courses?.length ? `<div class="small">${coursesLabel}: ${e.courses.map(escapeHTML).join(', ')}</div>` : ''}
        ${e.thesis ? `<div class="small text-muted mt-1">${thesisLabel}: ${escapeHTML(e.thesis)}</div>` : ''}
      </div>
      <div class="flex-shrink-0"><span class="text-primary">${escapeHTML(e.start || '')} – ${escapeHTML(e.end || '')}</span></div>
    </div>
  `).join('');

  wrap.innerHTML = `<h2 class="mb-5">${sectionTitle}</h2>${blocks}`;
}

function renderCertsAndVolunteering(certs = [], volunteering = []) {
  const wrap = q('#awards .resume-section-content');
  if (!wrap) return;

  const sectionTitle = currentLanguage === 'es' ? 'Certificaciones y Voluntariado' : 'Certifications & Volunteering';
  const certsTitle = currentLanguage === 'es' ? 'Certificaciones' : 'Certifications';
  const volTitle = currentLanguage === 'es' ? 'Voluntariado' : 'Volunteering';

  const certList = certs.map(c => `
    <li><strong>${escapeHTML(c.name || '')}</strong> — ${escapeHTML(c.issuer || '')} (${monthYear(c.start)} – ${monthYear(c.end)})</li>
  `).join('');

  const volList = volunteering.map(v => `
    <li>
      <strong>${escapeHTML(v.title || '')}</strong> — ${escapeHTML(v.org || '')} (${escapeHTML(v.dates || '')})
      ${v.summary ? `: ${escapeHTML(v.summary)}` : ''}
    </li>
    ${v.highlights?.length ? `<ul>${v.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
  `).join('');

  wrap.innerHTML = `
    <h2 class="mb-5">${sectionTitle}</h2>
    ${certList ? `<h5 class="mt-2">${certsTitle}</h5><ul>${certList}</ul>` : ''}
    ${volList ? `<h5 class="mt-3">${volTitle}</h5><ul>${volList}</ul>` : ''}
  `;
}
