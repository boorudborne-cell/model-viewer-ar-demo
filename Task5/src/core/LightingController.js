import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * HDRI-освещение через environment map: .hdr карта загружается RGBELoader,
 * сворачивается PMREMGenerator'ом в IBL-текстуру и назначается scene.environment.
 * Опционально та же карта ставится фоном сцены (skybox).
 */
export class LightingController {
  constructor(stage) {
    this.stage = stage;
    this.pmrem = new THREE.PMREMGenerator(stage.renderer);
    this.envRT = null;        // RenderTarget с свёрнутой картой
    this.skybox = false;
    this.currentSource = 'room';
  }

  /** Быстрая процедурная «комната» — стартовый envmap, пока HDRI грузится. */
  applyRoomEnvironment() {
    const room = new RoomEnvironment();
    const rt = this.pmrem.fromScene(room, 0.04);
    room.dispose?.();
    this._swap(rt);
    this.currentSource = 'room';
    return Promise.resolve();
  }

  /** Загрузить и применить HDRI-карту (.hdr). */
  loadHDRI(url) {
    return new Promise((resolve, reject) => {
      new RGBELoader().load(
        url,
        (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          const rt = this.pmrem.fromEquirectangular(tex);
          tex.dispose();
          this._swap(rt);
          this.currentSource = url;
          resolve();
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  setSkybox(on) {
    this.skybox = on;
    this._syncBackground();
  }

  _swap(rt) {
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
    this.stage.scene.environment = rt.texture;
    this._syncBackground();
  }

  _syncBackground() {
    // В AR фон обязан быть прозрачным — иначе камера не видна.
    const useBg = this.skybox && !this.stage.inXR;
    this.stage.scene.background = useBg ? this.envRT?.texture ?? null : null;
  }

  onXRSessionChange() { this._syncBackground(); }

  dispose() {
    this.envRT?.dispose();
    this.pmrem.dispose();
  }
}
