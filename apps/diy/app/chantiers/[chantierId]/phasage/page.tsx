'use client';

/**
 * Page de phasage d'un chantier
 * Génère et affiche les lots de travaux proposés par l'IA
 * 
 * @version 1.0
 * @date 29 novembre 2025
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

interface LotGenere {
  ordre: number;
  titre: string;
  description: string;
  code_expertise: string;
  niveau_requis: 'debutant' | 'intermediaire' | 'confirme';
  duree_estimee_heures: number;
  cout_estime: number;
  prerequis_stricts: number[];
  points_attention?: string;
  dependances_type: 'sequentiel' | 'parallele';
}

interface Alerte {
  type: 'critique' | 'attention' | 'conseil';
  message: string;
}

interface ResultatPhasage {
  ready_for_phasage: boolean;
  analyse: string;
  lots: LotGenere[];
  alertes: Alerte[];
  budget_total_estime: number;
  duree_totale_estimee_heures: number;
}

interface Chantier {
  id: string;
  titre: string;
  budget_initial?: number;
}

// ==================== HELPERS ====================

const EXPERTISE_LABELS: Record<string, string> = {
  demolition: '🔨 Démolition',
  plomberie: '💧 Plomberie',
  electricite: '⚡ Électricité',
  plaquiste: '🧱 Plaquiste',
  carreleur: '🔲 Carreleur',
  peintre: '🎨 Peintre',
  menuisier: '🪚 Menuisier',
  generaliste: '🔧 Généraliste',
  isolation: '🧤 Isolation',
};

const NIVEAU_LABELS: Record<string, { label: string; color: string }> = {
  debutant: { label: 'Débutant', color: 'bg-green-100 text-green-800' },
  intermediaire: { label: 'Intermédiaire', color: 'bg-yellow-100 text-yellow-800' },
  confirme: { label: 'Confirmé', color: 'bg-red-100 text-red-800' },
};

const ALERTE_STYLES: Record<string, { icon: string; bg: string; border: string }> = {
  critique: { icon: '🚨', bg: 'bg-red-50', border: 'border-red-300' },
  attention: { icon: '⚠️', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  conseil: { icon: '💡', bg: 'bg-blue-50', border: 'border-blue-300' },
};

// ==================== COMPOSANT PRINCIPAL ====================

export default function PhasagePage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.id as string;

  // États
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phasage, setPhasage] = useState<ResultatPhasage | null>(null);
  const [lots, setLots] = useState<LotGenere[]>([]);

  // ==================== CHARGEMENT INITIAL ====================

  useEffect(() => {
    loadChantier();
  }, [chantierId]);

  async function loadChantier() {
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, titre, budget_initial')
        .eq('id', chantierId)
        .single();

      if (error) throw error;
      setChantier(data);
      
      // Lancer le phasage automatiquement
      generatePhasage();
    } catch (err) {
      setError('Chantier non trouvé');
      setLoading(false);
    }
  }

  // ==================== GÉNÉRATION PHASAGE ====================

  async function generatePhasage() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/phasage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chantierId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur génération phasage');
      }

      setPhasage(data.phasage);
      setLots(data.phasage.lots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  // ==================== MODIFICATION LOTS ====================

  function removeLot(ordre: number) {
    const newLots = lots
      .filter(l => l.ordre !== ordre)
      .map((l, idx) => ({ ...l, ordre: idx + 1 }));
    setLots(newLots);
  }

  function moveLot(ordre: number, direction: 'up' | 'down') {
    const index = lots.findIndex(l => l.ordre === ordre);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === lots.length - 1)
    ) {
      return;
    }

    const newLots = [...lots];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLots[index], newLots[swapIndex]] = [newLots[swapIndex], newLots[index]];
    
    // Recalculer les ordres
    setLots(newLots.map((l, idx) => ({ ...l, ordre: idx + 1 })));
  }

  // ==================== SAUVEGARDE ====================

  async function savePhasage() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/phasage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chantierId, 
          action: 'save',
          lots 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur sauvegarde');
      }

      // Redirection vers la page des lots
      router.push(`/chantiers/${chantierId}/travaux`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
      setSaving(false);
    }
  }

  // ==================== CALCULS ====================

  const budgetTotal = lots.reduce((sum, l) => sum + (l.cout_estime || 0), 0);
  const dureeTotal = lots.reduce((sum, l) => sum + (l.duree_estimee_heures || 0), 0);

  // ==================== RENDU ====================

  // Loading initial
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du chantier...</p>
        </div>
      </div>
    );
  }

  // Génération en cours
  if (generating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            🏗️ Génération du phasage...
          </h2>
          <p className="text-gray-600 mb-4">
            L'assistant analyse votre projet et prépare les lots de travaux adaptés.
          </p>
          <p className="text-sm text-gray-500">
            Cela peut prendre quelques secondes...
          </p>
        </div>
      </div>
    );
  }

  // Erreur
  if (error && !phasage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-700 mb-1"
              >
                ← Retour
              </button>
              <h1 className="text-xl font-bold text-gray-800">
                Phasage : {chantier?.titre}
              </h1>
            </div>
            <button
              onClick={generatePhasage}
              disabled={generating}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              🔄 Régénérer
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Analyse */}
        {phasage?.analyse && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Analyse du projet</h3>
            <p className="text-blue-700">{phasage.analyse}</p>
          </div>
        )}

        {/* Alertes */}
        {phasage?.alertes && phasage.alertes.length > 0 && (
          <div className="space-y-2 mb-6">
            {phasage.alertes.map((alerte, idx) => {
              const style = ALERTE_STYLES[alerte.type] || ALERTE_STYLES.conseil;
              return (
                <div
                  key={idx}
                  className={`${style.bg} border ${style.border} rounded-lg p-3 flex items-start gap-2`}
                >
                  <span>{style.icon}</span>
                  <p className="text-sm">{alerte.message}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Résumé */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{lots.length}</p>
              <p className="text-sm text-gray-500">Lots</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{budgetTotal} €</p>
              <p className="text-sm text-gray-500">Budget estimé</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{dureeTotal}h</p>
              <p className="text-sm text-gray-500">Durée estimée</p>
            </div>
          </div>
        </div>

        {/* Liste des lots */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          📦 Lots de travaux ({lots.length})
        </h2>

        <div className="space-y-3">
          {lots.map((lot) => (
            <div
              key={lot.ordre}
              className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
                      {lot.ordre}
                    </span>
                    <h3 className="font-semibold text-gray-800">{lot.titre}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{lot.description}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {EXPERTISE_LABELS[lot.code_expertise] || lot.code_expertise}
                    </span>
                    <span className={`px-2 py-1 rounded ${NIVEAU_LABELS[lot.niveau_requis]?.color || 'bg-gray-100'}`}>
                      {NIVEAU_LABELS[lot.niveau_requis]?.label || lot.niveau_requis}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {lot.cout_estime} €
                    </span>
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      {lot.duree_estimee_heures}h
                    </span>
                  </div>

                  {lot.points_attention && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ {lot.points_attention}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => moveLot(lot.ordre, 'up')}
                    disabled={lot.ordre === 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveLot(lot.ordre, 'down')}
                    disabled={lot.ordre === lots.length}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeLot(lot.ordre)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message si modification */}
        {phasage && lots.length !== phasage.lots.length && (
          <p className="text-sm text-amber-600 mt-4">
            ⚠️ Vous avez modifié le phasage ({phasage.lots.length} → {lots.length} lots)
          </p>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </main>

      {/* Footer fixe */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={savePhasage}
            disabled={saving || lots.length === 0}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : `✓ Valider ${lots.length} lots`}
          </button>
        </div>
      </footer>
    </div>
  );
}
