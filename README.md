# 3D + AR на `<model-viewer>`

Демонстрационная страница с интерактивной 3D-моделью и AR-режимом на базе
веб-компонента [`<model-viewer>`](https://modelviewer.dev) от Google.

## Что внутри

| Файл | Назначение |
|---|---|
| `index.html` | Страница с `<model-viewer>`: AR-режимы, HDRI-освещение, элементы управления |
| `assets/models/Astronaut.glb` | Модель в **glTF** (для 3D-просмотра, WebXR и Scene Viewer) |
| `assets/models/Astronaut.usdz` | Та же модель в **USDZ** (для AR Quick Look на iOS) |
| `assets/environments/*.hdr` | **HDRI-карты** окружения (свет и отражения модели) |
| `libs/model-viewer.min.js` | Локальная копия библиотеки model-viewer (v4.x) |
| `server.ps1`, `serve.bat` | Локальный HTTP-сервер без зависимостей (PowerShell) |

## Быстрый запуск (localhost)

Запустите `serve.bat` (двойным щелчком) или в терминале:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1 -Port 8080
```

Откройте [http://localhost:8080](http://localhost:8080) — вращение, масштаб и HDRI-освещение
работают уже здесь. Альтернативы, если установлен Node/Python:

```bat
npx http-server -p 8080 -c-1
python -m http.server 8080
```

> Открыть страницу двойным щелчком как файл (`file://…`) нельзя: браузер требует
> безопасный контекст (`https://` или `http://localhost`) для WebXR и AR.

## Атрибуты AR в `index.html`

```html
<model-viewer
  src="assets/models/Astronaut.glb"
  ios-src="assets/models/Astronaut.usdz"      <!-- USDZ для Quick Look (iOS) -->
  ar                                           <!-- включить кнопку AR -->
  ar-modes="webxr scene-viewer quick-look"     <!-- приоритет режимов -->
  ar-placement="floor" ar-scale="auto"
  xr-environment                               <!-- свет реального мира в WebXR -->
  environment-image="assets/environments/spruit_sunrise_1k.hdr"
  ... >
```

- **webxr** — AR прямо в браузере (Chrome на Android с ARCore);
- **scene-viewer** — системное приложение «Просмотр программ Google» (Scene Viewer);
- **quick-look** — AR Quick Look в Safari (iOS/iPadOS), использует `ios-src` (USDZ).

## AR на телефоне — нужен HTTPS

Все AR-режимы запускаются только из безопасного контекста. На телефоне
`localhost` — это сам телефон, поэтому для проверки AR нужен **публичный HTTPS**.

Самый быстрый путь — бесплатный хостинг:

1. **Netlify Drop** — откройте [app.netlify.com/drop](https://app.netlify.com/drop) и перетащите папку проекта целиком (бесплатно, ссылка вида `https://…netlify.app`).
2. **GitHub Pages** — залейте папку в репозиторий, включите Pages в настройках.
3. **Cloudflare Pages** — аналогично.

Вариант «на локальном ПК» (для опытных): `mkcert` или Caddy.

```bat
:: mkcert: свой доверенный сертификат (нужно поставить корневой сертификат и на телефон)
mkcert -install
mkcert 192.168.1.10
npx http-server -S -C 192.168.1.10.pem -K 192.168.1.10-key.pem -p 8443
```

```bat
:: Caddy: HTTPS с внутренним CA
caddy file-server --listen :8443 --tls internal
```

При самоподписанном сертификате браузер покажет предупреждение — его нужно принять.

## Требования к устройствам

- **Android**: Chrome (или другой Chromium-браузер) + **Google Play Services for AR (ARCore)**,
  устройство из [списка поддерживаемых](https://developers.google.com/ar/devices).
  Проверить ARCore: в Play Store найдите «Google Play Services for AR» — кнопка должна быть «Открыть»/«Обновить», а не «Установить» на несовместимом устройстве.
- **iOS / iPadOS**: Safari, iOS 12+. **Quick Look** встроен в систему — отдельно ставить не нужно;
  достаточно, чтобы `ios-src` (USDZ) был доступен по HTTPS.

## Как проверить на телефоне

1. Откройте страницу по HTTPS на телефоне (см. раздел выше).
2. Нажмите **«Посмотреть в AR»**.
3. **Android**: откроется Scene Viewer → наведите камеру на поверхность → коснитесь экрана — модель встанет на пол. Её можно двигать, вращать и масштабировать.
4. **iOS**: откроется Quick Look → наведите камеру на поверхность → модель появится в комнате.

Кнопка «Посмотреть в AR» автоматически скрывается, если устройство/браузер не поддерживает AR.

## Удалённая отладка

- **Android + Chrome**: на телефоне включите «Отладка по USB» (Настройки → Для разработчиков), подключите кабелем, откройте на ПК `chrome://inspect` → **Inspect**. В DevTools видны консоль, сеть и ошибки WebXR.
- **iOS + Safari (нужен Mac)**: на iPhone включите Настройки → Safari → Дополнительно → **Web Inspector**, в Safari на Mac: меню «Разработка» → ваш iPhone.
- Быстрая проверка без отладчика: строки статуса под моделью на самой странице (`ar-status` события).

## Своя модель вместо астронавта

1. **glTF/GLB** — экспорт из Blender (*File → Export → glTF 2.0*) или любого 3D-редактора.
   Проверить и оптимизировать: [gltf.report](https://gltf.report), [Babylon Sandbox](https://sandbox.babylonjs.com).
2. **USDZ** — конвертация из GLB:
   [modelconverter.com](https://modelconverter.com) (онлайн, GLB → USDZ),
   Reality Converter (macOS), либо утилита [`usd_from_gltf`](https://github.com/google/usd_from_gltf) от Google.
3. Положите файлы в `assets/models/` и поменяйте `src` и `ios-src` в `index.html`.

## Возможные проблемы

| Симптом | Причина и решение |
|---|---|
| Кнопки AR нет вообще | Страница не по HTTPS/localhost; не установлен ARCore; открыт старый браузер. Проверьте `https://`, Chrome последней версии |
| AR запускается, но «Не удалось запустить» | Модель/USDZ должны отдаваться по HTTPS с CORS; ARCore не установлен |
| Модель не грузится, консоль ругается на MIME | Сервер должен отдавать `.glb` как `model/gltf-binary`, `.usdz` как `model/vnd.usdz+zip` — `server.ps1` это делает |
| На iOS ничего не происходит | Нужен именно Safari, атрибут `ios-src` с USDZ и HTTPS-адрес |
| Чёрная модель / нет отражений | Не загрузилась HDRI-карта (`environment-image`) — проверьте путь в сети DevTools |
