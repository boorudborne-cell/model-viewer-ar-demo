/**
 * HTML UI-панель (она же dom-overlay в AR). Компактная: AR-кнопка, модель,
 * цвет и автовращение всегда на виду; HDRI/PBR/повороты — в свёрнутом блоке
 * «Настройки». beforexrselect на панели гасит XR select, чтобы тапы по UI
 * не «проходили» в сцену и не ставили монету сквозь кнопки.
 */
export class ControlPanel {
  constructor(handlers) {
    this.h = handlers;
    const $ = (id) => document.getElementById(id);
    this.el = {
      panel: $('panel'),
      overlay: $('xr-overlay'),
      status: $('status'),
      arStart: $('ar-start'),
      spinToggle: $('spin-toggle'),
      modelTabs: $('model-tabs'),
      swatches: $('swatches'),
      customColor: $('custom-color'),
      rotL: $('rot-l'),
      rotR: $('rot-r'),
      hdri: $('hdri'),
      skybox: $('skybox'),
      skyChip: $('sky-chip'),
      exposure: $('exposure'),
      metalness: $('metalness'),
      roughness: $('roughness'),
      matReset: $('mat-reset'),
      arControls: $('ar-controls'),
      arClear: $('ar-clear'),
      arStop: $('ar-stop'),
      advanced: $('advanced'),
      hint: $('hint'),
    };

    this._bind();
    this.arReady = this._detectAR();

    // Тапы по UI не должны попадать в XR-сцену.
    this.el.panel.addEventListener('beforexrselect', (e) => e.preventDefault());

    // На широких экранах настройки открыты сразу, на телефоне — по кнопке.
    // Реагируем только на пересечение брейкпоинта, чтобы не сбрасывать выбор пользователя.
    let wasWide = window.innerWidth >= 900;
    this.el.advanced.open = wasWide;
    window.addEventListener('resize', () => {
      const isWide = window.innerWidth >= 900;
      if (isWide === wasWide) return;
      wasWide = isWide;
      if (!this.presenting) this.el.advanced.open = isWide;
    });
  }

  _bind() {
    const { el, h } = { el: this.el, h: this.h };

    el.arStart.addEventListener('click', async () => {
      if (el.arStart.dataset.ready !== '1') {
        this.setStatus('AR сейчас недоступна. Откройте страницу в Chrome на Android (ARCore) по HTTPS.', 'warn');
        return;
      }
      el.arStart.disabled = true;
      try {
        await h.onARStart(el.overlay || el.panel);
      } catch {
        /* подробный статус уже выставлен в ARController */
      } finally {
        if (!this.presenting) el.arStart.disabled = false;
      }
    });

    el.modelTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      for (const b of el.modelTabs.querySelectorAll('.seg-btn')) b.classList.toggle('on', b === btn);
      h.onModelChange(btn.dataset.model);
    });

    el.swatches.addEventListener('click', (e) => {
      const btn = e.target.closest('.swatch');
      if (!btn || btn.classList.contains('custom')) return;
      this._pickSwatch(btn);
      h.onColor(btn.dataset.color || null);
    });
    el.customColor.addEventListener('input', () => {
      this._pickSwatch(el.customColor);
      h.onColor(el.customColor.value);
    });
    el.customColor.addEventListener('change', () => h.onColor(el.customColor.value));

    el.spinToggle.addEventListener('click', () => {
      const on = !el.spinToggle.classList.contains('on');
      el.spinToggle.classList.toggle('on', on);
      el.spinToggle.setAttribute('aria-pressed', String(on));
      h.onSpin(on);
    });

    el.rotL.addEventListener('click', () => h.onRotate(-45));
    el.rotR.addEventListener('click', () => h.onRotate(45));

    el.hdri.addEventListener('change', () => h.onHDRI(el.hdri.value));
    el.skybox.addEventListener('change', () => {
      el.skyChip.classList.toggle('on', el.skybox.checked);
      h.onSkybox(el.skybox.checked);
    });
    el.exposure.addEventListener('input', () => h.onExposure(parseFloat(el.exposure.value)));
    el.metalness.addEventListener('input', () => h.onMetalness(parseFloat(el.metalness.value)));
    el.roughness.addEventListener('input', () => h.onRoughness(parseFloat(el.roughness.value)));
    el.matReset.addEventListener('click', () => {
      el.metalness.value = 1;
      el.roughness.value = 1;
      h.onMaterialsReset();
    });

    el.arStop.addEventListener('click', () => h.onARStop());
    el.arClear.addEventListener('click', () => h.onARClear());
  }

  _pickSwatch(btn) {
    for (const b of this.el.swatches.querySelectorAll('.swatch')) b.classList.remove('on');
    btn.classList.add('on');
  }

  /** Проверка поддержки AR до показа кнопки: иначе она выглядит «живой», но мертва. */
  async _detectAR() {
    const btn = this.el.arStart;
    if (!ARController.supported) {
      btn.disabled = true;
      btn.textContent = window.isSecureContext
        ? 'AR недоступна (нет WebXR)'
        : 'AR: нужен HTTPS';
      this.setStatus(
        'Локальный предпросмотр активен. AR недоступна: ' +
        (window.isSecureContext ? 'нет WebXR в этом браузере' : 'открыто без HTTPS/localhost'),
        'warn'
      );
      return;
    }

    // Кнопка в HTML отключена по умолчанию: включаем её, только если устройство
    // действительно поддерживает immersive-ar.
    navigator.xr.isSessionSupported('immersive-ar')
      .then((ok) => {
        btn.disabled = !ok;
        if (!ok) btn.textContent = 'AR не поддерживается';
      })
      .catch(() => {
        btn.disabled = true;
        btn.textContent = 'AR не поддерживается';
      });
  }

  get presenting() { return this.el.panel.classList.contains('presenting'); }

  setARPresenting(on) {
    this.el.panel.classList.toggle('presenting', on);
    this.el.arControls.hidden = !on;
    this.el.arStart.hidden = on;
    this.el.arStart.disabled = on;
  }

  setStatus(text, kind = '') {
    this.el.status.textContent = text;
    this.el.status.className = 'status' + (kind ? ' ' + kind : '');
  }
}