import { languageConfig } from './config.js';
import { q, qa, monthYear } from './core.js';
import { renderAllContent } from './renderers.js';

let currentLanguage = 'en';
let portfolioData = null;
let __renderToken = 0;

export async function initLanguage() {
  const savedLanguage = localStorage.getItem('portfolioLanguage');
  const browserLanguage = (navigator.language || 'en').split('-')[0];
  const defaultLanguage = Object.keys(languageConfig).includes(browserLanguage) ? browserLanguage : 'en';
  await loadLanguageData(savedLanguage || defaultLanguage);
}

export async function loadLanguageData(lang) {
  try {
    if (!languageConfig[lang]) throw new Error(`Language ${lang} not supported`);
    
    const response = await fetch(languageConfig[lang].file, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    portfolioData = await response.json();
    currentLanguage = lang;
    localStorage.setItem('portfolioLanguage', lang);

    updateLanguageSwitcher();
    await renderAllContent(++__renderToken);
  } catch (e) {
    console.error('Failed to load portfolio data:', e);
    if (lang !== 'en') await loadLanguageData('en');
    else showErrorState();
  }
}

function updateLanguageSwitcher() {
  const name = languageConfig[currentLanguage]?.name || 'English';
  qa('.currentLanguage').forEach(el => el.textContent = name);
}

function showErrorState() {
  const aboutLead = q('#about .lead') || q('#about');
  if (aboutLead) aboutLead.textContent = 'Unable to load profile data. Please try reloading.';
}