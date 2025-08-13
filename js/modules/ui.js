import { qa } from './core.js';
import { loadLanguageData } from './language.js';

export function initUI() {
  // Initialize scroll spy if available
  const sideNav = document.body.querySelector('#sideNav');
  if (sideNav && window.bootstrap?.ScrollSpy) {
    new bootstrap.ScrollSpy(document.body, {
      target: '#sideNav',
      rootMargin: '0px 0px -40%',
    });
  }

  // Mobile nav collapse
  const navbarToggler = document.body.querySelector('.navbar-toggler');
  const responsiveNavItems = [].slice.call(
    document.querySelectorAll('#navbarResponsive .nav-link')
  );
  responsiveNavItems.forEach((item) => {
    item.addEventListener('click', () => {
      if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
        navbarToggler.click();
      }
    });
  });

  // Language switcher
  setupLanguageSwitcher();
}

function setupLanguageSwitcher() {
  qa('.language-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lang = e.currentTarget.getAttribute('data-lang');
      if (lang && lang !== currentLanguage) await loadLanguageData(lang);
    });
  });
}