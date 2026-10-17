import * as THREE from 'three';
import { GLTFLoader } from './libs/loaders/GLTFLoader.js';

const button = document.querySelector('#start');
const status = document.querySelector('#status');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(1, 2, 1);
scene.add(light);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.075, 0.085, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x36cc75, side: THREE.DoubleSide })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

let coinModel = null;
let placedCoin = null;
let hitTestSource = null;
let arSupported = false;

new GLTFLoader().load(
  '../assets/models/Dollar-Coin.glb?v=3',
  (gltf) => { coinModel = gltf.scene; updateButton(); },
  undefined,
  () => { status.textContent = 'Не удалось загрузить монету.'; }
);

if (navigator.xr && window.isSecureContext) {
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    arSupported = supported;
    updateButton();
  }).catch(() => { status.textContent = 'Не удалось проверить поддержку AR.'; });
} else {
  status.textContent = 'WebXR AR недоступен в этом браузере.';
}

function updateButton() {
  button.disabled = !coinModel || !arSupported;
  if (coinModel && arSupported) status.textContent = 'Готово к запуску.';
  else if (coinModel && !arSupported) status.textContent = 'WebXR AR недоступен в этом браузере.';
}

button.addEventListener('click', async () => {
  button.disabled = true;
  let session;
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor']
    });
    session.addEventListener('end', () => {
      hitTestSource?.cancel();
      hitTestSource = null;
      reticle.visible = false;
      if (placedCoin) scene.remove(placedCoin);
      placedCoin = null;
      updateButton();
    }, { once: true });
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    await renderer.xr.setSession(session);
    status.textContent = 'Найдите поверхность и коснитесь экрана.';
  } catch (error) {
    if (session) await session.end().catch(() => {});
    button.disabled = false;
    status.textContent = `AR не запустилась: ${error.message}`;
  }
});

const controller = renderer.xr.getController(0);
controller.addEventListener('select', () => {
  if (!reticle.visible || placedCoin || !coinModel) return;
  placedCoin = coinModel.clone(true);
  reticle.matrix.decompose(placedCoin.position, placedCoin.quaternion, placedCoin.scale);
  scene.add(placedCoin);
  reticle.visible = false;
  status.textContent = 'Монета размещена.';
});
scene.add(controller);

renderer.setAnimationLoop((time, frame) => {
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (frame && hitTestSource && referenceSpace && !placedCoin) {
    const results = frame.getHitTestResults(hitTestSource);
    const pose = results[0]?.getPose(referenceSpace);
    reticle.visible = Boolean(pose);
    if (pose) reticle.matrix.fromArray(pose.transform.matrix);
  }
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
