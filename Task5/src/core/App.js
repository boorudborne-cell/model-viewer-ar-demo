import * as THREE from 'three';
import { SceneStage } from './SceneStage.js';
import { LightingController } from './LightingController.js';
import { ModelController } from './ModelController.js';
import { ARController } from './ARController.js';
import { ControlPanel } from '../ui/ControlPanel.js';

/**
 * Точка сборки: связывает сцену, HDRI-освещение, модели, AR и UI-панель.
 * Все доменные классы разделены по модулям (SceneStage / LightingController /
 * ModelController / ARController / ControlPanel), App только прокидывает события.
 */
export class App {
  async start() {
    this.stage = new SceneStage(document.getElementById('viewport'));
    this.lighting = new LightingController(this.stage);
    this.models = new ModelController(this.stage.scene);
    this.clock = new THREE.Clock();

    this.ar = new ARController(this.stage, this.models, {
      onStatus: (t, k) => this.panel.setStatus(t, k),
      onStart: () => {
        this.panel.setARPresenting(true);
        this.lighting.onXRSessionChange();
      },
      onEnd: () => {
        this.panel.setARPresenting(false);
        this.lighting.onXRSessionChange();
      },
    });

    this.panel = new ControlPanel({
      onModelChange: (key) => this._guard('смена модели', () => this.models.switchTo(key)),
      onColor: (hex) => this.models.setColor(hex),
      onRotate: (deg) => this.models.rotateAll(deg),
      onSpin: (on) => this.models.setSpin(on),
      onHDRI: (value) => this._guard('HDRI', () =>
        value === 'room' ? this.lighting.applyRoomEnvironment() : this.lighting.loadHDRI(value)),
      onSkybox: (on) => this.lighting.setSkybox(on),
      onExposure: (v) => this.stage.setExposure(v),
      onMetalness: (v) => this.models.setMetalness(v),
      onRoughness: (v) => this.models.setRoughness(v),
      onMaterialsReset: () => this.models.resetMaterials(),
      onARStart: (overlayRoot) => this.ar.start(overlayRoot),
      onARStop: () => this.ar.stop(),
      onARClear: () => { this.models.clearPlacements(); this.panel.setStatus('Размещённые монеты очищены'); },
    });

    // Стартовое освещение: процедурная комната сразу, затем HDRI из списка.
    this.lighting.applyRoomEnvironment();
    const defaultHDRI = this.panel.el.hdri.value;
    await this._guard('HDRI', () => this.lighting.loadHDRI(defaultHDRI));

    await this._guard('модель', () => this.models.switchTo('Dollar-Coin'));
    this.panel.setStatus(
      ARController.supported
        ? 'Готово: модель, HDRI и PBR активны. Вращайте сцену мышью; «Запустить AR» — на телефоне'
        : 'Готово (десктоп-предпросмотр). Для AR откройте страницу по HTTPS на телефоне'
    );

    this.stage.renderer.setAnimationLoop((_time, frame) => {
      this.models.tick(this.clock.getDelta());
      this.ar.update(frame);
      this.stage.render(frame);
    });
  }

  async _guard(label, fn) {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error(`[${label}]`, error);
      this.panel.setStatus(`Ошибка (${label}): ` + (error?.message || error), 'err');
      return false;
    }
  }
}
