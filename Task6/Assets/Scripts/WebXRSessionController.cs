using UnityEngine;
using WebXR;

namespace Task6
{
    /// <summary>
    /// Реагирует на вход/выход из WebXR-сессии и логирует возможности устройства.
    /// В AR фон камеры делается прозрачным: браузер показывает видео с камеры
    /// под Unity-канвасом, поэтому сцена должна иметь alpha = 0.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class WebXRSessionController : MonoBehaviour
    {
        public Color normalBackground = new Color(0.02f, 0.03f, 0.06f, 1f);

        private Camera _camera;

        private void Awake()
        {
            _camera = GetComponent<Camera>();
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = normalBackground;
        }

        private void OnEnable()
        {
            WebXRManager.OnXRChange += HandleXRChange;
        }

        private void OnDisable()
        {
            WebXRManager.OnXRChange -= HandleXRChange;
        }

        private void Start()
        {
            WebXRManager manager = FindFirstObjectByType<WebXRManager>();
            if (manager != null)
            {
                Debug.Log($"[Task6] WebXR ready. AR supported: {manager.isSupportedAR}, VR supported: {manager.isSupportedVR}");
            }
        }

        private void HandleXRChange(WebXRState state, int viewsCount, Rect leftRect, Rect rightRect)
        {
            Debug.Log($"[Task6] XR state changed: {state}, views: {viewsCount}");

            if (_camera == null) return;
            if (state == WebXRState.AR)
            {
                // Прозрачный фон — сквозь канвас видно камеру телефона.
                _camera.backgroundColor = new Color(0f, 0f, 0f, 0f);
            }
            else
            {
                _camera.backgroundColor = normalBackground;
            }
        }
    }
}