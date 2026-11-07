using System.Collections.Generic;
using UnityEngine;

namespace Task6
{
    /// <summary>
    /// Генератор меша «кристалла» (октаэдр с плоскими гранями).
    /// Используется редакторским скриптом и сохраняется как ассет,
    /// чтобы сцена ссылалась на обычный Mesh.
    /// </summary>
    public static class ArtifactMesh
    {
        public static Mesh CreateOctahedron(float radius = 1f, float heightScale = 1.25f)
        {
            Vector3 top = new Vector3(0f, radius * heightScale, 0f);
            Vector3 bottom = new Vector3(0f, -radius * heightScale, 0f);
            Vector3[] equator =
            {
                new Vector3(radius, 0f, 0f),
                new Vector3(0f, 0f, radius),
                new Vector3(-radius, 0f, 0f),
                new Vector3(0f, 0f, -radius),
            };

            var vertices = new List<Vector3>(24);
            var normals = new List<Vector3>(24);
            var uvs = new List<Vector2>(24);

            void AddTriangle(Vector3 a, Vector3 b, Vector3 c)
            {
                Vector3 n = Vector3.Cross(b - a, c - a).normalized;
                vertices.Add(a); vertices.Add(b); vertices.Add(c);
                // Плоские грани: каждая вершина получает нормаль своей грани.
                normals.Add(n); normals.Add(n); normals.Add(n);
                uvs.Add(new Vector2(0f, 0f));
                uvs.Add(new Vector2(1f, 0f));
                uvs.Add(new Vector2(0.5f, 1f));
            }

            for (int i = 0; i < 4; i++)
            {
                Vector3 e0 = equator[i];
                Vector3 e1 = equator[(i + 1) % 4];
                AddTriangle(top, e1, e0);        // верхняя «пирамида»
                AddTriangle(bottom, e0, e1);     // нижняя «пирамида»
            }

            var mesh = new Mesh { name = "ArtifactMesh" };
            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(new List<int>(BuildSequentialIndices(vertices.Count)), 0);
            mesh.RecalculateBounds();
            return mesh;
        }

        private static int[] BuildSequentialIndices(int vertexCount)
        {
            var indices = new int[vertexCount];
            for (int i = 0; i < vertexCount; i++) indices[i] = i;
            return indices;
        }
    }
}