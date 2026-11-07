import * as THREE from 'three';

/**
 * WebXR immersive-AR: hit-test по центру экрана и по касанию (transient input),
 * кольцо-ретикл, постановка монет через ModelController.
 * dom-overlay: панель UI (#panel) остаётся кликабельной внутри AR-сессии.
 */
export class ARController {
  static get supported() {
    return Boolean(navigator.xr) && window.isSecureContext;
  }

  constructor(stage, models, hooks = {}) {
    this.stage = stage;
    this.models = models;
    this.hooks = hooks; // { onStatus(text, kind), onStart(), onEnd() }

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.0325, 0.045, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    stage.scene.add(this.reticle);

    this.session = null;
    this.hitTestSource = null;
    this.touchHitTestSource = null;
    this.lastHitMatrix = new THREE.Matrix4();
    this.lastHitTime = 0;
    this.lastTouchMatrix = new THREE.Matrix4();
    this.lastTouchSource = null;
    this.lastTouchTime = 0;
  }

  _status(text, kind) { this.hooks.onStatus?.(text, kind); }

  async start(overlayRoot) {
    if (this.session) return;
    this._status('Запуск AR-сессии…');
    let session;
    try {
      session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: overlayRoot ? ['dom-overlay', 'light-estimation'] : ['light-estimation'],
        ...(overlayRoot ? { domOverlay: { root: overlayRoot } } : {}),
      });
      session.addEventListener('end', () => this._onEnd(), { once: true });
      session.addEventListener('select', (e) => this._onSelect(e));
      await this.stage.renderer.xr.setSession(session);
      this.session = session;
      this._onStart();
      this._startHitTests(session);
      this._startTouchHitTest(session);
    } catch (error) {
      if (session) await session.end().catch(() => {});
      this._status('Не удалось запустить AR: ' + (error?.message || error), 'err');
      throw error;
    }
  }

  stop() { this.session?.end().catch(() => {}); }

  _onStart() {
    // В AR витрина и пол-«студия» мешают: видна только камера и размещённые монеты.
    this.models.showcase.visible = false;
    this.stage.ground.visible = false;
    this.stage.controls.enabled = false;
    this.hooks.onStart?.();
    this._status('AR активен: наведите камеру на поверхность и коснитесь её, чтобы поставить монету');
  }

  _onEnd() {
    this.session = null;
    this.hitTestSource = null;
    this.touchHitTestSource = null;
    this.lastHitTime = 0;
    this.lastTouchSource = null;
    this.lastTouchTime = 0;
    this.reticle.visible = false;
    this.models.showcase.visible = true;
    this.stage.ground.visible = true;
    this.stage.controls.enabled = true;
    this.hooks.onEnd?.();
    this._status('AR завершён. Размещённые монеты очищены');
    this.models.clearPlacements();
  }

  async _startHitTests(session) {
    try {
      const viewerSpace = await session.requestReferenceSpace('viewer');
      const source = await session.requestHitTestSource({ space: viewerSpace });
      if (this.stage.renderer.xr.getSession() === session) this.hitTestSource = source;
      else source.cancel();
    } catch { /* Сессия могла закончиться до старта трекинга. */ }
  }

  async _startTouchHitTest(session) {
    if (!session.requestHitTestSourceForTransientInput) return;
    try {
      const source = await session.requestHitTestSourceForTransientInput({
        profile: 'generic-touchscreen',
      });
      if (this.stage.renderer.xr.getSession() === session) this.touchHitTestSource = source;
      else source.cancel();
    } catch { /* Тапы останутся через центральный hit-test. */ }
  }

  _onSelect(event) {
    const refSpace = this.stage.renderer.xr.getReferenceSpace();
    if (!this.hitTestSource || !refSpace) return;

    let pose = null;
    if (this.touchHitTestSource) {
      try {
        const groups = event.frame.getHitTestResultsForTransientInput(this.touchHitTestSource);
        const touch = groups.find((g) => g.inputSource === event.inputSource);
        pose = touch?.results[0]?.getPose(refSpace);
      } catch { /* Резерв — центральный hit-test. */ }
    }
    if (!pose && event.inputSource === this.lastTouchSource && performance.now() - this.lastTouchTime < 500) {
      this.lastHitMatrix.copy(this.lastTouchMatrix);
      this.lastHitTime = performance.now();
    }
    if (!pose && performance.now() - this.lastHitTime > 500) {
      try { pose = event.frame.getHitTestResults(this.hitTestSource)[0]?.getPose(refSpace); }
      catch { /* Используем последнюю видимую точку. */ }
    }
    if (pose) {
      this.lastHitMatrix.fromArray(pose.transform.matrix);
      this.lastHitTime = performance.now();
    }
    if (performance.now() - this.lastHitTime > 500) return;

    this.models.placeAt(this.lastHitMatrix);
    this._status('Монета размещена ✓ (касание — ещё одна, кнопки UI работают через overlay)');
  }

  /** Вызывается из цикла App, пока активна XR-сессия. */
  update(frame) {
    if (!frame || !this.session) return;
    const refSpace = this.stage.renderer.xr.getReferenceSpace();

    if (this.touchHitTestSource && refSpace) {
      try {
        const groups = frame.getHitTestResultsForTransientInput(this.touchHitTestSource);
        for (const group of groups) {
          const pose = group.results[0]?.getPose(refSpace);
          if (pose) {
            this.lastTouchMatrix.fromArray(pose.transform.matrix);
            this.lastTouchSource = group.inputSource;
            this.lastTouchTime = performance.now();
          }
        }
      } catch { /* Центральный hit-test остаётся доступным. */ }
    }

    if (this.hitTestSource && refSpace) {
      const pose = frame.getHitTestResults(this.hitTestSource)[0]?.getPose(refSpace);
      this.reticle.visible = Boolean(pose);
      if (pose) {
        this.reticle.matrix.fromArray(pose.transform.matrix);
        this.lastHitMatrix.copy(this.reticle.matrix);
        this.lastHitTime = performance.now();
      }
    }
  }
}
