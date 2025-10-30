/**
 * @file KBPoolDebug.tsx
 * @version v0.01
 * @date 30 octobre 2025
 * @description Composant de debug pour tester le pool de KB
 * 
 * Usage : Ajouter temporairement dans une page pour tester
 */

"use client";

import { useEffect, useState } from 'react';
import { getAvailableKB, checkKBAvailability } from '@/app/lib/services/knowledgeBasePoolService';
import type { KnowledgeBasePool } from '@/app/lib/services/knowledgeBasePoolService';

export default function KBPoolDebug() {
  const [kbDecouverte, setKbDecouverte] = useState<KnowledgeBasePool | null>(null);
  const [availability, setAvailability] = useState({ decouverte: 0, preselection: 0, selection: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKBInfo() {
      try {
        // Récupérer une KB découverte disponible
        const kb = await getAvailableKB('decouverte');
        setKbDecouverte(kb);

        // Vérifier la disponibilité du stock
        const avail = await checkKBAvailability();
        setAvailability(avail);
      } catch (err) {
        console.error('Erreur chargement KB:', err);
      } finally {
        setLoading(false);
      }
    }

    loadKBInfo();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded p-4 my-4">
        <p className="text-sm">⏳ Chargement KB pool...</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 my-4">
      <h3 className="text-lg font-bold text-blue-800 mb-3">🧪 DEBUG : Pool de KB</h3>
      
      {/* Stock disponible */}
      <div className="mb-4">
        <p className="font-semibold text-sm mb-2">📊 Stock disponible :</p>
        <ul className="text-sm space-y-1">
          <li>• Découverte : <strong>{availability.decouverte}</strong> KB</li>
          <li>• Présélection : <strong>{availability.preselection}</strong> KB</li>
          <li>• Sélection : <strong>{availability.selection}</strong> KB</li>
        </ul>
      </div>

      {/* KB Découverte exemple */}
      <div>
        <p className="font-semibold text-sm mb-2">🔍 KB Découverte disponible :</p>
        {kbDecouverte ? (
          <div className="bg-white rounded p-3 text-xs">
            <p><strong>Nom :</strong> {kbDecouverte.heygen_kb_name}</p>
            <p><strong>ID HeyGen :</strong> <code className="bg-gray-200 px-1 rounded">{kbDecouverte.heygen_kb_id}</code></p>
            <p><strong>Type :</strong> {kbDecouverte.kb_type}</p>
            <p><strong>Spécialité :</strong> {kbDecouverte.kb_specialty}</p>
            <p><strong>Statut :</strong> <span className="text-green-600 font-semibold">{kbDecouverte.status}</span></p>
          </div>
        ) : (
          <p className="text-red-600 text-sm">❌ Aucune KB disponible</p>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-3">
        💡 Ce composant est temporaire pour valider le fonctionnement du pool
      </p>
    </div>
  );
}
