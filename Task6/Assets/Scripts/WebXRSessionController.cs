using UnityEngine;
using WebXR;

namespace Task6
{
    /// <summary>
    /// Реагирует на вход/выход из WebXR-сессии и логирует возможности устройства.
    /// В AR фон камеры делается прозрачным: браузер показывает видео с камеры
    /// под Unity-канвасом, поэтому сцена должна иметь alpha = 0.
    ///
    /// Состояние читается из WebXRManager каждый кадр, а не только из события
    /// OnXRChange: у этого события несколько подписчиков, и если более ранний
    /// бросит исключение, наш обработчик не вызовется и фон останется чёрным.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class WebXRSessionController : MonoBehaviour
    {
        public Color normalBackground = new Color(0.02f, 0.03f, 0.06f, 1f);

        private static readonly Color transparentBackground = new Color(0f, 0f, 0f, 0f);

        private Camera _camera;
        private WebXRState _appliedState = WebXRState.NORMAL;

        private void Awake()
        {
            _camera = GetComponent<Camera>();
            ApplyState(WebXRState.NORMAL);
        }

        private void Update()
        {
            WebXRManager manager = WebXRManager.Instance;
            WebXRState state = manager != null ? manager.XRState : WebXRState.NORMAL;
            if (state == _appliedState) return;

            _appliedState = state;
            ApplyState(state);
        }

        private void Start()
        {
            WebXRManager manager = WebXRManager.Instance;
            if (manager != null)
            {
                Debug.Log($"[Task6] WebXR ready. AR supported: {manager.isSupportedAR}, VR supported: {manager.isSupportedVR}");
            }
        }

        private void ApplyState(WebXRState state)
        {
            if (_camera == null) return;

            // Solid color в обоих режимах: в AR прозрачный, в 3D — тёмный фон сцены.
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = state == WebXRState.AR ? transparentBackground : normalBackground;

            Debug.Log($"[Task6] XR state changed: {state}");
        }
    }
}