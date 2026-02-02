'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTachesByEtape, demarrerTache, terminerTache } from '@/app/lib/services/tachesService';
import ConfirmModal from '@/app/components/ConfirmModal';
import CardButton from '@/app/components/CardButton';
import NotesButton from '@/app/components/NotesButton';
// NOUVEAUX IMPORTS
import Breadcrumb from '@/app/components/Breadcrumb';
import ParentContext from '@/app/components/ParentContext';
import { getParentsContext } from '@/app/lib/services/parentContextService';

interface Tache {
  id: string;
  numero: number;
  titre: string;
  description?: string;
  statut: string;
  duree_estimee_minutes?: number;
  duree_reelle_minutes?: number;
  ordre?: number;
  est_critique: boolean;
  notes?: string;
  outils_necessaires?: string[];
  conseils_pro?: string;
}

interface Etape {
  id: string;
  titre: string;
  description?: string;
  statut: string;
  progression: number;
  duree_estimee_minutes?: number;
  duree_reelle_minutes?: number;
}

export default function TachesPage() {
  const params = useParams();
  const chantierId = params.chantierId as string;
  const travailId = params.travailId as string;
  const etapeId = params.etapeId as string;
  
  const [etape, setEtape] = useState<Etape | null>(null);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTerminees, setShowTerminees] = useState(false);
  const [showAFaire, setShowAFaire] = useState(true);
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

  // NOUVEAU : État pour les parents (chantier + lot)
  const [parents, setParents] = useState<{
    chantier?: { titre: string };
    lot?: { titre: string };
  }>({});

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, [etapeId, chantierId, travailId]);

  async function loadData() {
    try {
      // Charger en parallèle les tâches ET les parents
      const [data, parentsData] = await Promise.all([
        getTachesByEtape(etapeId),
        getParentsContext({ chantierId, travailId })
      ]);
      
      if (data) {
        setEtape(data.etape);
        setTaches(data.taches);
      }
      setParents(parentsData);
    } catch (error) {
      console.error('Error loading taches:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '4rem 1rem',
        textAlign: 'center' 
      }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  if (!etape) {
    return (
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '4rem 1rem',
        textAlign: 'center' 
      }}>
        <h2>❌ Étape introuvable</h2>
        <Link 
          href={`/chantiers/${chantierId}/travaux/${travailId}/etapes`}
          className="main-btn btn-blue" 
          style={{ marginTop: '2rem' }}
        >
          ← Retour aux étapes
        </Link>
      </div>
    );
  }

  // Grouper par statut
  const terminees = taches.filter(t => t.statut === 'terminée');
  const aFaire = taches.filter(t => 
    t.statut === 'à_faire' || 
    t.statut === 'à_venir' || 
    t.statut === 'brouillon' ||
    !t.statut
  );

  // Calculer les stats
  const totalTaches = taches.length;
  const progressionAuto = totalTaches > 0 
    ? Math.round((terminees.length / totalTaches) * 100)
    : 0;
  const dureeEstimeeMinutes = taches.reduce((sum, t) => sum + (t.duree_estimee_minutes || 0), 0);
  const dureeReelleMinutes = taches.reduce((sum, t) => sum + (t.duree_reelle_minutes || 0), 0);

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminée': return 'var(--green)';
      default: return 'var(--blue)'; // à_faire correspond à bleu (comme en_cours)
    }
  };

  const TacheCard = ({ tache }: { tache: Tache }) => {
    const statusColor = getStatusColor(tache.statut);
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
                     statusColor === 'var(--green)' ? 'rgba(16, 185, 129, 0.25)' :
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
                minWidth: isMobile ? '26px' : '32px',
                height: isMobile ? '26px' : '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: isMobile ? '0.8rem' : '0.9rem'
              }}>
                {tache.numero}
              </span>
              <h3 style={{ 
                fontSize: isMobile ? '0.9rem' : '1.05rem', 
                margin: 0,
                color: 'var(--gray-light)',
                fontWeight: '700',
                lineHeight: '1.2',
                flex: 1
              }}>
                {tache.titre}
              </h3>
              {tache.est_critique && (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}>
                  🔥 Critique
                </span>
              )}
              <span style={{ 
                fontSize: '1.2rem',
                color: 'var(--gray)',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: isMobile ? '0.75rem' : '1.5rem', 
              fontSize: isMobile ? '0.75rem' : '0.85rem', 
              color: 'var(--gray)',
              marginLeft: '0'
            }}>
              {(tache.duree_estimee_minutes ?? 0) > 0 && (
                <span>⏱️ {tache.duree_estimee_minutes} min</span>
              )}
              {(tache.duree_reelle_minutes ?? 0) > 0 && (
                <span style={{ color: 'var(--blue)', fontWeight: '600' }}>
                  ✓ {tache.duree_reelle_minutes} min réel
                </span>
              )}
              {tache.outils_necessaires && tache.outils_necessaires.length > 0 && (
                <span>🔧 {tache.outils_necessaires.length} outil{tache.outils_necessaires.length > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Boutons selon statut */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexShrink: 0,
              alignItems: 'flex-start'
            }}>
            {tache.statut === 'à_faire' && (
              <CardButton
                variant="primary"
                color="var(--blue)"
                icon="✓"
                label="Valider"
                onClick={async () => {
                  try {
                    await terminerTache(tache.id);
                    await loadData();
                  } catch (error) {
                    console.error('Error completing tache:', error);
                  }
                }}
              />
            )}

            {tache.statut === 'terminée' && (
              <CardButton
                variant="primary"
                color="var(--green)"
                icon="↻"
                label="Refaire"
                onClick={async () => {
                  try {
                    await demarrerTache(tache.id);
                    await loadData();
                  } catch (error) {
                    console.error('Error restarting tache:', error);
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Contenu détaillé - expandable */}
        {isExpanded && (
          <div style={{
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginLeft: '40px'
          }}>
            {tache.description && (
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
                  {tache.description}
                </p>
              </div>
            )}

            {tache.outils_necessaires && tache.outils_necessaires.length > 0 && (
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
                  {tache.outils_necessaires.map((outil, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: `color-mix(in srgb, ${statusColor} 20%, transparent)`,
                        color: 'var(--gray-light)',
                        border: `1px solid color-mix(in srgb, ${statusColor} 50%, transparent)`,
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {outil}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tache.conseils_pro && (
              <div style={{
                background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                border: `1px solid ${statusColor}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem'
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
                  {tache.conseils_pro}
                </p>
              </div>
            )}

            {tache.notes && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}>
                <h4 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem', 
                  color: 'var(--gray-light)'
                }}>
                  📌 Notes
                </h4>
                <p style={{ 
                  color: 'var(--gray)', 
                  fontSize: '0.9rem', 
                  margin: 0, 
                  lineHeight: '1.5',
                  fontStyle: 'italic'
                }}>
                  {tache.notes}
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
      {/* ========== NOUVEAU BREADCRUMB ========== */}
      <Breadcrumb 
        currentLevel="taches" 
        chantierId={chantierId}
        travailId={travailId}
        etapeId={etapeId}
      />

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 1rem',
        paddingTop: isMobile ? '35px' : '70px'
      }}>
       {/* ========== NOUVEAU PARENT CONTEXT ========== */}
        {!isMobile && (
          <ParentContext 
            chantier={parents.chantier}
            lot={parents.lot}
          />
        )}

        {/* ÉTAT DES LIEUX DE L'ÉTAPE */}
        <div style={{
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Header avec titre + bouton notes */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.75rem',
            gap: '1rem'
          }}>
            <h1 style={{ 
              fontSize: isMobile ? '1.1rem' : '1.5rem', 
              margin: 0,
              color: 'var(--gray-light)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🎯 Etape : {etape.titre}
            </h1>
            
            {/* Bouton Notes */}
            <NotesButton level="etape" id={etapeId} />
          </div>
          {!isMobile && etape.description && (
            <p style={{ 
              fontSize: '0.95rem', 
              color: 'var(--gray)', 
              marginBottom: '1rem',
              lineHeight: '1.4'
            }}>
              {etape.description}
            </p>
          )}

          {/* Barre progression 16px */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              width: '100%',
              height: isMobile ? '10px' : '16px',
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
            gap: isMobile ? '0.75rem' : '2rem',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            color: 'var(--gray)',
            marginBottom: '1rem'
          }}>
            <span style={{ 
              color: 'var(--gray-light)', 
              fontSize: isMobile ? '0.95rem' : '1.1rem', 
              fontWeight: '700' 
            }}>
              {progressionAuto}%{!isMobile && ' complété'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: isMobile ? '1rem' : '1.1rem' }}>⏱️</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {dureeReelleMinutes}min
                </strong>
                {!isMobile && <span style={{ opacity: 0.6 }}> / {dureeEstimeeMinutes}min</span>}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: isMobile ? '1rem' : '1.1rem' }}>✅</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {terminees.length}
                </strong>
                <span style={{ opacity: 0.6 }}> / {totalTaches}</span>
                {isMobile ? (
                  <span style={{ color: 'var(--blue)', marginLeft: '0.5rem' }}>• {aFaire.length} à faire</span>
                ) : (
                  <>
                    <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                      • {terminees.length} terminée{terminees.length > 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                      • {aFaire.length} à faire
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Section À FAIRE */}
        {aFaire.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="À faire" 
              count={aFaire.length} 
              color="var(--blue)" 
              icon="🔨"
              isExpanded={showAFaire}
              onToggle={() => setShowAFaire(!showAFaire)}
            />
            {showAFaire && aFaire.map(tache => <TacheCard key={tache.id} tache={tache} />)}
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
            {showTerminees && terminees.map(tache => <TacheCard key={tache.id} tache={tache} />)}
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
