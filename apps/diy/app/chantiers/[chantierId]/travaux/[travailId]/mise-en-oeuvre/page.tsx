'use client';

/**
 * Page Mise en Œuvre - Génération et gestion des étapes d'un lot
 * 
 * Pattern identique à /phasage pour les lots
 * 
 * @version 1.0
 * @date 02 décembre 2025
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
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
import {
  applyEtapesAction,
  type EtapesAction
} from '@/app/lib/services/etapesActions';

// ==================== COMPOSANT LOADING ====================

function LoadingMiseEnOeuvre() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  
  const steps = [
    { icon: '📋', text: 'Analyse du lot de travaux...' },
    { icon: '🔍', text: 'Identification des étapes nécessaires...' },
    { icon: '🔧', text: 'Sélection des outils et matériaux...' },
    { icon: '⏱️', text: 'Estimation des durées...' },
    { icon: '💡', text: 'Ajout des conseils de pro...' },
  ];

  const TOTAL_DURATION = 20000; // 20 secondes
  const STEP_DURATION = TOTAL_DURATION / steps.length; 

  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(newProgress);
      
      const newStep = Math.min(Math.floor(elapsed / STEP_DURATION), steps.length - 1);
      
      if (newStep !== step) {
        const completedSteps = [];
        for (let i = 0; i < newStep; i++) {
          completedSteps.push(i);
        }
        setCompleted(completedSteps);
        setStep(newStep);
      }
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
    
    return () => clearInterval(progressInterval);
  }, []);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--body-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        {/* Progress bar circulaire */}
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 1.5rem',
          position: 'relative'
        }}>
          <svg
            width="120"
            height="120"
            style={{
              transform: 'rotate(-90deg)',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(16, 185, 129, 0.2)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--green)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.1s linear'
              }}
            />
          </svg>
          
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem'
          }}>
            🔧
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--body-bg)',
            padding: '0 0.5rem',
            fontSize: '0.75rem',
            color: 'var(--green)',
            fontWeight: '700'
          }}>
            {Math.round(progress)}%
          </div>
        </div>

        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: 'var(--gray-light)',
          marginBottom: '0.5rem'
        }}>
          Génération des étapes...
        </h2>

        <p style={{
          fontSize: '0.95rem',
          color: 'var(--gray)',
          marginBottom: '1.5rem'
        }}>
          L'assistant analyse le lot et prépare les étapes détaillées.
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          {steps.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                borderRadius: '8px',
                background: idx === step ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              <span style={{
                fontSize: '0.85rem',
                color: idx === step ? 'var(--green)' : completed.includes(idx) ? '#10b981' : 'var(--gray)',
                fontWeight: idx === step ? '600' : '400',
                flex: 1,
                textAlign: 'left'
              }}>
                {s.text}
              </span>
              {completed.includes(idx) && <span style={{ color: '#10b981' }}>✓</span>}
              {idx === step && <span style={{ color: 'var(--green)' }}>...</span>}
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
          Cela peut prendre quelques secondes...
        </p>
      </div>
    </div>
  );
}

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
  isFirst,
  isLast
}: { 
  etape: EtapeGeneree;
  index: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDelete: (index: number) => void;
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

  // Écouter les actions de l'assistant IA
  useEffect(() => {
    const handleEtapesAction = (event: CustomEvent<EtapesAction>) => {
      console.log('🎯 Action étapes reçue:', event.detail);
      const newEtapes = applyEtapesAction(etapes, event.detail);
      setEtapes(newEtapes);
      setHasChanges(true);
    };

    window.addEventListener('etapesAction', handleEtapesAction as EventListener);
    
    return () => {
      window.removeEventListener('etapesAction', handleEtapesAction as EventListener);
    };
  }, [etapes]);

  // Charger les infos du lot et du chantier
  useEffect(() => {
    async function loadData() {
      try {
        // Charger le lot via Supabase
        const { data: travailData, error: travailError } = await supabase
          .from('travaux')
          .select('*')
          .eq('id', travailId)
          .single();

        if (travailError || !travailData) throw new Error('Lot non trouvé');
        setTravail(travailData);

        // Charger le chantier via Supabase
        const { data: chantierData } = await supabase
          .from('chantiers')
          .select('id, titre')
          .eq('id', travailData.chantier_id)
          .single();

        if (chantierData) setChantier(chantierData);

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
      
      // Rafraîchir le contexte de l'assistant pour qu'il voie les nouvelles étapes
      window.dispatchEvent(new CustomEvent('refreshAssistantContext'));
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

  // Quitter (avec option de sauvegarder)
  const handleQuit = () => {
    if (hasChanges) {
      const choice = window.confirm(
        'Vous avez des modifications non sauvegardées.\n\nCliquez OK pour sauvegarder en brouillon avant de quitter.\nCliquez Annuler pour quitter sans sauvegarder.'
      );
      if (choice) {
        // Sauvegarder puis quitter
        saveEtapesBrouillon(travailId, etapes).then(() => {
          router.push(`/chantiers/${chantierId}/travaux`);
        });
        return;
      }
    }
    router.push(`/chantiers/${chantierId}/travaux`);
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

        {/* Titre + Bouton Régénérer */}
        <div style={{ 
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--gray-light)' }}>
              🔧 Mise en œuvre : {travail?.titre}
            </h1>
            {travail?.description && (
              <p style={{ margin: '0.5rem 0 0', color: 'var(--gray)', fontSize: '0.9rem' }}>
                {travail.description}
              </p>
            )}
          </div>
          
          {/* Bouton Régénérer en haut à droite */}
          {viewMode === 'preview' && (
            <button
              onClick={handleRegenerate}
              disabled={isSaving}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid var(--gray)',
                borderRadius: '8px',
                color: 'var(--gray-light)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                opacity: isSaving ? 0.5 : 1
              }}
            >
              🔄 Régénérer
            </button>
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
        {viewMode === 'generating' && <LoadingMiseEnOeuvre />}

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

            {/* Actions - Footer sticky */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              padding: '1rem'
            }}>
              <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                display: 'flex',
                gap: '0.75rem'
              }}>
                <button
                  onClick={handleQuit}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    color: 'var(--gray-light)',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidate}
                  disabled={isSaving || etapes.length === 0}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: etapes.length === 0 ? 'rgba(255,255,255,0.1)' : 'var(--green)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: etapes.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? 'Sauvegarde...' : `✓ Valider ${etapes.length} étapes`}
                </button>
              </div>
            </div>
          </>
        )}

       {/* Retour - avec padding pour footer fixe */}
        <div style={{ marginTop: '2rem', paddingBottom: '5rem', textAlign: 'center' }}>
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
