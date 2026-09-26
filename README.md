# Две практические работы по AR

## 1. Монета в 3D и AR

Открыть: https://boorudborne-cell.github.io/model-viewer-ar-demo/

`index.html` подключает `libs/model-viewer.min.js` и показывает `assets/models/Dollar-Coin.glb`. Атрибут `camera-controls` позволяет вращать модель, а `ar` и `ar-modes` включают AR на совместимом телефоне. На Android используется WebXR или Scene Viewer; на iPhone `model-viewer` создаёт USDZ из GLB для Quick Look. `spruit_sunrise_1k.hdr` освещает монету.

Монета взята с [RigModels](https://rigmodels.com/model.php?view=Dollar_Coin-3d-model__6DRTYIUE29U8TWBSK78PS2S3X&searchkeyword=money). В архиве указано **только личное использование**; текст лицензии лежит в `assets/models/LICENSE-Dollar-Coin.txt`.

## 2. Маска «Этот человек»

Открыть: https://boorudborne-cell.github.io/model-viewer-ar-demo/task2/

- `task2/index.html` — выбор двух режимов и изображение-маркер.
- `task2/marker.html` — MindAR Image Tracking. `targets.mind` содержит признаки изображения `task2/assets/marker.png`. Когда камера узнаёт плакат, `mindar-image-target` показывает `task2/assets/this-man-mask.glb` поверх него.
- `task2/face.html` — MindAR Face Tracking. `mindar-face-target` прикрепляет ту же маску к обнаруженному лицу. Для лица файл `targets.mind` не нужен.
- `task2/libs/` — локальные копии A-Frame и MindAR.

`targets.mind` скомпилирован из присланного плаката официальным компилятором MindAR. GLB-маска — изогнутая поверхность с чёрно-белым изображением лица.

## Проверка

Откройте страницы по HTTPS на телефоне и разрешите доступ к камере. Для режима маркера покажите плакат на другом экране или распечатайте его. Локально можно запустить `serve.bat` и открыть `http://localhost:8080/` или `http://localhost:8080/task2/`.
