'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { getEtapesByTravail, annulerEtape, reactiverEtape, demarrerEtape, terminerEtape } from '@/app/lib/services/etapesService';
import CardButton from '@/app/components/CardButton';
import { terminerToutesLesTaches } from '@/app/lib/services/tachesService';

interface Etape {
  id: string;
  numero: number;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  duree_estimee_minutes: number;
  duree_reelle_minutes?: number;
  difficulte: string;
  outils_necessaires: string[];
  materiaux_necessaires?: any[];
  conseils_pro?: string;
  blocage_raison?: string;
  nombre_taches?: number;        
  taches_terminees?: number;     
}

interface Travail {
  id: string;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  duree_estimee_heures?: number;     
  duree_reelle_heures?: number;
  budget_estime?: number;
  budget_reel?: number;
  expertise?: {
    nom: string;
    code: string;
  };
}

export default function TravailDetailPage() {
  const params = useParams();
  const chantierId = params.chantierId as string;
  const travailId = params.travailId as string;
  const [travail, setTravail] = useState<Travail | null>(null);
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnCours, setShowEnCours] = useState(true);
  const [showBloques, setShowBloques] = useState(true);
  const [showAnnulees, setShowAnnulees] = useState(false);
  const [showTerminees, setShowTerminees] = useState(false);
  const [showAVenir, setShowAVenir] = useState(true);
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
        const data = await getEtapesByTravail(travailId);
        if (data) {
          setTravail(data.travail);
          setEtapes(data.etapes);
        }
      } catch (error) {
        console.error('Error loading travail detail:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [travailId]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  if (!travail) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>❌ Lot introuvable</h2>
        <Link href="/chantiers/travaux" className="main-btn btn-blue" style={{ marginTop: '2rem' }}>
          ← Retour aux lots
        </Link>
      </div>
    );
  }

  // Grouper par statut
  const terminees = etapes.filter(e => e.statut === 'terminé');
  const enCours = etapes.filter(e => e.statut === 'en_cours');
  const bloquees = etapes.filter(e => e.statut === 'bloqué');
  const annulees = etapes.filter(e => e.statut === 'annulé');
  const aVenir = etapes.filter(e => e.statut === 'à_venir' || !e.statut);

  // Calculer les stats
  const totalEtapes = etapes.length;
  const progressionAuto = totalEtapes > 0 
    ? Math.round((terminees.length / totalEtapes) * 100)
    : 0;
  const dureeReelleMinutes = etapes.reduce((sum, e) => sum + (e.duree_reelle_minutes || 0), 0);
  const dureeEstimeeMinutes = etapes.reduce((sum, e) => sum + (e.duree_estimee_minutes || 0), 0);
  const progressionHeures = dureeEstimeeMinutes > 0
    ? Math.round((dureeReelleMinutes / dureeEstimeeMinutes) * 100)
    : 0;

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloqué': return 'var(--orange)';
      case 'annulé': return 'var(--red)';
      case 'à_venir': return 'var(--purple)';
      default: return 'var(--gray)';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'terminé': return '✓';
      case 'en_cours': return '🔨';
      case 'bloqué': return '🚫';
      case 'annulé': return '🗑️';
      case 'à_venir': return '📅';
      default: return '✅';
    }
  };

  const getDifficultyColor = (difficulte: string) => {
    switch (difficulte) {
      case 'facile': return 'var(--green)';
      case 'moyen': return 'var(--yellow)';
      case 'difficile': return 'var(--red)';
      default: return 'var(--gray)';
    }
  };

  const getDifficultyIcon = (difficulte: string) => {
    switch (difficulte) {
      case 'facile': return '●○○';     // 1/3
      case 'moyen': return '●●○';      // 2/3
      case 'difficile': return '●●●';  // 3/3
      default: return '○○○';
    }
  };

  const EtapeCard = ({ etape }: { etape: Etape }) => {
    const statusColor = getStatusColor(etape.statut);
    const progressionAuto = etape.nombre_taches && etape.nombre_taches > 0
      ? Math.round(((etape.taches_terminees || 0) / etape.nombre_taches) * 100)
      : 0;
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div style={{
        background: `linear-gradient(90deg, #0d0d0d 0%, color-mix(in srgb, ${statusColor} 50%, #1a1a1a) 100%)`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        borderLeft: `4px solid ${statusColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        const rgba = statusColor === 'var(--blue)' ? 'rgba(37, 99, 235, 0.25)' :
                     statusColor === 'var(--orange)' ? 'rgba(255, 107, 53, 0.25)' :
                     statusColor === 'var(--green)' ? 'rgba(16, 185, 129, 0.25)' :
                     statusColor === 'var(--purple)' ? 'rgba(168, 85, 247, 0.25)' :
                     statusColor === 'var(--red)' ? 'rgba(239, 68, 68, 0.25)' :
                     'rgba(107, 114, 128, 0.25)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${rgba}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }}>
        {/* Header cliquable */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: isExpanded ? '1rem' : '0.5rem',
            gap: '1rem',
            cursor: 'pointer'
          }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{
                background: statusColor,
                color: 'white',
                minWidth: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.9rem'
              }}>
                {etape.numero}
              </span>
              <h3 style={{ 
                fontSize: '1.05rem', 
                margin: 0,
                color: 'var(--gray-light)',
                fontWeight: '700',
                lineHeight: '1.2',
                flex: 1
              }}>
                {getStatusIcon(etape.statut)} {etape.titre}
              </h3>
              <span style={{ 
                fontSize: '1.2rem',
                color: 'var(--gray)',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </div>
              
            {etape.blocage_raison && (
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--orange)', 
                margin: 0,
                marginTop: '0.5rem',
                marginLeft: '40px',
                fontStyle: 'italic',
                padding: '0.5rem',
                background: 'rgba(255, 107, 53, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 107, 53, 0.2)'
              }}>
                💬 {etape.blocage_raison}
              </p>
            )}
          </div>
  
          {/* Boutons selon statut */}
          {etape.statut !== 'terminé' && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexShrink: 0,
              alignItems: 'flex-start'
            }}>
            {/* Boutons à_venir */}
            {etape.statut === 'à_venir' && (
              <>
                <CardButton
                  variant="primary"
                  color="var(--purple)"
                  icon="🚀"
                  label="Démarrer"
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Démarrer cette étape ?',
                      message: `"${etape.titre}" passera en cours.`,
                      onConfirm: async () => {
                        await demarrerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
                {/* Bouton Tâches - TOUJOURS VISIBLE sans count */}
                <CardButton
                  variant="secondary"
                  color="var(--purple)"
                  icon="📋"
                  label="Tâches"
                  onClick={() => {
                    window.location.href = `/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/taches`;
                  }}
                />
                <CardButton
                  variant="danger"
                  icon="🗑️"
                  label="Annuler"
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Annuler cette étape ?',
                      message: `"${etape.titre}" sera marquée comme annulée.`,
                      onConfirm: async () => {
                        await annulerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              </>
            )}
  
            {/* Boutons en_cours */}
            {etape.statut === 'en_cours' && (
              <>
                {/* Bouton TÂCHES */}
                {etape.nombre_taches && etape.nombre_taches > 0 && (
                  <CardButton
                    variant="primary"
                    color="var(--blue)"
                    icon="📋"
                    label="Tâches"
                    count={etape.nombre_taches}
                    onClick={() => {
                      window.location.href = `/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/taches`;
                    }}
                  />
                )}
                
                {/* Bouton TOUT TERMINER - NOUVEAU */}
                <CardButton
                  variant="secondary"
                  color="var(--green)"
                  icon="✓✓"
                  label="Tout terminer"
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Tout terminer ?',
                      message: `Toutes les tâches de "${etape.titre}" seront marquées comme terminées, ainsi que l'étape elle-même.`,
                      onConfirm: async () => {
                        // 1. Terminer toutes les tâches
                        if (etape.nombre_taches && etape.nombre_taches > 0) {
                          await terminerToutesLesTaches(etape.id);
                        }
                        // 2. Terminer l'étape
                        await terminerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
                
                {/* Bouton ANNULER */}
                <CardButton
                  variant="danger"
                  icon="🗑️"
                  label="Annuler"
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Annuler cette étape ?',
                      message: `"${etape.titre}" sera marquée comme annulée.`,
                      onConfirm: async () => {
                        await annulerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              </>
            )}
  
            {/* Bouton Débloquer (bloqué) */}
            {etape.statut === 'bloqué' && (
              <CardButton
                variant="primary"
                color="var(--orange)"
                icon="🔓"
                label="Débloquer"
                onClick={() => {
                  // TODO: Implémenter debloquerEtape()
                  console.log('Débloquer étape:', etape.id);
                }}
              />
            )}
  
            {/* Bouton Réactiver (annulé) */}
            {etape.statut === 'annulé' && (
              <CardButton
                variant="primary"
                color="var(--red)"
                icon="↻"
                label="Réactiver"
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: 'Réactiver cette étape ?',
                    message: `"${etape.titre}" repassera à l'état "à venir".`,
                    onConfirm: async () => {
                      await reactiverEtape(etape.id);
                      setModalConfig({ ...modalConfig, isOpen: false });
                      window.location.reload();
                    }
                  });
                }}
              />
            )}
          </div>
          )}
        </div>
  
        {/* Barre de progression + Stats en ligne */}
        {etape.statut === 'en_cours' && etape.nombre_taches && etape.nombre_taches > 0 && (
          <>
            {/* Barre de progression */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressionAuto}%`,
                  height: '100%',
                  background: 'var(--blue)',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
            </div>
        
            {/* Stats en ligne - FORMAT ALIGNÉ PAGE TRAVAUX */}
            <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--gray)',
              marginBottom: '0.5rem'
            }}>
              {/* % complété */}
              <span style={{ 
                color: 'var(--gray-light)', 
                fontWeight: '700'
              }}>
                {progressionAuto}% complété
              </span>
        
              {/* Durée estimée */}
              <span>⏱️ {etape.duree_estimee_minutes} min</span>
        
              {/* Tâches avec détail */}
              <span>
                ✅ {etape.taches_terminees || 0}/{etape.nombre_taches}
                {(etape.taches_terminees || 0) > 0 && (
                  <span style={{ color: 'var(--green)', marginLeft: '0.5rem', fontWeight: '600' }}>
                    • {etape.taches_terminees} terminée{(etape.taches_terminees || 0) > 1 ? 's' : ''}
                  </span>
                )}
              </span>
        
              {/* Outils */}
              {etape.outils_necessaires?.length > 0 && (
                <span>🔧 {etape.outils_necessaires.length} outil{etape.outils_necessaires.length > 1 ? 's' : ''}</span>
              )}
        
              {/* Badge difficulté */}
              <span style={{
                background: `${getDifficultyColor(etape.difficulte)}20`,
                color: getDifficultyColor(etape.difficulte),
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                lineHeight: '1'
              }}>
                {getDifficultyIcon(etape.difficulte)} {etape.difficulte}
              </span>
            </div>
          </>
        )}
  
        {/* Contenu détaillé - expandable */}
        {isExpanded && (
          <div style={{
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginLeft: '40px'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                marginBottom: '0.5rem', 
                color: 'var(--gray-light)'
              }}>
                📝 Description
              </h4>
              <p style={{ 
                color: 'var(--gray)', 
                lineHeight: '1.6', 
                margin: 0,
                fontSize: '0.9rem'
              }}>
                {etape.description}
              </p>
            </div>
  
            {etape.outils_necessaires?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem', 
                  color: 'var(--gray-light)'
                }}>
                  🔧 Outils nécessaires
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {etape.outils_necessaires.map((outil, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: `color-mix(in srgb, ${statusColor} 20%, transparent)`,
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: 'var(--gray-light)',
                        border: `1px solid color-mix(in srgb, ${statusColor} 50%, transparent)`
                      }}
                    >
                      {outil}
                    </span>
                  ))}
                </div>
              </div>
            )}
  
            {etape.conseils_pro && (
              <div style={{
                background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                border: `1px solid ${statusColor}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}>
                <h4 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem', 
                  color: statusColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  💡 Conseil pro
                </h4>
                <p style={{ 
                  color: 'var(--gray-light)', 
                  fontSize: '0.9rem', 
                  margin: 0, 
                  lineHeight: '1.5' 
                }}>
                  {etape.conseils_pro}
                </p>
              </div>
            )}
          </div>
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
        background: `linear-gradient(90deg, transparent 0%, ${color} 80%)`,
        marginBottom: '0.75rem'
      }}></div>
    </div>
  );

  return (
    <>
      {/* BREADCRUMB FIXED */}
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
          maxWidth: '1100px', 
          margin: '0 auto', 
          padding: '1rem',
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
          <Link href="/chantiers/travaux" style={{ 
            color: 'var(--gray)', 
            transition: 'color 0.2s',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
          >
            🏗️ Création nouvelle chambre
          </Link>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '600' }}>
            Lots
          </span>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '500' }}>
            Étapes ({etapes.length})
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 1rem',
        paddingTop: '85px'
      }}>
        {/* ÉTAT DES LIEUX DU LOT */}
        <div style={{
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '0.75rem',
            color: 'var(--gray-light)',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🔨 {travail.titre}
          </h1>
          {travail.description && (
            <p style={{ 
              fontSize: '0.95rem', 
              color: 'var(--gray)', 
              marginBottom: '1rem',
              lineHeight: '1.4'
            }}>
              {travail.description}
            </p>
          )}

          {/* Barre progression 16px */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              width: '100%',
              height: '16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressionAuto}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </div>
        
          {/* Stats inline */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '2rem',
            fontSize: '0.95rem',
            color: 'var(--gray)'
          }}>
            <span style={{ 
              color: 'var(--gray-light)', 
              fontSize: '1.1rem', 
              fontWeight: '700' 
            }}>
              {progressionAuto}% complété
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>⏱️</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {Math.round(dureeReelleMinutes / 60)}h
                </strong>
                <span style={{ opacity: 0.6 }}> / {Math.round(dureeEstimeeMinutes / 60)}h</span>
                <span style={{ color: 'var(--gray-light)', marginLeft: '0.5rem', fontWeight: '700' }}>
                  {progressionHeures}%
                </span>
              </span>
            </div>

            {travail.budget_estime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>💰</span>
                <span>
                  <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                    {(travail.budget_reel || 0).toLocaleString()}€
                  </strong>
                  <span style={{ opacity: 0.6 }}> / {travail.budget_estime.toLocaleString()}€</span>
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {terminees.length}
                </strong>
                <span style={{ opacity: 0.6 }}> / {totalEtapes}</span>
                <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {terminees.length} terminée{terminees.length > 1 ? 's' : ''}
                </span>
                <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {enCours.length} en cours
                </span>
                <span style={{ color: 'var(--orange)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {bloquees.length} bloquée{bloquees.length > 1 ? 's' : ''}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Section EN COURS */}
        {enCours.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="En cours" 
              count={enCours.length} 
              color="var(--blue)" 
              icon="🔨"
              isExpanded={showEnCours}
              onToggle={() => setShowEnCours(!showEnCours)}
            />
            {showEnCours && enCours.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section BLOQUÉES */}
        {bloquees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Bloquées" 
              count={bloquees.length} 
              color="var(--orange)" 
              icon="⚠️"
              isExpanded={showBloques}
              onToggle={() => setShowBloques(!showBloques)}
            />
            {showBloques && bloquees.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section À VENIR */}
        {aVenir.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="À venir" 
              count={aVenir.length} 
              color="var(--purple)" 
              icon="📅"
              isExpanded={showAVenir}
              onToggle={() => setShowAVenir(!showAVenir)}
            />
            {showAVenir && aVenir.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section TERMINÉES */}
        {terminees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Terminées" 
              count={terminees.length} 
              color="var(--green)" 
              icon="✅"
              isExpanded={showTerminees}
              onToggle={() => setShowTerminees(!showTerminees)}
            />
            {showTerminees && terminees.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section ANNULÉES */}
        {annulees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Annulées" 
              count={annulees.length} 
              color="var(--red)" 
              icon="🗑️"
              isExpanded={showAnnulees}
              onToggle={() => setShowAnnulees(!showAnnulees)}
            />
            {showAnnulees && annulees.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
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
