using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using WebXR;

namespace Task6.EditorTools
{
    /// <summary>
    /// Создаёт сцену Task6 программно — удобно и воспроизводимо в batchmode:
    /// XR Rig (WebXRManager) → Camera Offset → Main Camera
    /// (Camera + WebXRCamera + WebXRController + WebXRSessionController),
    /// свет и объект-«кристалл» в viewer-space (ViewerSpaceAnchor).
    /// </summary>
    public static class Task6SceneBuilder
    {
        public const string ScenePath = "Assets/Scenes/WebARScene.unity";

        private const string ArtifactFolder = "Assets/Artifact";
        private const string MaterialPath = ArtifactFolder + "/ArtifactMaterial.mat";

        [MenuItem("Task6/1. Создать сцену", false, 1)]
        public static void CreateSceneFromMenu()
        {
            CreateScene();
        }

        public static void CreateScene()
        {
            EnsureFolder("Assets/Scenes");
            EnsureFolder(ArtifactFolder);

            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // ---------- XR Rig ----------
            var rig = new GameObject("XR Rig");
            rig.AddComponent<WebXRManager>();

            var cameraOffset = new GameObject("Camera Offset");
            cameraOffset.transform.SetParent(rig.transform, false);

            var cameraGO = new GameObject("Main Camera");
            cameraGO.tag = "MainCamera";
            cameraGO.transform.SetParent(cameraOffset.transform, false);

            var camera = cameraGO.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.02f, 0.03f, 0.06f, 1f);
            camera.nearClipPlane = 0.03f;
            camera.farClipPlane = 120f;
            camera.fieldOfView = 60f;

            cameraGO.AddComponent<AudioListener>();
            cameraGO.AddComponent<WebXRCamera>();   // камера WebXR (требование задания)
            cameraGO.AddComponent<WebXRController>(); // контроллер WebXR (требование задания)

            var sessionController = cameraGO.AddComponent<WebXRSessionController>();
            sessionController.normalBackground = camera.backgroundColor;

            // ---------- Свет ----------
            var lightGO = new GameObject("Key Light");
            var keyLight = lightGO.AddComponent<Light>();
            keyLight.type = LightType.Directional;
            keyLight.intensity = 1.15f;
            keyLight.color = new Color(1f, 0.97f, 0.92f);
            lightGO.transform.rotation = Quaternion.Euler(45f, -30f, 0f);

            // ---------- Объект в viewer-space: КУБ ----------
            var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.name = "Viewer-Space Cube";
            Object.DestroyImmediate(cube.GetComponent<BoxCollider>());

            var meshRenderer = cube.GetComponent<MeshRenderer>();
            meshRenderer.sharedMaterial = GetOrCreateMaterial();
            meshRenderer.shadowCastingMode = ShadowCastingMode.Off;
            meshRenderer.receiveShadows = false;

            // Ребро куба 0.3 м — на 1.1 м от камеры занимает ~1/6 высоты кадра.
            cube.transform.localScale = Vector3.one * 0.3f;

            var anchor = cube.AddComponent<ViewerSpaceAnchor>();
            anchor.viewer = cameraGO.transform;
            anchor.distance = 1.1f;
            anchor.verticalOffset = -0.12f;
            anchor.spinDegreesPerSecond = 18f;
            anchor.tiltDegrees = 28f;
            anchor.spinStartDegrees = 45f;

            // Свет внутри куба не нужен: даёт выжженное пятно на грани.

            // ---------- Сохранение ----------
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), ScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Task6] Scene created at " + ScenePath);
        }

        private static Material GetOrCreateMaterial()
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (existing != null) return existing;

            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");

            var material = new Material(shader) { name = "ArtifactMaterial" };

            var baseColor = new Color(0.10f, 0.72f, 0.85f, 1f);
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", baseColor);
            if (material.HasProperty("_Color")) material.SetColor("_Color", baseColor);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", 0.55f);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.8f);
            if (material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                // Легкое свечение, чтобы куб читался на тёмном фоне, но грани не выжигались.
                material.SetColor("_EmissionColor", baseColor * 0.25f);
                material.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            }
            material.enableInstancing = true;

            AssetDatabase.CreateAsset(material, MaterialPath);
            return material;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            System.IO.Directory.CreateDirectory(path);
            AssetDatabase.Refresh();
        }
    }
}