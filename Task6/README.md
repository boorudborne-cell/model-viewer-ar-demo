# Задание 6 — WebAR на Unity + WebXR Exporter

AR-сцена Unity (WebGL), собранная на пакете **De-Panther unity-webxr-export**
(`com.de-panther.webxr` 0.25.0). Объект — низкополигональный «кристалл» —
висит в **viewer-space**: в центре поля зрения камеры, следует за головой,
покачивается и вращается. Новый проект (не монета и не маска).

## Что сделано

| Требование | Реализация |
|---|---|
| unity-webxr-export подключён | Пакет встроен в `Packages/com.de-panther.webxr` (исходники + .meta, версия 0.25.0), зависимость `com.unity.xr.management` обновлена до 4.6.1, провайдер включается автоматически скриптом сборки |
| Камера WebXR и WebXRController | `XR Rig` → `WebXRManager`; `Main Camera` содержит `Camera`, `WebXRCamera`, `WebXRController`, `WebXRSessionController` |
| Объект в центре экрана (viewer-space) | `Assets/Scripts/ViewerSpaceAnchor.cs` — позиция = позиция камеры + forward × 1.1 м, плавное следование, «лицо» к камере, покачивание, вращение |
| WebGL-сборка с нужными настройками | `Task6Builder.ConfigurePlayerSettings()`: `compressionFormat = Disabled`, `decompressionFallback = false`, `threadsSupport = false`, шаблон `PROJECT:WebXR2020`, Linear color space |
| Тестирование на мобильном | Сайт публикуется по HTTPS (GitHub Pages), протокол проверки — ниже |

## Структура проекта

```text
Task6/                                  ← Unity-проект (Unity 6, URP 17.6)
├── Assets/
│   ├── Scripts/
│   │   ├── ViewerSpaceAnchor.cs        объект в viewer-space
│   │   ├── WebXRSessionController.cs   реакция на AR-сессию, прозрачный фон в AR
│   │   └── ArtifactMesh.cs             генератор меша кристалла (октаэдр)
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

> ⚠️ На этой машине **лицензия Unity не активирована** (licensing client: 0 license files,
> все entitlements `granted: False`), поэтому batch-сборка завершается кодом **198**.
> Нужен однократный вход: **Unity Hub → Sign in → Unity Personal (бесплатно)**.

После активации лицензии:

```bat
cd /d C:\Users\Asus\Desktop\Z\Task6
build.bat
```

Скрипт выполнит:

1. `Task6SceneBuilder.CreateScene()` — сгенерирует сцену `Assets/Scenes/WebARScene.unity`
   (XR Rig, Main Camera + WebXRCamera + WebXRController, Key Light, кристалл с ViewerSpaceAnchor);
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

Страница: `https://<user>.github.io/<repo>/Task6/Build/WebGL/`
(после сборки папка `Build/WebGL` должна попасть в репозиторий).

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
2. Дождаться загрузки сцены: виден вращающийся кристалл в центре экрана (обычный 3D).
3. Проверить, что индикатор сверху показал «AR поддерживается».
4. Нажать **«Войти в AR»**: камера покажет комнату, кристалл будет висеть в центре
   поля зрения (viewer-space) — наклоняйте/поворачивайте телефон, объект следует за взглядом.
5. Повторное нажатие («Выйти из AR») возвращает обычный 3D.
6. Отладка: `chrome://inspect` на ПК с USB-подключением; в WebGL-консоли
   `[Task6] WebXR ready. AR supported: True`, `[Task6] XR state changed: AR`.

Ограничения: iOS Safari не поддерживает `immersive-ar` WebXR (для iOS остаётся
AR Quick Look с USDZ — это другой путь, вне этого задания). Desktop/VR-шлем:
WebXR есть в Quest Browser, но паспортный сценарий задания — телефон Android.

## Совместимость и размер сборки

- Пакет `unity-webxr-export` 0.25.0 официально рассчитан на Unity **2020.3+**; проект
  создан на **Unity 6 (6000.6.7f1) + URP 17.6**. В коде пакета есть отдельные ветки для
  Unity 6 (`UNITY_6000_0_OR_NEWER`: требуется Linear color space — выставлено).
  Риск совместимости Unity 6 остаётся (пакет старый), поэтому после первой сборки нужно
  проверить консоль редактора на ошибки компиляции.
- Настройки WebGL: `compressionFormat = Disabled` (без Brotli/Gzip и без fallback —
  файлы `.data` идут как есть, поэтому сборка крупнее, чем с gzip), `threadsSupport = false`
  (нет pthread/wasm-потоков — совместимо с WebXR-тредом браузера), `linkerTarget = Wasm`.
  Ожидаемый размер: **~6–10 МБ** (`.wasm` + `.data` + loader); точные значения пишет
  `Build/WebGL/build-report.txt` (`SIZE_MB=...`). Артефактов сборки в этой машине пока
  нет — их создаёт `build.bat` после активации лицензии.
- Контрольный список для зачётной проверки: `Library/` не коммитится, лицензия MIT
  пакета сохраняется в `Packages/com.de-panther.webxr/LICENSE.md`.

## Статус

- [x] Проект, пакет webxr, сцена-генератор, настройки XR/WebGL, шаблон с AR-кнопкой, скрипты
- [ ] **Сборка WebGL** — заблокирована неактивированной лицензией Unity
- [ ] Публикация сборки на HTTPS и проверка на Android (после сборки)