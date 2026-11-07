using UnityEngine;

namespace Task6
{
    /// <summary>
    /// Держит объект в viewer-space: объект всегда находится в центре поля зрения
    /// камеры WebXR (расстояние + небольшое смещение вниз), плавно следует за головой,
    /// покачивается и медленно вращается. Работает и в обычном 3D-просмотре, и в AR.
    /// </summary>
    [DefaultExecutionOrder(100)]
    public class ViewerSpaceAnchor : MonoBehaviour
    {
        [Tooltip("Камера WebXR (Main Camera). Если пусто — берётся Camera.main.")]
        public Transform viewer;

        [Tooltip("Расстояние от камеры до объекта в метрах.")]
        public float distance = 1.1f;

        [Tooltip("Смещение по вертикали относительно центра экрана (м).")]
        public float verticalOffset = -0.12f;

        public float bobAmplitude = 0.008f;
        public float bobSpeed = 1.4f;

        [Tooltip("Медленное вращение вокруг своей оси, °/сек.")]
        public float spinDegreesPerSecond = 18f;

        [Tooltip("Наклон по X, чтобы объём куба читался (15–25°).")]
        public float tiltDegrees = 18f;

        [Tooltip("Разворачивать объект «лицом» к камере.")]
        public bool faceViewer = true;

        [Range(0f, 30f)]
        public float followSharpness = 12f;

        private void Start()
        {
            // Сразу ставим объект в viewer-space: иначе первый кадр (или пауза
            // вкладки в браузере) показывает его прямо перед камерой.
            SnapToViewer();
        }

        private void OnEnable()
        {
            SnapToViewer();
        }

        private void LateUpdate()
        {
            Transform cam = ResolveViewer();
            if (cam == null) return;

            Vector3 target = ComputeTarget(cam);
            float t = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
            transform.position = Vector3.Lerp(transform.position, target, t);

            if (!faceViewer) return;

            Vector3 toViewer = cam.position - transform.position;
            if (toViewer.sqrMagnitude < 0.0001f) return;

            float spin = Time.time * spinDegreesPerSecond;
            transform.rotation = Quaternion.LookRotation(toViewer, Vector3.up) *
                                 Quaternion.Euler(tiltDegrees, spin, 0f);
        }

        private void SnapToViewer()
        {
            Transform cam = ResolveViewer();
            if (cam == null) return;
            transform.position = ComputeTarget(cam);
        }

        private Transform ResolveViewer()
        {
            if (viewer != null) return viewer;
            Camera mainCamera = Camera.main;
            return mainCamera != null ? mainCamera.transform : null;
        }

        private Vector3 ComputeTarget(Transform cam)
        {
            Vector3 target = cam.position + cam.forward * distance + Vector3.up * verticalOffset;
            target.y += Mathf.Sin(Time.time * bobSpeed) * bobAmplitude;
            return target;
        }
    }
}