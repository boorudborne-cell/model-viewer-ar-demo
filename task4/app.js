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
  new THREE.RingGeometry(0.065, 0.09, 40).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

let coinModel = null;
let placedCoin = null;
let hitTestSource = null;
let touchHitTestSource = null;
let arSupported = false;
const lastHitMatrix = new THREE.Matrix4();
let lastHitTime = 0;
const lastTouchMatrix = new THREE.Matrix4();
let lastTouchSource = null;
let lastTouchTime = 0;

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
      hitTestSource = null;
      touchHitTestSource = null;
      lastHitTime = 0;
      lastTouchSource = null;
      lastTouchTime = 0;
      reticle.visible = false;
      if (placedCoin) scene.remove(placedCoin);
      placedCoin = null;
      updateButton();
    }, { once: true });
    session.addEventListener('select', onSelect);
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    if (session.requestHitTestSourceForTransientInput) {
      try {
        touchHitTestSource = await session.requestHitTestSourceForTransientInput({
          profile: 'generic-touchscreen'
        });
      } catch { /* Taps still work through the centre hit-test. */ }
    }
    await renderer.xr.setSession(session);
    status.textContent = 'Найдите поверхность и коснитесь экрана.';
  } catch (error) {
    if (session) await session.end().catch(() => {});
    button.disabled = false;
    status.textContent = `AR не запустилась: ${error.message}`;
  }
});

function onSelect(event) {
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (!coinModel || !hitTestSource || !referenceSpace) return;

  let pose = null;
  if (touchHitTestSource) {
    try {
      const groups = event.frame.getHitTestResultsForTransientInput(touchHitTestSource);
      const touch = groups.find((group) => group.inputSource === event.inputSource);
      pose = touch?.results[0]?.getPose(referenceSpace);
    } catch { /* Fall back to the centre or last visible marker. */ }
  }
  if (!pose && event.inputSource === lastTouchSource && performance.now() - lastTouchTime < 500) {
    lastHitMatrix.copy(lastTouchMatrix);
    lastHitTime = performance.now();
  }
  if (!pose && performance.now() - lastHitTime > 500) {
    try { pose = event.frame.getHitTestResults(hitTestSource)[0]?.getPose(referenceSpace); }
    catch { /* Use the last recently visible marker. */ }
  }
  if (pose) {
    lastHitMatrix.fromArray(pose.transform.matrix);
    lastHitTime = performance.now();
  }
  if (performance.now() - lastHitTime > 500) return;

  if (!placedCoin) {
    placedCoin = coinModel.clone(true);
    scene.add(placedCoin);
  }
  lastHitMatrix.decompose(placedCoin.position, placedCoin.quaternion, placedCoin.scale);
  status.textContent = 'Монета размещена. Коснитесь ещё раз, чтобы переставить.';
}

renderer.setAnimationLoop((time, frame) => {
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (frame && touchHitTestSource && referenceSpace) {
    try {
      const groups = frame.getHitTestResultsForTransientInput(touchHitTestSource);
      for (const group of groups) {
        const pose = group.results[0]?.getPose(referenceSpace);
        if (pose) {
          lastTouchMatrix.fromArray(pose.transform.matrix);
          lastTouchSource = group.inputSource;
          lastTouchTime = performance.now();
        }
      }
    } catch { /* The centre hit-test remains available. */ }
  }
  if (frame && hitTestSource && referenceSpace) {
    const results = frame.getHitTestResults(hitTestSource);
    const pose = results[0]?.getPose(referenceSpace);
    reticle.visible = Boolean(pose);
    if (pose) {
      reticle.matrix.fromArray(pose.transform.matrix);
      lastHitMatrix.copy(reticle.matrix);
      lastHitTime = performance.now();
    }
  }
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
