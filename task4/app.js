import * as THREE from 'three';
import { GLTFLoader } from './libs/loaders/GLTFLoader.js';

const button = document.querySelector('#start');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFramebufferScaleFactor(0.8);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(1, 2, 1);
scene.add(light);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.0325, 0.045, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

let coinModel = null;
let modelLoadFailed = false;
const placedCoins = [];
const pendingPlacements = [];
let hitTestSource = null;
let touchHitTestSource = null;
const lastHitMatrix = new THREE.Matrix4();
let lastHitTime = 0;
const lastTouchMatrix = new THREE.Matrix4();
let lastTouchSource = null;
let lastTouchTime = 0;

new GLTFLoader().load(
  '../assets/models/Dollar-Coin.glb?v=3',
  (gltf) => {
    coinModel = gltf.scene;
    for (const matrix of pendingPlacements) placeCoin(matrix);
    pendingPlacements.length = 0;
  },
  undefined,
  () => {
    modelLoadFailed = true;
    button.textContent = 'Не удалось загрузить монету';
    button.disabled = true;
  }
);

if (navigator.xr && window.isSecureContext) {
  button.disabled = false;
} else {
  button.textContent = 'AR недоступна';
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
      for (const coin of placedCoins) scene.remove(coin);
      placedCoins.length = 0;
      pendingPlacements.length = 0;
      button.disabled = modelLoadFailed;
    }, { once: true });
    session.addEventListener('select', onSelect);
    await renderer.xr.setSession(session);
    startHitTests(session);
    startTouchHitTest(session);
  } catch (error) {
    if (session) await session.end().catch(() => {});
    button.disabled = modelLoadFailed;
    if (!modelLoadFailed) button.textContent = 'Повторить запуск AR';
  }
});

async function startHitTests(session) {
  try {
    const viewerSpace = await session.requestReferenceSpace('viewer');
    const source = await session.requestHitTestSource({ space: viewerSpace });
    if (renderer.xr.getSession() === session) hitTestSource = source;
    else source.cancel();
  } catch { /* The session may have ended before tracking started. */ }
}

async function startTouchHitTest(session) {
  if (!session.requestHitTestSourceForTransientInput) return;
  try {
    const source = await session.requestHitTestSourceForTransientInput({
      profile: 'generic-touchscreen'
    });
    if (renderer.xr.getSession() === session) touchHitTestSource = source;
    else source.cancel();
  } catch { /* Taps still work through the centre hit-test. */ }
}

function onSelect(event) {
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (!hitTestSource || !referenceSpace) return;

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

  const matrix = lastHitMatrix.clone();
  if (coinModel) placeCoin(matrix);
  else pendingPlacements.push(matrix);
}

function placeCoin(matrix) {
  const coin = coinModel.clone(true);
  matrix.decompose(coin.position, coin.quaternion, coin.scale);
  coin.scale.multiplyScalar(0.5);
  scene.add(coin);
  placedCoins.push(coin);
}

renderer.setAnimationLoop((time, frame) => {
  if (!frame) return;
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (touchHitTestSource && referenceSpace) {
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
  if (hitTestSource && referenceSpace) {
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
