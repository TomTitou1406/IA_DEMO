/**
 * @file KBCompilerDebug.tsx
 * @version v0.02
 * @date 30 octobre 2025
 * @description Composant de debug pour tester la compilation des KB + test List KB
 */

"use client";

import { useState } from "react";

export default function KBCompilerDebug() {
  const [posteId, setPosteId] = useState("816c9249-f5e3-4928-8746-ec085dbb5b60");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [kbList, setKbList] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(false);

  const handleTestCompilation = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log("🧪 [DEBUG] Test compilation KB pour poste:", posteId);

      // Appel direct du service (import dynamique)
      const { compileKnowledgeBases } = await import("@/app/lib/services/knowledgeBaseCompilerService");
      
      const compilationResult = await compileKnowledgeBases(posteId);
      
      console.log("✅ [DEBUG] Résultat:", compilationResult);
      setResult(compilationResult);

    } catch (err) {
      console.error("❌ [DEBUG] Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleTestListKB = async () => {
    try {
      setLoadingList(true);
      setKbList(null);
      setError(null);

      console.log("🧪 [DEBUG] Test List KB HeyGen...");

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/list-kb`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur API');
      }

      const data = await response.json();
      console.log("✅ [DEBUG] Liste KB:", data);
      setKbList(data);

    } catch (err) {
      console.error("❌ [DEBUG] Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingList(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
      <h3 className="text-lg font-bold text-purple-800 mb-3">
        🧪 DEBUG - Test Compilation KB
      </h3>

      <div className="space-y-3">
        {/* Input Poste ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Poste ID :
          </label>
          <input
            type="text"
            value={posteId}
            onChange={(e) => setPosteId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            placeholder="UUID du poste"
          />
        </div>

        {/* Boutons de test */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bouton Test Compilation */}
          <button
            onClick={handleTestCompilation}
            disabled={loading || !posteId}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
          >
            {loading ? "⏳ Compilation..." : "🚀 Tester Compilation"}
          </button>

          {/* Bouton Test List KB */}
          <button
            onClick={handleTestListKB}
            disabled={loadingList}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
          >
            {loadingList ? "⏳ Chargement..." : "📋 Tester List KB"}
          </button>
        </div>

        {/* Résultat Compilation Success */}
        {result && result.success && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm">
            <div className="font-bold text-green-800 mb-2">✅ Compilation réussie !</div>
            <div className="space-y-1 text-green-700 font-mono text-xs">
              <div>KB Découverte : {result.kb_decouverte_id}</div>
              <div>KB Présélection : {result.kb_preselection_id}</div>
              <div>KB Sélection : {result.kb_selection_id}</div>
            </div>
            {result.message && (
              <div className="mt-2 text-green-600">{result.message}</div>
            )}
          </div>
        )}

        {/* Résultat List KB */}
        {kbList && kbList.success && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-sm">
            <div className="font-bold text-blue-800 mb-2">✅ Liste KB récupérée !</div>
            <div className="text-blue-700 text-xs">
              Nombre de KB : {kbList.data?.data?.length || 0}
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                Voir les détails (console)
              </summary>
              <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(kbList.data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Résultat Error */}
        {(error || (result && !result.success)) && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm">
            <div className="font-bold text-red-800 mb-2">❌ Erreur</div>
            <div className="text-red-700 text-xs">
              {error || result?.error || "Erreur inconnue"}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 italic">
          Ce composant est temporaire pour tester la compilation des KB et l'accès API HeyGen.
          Vérifie la console navigateur pour les logs détaillés.
        </div>
      </div>
    </div>
  );
}
