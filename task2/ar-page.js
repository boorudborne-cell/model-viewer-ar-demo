document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  const imageMode = document.body.dataset.mode === 'image';
  const systemName = imageMode ? 'mindar-image-system' : 'mindar-face-system';
  const target = imageMode ? document.getElementById('image-target') : scene;
  const startButton = document.getElementById('start-ar');
  const stopButton = document.getElementById('stop-ar');
  const switchButton = document.getElementById('switch-camera');
  const status = document.getElementById('ar-status');
  let running = false;

  function say(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function ready() {
    if (!window.isSecureContext) {
      say('Для камеры откройте страницу по HTTPS или через localhost.', true);
      return;
    }
    if (!scene.systems[systemName]) {
      say('Не удалось загрузить MindAR. Перезагрузите страницу.', true);
      return;
    }
    startButton.disabled = false;
    say('Сцена готова. Нажмите «Включить камеру».');
  }

  if (scene.hasLoaded) ready();
  else scene.addEventListener('loaded', ready, {once: true});

  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    say('Запрашиваем доступ к камере…');
    try {
      await scene.systems[systemName].start();
      running = true;
      startButton.hidden = true;
      stopButton.hidden = false;
      if (switchButton) switchButton.hidden = false;
      say(imageMode ? 'Наведите камеру на плакат-маркер.' : 'Наведите фронтальную камеру на лицо.');
    } catch (error) {
      startButton.disabled = false;
      say('Не удалось включить камеру. Проверьте разрешение браузера и HTTPS.', true);
      console.error(error);
    }
  });

  stopButton.addEventListener('click', () => {
    scene.systems[systemName].stop();
    running = false;
    stopButton.hidden = true;
    if (switchButton) switchButton.hidden = true;
    startButton.hidden = false;
    startButton.disabled = false;
    say('Камера остановлена.');
  });

  if (switchButton) switchButton.addEventListener('click', () => {
    scene.systems[systemName].switchCamera();
    say('Камера переключена. Наведите её на лицо.');
  });

  scene.addEventListener('arError', () => {
    startButton.disabled = false;
    say('Не удалось запустить AR. Проверьте доступ к камере и обновите страницу.', true);
  });
  target.addEventListener('targetFound', () => {
    say(imageMode ? 'Маркер найден — маска появилась.' : 'Лицо найдено — маска появилась.');
  });
  target.addEventListener('targetLost', () => {
    if (running) say(imageMode ? 'Маркер потерян. Покажите камере весь плакат.' : 'Лицо потеряно. Посмотрите в камеру.');
  });
  window.addEventListener('pagehide', () => {
    if (running) scene.systems[systemName].stop();
  });
});
