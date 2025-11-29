'use client';

/**
 * Page de phasage d'un chantier
 * Génère et affiche les lots de travaux proposés par l'IA
 * 
 * @version 2.0 - Thème sombre cohérent
 * @date 29 novembre 2025
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

// ==================== COMPOSANT LOADING ====================

function LoadingPhasage() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: '📋', text: 'Analyse du projet...' },
    { icon: '🔍', text: 'Identification des travaux nécessaires...' },
    { icon: '📦', text: 'Organisation en lots cohérents...' },
    { icon: '🔗', text: 'Vérification des dépendances...' },
    { icon: '⏱️', text: 'Estimation durées et coûts...' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {/* Animation */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 1.5rem',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid rgba(249, 115, 22, 0.2)',
            borderTopColor: 'var(--orange)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            position: 'absolute',
            inset: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}>
            🏗️
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
                color: idx === step ? 'var(--orange)' : 'var(--gray)',
                fontWeight: idx === step ? '600' : '400'
              }}>
                {s.text}
              </span>
              {idx < step && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
            </div>
          ))}
        </div>

        <p style={{
          fontSize: '0.8rem',
          color: 'var(--gray)'
        }}>
          Cela peut prendre quelques secondes...
        </p>

        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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

  // ==================== RÉGÉNÉRATION (repart de zéro) ====================

  async function regeneratePhasage() {
    setLots([]);
    setPhasage(null);
    generatePhasage();
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

  // Loading ou génération
  if (loading || generating) {
    return <LoadingPhasage />;
  }

  // Erreur
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
      {/* BREADCRUMB */}
      <div style={{
        position: 'fixed',
        top: '100px',
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.98)',
        backdropFilter: 'blur(10px)',
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
            <Link href={`/chantiers/${chantierId}`} style={{ color: 'var(--gray)' }}>
              ← Retour
            </Link>
            <span style={{ color: 'var(--gray)' }}>/</span>
            <span style={{ color: 'var(--orange)', fontWeight: '600' }}>
              🏗️ Phasage : {chantier?.titre}
            </span>
          </div>
          <button
            onClick={regeneratePhasage}
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

            return (
              <div
                key={lot.ordre}
                style={{
                  background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a1a 100%)',
                  borderRadius: '12px',
                  borderLeft: '4px solid var(--blue)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}
              >
                {/* Numéro */}
                <div style={{
                  background: 'var(--blue)',
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

        {/* Message modification */}
        {phasage && lots.length !== phasage.lots.length && (
          <p style={{
            fontSize: '0.85rem',
            color: '#f59e0b',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ⚠️ Vous avez modifié le phasage ({phasage.lots.length} → {lots.length} lots)
          </p>
        )}

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
            onClick={() => router.back()}
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
            onClick={savePhasage}
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
