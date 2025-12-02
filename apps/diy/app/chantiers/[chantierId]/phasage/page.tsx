'use client';

/**
 * Page de phasage d'un chantier
 * Génère et affiche les lots de travaux proposés par l'IA
 * 
 * @version 2.1 - Brouillon, modale, vérification règles
 * @date 29 novembre 2025
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';
import { applyPhasageAction, type PhasageAction } from '@/app/lib/services/phasageActions';

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

interface RegleViolation {
  lot: string;
  probleme: string;
  suggestion: string;
}

// ==================== HELPERS ====================

const EXPERTISE_LABELS: Record<string, { label: string; icon: string }> = {
  demolition: { label: 'Démolition', icon: '🔨' },
  plomberie: { label: 'Plomberie', icon: '💧' },
  electricite: { label: 'Électricité', icon: '⚡' },
  plaquiste: { label: 'Plaquiste', icon: '🧱' },
  carreleur: { label: 'Carreleur', icon: '🔲' },
  peintre: { label: 'Peinture', icon: '🎨' },
  menuisier: { label: 'Menuiserie', icon: '🪚' },
  generaliste: { label: 'Général', icon: '🔧' },
  isolation: { label: 'Isolation', icon: '🧤' },
};

const NIVEAU_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  debutant: { label: 'Débutant', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },
  intermediaire: { label: 'Intermédiaire', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' },
  confirme: { label: 'Confirmé', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
};

const ALERTE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  critique: { icon: '🚨', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
  attention: { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },
  conseil: { icon: '💡', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
};

// ==================== RÈGLES DE DÉPENDANCES ====================

const REGLES_ORDRE: Record<string, string[]> = {
  // code_expertise : doit être AVANT ces codes
  demolition: ['plomberie', 'electricite', 'isolation', 'plaquiste', 'carreleur', 'peintre', 'menuisier', 'generaliste'],
  plomberie: ['plaquiste', 'carreleur', 'peintre'],
  electricite: ['plaquiste', 'carreleur', 'peintre'],
  isolation: ['plaquiste'],
  plaquiste: ['carreleur', 'peintre'],
  carreleur: ['generaliste', 'menuisier'], // équipements sanitaires souvent en generaliste
  peintre: ['menuisier'], // finitions
};

function verifierRegles(lots: LotGenere[]): RegleViolation[] {
  const violations: RegleViolation[] = [];
  
  lots.forEach((lot) => {
    const doitEtreAvant = REGLES_ORDRE[lot.code_expertise] || [];
    
    doitEtreAvant.forEach((codeApres) => {
      // Chercher si un lot avec ce code est AVANT le lot actuel
      const lotAvant = lots.find(
        (l) => l.code_expertise === codeApres && l.ordre < lot.ordre
      );
      
      if (lotAvant) {
        const expertiseActuel = EXPERTISE_LABELS[lot.code_expertise]?.label || lot.code_expertise;
        const expertiseAvant = EXPERTISE_LABELS[codeApres]?.label || codeApres;
        
        violations.push({
          lot: lot.titre,
          probleme: `"${expertiseActuel}" (n°${lot.ordre}) devrait être avant "${expertiseAvant}" (n°${lotAvant.ordre})`,
          suggestion: `Déplacez "${lot.titre}" avant "${lotAvant.titre}"`,
        });
      }
    });
  });
  
  return violations;
}

// ==================== COMPOSANT MODALE ====================

function Modale({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel,
  type = 'warning'
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}) {
  if (!isOpen) return null;

  const colors = {
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', icon: '⚠️' },
    danger: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', icon: '🚨' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', icon: '💡' },
  };
  const config = colors[type];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        border: `1px solid ${config.border}`,
        maxWidth: '450px',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: config.bg,
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${config.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
          <h3 style={{ margin: 0, color: 'var(--gray-light)', fontSize: '1.1rem', fontWeight: '600' }}>
            {title}
          </h3>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.25rem' }}>
          <p style={{ color: 'var(--gray)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: 'var(--gray-light)',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.25rem',
              background: config.border,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPOSANT LOADING ====================

function LoadingPhasage() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  
  const steps = [
    { icon: '📋', text: 'Analyse du projet...' },
    { icon: '🔍', text: 'Identification des travaux nécessaires...' },
    { icon: '📦', text: 'Organisation en lots cohérents...' },
    { icon: '🔗', text: 'Vérification des dépendances...' },
    { icon: '⏱️', text: 'Estimation durées et coûts...' },
  ];

  const TOTAL_DURATION = 25000; // 30 secondes
  const STEP_DURATION = TOTAL_DURATION / steps.length; 

  // Progress bar animation (30 secondes pour faire le tour)
  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(newProgress);
      
      // Calculer l'étape actuelle basée sur le temps
      const newStep = Math.min(Math.floor(elapsed / STEP_DURATION), steps.length - 1);
      
      // Marquer toutes les étapes précédentes comme complétées
      if (newStep !== step) {
        const completedSteps = [];
        for (let i = 0; i < newStep; i++) {
          completedSteps.push(i);
        }
        setCompleted(completedSteps);
        setStep(newStep);
      }
      
      // Arrêter à 100%
      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
    
    return () => clearInterval(progressInterval);
  }, []);

  // Calculer le cercle SVG
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
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
          {/* SVG cercle de progression */}
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
            {/* Cercle de fond */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(249, 115, 22, 0.2)"
              strokeWidth="8"
            />
            {/* Cercle de progression */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--orange)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.1s linear'
              }}
            />
          </svg>
          
          {/* Icône centrale */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem'
          }}>
            🏗️
          </div>
          
          {/* Pourcentage */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a0a0a',
            padding: '0 0.5rem',
            fontSize: '0.75rem',
            color: 'var(--orange)',
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
          Génération du phasage...
        </h2>

        <p style={{
          fontSize: '0.95rem',
          color: 'var(--gray)',
          marginBottom: '1.5rem'
        }}>
          L'assistant analyse votre projet et prépare les lots de travaux adaptés.
        </p>

        {/* Étapes */}
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
                background: idx === step ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              <span style={{
                fontSize: '0.85rem',
                color: idx === step ? 'var(--orange)' : completed.includes(idx) ? '#10b981' : 'var(--gray)',
                fontWeight: idx === step ? '600' : '400',
                flex: 1,
                textAlign: 'left'
              }}>
                {s.text}
              </span>
              {completed.includes(idx) && <span style={{ color: '#10b981' }}>✓</span>}
              {idx === step && <span style={{ color: 'var(--orange)' }}>...</span>}
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

// ==================== COMPOSANT PRINCIPAL ====================

export default function PhasagePage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.chantierId as string;

  // États
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phasage, setPhasage] = useState<ResultatPhasage | null>(null);
  const [lots, setLots] = useState<LotGenere[]>([]);
  
  // Modales
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [violations, setViolations] = useState<RegleViolation[]>([]);

  // ==================== CHARGEMENT INITIAL ====================

  useEffect(() => {
    loadChantier();
  }, [chantierId]);

  // ==================== ÉCOUTE ACTIONS IA ====================

  useEffect(() => {
    const handlePhasageAction = (event: CustomEvent<PhasageAction>) => {
      const action = event.detail;
      console.log('🎯 Action phasage reçue:', action);
      
      // Appliquer l'action sur les lots
      const newLots = applyPhasageAction(lots, action);
      setLots(newLots);
      setViolations([]); // Reset violations quand on modifie
      
      // Sauvegarder en brouillon automatiquement
      fetch('/api/phasage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chantierId, 
          action: 'save_brouillon',
          lots: newLots 
        }),
      }).then(() => {
        console.log('✅ Brouillon auto-sauvegardé après action IA');
      }).catch((err) => {
        console.warn('⚠️ Erreur sauvegarde brouillon:', err);
      });
    };

    window.addEventListener('phasageAction', handlePhasageAction as EventListener);
    
    return () => {
      window.removeEventListener('phasageAction', handlePhasageAction as EventListener);
    };
  }, [lots, chantierId]);

  async function loadChantier() {
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, titre, budget_initial')
        .eq('id', chantierId)
        .single();

      if (error) throw error;
      setChantier(data);
      
      // Vérifier s'il y a un brouillon existant
      const brouillonResponse = await fetch('/api/phasage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chantierId, action: 'load_brouillon' }),
      });
      const brouillonData = await brouillonResponse.json();
      
      if (brouillonData.hasBrouillon && brouillonData.lots?.length > 0) {
        // Charger le brouillon existant
        setLots(brouillonData.lots);
        setPhasage({
          ready_for_phasage: true,
          analyse: 'Brouillon chargé - Vous pouvez continuer votre phasage.',
          lots: brouillonData.lots,
          alertes: [],
          budget_total_estime: brouillonData.lots.reduce((s: number, l: LotGenere) => s + (l.cout_estime || 0), 0),
          duree_totale_estimee_heures: brouillonData.lots.reduce((s: number, l: LotGenere) => s + (l.duree_estimee_heures || 0), 0),
        });
        setLoading(false);
      } else {
        // Sinon générer
        generatePhasage();
      }
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
      
      // Sauvegarder automatiquement en brouillon pour que l'assistant ait le contexte
      try {
        await fetch('/api/phasage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chantierId, 
            action: 'save_brouillon',
            lots: data.phasage.lots 
          }),
        });
        console.log('✅ Brouillon auto-sauvegardé');
      } catch (e) {
        console.warn('⚠️ Sauvegarde brouillon auto échouée:', e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  // ==================== RÉGÉNÉRATION ====================

  function handleRegenerateClick() {
    setShowRegenerateModal(true);
  }

  async function confirmRegenerate() {
    setShowRegenerateModal(false);
    setLots([]);
    setPhasage(null);
    setViolations([]);
    
    // Supprimer les brouillons existants
    await fetch('/api/phasage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chantierId, action: 'reset' }),
    });
    
    generatePhasage();
  }

  // ==================== MODIFICATION LOTS ====================

  function removeLot(ordre: number) {
    const newLots = lots
      .filter(l => l.ordre !== ordre)
      .map((l, idx) => ({ ...l, ordre: idx + 1 }));
    setLots(newLots);
    setViolations([]); // Reset violations quand on modifie
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
    
    setLots(newLots.map((l, idx) => ({ ...l, ordre: idx + 1 })));
    setViolations([]); // Reset violations quand on modifie
  }

  // ==================== VALIDATION ====================

  function handleValidateClick() {
    // Vérifier les règles
    const reglesViolees = verifierRegles(lots);
    setViolations(reglesViolees);
    
    if (reglesViolees.length > 0) {
      setShowValidateModal(true);
    } else {
      // Pas de violation, valider directement
      savePhasage('validate');
    }
  }

  async function savePhasage(action: 'save_brouillon' | 'validate') {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/phasage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chantierId, 
          action,
          lots 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur sauvegarde');
      }

      if (action === 'validate') {
        router.push(`/chantiers/${chantierId}/travaux`);
      } else {
        router.push(`/chantiers/${chantierId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
      setSaving(false);
    }
  }

  // ==================== QUITTER ====================

  function handleQuitClick() {
    setShowQuitModal(true);
  }

  async function confirmQuitWithSave() {
    setShowQuitModal(false);
    await savePhasage('save_brouillon');
  }

  function confirmQuitWithoutSave() {
    setShowQuitModal(false);
    router.push(`/chantiers/${chantierId}`);
  }

  // ==================== CALCULS ====================

  const budgetTotal = lots.reduce((sum, l) => sum + (l.cout_estime || 0), 0);
  const dureeTotal = lots.reduce((sum, l) => sum + (l.duree_estimee_heures || 0), 0);

  // ==================== RENDU ====================

  // Loading génération IA = animation complète
  if (generating) {
    return <LoadingPhasage />;
  }

  // Loading initial (chargement brouillon) = spinner simple
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--gray)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !phasage) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: 'var(--gray-light)', marginBottom: '0.5rem' }}>Erreur</h2>
          <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'var(--gray-light)',
              cursor: 'pointer'
            }}
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '100px' }}>
      
      {/* MODALES */}
      <Modale
        isOpen={showRegenerateModal}
        type="warning"
        title="Régénérer le phasage ?"
        message="Cette action va supprimer tous les lots actuels et en générer de nouveaux. Les modifications non sauvegardées seront perdues."
        confirmText="Régénérer"
        cancelText="Annuler"
        onConfirm={confirmRegenerate}
        onCancel={() => setShowRegenerateModal(false)}
      />

      <Modale
        isOpen={showValidateModal}
        type="danger"
        title="Ordre des lots incorrect"
        message={`Attention : ${violations.length} problème(s) d'ordre détecté(s). Par exemple : ${violations[0]?.probleme || ''}. Voulez-vous quand même valider ?`}
        confirmText="Valider quand même"
        cancelText="Corriger"
        onConfirm={() => { setShowValidateModal(false); savePhasage('validate'); }}
        onCancel={() => setShowValidateModal(false)}
      />

      <Modale
        isOpen={showQuitModal}
        type="info"
        title="Quitter le phasage ?"
        message="Voulez-vous sauvegarder votre phasage en brouillon pour y revenir plus tard ?"
        confirmText="Sauvegarder et quitter"
        cancelText="Quitter sans sauvegarder"
        onConfirm={confirmQuitWithSave}
        onCancel={confirmQuitWithoutSave}
      />

      {/* BREADCRUMB */}
      <div style={{
        position: 'fixed',
        top: '100px',
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.98)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <span 
              onClick={handleQuitClick}
              style={{ color: 'var(--gray)', cursor: 'pointer' }}
            >
              ← Retour
            </span>
            <span style={{ color: 'var(--gray)' }}>/</span>
            <span style={{ color: 'var(--orange)', fontWeight: '600' }}>
              🏗️ Phasage : {chantier?.titre}
            </span>
          </div>
          <button
            onClick={handleRegenerateClick}
            disabled={generating}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'var(--gray-light)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            🔄 Régénérer
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem', paddingTop: '70px' }}>
        
        {/* ANALYSE */}
        {phasage?.analyse && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>📋</span>
              <span style={{ fontWeight: '600', color: '#60a5fa' }}>Analyse du projet</span>
            </div>
            <p style={{ color: 'var(--gray-light)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              {phasage.analyse}
            </p>
          </div>
        )}

        {/* ALERTES */}
        {phasage?.alertes && phasage.alertes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {phasage.alertes.map((alerte, idx) => {
              const config = ALERTE_CONFIG[alerte.type] || ALERTE_CONFIG.conseil;
              return (
                <div
                  key={idx}
                  style={{
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}
                >
                  <span>{config.icon}</span>
                  <p style={{ color: config.color, fontSize: '0.85rem', margin: 0 }}>{alerte.message}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* VIOLATIONS DE RÈGLES */}
        {violations.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span>🚨</span>
              <span style={{ fontWeight: '600', color: '#ef4444' }}>
                Problèmes d'ordre détectés ({violations.length})
              </span>
            </div>
            {violations.map((v, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.85rem', 
                color: 'var(--gray-light)',
                marginBottom: '0.5rem',
                paddingLeft: '1.5rem'
              }}>
                • {v.probleme}
              </div>
            ))}
          </div>
        )}

        {/* RÉSUMÉ */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3b82f6' }}>{lots.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Lots</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10b981' }}>{budgetTotal.toLocaleString()} €</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Budget estimé</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b' }}>{dureeTotal}h</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Durée estimée</div>
          </div>
        </div>

        {/* TITRE SECTION */}
        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          color: 'var(--gray-light)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          📦 Lots de travaux ({lots.length})
        </h2>

        {/* LISTE DES LOTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {lots.map((lot) => {
            const expertise = EXPERTISE_LABELS[lot.code_expertise] || { label: lot.code_expertise, icon: '🔧' };
            const niveau = NIVEAU_CONFIG[lot.niveau_requis] || NIVEAU_CONFIG.intermediaire;
            const hasViolation = violations.some(v => v.lot === lot.titre);

            return (
              <div
                key={lot.ordre}
                style={{
                  background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a1a 100%)',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${hasViolation ? '#ef4444' : 'var(--blue)'}`,
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  transition: 'all 0.2s'
                }}
              >
                {/* Numéro */}
                <div style={{
                  background: hasViolation ? '#ef4444' : 'var(--blue)',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  {lot.ordre}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'var(--gray-light)',
                    margin: '0 0 0.35rem 0'
                  }}>
                    {lot.titre}
                  </h3>
                  
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--gray)',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.4'
                  }}>
                    {lot.description}
                  </p>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: 'var(--gray-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {expertise.icon} {expertise.label}
                    </span>
                    <span style={{
                      background: niveau.bg,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: niveau.color
                    }}>
                      {niveau.label}
                    </span>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: '#10b981'
                    }}>
                      {lot.cout_estime} €
                    </span>
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: '#f59e0b'
                    }}>
                      {lot.duree_estimee_heures}h
                    </span>
                  </div>

                  {/* Point d'attention */}
                  {lot.points_attention && (
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#f59e0b',
                      margin: '0.5rem 0 0 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.35rem'
                    }}>
                      <span>⚠️</span> {lot.points_attention}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => moveLot(lot.ordre, 'up')}
                    disabled={lot.ordre === 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: lot.ordre === 1 ? 'rgba(255,255,255,0.2)' : 'var(--gray)',
                      cursor: lot.ordre === 1 ? 'not-allowed' : 'pointer',
                      padding: '0.25rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveLot(lot.ordre, 'down')}
                    disabled={lot.ordre === lots.length}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: lot.ordre === lots.length ? 'rgba(255,255,255,0.2)' : 'var(--gray)',
                      cursor: lot.ordre === lots.length ? 'not-allowed' : 'pointer',
                      padding: '0.25rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeLot(lot.ordre)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginTop: '1rem'
          }}>
            <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* FOOTER FIXE */}
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
            onClick={handleQuitClick}
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
            onClick={handleValidateClick}
            disabled={saving || lots.length === 0}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: lots.length === 0 ? 'rgba(255,255,255,0.1)' : 'var(--orange)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: lots.length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Sauvegarde...' : `✓ Valider ${lots.length} lots`}
          </button>
        </div>
      </div>
    </div>
  );
}
