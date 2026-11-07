import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Реестр моделей. diameter — физический диаметр монеты в метрах (для AR). */
export const MODELS = {
  'Dollar-Coin': {
    label: 'Dollar-Coin (glTF)',
    url: './assets/models/Dollar-Coin.glb?v=1',
    diameter: 0.08,
  },
  'Dollar-Coin-10RUB': {
    label: 'Dollar-Coin-10RUB (glTF)',
    url: './assets/models/Dollar-Coin-10RUB.glb?v=1',
    diameter: 0.07,
  },
};

/**
 * Загрузка и управление 3D-объектом:
 *  — glTF-модели с PBR-текстурами (metalness/roughness из файла);
 *  — витрина для десктопа (showcase) и размещённые копии для AR (placements);
 *  — смена цвета / metalness / roughness поверх оригинальных значений материала;
 *  — поворот и автовращение всех экземпляров.
 */
export class ModelController {
  constructor(scene) {
    this.loader = new GLTFLoader();
    this.cache = new Map();          // key -> нормализованный шаблон
    this.currentKey = null;
    this.current = null;             // активный шаблон
    this.materials = [];             // стандартные (PBR) материалы текущего шаблона
    this.originals = new Map();      // material -> исходные color/metalness/roughness
    this.userColor = null;
    this.metalOverride = null;
    this.roughOverride = null;

    this.showcase = new THREE.Group();
    this.showcase.position.set(0, 0.055, 0);
    this.placements = new THREE.Group();
    this._placedMatrices = [];       // матрицы размещения для пересборки при смене модели
    scene.add(this.showcase, this.placements);

    this.spin = true;
    this.spinSpeed = THREE.MathUtils.degToRad(30); // °/сек
  }

  async load(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const gltf = await this.loader.loadAsync(MODELS[key].url);
    const root = gltf.scene;

    // Нормализация: приводим монету к физическому диаметру и центрируем.
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z) || size.y;
    root.scale.multiplyScalar(MODELS[key].diameter / span);

    const box2 = new THREE.Box3().setFromObject(root);
    const center = box2.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -box2.min.y, -center.z);

    root.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
    });

    const template = new THREE.Group();
    template.add(root);
    this.cache.set(key, template);
    return template;
  }

  async switchTo(key) {
    const template = await this.load(key);
    if (this.current) this.showcase.remove(this.current);
    this.current = template;
    this.currentKey = key;
    this.showcase.add(template);

    this._collectMaterials(template);
    this._applyMaterialOverrides();
    this._rebuildPlacements();
    return template;
  }

  /* ---------- материалы (PBR) ---------- */

  _collectMaterials(root) {
    this.materials = [];
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m.isMeshStandardMaterial || this.materials.includes(m)) continue;
        this.materials.push(m);
        if (!this.originals.has(m)) {
          this.originals.set(m, {
            color: m.color.clone(),
            metalness: m.metalness,
            roughness: m.roughness,
          });
        }
      }
    });
  }

  setColor(hex) { this.userColor = hex; this._applyMaterialOverrides(); }
  setMetalness(v) { this.metalOverride = v; this._applyMaterialOverrides(); }
  setRoughness(v) { this.roughOverride = v; this._applyMaterialOverrides(); }
  resetMaterials() {
    this.userColor = null; this.metalOverride = null; this.roughOverride = null;
    this._applyMaterialOverrides();
  }

  _applyMaterialOverrides() {
    const tint = this.userColor ? new THREE.Color(this.userColor) : null;
    for (const m of this.materials) {
      const o = this.originals.get(m);
      if (!o) continue;
      m.color.copy(tint ?? o.color);
      m.metalness = this.metalOverride ?? o.metalness;
      m.roughness = this.roughOverride ?? o.roughness;
      m.needsUpdate = true;
    }
  }

  /* ---------- размещение и поворот экземпляров ---------- */

  /** Поставить копию текущей модели по матрице hit-test из AR. */
  placeAt(matrix) {
    if (!this.current) return null;
    this._placedMatrices.push(matrix.clone());
    return this._placeOne(matrix);
  }

  _placeOne(matrix) {
    const inst = this.current.clone(true); // клона разделяют материалы — цвет/поворот применяются ко всем
    matrix.decompose(inst.position, inst.quaternion, inst.scale);
    this.placements.add(inst);
    return inst;
  }

  _rebuildPlacements() {
    this.placements.clear();
    for (const m of this._placedMatrices) this._placeOne(m);
  }

  clearPlacements() {
    this._placedMatrices.length = 0;
    this.placements.clear();
  }

  rotateAll(degrees) {
    const rad = THREE.MathUtils.degToRad(degrees);
    this.showcase.rotateY(rad);
    for (const p of this.placements.children) p.rotateY(rad);
  }

  tick(deltaSec) {
    if (!this.spin) return;
    this.showcase.rotateY(this.spinSpeed * deltaSec);
    for (const p of this.placements.children) p.rotateY(this.spinSpeed * deltaSec);
  }

  setSpin(on) { this.spin = on; }
}
