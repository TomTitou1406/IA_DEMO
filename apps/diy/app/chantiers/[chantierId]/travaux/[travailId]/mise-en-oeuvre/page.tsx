/**
 * Page Mise en Œuvre - Génération et gestion des étapes d'un lot
 * 
 * Pattern identique à /phasage pour les lots
 * 
 * @version 1.0
 * @date 02 décembre 2025
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  loadEtapesBrouillon,
  loadEtapesValidees,
  saveEtapesBrouillon,
  validerEtapes,
  deleteEtapes,
  calculerTotaux,
  aggregerMateriaux,
  aggregerOutils,
  type EtapeGeneree
} from '@/app/lib/services/etapesGeneratorService';

// ==================== TYPES ====================

type ViewMode = 'loading' | 'empty' | 'generating' | 'preview' | 'error';

interface TravailInfo {
  id: string;
  titre: string;
  description: string;
  code_expertise: string;
  duree_estimee_heures: number;
  chantier_id: string;
}

interface ChantierInfo {
  id: string;
  titre: string;
}

// ==================== COMPOSANTS ====================

function EtapeCard({ 
  etape, 
  index,
  onMove,
  onDelete,
  onEdit,
  isFirst,
  isLast
}: { 
  etape: EtapeGeneree;
  index: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const difficulteColors: Record<string, { bg: string; text: string }> = {
    'facile': { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
    'moyen': { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
    'difficile': { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' }
  };

  const diffStyle = difficulteColors[etape.difficulte] || difficulteColors.moyen;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '0.75rem'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--orange)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.9rem'
          }}>
            {etape.numero}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--gray-light)', fontSize: '0.95rem' }}>
              {etape.titre}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>
              ⏱️ {etape.duree_estimee_minutes} min
              <span style={{
                marginLeft: '0.5rem',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                background: diffStyle.bg,
                color: diffStyle.text,
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                {etape.difficulte}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => onMove(index, 'up')}
            disabled={isFirst}
            style={{
              padding: '0.3rem 0.5rem',
              background: isFirst ? 'transparent' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '4px',
              color: isFirst ? 'var(--gray)' : 'var(--gray-light)',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem'
            }}
          >
            ↑
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={isLast}
            style={{
              padding: '0.3rem 0.5rem',
              background: isLast ? 'transparent' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '4px',
              color: isLast ? 'var(--gray)' : 'var(--gray-light)',
              cursor: isLast ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem'
            }}
          >
            ↓
          </button>
          <button
            onClick={() => onEdit(index)}
            style={{
              padding: '0.3rem 0.5rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(index)}
            style={{
              padding: '0.3rem 0.5rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
        {etape.description}
      </div>

      {/* Outils & Matériaux */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {etape.outils_necessaires && etape.outils_necessaires.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
            🔧 {etape.outils_necessaires.slice(0, 3).join(', ')}
            {etape.outils_necessaires.length > 3 && ` +${etape.outils_necessaires.length - 3}`}
          </div>
        )}
        {etape.materiaux_necessaires && etape.materiaux_necessaires.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
            📦 {etape.materiaux_necessaires.length} matériau(x)
          </div>
        )}
      </div>

      {/* Conseils pro */}
      {etape.conseils_pro && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#10b981'
        }}>
          💡 {etape.conseils_pro}
        </div>
      )}
    </div>
  );
}

// ==================== PAGE PRINCIPALE ====================

export default function MiseEnOeuvrePage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.chantierId as string;
  const travailId = params.travailId as string;

  // États
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [etapes, setEtapes] = useState<EtapeGeneree[]>([]);
  const [travail, setTravail] = useState<TravailInfo | null>(null);
  const [chantier, setChantier] = useState<ChantierInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Charger les infos du lot et du chantier
  useEffect(() => {
    async function loadData() {
      try {
        // Charger le lot
        const travailRes = await fetch(`/api/travaux/${travailId}`);
        if (!travailRes.ok) throw new Error('Lot non trouvé');
        const travailData = await travailRes.json();
        setTravail(travailData);

        // Charger le chantier
        const chantierRes = await fetch(`/api/chantiers/${travailData.chantier_id}`);
        if (chantierRes.ok) {
          const chantierData = await chantierRes.json();
          setChantier(chantierData);
        }

        // Vérifier si des étapes existent déjà
        const etapesValidees = await loadEtapesValidees(travailId);
        if (etapesValidees.length > 0) {
          setEtapes(etapesValidees);
          setViewMode('preview');
          return;
        }

        const etapesBrouillon = await loadEtapesBrouillon(travailId);
        if (etapesBrouillon.length > 0) {
          setEtapes(etapesBrouillon);
          setViewMode('preview');
          return;
        }

        // Aucune étape, afficher l'écran de génération
        setViewMode('empty');
      } catch (err) {
        console.error('Erreur chargement:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setViewMode('error');
      }
    }

    if (travailId) {
      loadData();
    }
  }, [travailId]);

  // Générer les étapes
  const handleGenerate = async () => {
    setViewMode('generating');
    setError(null);

    try {
      const res = await fetch('/api/etapes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travailId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur génération');
      }

      const data = await res.json();
      setEtapes(data.etapes || []);
      setViewMode('preview');
      setHasChanges(true);
    } catch (err) {
      console.error('Erreur génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setViewMode('error');
    }
  };

  // Régénérer les étapes
  const handleRegenerate = async () => {
    if (!confirm('Régénérer les étapes ? Les modifications actuelles seront perdues.')) return;
    await handleGenerate();
  };

  // Sauvegarder en brouillon
  const handleSaveBrouillon = async () => {
    setIsSaving(true);
    try {
      const result = await saveEtapesBrouillon(travailId, etapes);
      if (!result.success) throw new Error(result.error);
      setHasChanges(false);
      alert('Brouillon sauvegardé !');
    } catch (err) {
      alert('Erreur sauvegarde : ' + (err instanceof Error ? err.message : 'Erreur'));
    } finally {
      setIsSaving(false);
    }
  };

  // Valider les étapes
  const handleValidate = async () => {
    if (!confirm('Valider ces étapes ? Le lot passera en statut "à venir".')) return;
    
    setIsSaving(true);
    try {
      const result = await validerEtapes(travailId, etapes);
      if (!result.success) throw new Error(result.error);
      
      // Rediriger vers la page du lot
      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes`);
    } catch (err) {
      alert('Erreur validation : ' + (err instanceof Error ? err.message : 'Erreur'));
    } finally {
      setIsSaving(false);
    }
  };

  // Déplacer une étape
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newEtapes = [...etapes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newEtapes.length) return;
    
    [newEtapes[index], newEtapes[targetIndex]] = [newEtapes[targetIndex], newEtapes[index]];
    
    // Renuméroter
    newEtapes.forEach((e, i) => { e.numero = i + 1; });
    
    setEtapes(newEtapes);
    setHasChanges(true);
  };

  // Supprimer une étape
  const handleDelete = (index: number) => {
    if (!confirm(`Supprimer l'étape "${etapes[index].titre}" ?`)) return;
    
    const newEtapes = etapes.filter((_, i) => i !== index);
    newEtapes.forEach((e, i) => { e.numero = i + 1; });
    
    setEtapes(newEtapes);
    setHasChanges(true);
  };

  // Éditer une étape (ouvre modal - à implémenter)
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    // TODO: Modal d'édition
    alert('Édition à implémenter - pour l\'instant, utilisez l\'assistant IA');
  };

  // Calculer les totaux
  const totaux = calculerTotaux(etapes);
  const materiaux = aggregerMateriaux(etapes);
  const outils = aggregerOutils(etapes);

  // ==================== RENDU ====================

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--body-bg)', 
      color: 'var(--gray-light)',
      padding: '1rem'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--gray)' }}>
          <Link href="/chantiers" style={{ color: 'var(--gray)' }}>Chantiers</Link>
          {' > '}
          <Link href={`/chantiers/${chantierId}`} style={{ color: 'var(--gray)' }}>
            {chantier?.titre || 'Chantier'}
          </Link>
          {' > '}
          <Link href={`/chantiers/${chantierId}/travaux`} style={{ color: 'var(--gray)' }}>
            Lots
          </Link>
          {' > '}
          <span style={{ color: 'var(--orange)' }}>{travail?.titre || 'Lot'}</span>
          {' > '}
          <span style={{ color: 'var(--gray-light)' }}>Mise en œuvre</span>
        </div>

        {/* Titre */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--gray-light)' }}>
            🔧 Mise en œuvre : {travail?.titre}
          </h1>
          {travail?.description && (
            <p style={{ margin: '0.5rem 0 0', color: 'var(--gray)', fontSize: '0.9rem' }}>
              {travail.description}
            </p>
          )}
        </div>

        {/* Contenu selon le mode */}
        
        {/* LOADING */}
        {viewMode === 'loading' && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Chargement...</p>
          </div>
        )}

        {/* EMPTY - Aucune étape */}
        {viewMode === 'empty' && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            border: '2px dashed rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--gray-light)' }}>
              Aucune étape définie
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
              Générez automatiquement les étapes de ce lot avec l'IA
            </p>
            <button
              onClick={handleGenerate}
              style={{
                padding: '0.875rem 2rem',
                background: 'var(--green)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              ✨ Générer les étapes
            </button>
          </div>
        )}

        {/* GENERATING */}
        {viewMode === 'generating' && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}></div>
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--gray-light)' }}>
              Génération en cours...
            </h2>
            <p style={{ color: 'var(--gray)' }}>
              L'IA analyse le lot et prépare les étapes détaillées
            </p>
          </div>
        )}

        {/* ERROR */}
        {viewMode === 'error' && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
            <p style={{ color: '#ef4444', margin: '0 0 1rem' }}>{error}</p>
            <button
              onClick={() => setViewMode('empty')}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--gray-dark)',
                color: 'var(--gray-light)',
                border: '1px solid var(--gray)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* PREVIEW - Liste des étapes */}
        {viewMode === 'preview' && (
          <>
            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--orange)' }}>
                  {totaux.nombre_etapes}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Étapes</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--blue)' }}>
                  {totaux.duree_totale_heures}h
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Durée totale</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--green)' }}>
                  {outils.length}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Outils</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--purple)' }}>
                  {materiaux.length}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Matériaux</div>
              </div>
            </div>

            {/* Liste des étapes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--gray-light)' }}>
                📋 Étapes ({etapes.length})
              </h3>
              {etapes.map((etape, index) => (
                <EtapeCard
                  key={index}
                  etape={etape}
                  index={index}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  isFirst={index === 0}
                  isLast={index === etapes.length - 1}
                />
              ))}
            </div>

            {/* Récap matériaux */}
            {materiaux.length > 0 && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--purple)' }}>
                  📦 Matériaux nécessaires
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {materiaux.map((mat, i) => (
                    <span key={i} style={{
                      padding: '0.3rem 0.6rem',
                      background: 'rgba(139, 92, 246, 0.2)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--gray-light)'
                    }}>
                      {mat.nom} ({mat.quantite} {mat.unite})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Récap outils */}
            {outils.length > 0 && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--blue)' }}>
                  🔧 Outils nécessaires
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {outils.map((outil, i) => (
                    <span key={i} style={{
                      padding: '0.3rem 0.6rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--gray-light)'
                    }}>
                      {outil}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              position: 'sticky',
              bottom: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleRegenerate}
                  disabled={isSaving}
                  style={{
                    padding: '0.6rem 1rem',
                    background: 'transparent',
                    border: '1px solid var(--gray)',
                    borderRadius: '8px',
                    color: 'var(--gray-light)',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Régénérer
                </button>
                <button
                  onClick={handleSaveBrouillon}
                  disabled={isSaving || !hasChanges}
                  style={{
                    padding: '0.6rem 1rem',
                    background: 'transparent',
                    border: '1px solid var(--blue)',
                    borderRadius: '8px',
                    color: 'var(--blue)',
                    fontSize: '0.85rem',
                    cursor: isSaving || !hasChanges ? 'not-allowed' : 'pointer',
                    opacity: isSaving || !hasChanges ? 0.5 : 1
                  }}
                >
                  💾 Sauvegarder brouillon
                </button>
              </div>
              <button
                onClick={handleValidate}
                disabled={isSaving || etapes.length === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--green)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  cursor: isSaving || etapes.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isSaving || etapes.length === 0 ? 0.5 : 1,
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                }}
              >
                ✓ Valider les étapes
              </button>
            </div>
          </>
        )}

        {/* Retour */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link
            href={`/chantiers/${chantierId}/travaux`}
            style={{
              color: 'var(--gray)',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            ← Retour aux lots
          </Link>
        </div>
      </div>
    </div>
  );
}
