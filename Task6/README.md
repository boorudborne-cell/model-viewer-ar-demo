# Задание 6 — WebAR на Unity + WebXR Exporter

AR-сцена Unity (WebGL), собранная на пакете **De-Panther unity-webxr-export**
(`com.de-panther.webxr` 0.25.0). Объект — низкополигональный «куб» —
висит в **viewer-space**: в центре поля зрения камеры, следует за головой,
покачивается и вращается. Новый проект (не монета и не маска).

## Что сделано

| Требование | Реализация |
|---|---|
| unity-webxr-export подключён | Пакет встроен в `Packages/com.de-panther.webxr` (исходники + .meta, версия 0.25.0), зависимость `com.unity.xr.management` обновлена до 4.6.1, провайдер включается автоматически скриптом сборки |
| Камера WebXR и WebXRController | `XR Rig` → `WebXRManager`; `Main Camera` содержит `Camera`, `WebXRCamera`, `WebXRController`, `WebXRSessionController` |
| Объект в центре экрана (viewer-space) | `Assets/Scripts/ViewerSpaceAnchor.cs` — позиция = позиция камеры + forward × 1.1 м, плавное следование, «лицо» к камере, покачивание, вращение |
| WebGL-сборка с нужными настройками | `Task6Builder.ConfigurePlayerSettings()`: `compressionFormat = Disabled`, `decompressionFallback = false`, `threadsSupport = false`, шаблон `PROJECT:WebXR2020`, Linear color space |
| Тестирование на мобильном | HTTPS-хостинг (GitHub Pages), протокол проверки — ниже; AR проверяется на Android-устройстве |

## Структура проекта

```text
Task6/                                  ← Unity-проект (Unity 6, URP 17.6)
├── Assets/
│   ├── Scripts/
│   │   ├── ViewerSpaceAnchor.cs        объект в viewer-space
│   │   ├── WebXRSessionController.cs   реакция на AR-сессию, прозрачный фон в AR
│   │   └── 
│   ├── Editor/
│   │   ├── Task6SceneBuilder.cs        меню Task6 → 1. Создать сцену
│   │   └── Task6Builder.cs             меню Task6 → 2. Собрать WebGL (+ XR loader, настройки)
│   ├── WebGLTemplates/WebXR2020/       fullscreen-шаблон с кнопкой «Войти в AR»
│   └── Scenes/WebARScene.unity         создаётся скриптом (после активации лицензии)
├── Packages/
│   ├── manifest.json                   URP + XR Management 4.6.1 + webxr 0.25.0
│   └── com.de-panther.webxr/           встроенный пакет unity-webxr-export
├── ProjectSettings/                    настройки Unity 6 (URP-шаблон)
├── build.bat                           batch-сборка WebGL
└── build.log                           лог сборки
```

## Сборка

> ⚠️ Unity 6 требует активной лицензии. На этой машине лицензия — «персональная» через
> **Unity Hub**: при закрытом Hub batch-сборка падает с кодом **198**
> («No valid Unity Editor license found»). Держите Hub запущенным (иконка в трее).

```bat
cd /d C:\Users\Asus\Desktop\Z\Task6
build.bat
```

Скрипт выполнит:

1. `Task6SceneBuilder.CreateScene()` — сгенерирует сцену `Assets/Scenes/WebARScene.unity`
   (XR Rig, Main Camera + WebXRCamera + WebXRController, Key Light, куб с ViewerSpaceAnchor);
2. настройки XR (`XR General Settings` + провайдер `WebXR.WebXRLoader` для WebGL);
3. настройки WebGL (без сжатия/fallback/multithread, шаблон WebXR2020, Linear);
4. `BuildPipeline.BuildPlayer` → `Build/WebGL` + `build-report.txt` с размером сборки.

То же самое из редактора: открыть `Task6` в Unity, меню **Task6 → 1. Создать сцену**, затем
**Task6 → 2. Собрать WebGL** (или `Ctrl+B`, выбрав WebGL).

## Развёртывание (HTTPS)

WebXR требует безопасный контекст и доступ к камере, поэтому `file://` и http не подходят.

**GitHub Pages (используется для теста):**

```bat
set "PATH=%LOCALAPPDATA%\zcode-tools\git\cmd;%PATH%"
git -C C:\Users\Asus\Desktop\Z add Task6
git -C C:\Users\Asus\Desktop\Z commit -m "Task6 WebGL build"
git -C C:\Users\Asus\Desktop\Z push
```

Страница: **https://boorudborne-cell.github.io/model-viewer-ar-demo/Task6/Build/WebGL/**
(папка `Build/WebGL` закоммичена в репозиторий).

**Локальный HTTPS (для разработки):** mkcert + любой статический сервер:

```bat
mkcert -install
mkcert 192.168.1.10
npx http-server Build/WebGL -S -C 192.168.1.10.pem -K 192.168.1.10-key.pem -p 8443
```

Самоподписанный сертификат браузер не считает доверенным, и **WebXR на телефоне
в таком случае не запустится** — корневой сертификат mkcert нужно установить и на телефон,
либо использовать публичный HTTPS.

## Тестирование на мобильном устройстве

1. Открыть HTTPS-ссылку в **Chrome на Android** (ARCore установлен:
   «Google Play Services for AR», устройство из списка поддерживаемых).
2. Дождаться загрузки сцены: виден вращающийся куб в центре экрана (обычный 3D).
3. Проверить, что индикатор сверху показал «AR поддерживается».
4. Нажать **«Войти в AR»**: камера покажет комнату, куб будет висеть в центре
   поля зрения (viewer-space) — наклоняйте/поворачивайте телефон, объект следует за взглядом.
5. Повторное нажатие («Выйти из AR») возвращает обычный 3D.
6. Отладка: `chrome://inspect` на ПК с USB-подключением; в WebGL-консоли
   `[Task6] WebXR ready. AR supported: True`, `[Task6] XR state changed: AR`.

Ограничения: iOS Safari не поддерживает `immersive-ar` WebXR (для iOS остаётся
AR Quick Look с USDZ — это другой путь, вне этого задания). Desktop/VR-шлем:
WebXR есть в Quest Browser, но паспортный сценарий задания — телефон Android.

## Совместимость и размер сборки

- Пакет `unity-webxr-export` 0.25.0 официально рассчитан на Unity **2020.3+**; проект
  собран на **Unity 6 (6000.6.7f1) + URP 17.6**. Совместимость проверена на практике:
  пакет компилируется и работает на Unity 6 после правок проекта:
  - `Packages/com.de-panther.webxr/package.json` — зависимость поднята до `com.unity.xr.management@4.6.1`;
  - скрипты проекта вынесены в asmdef (`Task6.Runtime`, `Task6.Editor`) со ссылками на
    сборку `WebXR` (у пакета `autoReferenced: false`);
  - Unity 6 требует **Linear** color space (пакет проверяет это и предупреждает) — выставлено.
  Сборка: **0 ошибок, 2 предупреждения** (незначимые, из кода пакета).
- Настройки WebGL: `compressionFormat = Disabled` (без Brotli/Gzip и без fallback),
  `threadsSupport = false` (нет pthread/wasm-потоков), шаблон `WebXR2020`, Medium-стрипинг,
  IL2CPP `OptimizeSize`.
- **Фактический размер сборки: 39,27 МБ** (`Build/WebGL/build-report.txt`):
  `.wasm` — 29,23 МБ, `.data` — 9,60 МБ, `.framework.js` — 0,39 МБ, `.loader.js` — 0,03 МБ.
  Это следствие отключённого сжатия: с Brotli сборка была бы ~11–13 МБ, но задание требует
  `compressionFormat = Disabled` + без multithread. Для мобильного трафика 39 МБ — заметно,
  поэтому для реального продакшена стоит включить Brotli и настроить сервер с
  `Content-Encoding: br`.
- Контрольный список для зачётной проверки: `Library/` не коммитится (`.gitignore`),
  лицензия MIT пакета сохраняется в `Packages/com.de-panther.webxr/LICENSE.md`.

## Известная проблема и исправление (AR не запускался)

Симптом: на телефоне кнопка «Войти в AR» падала с
`TypeError: Cannot read properties of undefined (reading 'ARRequiredReferenceSpace')`
в `XRManager.onRequestARSession`.

Причина: `SetWebXRSettings` не вызывался, потому что `WebXRSettings.GetSettings()`
возвращал `null`. Ассет `Assets/XR/Settings/WebXRSettings.asset` не был зарегистрирован
в `EditorBuildSettings` как config object `WebXR.Settings`, поэтому
`WebXRBuildProcessor.OnPreprocessBuild` не добавлял его в preloaded assets, и в JS
оставалось `Module.WebXR.Settings === undefined`.

Исправление:
- `Task6Builder.ConfigureXR()` теперь создаёт/находит `WebXRSettings.asset` и
  регистрирует его через `EditorBuildSettings.AddConfigObject("WebXR.Settings", ...)`;
- в `webxr.jspre` добавлен защитный дефолт `Module.WebXR.Settings`
  (`local-floor` / `hit-test`, `hand-tracking`), который перезаписывается настройками
  из C#, если они доставлены;
- сборка пересобрана, ассет попадает в `.data` (`WebXRSettings` и
  `ARRequiredReferenceSpace` присутствуют в блобе).

Проверено в браузере: `Module.WebXR.Settings` — объект, а
`onRequestARSession()` формирует `immersive-ar` с `requiredFeatures: ["local-floor"]`
и `optionalFeatures: ["hit-test","hand-tracking"]` (ранее падало до вызова
`navigator.xr.requestSession`).

## Известная проблема и исправление (чёрный фон в AR)

Симптом: AR-сессия запускается, но вместо камеры телефона — чёрный фон.

Причины (две, обе обязательны):
1. В сцене у `WebXRCamera` не назначено ни одного camera-поля (`cameraMain`,
   `cameraL/R`, `cameraARL/R`). Его `OnXRChange`/`OnHeadsetUpdate` падали с
   `NullReferenceException` **раньше** обработчика `WebXRSessionController`
   в цепочке подписчиков, поэтому прозрачный фон камеры не выставлялся.
2. URP был собран с HDR: буфер кадра `R11G11B10` не имеет альфа-канала,
   поэтому даже при `alpha = 0` в clear color композитор получал непрозрачный кадр.

Исправление:
- `WebXRSessionController` больше не зависит от порядка подписчиков: состояние
  `WebXRManager.XRState` опрашивается в `Update()`, и в AR камера получает
  `clearFlags = SolidColor` + `backgroundColor.a = 0`;
- в `WebXRCamera` добавлены null-guards для неназначенных камер (пакет вендорен
  в `Packages/com.de-panther.webxr`, правка отмечена комментарием);
- HDR выключен в `PC_RPAsset` и `Mobile_RPAsset`, а `Task6Builder` теперь
  принудительно выставляет `m_SupportsHDR = false` у всех URP-ассетов при сборке;
- в шаблоне страницы фон канваса/`body` в режиме `in-ar` сделан прозрачным,
  а кнопка «Войти/Выйти из AR» переключается по реальным событиям сессии
  (`onXRSessionStarted/Ended/Error`), а не сразу по клику.

## Статус

- [x] Проект, пакет webxr, сцена-генератор, настройки XR/WebGL, шаблон с AR-кнопкой, скрипты
- [x] **Сборка WebGL** — выполнена (Unity 6, 0 ошибок), `Build/WebGL`
- [x] Публикация сборки по HTTPS (GitHub Pages), проверена загрузка WebGL-сцены в браузере
- [x] Исправлена передача `WebXR.Settings` в JS (AR-сессия больше не падает на `ARRequiredReferenceSpace`)
- [x] Исправлен прозрачный фон в AR (HDR off + прозрачная камера + null-guards в `WebXRCamera`)
- [ ] Проверка AR на Android-устройстве (камера/ARCore) — выполняется с телефона по ссылке