/**
 * @file KBCompilerDebug.tsx
 * @version v0.01
 * @date 30 octobre 2025
 * @description Composant de debug pour tester la compilation des KB
 */

"use client";

import { useState } from "react";

export default function KBCompilerDebug() {
  const [posteId, setPosteId] = useState("816c9249-f5e3-4928-8746-ec085dbb5b60");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

        {/* Bouton Test */}
        <button
          onClick={handleTestCompilation}
          disabled={loading || !posteId}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "⏳ Compilation en cours..." : "🚀 Tester Compilation KB"}
        </button>

        {/* Résultat Success */}
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
          Ce composant est temporaire pour tester la compilation des KB.
          Vérifie la console navigateur pour les logs détaillés.
        </div>
      </div>
    </div>
  );
}
