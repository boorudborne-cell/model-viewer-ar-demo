# Задание 5 — Three.js: управление объектом, HDRI-освещение, PBR, UI в AR

Интерактивная сцена на **Three.js r169** (ES-модули, без сборщика): монета
**Dollar-Coin ↔ Dollar-Coin-10RUB**, смена цвета и PBR-параметров, поворот и
автовращение, HDRI-освещение через environment map, WebXR AR с hit-test и
панелью управления через **dom-overlay**.

## Структура проекта (декомпозиция на классы-модули)

```text
Task5/
├── index.html                 загрузка importmap, разметка UI-панели
├── styles.css                 оформление панели (адаптив: справа / снизу)
├── src/
│   ├── main.js                точка входа: запуск App
│   ├── core/
│   │   ├── App.js             связывает все модули (оркестратор)
│   │   ├── SceneStage.js      сцена: renderer, камера, OrbitControls, свет-солнце, пол с тенью, ресайз
│   │   ├── LightingController.js  HDRI (RGBELoader) → PMREMGenerator → scene.environment; skybox; RoomEnvironment
│   │   ├── ModelController.js загрузка glTF (GLTFLoader), нормализация размера, смена модели, цвет/metalness/roughness, поворот, размещение копий в AR
│   │   └── ARController.js    WebXR immersive-ar: hit-test (центр + касание), ретикл, старт/стоп сессии, dom-overlay
│   └── ui/
│       └── ControlPanel.js    HTML UI: кнопки, селекторы, свотчи, слайдеры; beforexrselect против «тыканий сквозь UI»
├── assets/
│   ├── models/                Dollar-Coin.glb, Dollar-Coin-10RUB.glb (+ лицензии)
│   └── environments/          три HDRI-карты (.hdr)
└── libs/three/                Three.js r169 локально (three.module.js + примеры jsm)
```

## Как выполнены требования

| Требование | Реализация |
|---|---|
| Элементы управления объектом | HTML UI-панель: смена модели, цвета (свотчи + пипетка), поворот ±45°, автовращение, metalness/roughness, exposure, HDRI, skybox, AR |
| Поворот / смена цвета / замена модели | `ModelController.rotateAll()`, `setColor()`, `switchTo()`; обе монеты — glTF-файлы |
| HDRI / environment map | `LightingController`: RGBELoader → PMREMGenerator → `scene.environment` (3 карты + процедурная комната) |
| PBR-материалы | glTF с metalness/roughness-текстурами, `MeshStandardMaterial`, слайдеры поверх оригинальных значений, кнопка «Из glTF» для сброса |
| Модульность | 7 классов по слоям core/ui, импорт-маппинг через `importmap` |
| UI в AR и не мешает | панель объявлена `domOverlay.root` в `requestSession`; слушатель `beforexrselect` на панели отменяет XR select — тапы по кнопкам не ставят монету «сквозь» UI |

## Запуск

```bat
:: из корня папки Z (нужен любой HTTP-сервер)
serve.bat 8080
:: открыть http://localhost:8080/Task5/
```

или `python -m http.server 8080` / `npx http-server -p 8080`.

**AR** требует HTTPS (или localhost) и поддерживаемое устройство:
Chrome + ARCore на Android. Онлайн-версия:
https://boorudborne-cell.github.io/model-viewer-ar-demo/Task5/

## Проверено

- загрузка обеих монет, замена без перезагрузки;
- смена цвета (в т.ч. «матовая эмаль» = pink + metalness 0.1), сброс к значениям glTF;
- переключение трёх HDRI, skybox, экспозиция;
- автовращение и ручной поворот;
- код отдаётся локальным сервером с корректными MIME (`model/gltf-binary`, `.hdr`).
