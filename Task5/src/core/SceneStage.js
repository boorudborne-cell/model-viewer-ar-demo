import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Обёртка над «сценой Three.js»: renderer, камера, OrbitControls,
 * направленный свет для тени, пол с тенью, ресайз и цикл рендера.
 */
export class SceneStage {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50, window.innerWidth / window.innerHeight, 0.01, 30
    );
    this.camera.position.set(0.18, 0.22, 0.36);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.06, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 0.07;
    this.controls.maxDistance = 2.5;
    this.controls.maxPolarAngle = Math.PI * 0.55;

    // Направленный свет нужен для падающей тени: HDRI даёт отражения и
    // заполняющий свет, но сам по себе тени не отбрасывает.
    this.sun = new THREE.DirectionalLight(0xffffff, 1.8);
    this.sun.position.set(0.6, 1.4, 0.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { near: 0.1, far: 4, left: -0.6, right: 0.6, top: 0.6, bottom: -0.6 });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4a63, 0.35));

    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 64).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  get inXR() { return this.renderer.xr.isPresenting; }

  setExposure(value) { this.renderer.toneMappingExposure = value; }

  /** Вызывается из цикла App (renderer.setAnimationLoop). frame — в XR-сессиях. */
  render(frame) {
    if (!this.inXR && this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
