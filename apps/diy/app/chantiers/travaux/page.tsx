'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierDemo, getChantierStats } from '../../lib/services/chantierService';
import { getTravauxByChantier, updateTravailProgression, annulerTravail, reactiverTravail, commencerTravail, reporterTravail } from '../../lib/services/travauxService';
import ConfirmModal from '../../components/ConfirmModal';

interface Chantier {
  id: string;
  titre: string;
  progression: number;
  duree_estimee_heures: number;
  budget_initial: number;
  statut: string;
}

interface Travail {
  id: string;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  phase: string;
  ordre: number;
  blocage_raison?: string;
  duree_estimee_heures?: number;
  etapes?: {
    etapes: Array<{
      numero: number;
      titre: string;
      description: string;
      duree_minutes: number;
      outils: string[];
      difficulte: string;
      conseils?: string;
    }>;
  };
}

export default function TravauxPage() {
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [travaux, setTravaux] = useState<Travail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnCours, setShowEnCours] = useState(true);
  const [showBloques, setShowBloques] = useState(true);
  const [showTermines, setShowTermines] = useState(false);
  const [showAVenir, setShowAVenir] = useState(false);
  const [editingTravailId, setEditingTravailId] = useState<string | null>(null);
  const [tempProgression, setTempProgression] = useState<number>(0);
  const [showAnnulees, setShowAnnulees] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    async function loadData() {
      try {
        const chantierData = await getChantierDemo();
        if (chantierData) {
          setChantier(chantierData);
          const [statsData, allTravaux] = await Promise.all([
            getChantierStats(chantierData.id),
            getTravauxByChantier(chantierData.id)
          ]);
          setStats(statsData);
          setTravaux(allTravaux);
        }
      } catch (error) {
        console.error('Error loading travaux:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  // Grouper par statut
  const termines = travaux.filter(t => t.statut === 'terminé');
  const enCours = travaux.filter(t => t.statut === 'en_cours');
  const bloques = travaux.filter(t => t.statut === 'bloqué');
  const aVenir = travaux.filter(t => t.statut === 'à_venir');
  const annulees = travaux.filter(t => t.statut === 'annulé');

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloqué': return 'var(--orange)';
      default: return 'var(--gray)';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'terminé': return '✓';
      case 'en_cours': return '⚡';
      case 'bloqué': return '🚫';
      case 'annulé': return '🗑️';
      default: return '📅';
    }
  };

  const TravailCard = ({ travail }: { travail: Travail }) => {
    const isAnnulee = travail.statut === 'annulé';
    const statusColor = getStatusColor(travail.statut);
    
    return (
      <div style={{
        background: isAnnulee 
          ? 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)'
          : 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        borderLeft: `4px solid ${statusColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s',
        opacity: isAnnulee ? 0.6 : 1
      }}
      onMouseEnter={(e) => {
        if (!isAnnulee) {
          // EFFET HALO - Juste la shadow, pas de transform
          const rgba = statusColor === 'var(--blue)' ? 'rgba(37, 99, 235, 0.25)' :
                       statusColor === 'var(--orange)' ? 'rgba(255, 107, 53, 0.25)' :
                       statusColor === 'var(--green)' ? 'rgba(16, 185, 129, 0.25)' :
                       'rgba(107, 114, 128, 0.25)';
          e.currentTarget.style.boxShadow = `0 4px 16px ${rgba}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }}>
        {/* Header : Titre + Boutons EN LIGNE à droite */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
          gap: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              fontSize: '1.05rem', 
              margin: 0, 
              marginBottom: '0.35rem',
              color: 'var(--gray-light)',
              fontWeight: '700',
              lineHeight: '1.2'
            }}>
              {getStatusIcon(travail.statut)} {travail.titre}
            </h3>
            {travail.description && (
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--gray)', 
                margin: 0,
                lineHeight: '1.4'
              }}>
                {travail.description}
              </p>
            )}
            {travail.blocage_raison && (
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--orange)', 
                margin: 0,
                marginTop: '0.5rem',
                fontStyle: 'italic',
                padding: '0.5rem',
                background: 'rgba(255, 107, 53, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 107, 53, 0.2)'
              }}>
                💬 {travail.blocage_raison}
              </p>
            )}
          </div>

          {/* BOUTONS EN LIGNE (horizontal) À DROITE */}
          {travail.statut !== 'terminé' && travail.statut !== 'annulé' && editingTravailId !== travail.id && (
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexShrink: 0,
              alignItems: 'flex-start'
            }}>
              {/* Bouton REPORTER pour EN COURS à 0% */}
              {travail.statut === 'en_cours' && travail.progression === 0 && (
                <button 
                  className="main-btn"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.75rem',
                    minHeight: 'auto',
                    background: 'rgba(107, 114, 128, 0.15)',
                    color: 'var(--gray)',
                    fontWeight: '600',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--gray)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(107, 114, 128, 0.15)';
                    e.currentTarget.style.color = 'var(--gray)';
                  }}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Reporter cette tâche ?',
                      message: `"${travail.titre}" reviendra dans "À venir". Vous pourrez la redémarrer plus tard.`,
                      onConfirm: async () => {
                        await reporterTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                >
                  📅 Reporter
                </button>
              )}

              {/* Bouton AJUSTER pour EN COURS */}
              {travail.statut === 'en_cours' && (
                <button 
                  className="main-btn"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.75rem',
                    minHeight: 'auto',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--green)',
                    fontWeight: '600',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--green)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                    e.currentTarget.style.color = 'var(--green)';
                  }}
                  onClick={() => {
                    setTempProgression(travail.progression);
                    setEditingTravailId(travail.id);
                  }}
                >
                  📊 Ajuster
                </button>
              )}

              {/* Bouton DÉBLOQUER pour BLOQUÉS */}
              {travail.statut === 'bloqué' && (
                <button 
                  className="main-btn"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.75rem',
                    minHeight: 'auto',
                    background: 'rgba(255, 107, 53, 0.15)',
                    color: 'var(--orange)',
                    fontWeight: '600',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--orange)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                    e.currentTarget.style.color = 'var(--orange)';
                  }}
                >
                  🔓 Débloquer
                </button>
              )}

              {/* Bouton COMMENCER pour À VENIR */}
              {travail.statut === 'à_venir' && (
                <button 
                  className="main-btn"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.75rem',
                    minHeight: 'auto',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--green)',
                    fontWeight: '600',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--green)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                    e.currentTarget.style.color = 'var(--green)';
                  }}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Démarrer cette tâche ?',
                      message: `"${travail.titre}" passera en cours et vous pourrez suivre sa progression.`,
                      onConfirm: async () => {
                        await commencerTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                >
                  ▶️ Commencer
                </button>
              )}

              {/* Bouton X ÉTAPES (pour tous sauf annulés) */}
              {travail.etapes?.etapes && travail.etapes.etapes.length > 0 && (
                <Link 
                  href={`/chantiers/travaux/${travail.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--gray-light)',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                >
                  🎯 {travail.etapes?.etapes?.length || 0} étapes
                </Link>
              )}

              {/* Bouton ANNULER (pour en_cours, bloqué, à_venir) */}
              {travail.statut !== 'terminé' && (
                <button 
                  className="main-btn"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.75rem',
                    minHeight: 'auto',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontWeight: '600',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Annuler cette tâche ?',
                      message: `"${travail.titre}" sera marquée comme annulée. Vous pourrez toujours la réactiver plus tard.`,
                      onConfirm: async () => {
                        await annulerTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                >
                  🗑️ Annuler
                </button>
              )}
            </div>
          )}

          {/* Bouton Réactiver pour annulés */}
          {travail.statut === 'annulé' && (
            <button 
              className="main-btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.45rem 0.75rem',
                minHeight: 'auto',
                background: 'rgba(37, 99, 235, 0.15)',
                color: 'var(--blue)',
                fontWeight: '600',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--blue)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                e.currentTarget.style.color = 'var(--blue)';
              }}
              onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: 'Réactiver cette tâche ?',
                  message: `"${travail.titre}" reviendra dans "À venir" et pourra être planifiée.`,
                  onConfirm: async () => {
                    await reactiverTravail(travail.id);
                    setModalConfig({ ...modalConfig, isOpen: false });
                    window.location.reload();
                  }
                });
              }}
            >
              🔄 Réactiver
            </button>
          )}
        </div>

        {/* Progress bar OU Slider inline */}
        {travail.statut === 'en_cours' && (
          <>
            {editingTravailId === travail.id ? (
              // MODE ÉDITION : Slider inline
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={tempProgression}
                    onChange={(e) => setTempProgression(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '10px',
                      outline: 'none',
                      background: `linear-gradient(to right, var(--blue) 0%, var(--blue) ${tempProgression}%, rgba(255,255,255,0.1) ${tempProgression}%, rgba(255,255,255,0.1) 100%)`,
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <button
                    onClick={() => setTempProgression(100)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      color: 'var(--gray-light)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    100%
                  </button>
                  <span style={{ 
                    fontWeight: '700', 
                    minWidth: '45px', 
                    textAlign: 'right',
                    fontSize: '0.95rem',
                    color: 'var(--blue)'
                  }}>
                    {tempProgression}%
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="main-btn"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.5rem 1rem',
                      minHeight: 'auto',
                      flex: 1,
                      background: 'var(--green)',
                      color: 'white',
                      fontWeight: '700',
                      border: 'none'
                    }}
                    onClick={async () => {
                      await updateTravailProgression(travail.id, tempProgression);
                      setEditingTravailId(null);
                      window.location.reload();
                    }}
                  >
                    ✓ Valider
                  </button>
                  <button 
                    className="main-btn"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.5rem 1rem',
                      minHeight: 'auto',
                      flex: 1,
                      background: 'rgba(255,255,255,0.1)',
                      color: 'var(--gray-light)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                    onClick={() => setEditingTravailId(null)}
                  >
                    ✕ Annuler
                  </button>
                </div>
              </div>
            ) : (
              // MODE NORMAL : Barre de progression
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '0.4rem'
                }}>
                  <div style={{
                    width: `${travail.progression}%`,
                    height: '100%',
                    background: 'var(--blue)',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <p style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: '600',
                  color: 'var(--gray-light)',
                  margin: 0
                }}>
                  {travail.progression}%
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const SectionHeader = ({ 
    title, 
    count, 
    color, 
    icon, 
    isExpanded, 
    onToggle 
  }: { 
    title: string; 
    count: number; 
    color: string; 
    icon: string;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div 
        onClick={onToggle}
        style={{ 
          fontSize: '1.15rem', 
          marginBottom: '0.75rem',
          color: color,
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          padding: '0.5rem 0',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>
          {isExpanded ? '▽' : '▶'}
        </span>
        <span>{icon} {title}</span>
        <span style={{ 
          background: `${color}88`,
          color: color,
          border: `2px solid ${color}`,
          minWidth: '28px',
          height: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: '0.9rem',
          fontWeight: '700',
          padding: '0 0.35rem'
        }}>
          {count}
        </span>
      </div>
      <div style={{
        height: '2px',
        background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
        marginBottom: '0.75rem'
      }}></div>
    </div>
  );

  return (
    <>
      {/* BREADCRUMB FIXED - SANS FOND */}
      <div style={{ 
        position: 'fixed',
        top: '110px',  // Ajuster selon la hauteur de ton header
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '0.75rem',
        paddingBottom: '1rem'
      }}>
        <div style={{ 
          maxWidth: '1100px', 
          margin: '0 auto', 
          padding: '0 1rem',
          display: 'flex', 
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1rem'
        }}>
          <Link href="/chantiers" style={{ 
            color: 'var(--gray)', 
            transition: 'color 0.2s',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
          >
            ← Chantiers
          </Link>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '600' }}>
            🏗️ {chantier?.titre || 'Chantier'}
          </span>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '500' }}>
            Lots ({travaux.length})
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL avec padding-top pour breadcrumb */}
        <div style={{ 
          maxWidth: '1100px', 
          margin: '0 auto', 
          padding: '0.75rem 1rem',
          paddingTop: '160px'  // Padding pour éviter chevauchement avec breadcrumb
        }}>
        {/* État d'avancement du chantier - PLUS VISIBLE */}
        <div style={{
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Progress bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              width: '100%',
              height: '16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${stats?.progressionMoyenne || 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </div>

          {/* Stats TOUT EN LIGNE - PLUS VISIBLE */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '2rem',
            fontSize: '0.95rem',
            color: 'var(--gray)'
          }}>
            {/* % complété */}
            <span style={{ 
              color: 'var(--gray-light)', 
              fontSize: '1.1rem', 
              fontWeight: '700' 
            }}>
              {stats?.progressionMoyenne || 0}% complété
            </span>

            {/* Heures - SANS COULEUR BLEUE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>⏱️</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats?.heuresEffectuees || 0}h
                </strong>
                <span style={{ opacity: 0.6 }}> / {stats?.heuresEstimees || 0}h</span>
                <span style={{ color: 'var(--gray-light)', marginLeft: '0.5rem', fontWeight: '700' }}>
                  {stats?.progressionHeures || 0}%
                </span>
              </span>
            </div>
            
            {/* Budget - SANS COULEUR VERTE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>💰</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats?.budgetReel?.toLocaleString() || 0}€
                </strong>
                <span style={{ opacity: 0.6 }}> / {stats?.budgetEstime?.toLocaleString() || 0}€</span>
                <span style={{ color: 'var(--gray-light)', marginLeft: '0.5rem', fontWeight: '700' }}>
                  {stats?.progressionBudget || 0}%
                </span>
              </span>
            </div>

            {/* Tâches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats?.termines || 0}
                </strong>
                <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {stats?.termines || 0} Terminé{stats?.termines > 1 ? 's' : ''}
                </span>
                <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {stats?.enCours || 0} En cours
                </span>
                <span style={{ color: 'var(--orange)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {stats?.bloques || 0} Bloqué{stats?.bloques > 1 ? 's' : ''}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Section EN COURS (collapsible) */}
        {enCours.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="En cours" 
              count={enCours.length} 
              color="var(--blue)" 
              icon="⚡"
              isExpanded={showEnCours}
              onToggle={() => setShowEnCours(!showEnCours)}
            />
            {showEnCours && enCours.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section BLOQUÉS (collapsible) */}
        {bloques.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Bloqués" 
              count={bloques.length} 
              color="var(--orange)" 
              icon="⚠️"
              isExpanded={showBloques}
              onToggle={() => setShowBloques(!showBloques)}
            />
            {showBloques && bloques.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section À VENIR (collapsible) */}
        {aVenir.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="À venir" 
              count={aVenir.length} 
              color="var(--gray)" 
              icon="📅"
              isExpanded={showAVenir}
              onToggle={() => setShowAVenir(!showAVenir)}
            />
            {showAVenir && aVenir.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section TERMINÉS (collapsible) */}
        {termines.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Terminés" 
              count={termines.length} 
              color="var(--green)" 
              icon="✅"
              isExpanded={showTermines}
              onToggle={() => setShowTermines(!showTermines)}
            />
            {showTermines && termines.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section ANNULÉES (collapsible) */}
        {annulees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Annulées" 
              count={annulees.length} 
              color="var(--gray)" 
              icon="🗑️"
              isExpanded={showAnnulees}
              onToggle={() => setShowAnnulees(!showAnnulees)}
            />
            {showAnnulees && annulees.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}
        
        {/* Modal de confirmation */}
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText="Confirmer"
          cancelText="Annuler"
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
          type="warning"
        />
      </div>
    </>
  );
}
