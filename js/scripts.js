import { initLanguage } from './modules/language.js';
import { initUI } from './modules/ui.js';

// Initialize the app
window.addEventListener('DOMContentLoaded', async () => {
  if (window.__resume_inited__) return;
  window.__resume_inited__ = true;

  // Initialize UI interactions
  initUI();

  // Initialize language system (this will load initial data)
  await initLanguage();
});