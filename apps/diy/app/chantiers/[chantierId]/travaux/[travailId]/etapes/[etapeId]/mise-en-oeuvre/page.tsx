'use client';

/**
 * Page Mise en Œuvre des Tâches - Génération et gestion des tâches d'une étape
 * 
 * Pattern identique à /travaux/[travailId]/mise-en-oeuvre pour les étapes
 * 
 * @version 1.0
 * @date 04 décembre 2025
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import Link from 'next/link';
import {
  loadTachesBrouillon,
  loadTachesValidees,
  saveTachesBrouillon,
  validerTaches,
  deleteTaches,
  calculerTotaux,
  aggregerOutils,
  type TacheGeneree
} from '@/app/lib/services/tachesGeneratorService';
import {
  applyTachesAction,
  type TachesAction
} from '@/app/lib/services/tachesActions';

// ==================== COMPOSANT LOADING ====================

function LoadingTaches() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  
  const steps = [
    { icon: '📋', text: 'Analyse de l\'étape...' },
    { icon: '🔍', text: 'Identification des tâches...' },
    { icon: '🔧', text: 'Sélection des outils...' },
    { icon: '⏱️', text: 'Estimation des durées...' },
    { icon: '💡', text: 'Ajout des conseils...' },
  ];

  const TOTAL_DURATION = 15000; // 15 secondes
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
              stroke="rgba(59, 130, 246, 0.2)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--blue)"
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
            📋
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--body-bg)',
            padding: '0 0.5rem',
            fontSize: '0.75rem',
            color: 'var(--blue)',
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
          Génération des tâches...
        </h2>

        <p style={{
          fontSize: '0.95rem',
          color: 'var(--gray)',
          marginBottom: '1.5rem'
        }}>
          L'assistant analyse l'étape et prépare les tâches détaillées.
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
                background: idx === step ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              <span style={{
                fontSize: '0.85rem',
                color: idx === step ? 'var(--blue)' : completed.includes(idx) ? '#3b82f6' : 'var(--gray)',
                fontWeight: idx === step ? '600' : '400',
                flex: 1,
                textAlign: 'left'
              }}>
                {s.text}
              </span>
              {completed.includes(idx) && <span style={{ color: '#3b82f6' }}>✓</span>}
              {idx === step && <span style={{ color: 'var(--blue)' }}>...</span>}
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

interface EtapeInfo {
  id: string;
  numero: number;
  titre: string;
  description: string;
  duree_estimee_minutes: number;
  difficulte: string;
  travail_id: string;
}

interface TravailInfo {
  id: string;
  titre: string;
  code_expertise: string;
  chantier_id: string;
}

interface ChantierInfo {
  id: string;
  titre: string;
}

// ==================== COMPOSANTS ====================

function TacheCard({ 
  tache, 
  index,
  onMove,
  onDelete,
  isFirst,
  isLast
}: { 
  tache: TacheGeneree;
  index: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDelete: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      background: tache.est_critique 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(30, 30, 30, 1) 100%)'
        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 30, 30, 1) 100%)',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '0.75rem',
      border: tache.est_critique 
        ? '1px solid rgba(239, 68, 68, 0.3)'
        : '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <div 
          style={{ flex: 1, cursor: 'pointer' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: tache.est_critique ? 'var(--red)' : 'var(--blue)',
              color: 'white',
              minWidth: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}>
              {tache.numero}
            </span>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1rem', 
              color: 'var(--gray-light)',
              fontWeight: '600',
              flex: 1
            }}>
              {tache.titre}
            </h3>
            {tache.est_critique && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                🔥 Critique
              </span>
            )}
            <span style={{ 
              fontSize: '1rem',
              color: 'var(--gray)',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
          
          {/* Méta infos */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            fontSize: '0.8rem', 
            color: 'var(--gray)',
            marginLeft: '36px'
          }}>
            <span>⏱️ {tache.duree_estimee_minutes} min</span>
            {tache.outils_necessaires && tache.outils_necessaires.length > 0 && (
              <span>🔧 {tache.outils_necessaires.length} outil{tache.outils_necessaires.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => onMove(index, 'up')}
            disabled={isFirst}
            style={{
              width: '32px',
              height: '32px',
              background: isFirst ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              color: isFirst ? 'var(--gray)' : 'var(--gray-light)',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ↑
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={isLast}
            style={{
              width: '32px',
              height: '32px',
              background: isLast ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              color: isLast ? 'var(--gray)' : 'var(--gray-light)',
              cursor: isLast ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ↓
          </button>
          <button
            onClick={() => onDelete(index)}
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Détails expandés */}
      {isExpanded && (
        <div style={{ 
          marginTop: '1rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginLeft: '36px'
        }}>
          {tache.description && (
            <p style={{ 
              margin: '0 0 0.75rem', 
              fontSize: '0.9rem', 
              color: 'var(--gray)',
              lineHeight: '1.5'
            }}>
              {tache.description}
            </p>
          )}
          
          {tache.outils_necessaires && tache.outils_necessaires.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray)', marginRight: '0.5rem' }}>
                🔧 Outils :
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                {tache.outils_necessaires.map((outil, i) => (
                  <span key={i} style={{
                    padding: '0.2rem 0.5rem',
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--blue)'
                  }}>
                    {outil}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {tache.conseils_pro && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              color: '#eab308'
            }}>
              💡 {tache.conseils_pro}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== PAGE PRINCIPALE ====================

export default function MiseEnOeuvreTachesPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.chantierId as string;
  const travailId = params.travailId as string;
  const etapeId = params.etapeId as string;

  // États
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [taches, setTaches] = useState<TacheGeneree[]>([]);
  const [etape, setEtape] = useState<EtapeInfo | null>(null);
  const [travail, setTravail] = useState<TravailInfo | null>(null);
  const [chantier, setChantier] = useState<ChantierInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Écouter les actions de l'assistant IA
  useEffect(() => {
    const handleTachesAction = (event: Event) => {
      const customEvent = event as CustomEvent<TachesAction>;
      console.log('🎯 Action tâches reçue:', customEvent.detail);
      
      const newTaches = applyTachesAction(taches, customEvent.detail);
      setTaches(newTaches);
      setHasChanges(true);
      
      // Sauvegarder automatiquement en brouillon
      (async () => {
        const saveResult = await saveTachesBrouillon(etapeId, newTaches);
        if (saveResult.success) {
          console.log('✅ Tâches mises à jour en BDD');
          setHasChanges(false);
          window.dispatchEvent(new CustomEvent('refreshAssistantContext'));
        }
      })();
    };

    window.addEventListener('tachesAction', handleTachesAction);
    
    return () => {
      window.removeEventListener('tachesAction', handleTachesAction);
    };
  }, [taches, etapeId]);

  // Reset la conversation de l'assistant au changement d'étape
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('resetAssistantChat'));
    window.dispatchEvent(new CustomEvent('refreshAssistantContext'));
    console.log('🔄 Reset conversation pour nouvelle étape:', etapeId);
  }, [etapeId]);

  // Charger les infos
  useEffect(() => {
    async function loadData() {
      try {
        // Charger l'étape
        const { data: etapeData, error: etapeError } = await supabase
          .from('etapes')
          .select('*')
          .eq('id', etapeId)
          .single();

        if (etapeError || !etapeData) throw new Error('Étape non trouvée');
        setEtape(etapeData);

        // Charger le travail
        const { data: travailData } = await supabase
          .from('travaux')
          .select('*')
          .eq('id', etapeData.travail_id)
          .single();

        if (travailData) setTravail(travailData);

        // Charger le chantier
        if (travailData?.chantier_id) {
          const { data: chantierData } = await supabase
            .from('chantiers')
            .select('id, titre')
            .eq('id', travailData.chantier_id)
            .single();

          if (chantierData) setChantier(chantierData);
        }

        // Vérifier si des tâches existent déjà
        const tachesValidees = await loadTachesValidees(etapeId);
        if (tachesValidees.length > 0) {
          setTaches(tachesValidees);
          setViewMode('preview');
          return;
        }

        const tachesBrouillon = await loadTachesBrouillon(etapeId);
        if (tachesBrouillon.length > 0) {
          setTaches(tachesBrouillon);
          setViewMode('preview');
          return;
        }

        // Aucune tâche, afficher l'écran de génération
        setViewMode('empty');
      } catch (err) {
        console.error('Erreur chargement:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setViewMode('error');
      }
    }

    if (etapeId) {
      loadData();
    }
  }, [etapeId]);

  // Générer les tâches
  const handleGenerate = async () => {
    setViewMode('generating');
    setError(null);
    
    // Reset la conversation
    window.dispatchEvent(new CustomEvent('resetAssistantChat'));
    
    try {
      const res = await fetch('/api/taches/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapeId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur génération');
      }
      const data = await res.json();
      const generatedTaches = data.taches || [];
      
      setTaches(generatedTaches);
      setViewMode('preview');
      setHasChanges(true);
      
      // Sauvegarder automatiquement en brouillon
      if (generatedTaches.length > 0) {
        const saveResult = await saveTachesBrouillon(etapeId, generatedTaches);
        if (saveResult.success) {
          console.log('✅ Tâches sauvegardées en brouillon');
          setHasChanges(false);
        }
      }
      
      // Rafraîchir le contexte de l'assistant
      window.dispatchEvent(new CustomEvent('refreshAssistantContext'));
      
    } catch (err) {
      console.error('Erreur génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setViewMode('error');
    }
  };

  // Régénérer les tâches
  const handleRegenerate = async () => {
    if (!confirm('Régénérer les tâches ? Les modifications actuelles seront perdues.')) return;
    window.dispatchEvent(new CustomEvent('resetAssistantChat'));
    await handleGenerate();
  };

  // Valider les tâches
  const handleValidate = async () => {
    if (!confirm('Valider ces tâches ?')) return;
    
    setIsSaving(true);
    try {
      const result = await validerTaches(etapeId, taches);
      if (!result.success) throw new Error(result.error);
      
      // Rediriger vers la page des tâches
      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etapeId}/taches`);
    } catch (err) {
      alert('Erreur validation : ' + (err instanceof Error ? err.message : 'Erreur'));
    } finally {
      setIsSaving(false);
    }
  };

  // Quitter
  const handleQuit = async () => {
    const { data: brouillonExistant } = await supabase
      .from('taches')
      .select('id')
      .eq('etape_id', etapeId)
      .eq('statut', 'brouillon')
      .limit(1);
    
    const hasBrouillonEnBDD = brouillonExistant && brouillonExistant.length > 0;
    
    if (hasBrouillonEnBDD || hasChanges) {
      const garderBrouillon = window.confirm(
        'Des tâches brouillon existent pour cette étape.\n\n' +
        '• OK = Garder le brouillon (vous pourrez reprendre plus tard)\n' +
        '• Annuler = Supprimer le brouillon et quitter'
      );
      
      if (!garderBrouillon) {
        await deleteTaches(etapeId, 'brouillon');
        console.log('🗑️ Brouillon supprimé');
      }
    }
    
    router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes`);
  };

  // Déplacer une tâche
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newTaches = [...taches];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newTaches.length) return;
    
    [newTaches[index], newTaches[targetIndex]] = [newTaches[targetIndex], newTaches[index]];
    
    // Renuméroter
    newTaches.forEach((t, i) => { t.numero = i + 1; });
    
    setTaches(newTaches);
    setHasChanges(true);
    
    // Sauvegarder en brouillon et rafraîchir le contexte
    await saveTachesBrouillon(etapeId, newTaches);
    window.dispatchEvent(new CustomEvent('refreshAssistantContext'));
  };

  // Supprimer une tâche
  const handleDelete = async (index: number) => {
    if (!confirm(`Supprimer la tâche "${taches[index].titre}" ?`)) return;
    
    const newTaches = taches.filter((_, i) => i !== index);
    newTaches.forEach((t, i) => { t.numero = i + 1; });
    
    setTaches(newTaches);
    setHasChanges(true);
    
    // Sauvegarder en brouillon et rafraîchir le contexte
    await saveTachesBrouillon(etapeId, newTaches);
    window.dispatchEvent(new CustomEvent('refreshAssistantContext'));
  };

  // Calculer les totaux
  const totaux = calculerTotaux(taches);
  const outils = aggregerOutils(taches);

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
          <Link href={`/chantiers/${chantierId}/travaux/${travailId}/etapes`} style={{ color: 'var(--gray)' }}>
            Étapes
          </Link>
          {' > '}
          <span style={{ color: 'var(--blue)' }}>{etape?.titre || 'Étape'}</span>
          {' > '}
          <span style={{ color: 'var(--gray-light)' }}>Tâches</span>
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
              📋 Tâches : {etape?.titre}
            </h1>
            {etape?.description && (
              <p style={{ margin: '0.5rem 0 0', color: 'var(--gray)', fontSize: '0.9rem' }}>
                {etape.description}
              </p>
            )}
            {etape && (
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--gray)'
              }}>
                <span>⏱️ {etape.duree_estimee_minutes} min</span>
                <span>📊 {etape.difficulte}</span>
              </div>
            )}
          </div>
          
          {viewMode === 'preview' && (
            <button
              onClick={handleRegenerate}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: 'var(--gray)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🔄 Régénérer
            </button>
          )}
        </div>

        {/* EMPTY - Aucune tâche */}
        {viewMode === 'empty' && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', color: 'var(--gray-light)' }}>
              Générer les tâches
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--gray)', maxWidth: '400px', marginInline: 'auto' }}>
              L'assistant va analyser l'étape "{etape?.titre}" et générer les tâches détaillées.
            </p>
            <button
              onClick={handleGenerate}
              style={{
                padding: '0.875rem 2rem',
                background: 'var(--blue)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              ✨ Générer les tâches
            </button>
          </div>
        )}

        {/* GENERATING */}
        {viewMode === 'generating' && <LoadingTaches />}

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

        {/* PREVIEW - Liste des tâches */}
        {viewMode === 'preview' && (
          <>
            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--blue)' }}>
                  {totaux.nombre_taches}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Tâches</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--green)' }}>
                  {totaux.duree_totale_minutes}min
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Durée totale</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                  {totaux.taches_critiques}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Critiques</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--purple)' }}>
                  {outils.length}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Outils</div>
              </div>
            </div>

            {/* Liste des tâches */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--gray-light)' }}>
                📋 Tâches ({taches.length})
              </h3>
              {taches.map((tache, index) => (
                <TacheCard
                  key={index}
                  tache={tache}
                  index={index}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  isFirst={index === 0}
                  isLast={index === taches.length - 1}
                />
              ))}
            </div>

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
                  disabled={isSaving || taches.length === 0}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: taches.length === 0 ? 'rgba(255,255,255,0.1)' : 'var(--blue)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: taches.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? 'Sauvegarde...' : `✓ Valider ${taches.length} tâches`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Retour - avec padding pour footer fixe */}
        <div style={{ marginTop: '2rem', paddingBottom: '5rem', textAlign: 'center' }}>
          <Link
            href={`/chantiers/${chantierId}/travaux/${travailId}/etapes`}
            style={{
              color: 'var(--gray)',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            ← Retour aux étapes
          </Link>
        </div>
      </div>
    </div>
  );
}
