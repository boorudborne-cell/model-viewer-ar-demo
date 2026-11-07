using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.XR.Management;
using UnityEditor.XR.Management.Metadata;
using UnityEngine;

namespace Task6.EditorTools
{
    /// <summary>
    /// Настройка проекта и batch-сборка WebGL.
    ///
    /// Запуск из редактора: меню Task6 → «2. Собрать WebGL».
    /// Batchmode (без открытия окна):
    ///   Unity.exe -batchmode -quit -projectPath Task6 ^
    ///     -executeMethod Task6.EditorTools.Task6Builder.BuildWebGL ^
    ///     -logFile Task6/build.log
    /// Код возврата 0 — успех, 1 — ошибка сборки.
    /// </summary>
    public static class Task6Builder
    {
        public const string BuildFolder = "Build/WebGL";
        private const string XRFolder = "Assets/XR";
        private const string WebXRSettingsPath = "Assets/XR/Settings/WebXRSettings.asset";
        private const string WebXRSettingsKey = "WebXR.Settings";

        [MenuItem("Task6/2. Собрать WebGL", false, 2)]
        public static void BuildFromMenu()
        {
            BuildWebGL();
        }

        public static void BuildWebGL()
        {
            if (!File.Exists(Task6SceneBuilder.ScenePath))
            {
                Debug.Log("[Task6] Scene not found — creating it first.");
                Task6SceneBuilder.CreateScene();
            }

            ConfigureXR();
            ConfigurePlayerSettings();

            Directory.CreateDirectory(BuildFolder);

            var options = new BuildPlayerOptions
            {
                scenes = new[] { Task6SceneBuilder.ScenePath },
                locationPathName = BuildFolder,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            // summary.totalSize в WebGL считает не весь вывод, поэтому считаем папку сами.
            long folderBytes = 0;
            foreach (string file in Directory.GetFiles(BuildFolder, "*", SearchOption.AllDirectories))
                folderBytes += new FileInfo(file).Length;

            string result =
                $"RESULT={summary.result}\n" +
                $"SIZE_BYTES={folderBytes}\n" +
                $"SIZE_MB={folderBytes / 1024f / 1024f:F2}\n" +
                $"ERRORS={summary.totalErrors}\n" +
                $"WARNINGS={summary.totalWarnings}\n" +
                $"OUT={BuildFolder}\n";

            Debug.Log("[Task6] BUILD\n" + result);
            File.WriteAllText(Path.Combine(BuildFolder, "build-report.txt"), result);

            if (Application.isBatchMode)
            {
                EditorApplication.Exit(summary.result == BuildResult.Succeeded ? 0 : 1);
            }
        }

        /// <summary>Создаёт XR General Settings и включает провайдер WebXR Export для WebGL.</summary>
        private static void ConfigureXR()
        {
            const string loaderTypeName = "WebXR.WebXRLoader";

            XRGeneralSettingsPerBuildTarget perTarget = FindOrCreatePerBuildTargetSettings();

            if (!perTarget.HasSettingsForBuildTarget(BuildTargetGroup.WebGL))
                perTarget.CreateDefaultSettingsForBuildTarget(BuildTargetGroup.WebGL);

            if (!perTarget.HasManagerSettingsForBuildTarget(BuildTargetGroup.WebGL))
                perTarget.CreateDefaultManagerSettingsForBuildTarget(BuildTargetGroup.WebGL);

            var manager = perTarget.SettingsForBuildTarget(BuildTargetGroup.WebGL).Manager;

            bool alreadyAssigned = manager.activeLoaders.Any(
                loader => loader != null && loader.GetType().FullName == loaderTypeName);

            if (!alreadyAssigned)
            {
                bool assigned = XRPackageMetadataStore.AssignLoader(manager, loaderTypeName, BuildTargetGroup.WebGL);
                Debug.Log("[Task6] WebXR loader assigned: " + assigned);
            }

            RegisterWebXRSettings();

            EditorUtility.SetDirty(perTarget);
            AssetDatabase.SaveAssets();
        }

        /// <summary>
        /// Регистрирует WebXRSettings как config object сборки.
        /// WebXRBuildProcessor.OnPreprocessBuild читает его через WebXRSettings.GetSettings()
        /// и добавляет ассет в preloaded assets; без регистрации в плеере
        /// Module.WebXR.Settings остаётся undefined и запрос AR-сессии падает.
        /// </summary>
        private static void RegisterWebXRSettings()
        {
            WebXR.WebXRSettings settings =
                AssetDatabase.LoadAssetAtPath<WebXR.WebXRSettings>(WebXRSettingsPath);

            if (settings == null)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(WebXRSettingsPath));
                settings = ScriptableObject.CreateInstance<WebXR.WebXRSettings>();
                AssetDatabase.CreateAsset(settings, WebXRSettingsPath);
                Debug.Log("[Task6] Created WebXRSettings asset: " + WebXRSettingsPath);
            }

            EditorBuildSettings.AddConfigObject(WebXRSettingsKey, settings, true);
            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();
        }

        private static XRGeneralSettingsPerBuildTarget FindOrCreatePerBuildTargetSettings()
        {
            string[] guids = AssetDatabase.FindAssets("t:XRGeneralSettingsPerBuildTarget");
            if (guids.Length > 0)
            {
                string path = AssetDatabase.GUIDToAssetPath(guids[0]);
                var loaded = AssetDatabase.LoadAssetAtPath<XRGeneralSettingsPerBuildTarget>(path);
                if (loaded != null) return loaded;
            }

            if (!AssetDatabase.IsValidFolder(XRFolder))
            {
                Directory.CreateDirectory(XRFolder);
                AssetDatabase.Refresh();
            }

            var asset = ScriptableObject.CreateInstance<XRGeneralSettingsPerBuildTarget>();
            AssetDatabase.CreateAsset(asset, XRFolder + "/XRGeneralSettingsPerBuildTarget.asset");
            AssetDatabase.SaveAssets();
            return asset;
        }

        /// <summary>Настройки WebGL под WebXR (без compression fallback и multithread).</summary>
        private static void ConfigurePlayerSettings()
        {
            PlayerSettings.companyName = "ZCourse";
            PlayerSettings.productName = "Task6 WebAR — Viewer-Space Artifact";
            PlayerSettings.bundleVersion = "1.0.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;

            // Обязательные требования задания:
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled; // без сжатия/fallback
            PlayerSettings.WebGL.decompressionFallback = false;                       // fallback выключен
            PlayerSettings.WebGL.threadsSupport = false;                              // без многопоточности

            // WebXR: шаблон из пакета (Assets/WebGLTemplates/WebXR2020)
            PlayerSettings.WebGL.template = "PROJECT:WebXR2020";
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.nameFilesAsHashes = true;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;

            // Не вырезать код WebXR при сборке, но и не раздувать wasm:
            // Medium-стрипинг + IL2CPP OptimizeSize заметно уменьшают размер.
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.Medium);
            PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.WebGL, Il2CppCodeGeneration.OptimizeSize);
            PlayerSettings.stripEngineCode = true;

            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
        }
    }
}