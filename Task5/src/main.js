import { App } from './core/App.js?v=2';

new App().start().catch((error) => {
  console.error('Fatal:', error);
  const status = document.getElementById('status');
  if (status) {
    status.textContent = 'Ошибка инициализации: ' + (error?.message || error);
    status.className = 'status err';
  }
});
