/*!
 * Resume template + JSON renderer
 * Works with /data/portfolio.v2.json (schemaVersion 2.x)
 * Keep your existing section IDs: #about, #experience, #education, #skills, #interests, #awards
 */

window.addEventListener('DOMContentLoaded', async () => {
  // ===== Keep existing behavior (ScrollSpy + responsive toggler) =====
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

  // ===== Load JSON v2 and render =====
  try {
    const data = await fetch('./portfolio.v2.json?v=' + Date.now());
    applySiteMeta(data.site);
    applyVisibilityOrder(data.site?.sections || []);

    renderAbout(data.about);
    renderExperience(data.experience || []);
    renderProjects(data.projects || []);             // maps to #interests
    renderSkills(data.skills || {});
    renderEducation(data.education || []);
    renderCertsAndVolunteering(
      data.certifications || [],
      data.volunteering || []
    );                                               // both go to #awards
  } catch (err) {
    console.error('Failed to load portfolio JSON:', err);
    // Optional: show a friendly fallback message in #about
    const aboutLead = q('#about .lead');
    if (aboutLead) aboutLead.textContent = 'Unable to load profile data. Please try reloading.';
  }
});

/* ------------------------ helpers ------------------------ */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const q = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function monthYear(iso) {
  if (!iso) return '';
  if (iso === 'Present') return 'Present';
  const [y, m] = (iso + '').split('-');
  if (!m) return y;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en', { month: 'long', year: 'numeric' });
}

function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[s]);
}

function applySiteMeta(site = {}) {
  if (site.title) document.title = site.title;
  // Feature flags are available if you want to toggle UI without code changes
}

/** Hide sections marked visible:false in site.sections and (optionally) reorder headings in the navbar */
function applyVisibilityOrder(sections) {
  const byId = Object.fromEntries(sections.map(s => [s.id, s]));
  // Map logical IDs to template section IDs
  const idMap = {
    about: '#about',
    experience: '#experience',
    projects: '#interests',
    skills: '#skills',
    education: '#education',
    certifications: '#awards', // share with volunteering
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

  // Navbar order (optional)
  const navUl = q('#navbarResponsive .navbar-nav');
  if (!navUl) return;
  const currentLis = qa('li.nav-item', navUl);
  const liByHref = new Map(currentLis.map(li => [li.querySelector('a')?.getAttribute('href'), li]));
  // Build desired order from sections[]; skip those without a nav link in template
  const desiredOrder = sections
    .filter(s => s.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(s => {
      const css = idMap[s.id] || `#${s.id}`;
      return liByHref.get(css);
    })
    .filter(Boolean);

  // Append in desired order
  desiredOrder.forEach(li => navUl.appendChild(li));
}

/* ------------------------ renderers ------------------------ */

function renderAbout(about = {}) {
  const nameEl = q('#about h1');
  const subEl = q('#about .subheading');
  const summaryEl = q('#about .lead');
  const socialsEl = q('#about .social-icons');
  const avatar = q('#sideNav img.img-profile');

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

  // Optional: add download CV buttons under the social icons
  if (about.downloadables?.length) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mt-3';
    wrapper.innerHTML = about.downloadables.map(d =>
      `<a class="btn btn-sm btn-outline-primary me-2" href="${escapeHTML(d.href)}" target="_blank" rel="noreferrer">${escapeHTML(d.label)}</a>`
    ).join('');
    socialsEl?.after(wrapper);
  }
}

function renderExperience(items = []) {
  const wrap = q('#experience .resume-section-content');
  if (!wrap) return;

  const blocks = items.map(x => {
    const bullets = (x.highlights || x.bullets || []).map(b => `<li>${b}</li>`).join('');
    const stack = x.stack?.length ? `<div class="small text-muted mt-2">Stack: ${x.stack.join(', ')}</div>` : '';
    const when = `${monthYear(x.employment?.start)} – ${x.employment?.end ? monthYear(x.employment.end) : 'Present'}`;
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

  wrap.innerHTML = `<h2 class="mb-5">Experience</h2>${blocks}`;
}

function renderProjects(items = []) {
  const wrap = q('#interests .resume-section-content');
  if (!wrap) return;

  const blocks = items.map(p => {
    const links = (p.links || []).map(l =>
      `<a class="me-2" href="${escapeHTML(l.href)}" target="_blank" rel="noreferrer">${escapeHTML(l.label)}</a>`
    ).join('');
    const outcomes = (p.outcomes || []).map(o => `<li>${o}</li>`).join('');
    const stack = p.stack?.length ? `<div class="small text-muted mt-1">Stack: ${p.stack.join(', ')}</div>` : '';

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

  wrap.innerHTML = `<h2 class="mb-5">Projects</h2>${blocks}`;
}

function renderSkills(skills = {}) {
  const wrap = q('#skills .resume-section-content');
  if (!wrap) return;

  const toBadgeRow = arr => arr?.length
    ? `<ul class="list-inline dev-icons">${arr.map(s => `<li class="list-inline-item"><span class="badge bg-secondary">${escapeHTML(s.name || s)}</span></li>`).join('')}</ul>`
    : '';

  const categoryBlocks = (skills.categories || []).map(cat => {
    // If items have levels, also show a subtle progress bar
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
    <h2 class="mb-5">Skills</h2>
    ${categoryBlocks}
  `;
}

function renderEducation(items = []) {
  const wrap = q('#education .resume-section-content');
  if (!wrap) return;

  const blocks = items.map(e => `
    <div class="d-flex flex-column flex-md-row justify-content-between mb-5">
      <div class="flex-grow-1">
        <h3 class="mb-0">${escapeHTML(e.school || '')}</h3>
        <div class="subheading mb-3">${escapeHTML(e.degree || '')}${e.location ? ' — ' + escapeHTML(e.location) : ''}</div>
        ${e.courses?.length ? `<div class="small">Selected courses: ${e.courses.map(escapeHTML).join(', ')}</div>` : ''}
        ${e.thesis ? `<div class="small text-muted mt-1">Thesis: ${escapeHTML(e.thesis)}</div>` : ''}
      </div>
      <div class="flex-shrink-0"><span class="text-primary">${escapeHTML(e.start || '')} – ${escapeHTML(e.end || '')}</span></div>
    </div>
  `).join('');

  wrap.innerHTML = `<h2 class="mb-5">Education</h2>${blocks}`;
}

function renderCertsAndVolunteering(certs = [], volunteering = []) {
  const wrap = q('#awards .resume-section-content');
  if (!wrap) return;

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
    <h2 class="mb-5">Certifications & Volunteering</h2>
    ${certList ? `<h5 class="mt-2">Certifications</h5><ul>${certList}</ul>` : ''}
    ${volList ? `<h5 class="mt-3">Volunteering</h5><ul>${volList}</ul>` : ''}
  `;
}
