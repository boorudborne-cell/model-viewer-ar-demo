import { MODELS } from '../core/ModelController.js';
import { ARController } from '../core/ARController.js';

/**
 * HTML UI-панель (она же dom-overlay в AR): привязка кнопок/селекторов/слайдеров
 * к контроллерам. beforexrselect на панели гасит XR select, чтобы тапы по UI
 * не «проходили» в сцену и не ставили монету сквозь кнопки.
 */
export class ControlPanel {
  constructor(handlers) {
    this.h = handlers;
    this.el = {
      panel: document.getElementById('panel'),
      status: document.getElementById('status'),
      model: document.getElementById('model'),
      swatches: document.getElementById('swatches'),
      customColor: document.getElementById('custom-color'),
      rotL: document.getElementById('rot-l'),
      rotR: document.getElementById('rot-r'),
      spin: document.getElementById('spin'),
      spinChip: document.getElementById('spin-chip'),
      hdri: document.getElementById('hdri'),
      skybox: document.getElementById('skybox'),
      skyChip: document.getElementById('sky-chip'),
      exposure: document.getElementById('exposure'),
      metalness: document.getElementById('metalness'),
      roughness: document.getElementById('roughness'),
      matReset: document.getElementById('mat-reset'),
      arStart: document.getElementById('ar-start'),
      arClear: document.getElementById('ar-clear'),
      arStop: document.getElementById('ar-stop'),
    };

    this._fillModelSelect();
    this._bind();
    this._setupARButton();

    // Тапы по UI не должны попадать в XR-сцену.
    this.el.panel.addEventListener('beforexrselect', (e) => e.preventDefault());
  }

  _fillModelSelect() {
    this.el.model.innerHTML = '';
    for (const [key, cfg] of Object.entries(MODELS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = cfg.label;
      this.el.model.appendChild(opt);
    }
  }

  _bind() {
    const { el, h } = { el: this.el, h: this.h };

    el.model.addEventListener('change', () => h.onModelChange(el.model.value));

    // Свотчи цвета: data-color="" — исходный цвет из glTF.
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

    el.rotL.addEventListener('click', () => h.onRotate(-45));
    el.rotR.addEventListener('click', () => h.onRotate(45));
    el.spin.addEventListener('change', () => {
      el.spinChip.classList.toggle('on', el.spin.checked);
      h.onSpin(el.spin.checked);
    });

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

    el.arStart.addEventListener('click', async () => {
      try { await h.onARStart(el.panel); } catch { /* статус уже показан */ }
    });
    el.arStop.addEventListener('click', () => h.onARStop());
    el.arClear.addEventListener('click', () => h.onARClear());
  }

  _pickSwatch(btn) {
    for (const b of this.el.swatches.querySelectorAll('.swatch')) b.classList.remove('on');
    btn.classList.add('on');
  }

  _setupARButton() {
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

  setARPresenting(on) {
    this.el.arStart.hidden = on;
    this.el.arClear.hidden = !on;
    this.el.arStop.hidden = !on;
  }

  setStatus(text, kind = '') {
    this.el.status.textContent = text;
    this.el.status.className = 'status' + (kind ? ' ' + kind : '');
  }
}
