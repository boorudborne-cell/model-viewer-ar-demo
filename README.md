# Dollar Coin — 3D и AR

Личная некоммерческая демонстрация монеты [Dollar Coin на RigModels](https://rigmodels.com/model.php?view=Dollar_Coin-3d-model__6DRTYIUE29U8TWBSK78PS2S3X&searchkeyword=money) через [`<model-viewer>`](https://modelviewer.dev/).

**Открыть на телефоне:** https://boorudborne-cell.github.io/model-viewer-ar-demo/

Модель в `assets/models/Dollar-Coin.glb` конвертирована из OBJ, полученного по ссылке выше. Её диаметр в AR — 12 см. Исходный архив содержит ограничение **Personal Use only**; текст лицензии сохранён в `assets/models/LICENSE-Dollar-Coin.txt`. Для коммерческого использования требуется Premium membership на RigModels. Не используйте модель в коммерческих проектах без соответствующих прав.

## Как запустить

На телефоне откройте адрес GitHub Pages по HTTPS. Вращайте монету пальцем, а на совместимом устройстве нажмите «Посмотреть в AR» и наведите камеру на поверхность.

- Android: Chrome и установленный Google Play Services for AR. `model-viewer` использует WebXR или Scene Viewer.
- iPhone/iPad: Safari и Quick Look. `model-viewer` создаёт USDZ из GLB при запуске AR, поэтому отдельный `ios-src` не требуется.

Доступность AR зависит от устройства и браузера. Кнопка AR скрывается, если режим не поддерживается.

Для локального просмотра запустите `serve.bat` или `powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1 -Port 8080`, затем откройте http://localhost:8080/. AR на телефоне требует HTTPS; локальный HTTP-адрес компьютера для этого не подходит.

## Файлы

- `index.html` — страница просмотра и управления освещением.
- `assets/models/Dollar-Coin.glb` — текстурированная монета для 3D и AR.
- `assets/models/LICENSE-Dollar-Coin.txt` — лицензия из архива модели.
- `assets/environments/*.hdr` — варианты освещения.
- `libs/model-viewer.min.js` — локальная копия компонента.
- `server.ps1`, `serve.bat` — локальный сервер для проверки.

Подробнее об автоматическом USDZ для iOS: [документация `<model-viewer>`](https://modelviewer.dev/examples/augmentedreality/index.html).

## Задание 2 — MindAR

Отдельная AR-маска по мотивам «Вам снился этот человек?» размещена в [`task2/`](task2/). Есть режим трекинга лица и режим трекинга присланного изображения-маркера. Страница монеты и её файлы работают отдельно. Подробнее: [`task2/README.md`](task2/README.md).
