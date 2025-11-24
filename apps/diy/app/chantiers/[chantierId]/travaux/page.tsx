'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierDemo, getChantierStats } from '@/app/lib/services/chantierService';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useParams } from 'next/navigation';
import CardButton from '@/app/components/CardButton';
import { terminerToutesLesEtapes } from '@/app/lib/services/etapesService';
import { getTravauxByChantier, annulerTravail, reactiverTravail, commencerTravail, reporterTravail, terminerTravail } from '@/app/lib/services/travauxService';

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
  const params = useParams();
  const chantierId = params.chantierId as string;
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [travaux, setTravaux] = useState<Travail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnCours, setShowEnCours] = useState(true);
  const [showBloques, setShowBloques] = useState(true);
  const [showTermines, setShowTermines] = useState(false);
  const [showAVenir, setShowAVenir] = useState(false);
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
  const progressionChantier = travaux.length > 0
    ? Math.round((termines.length / travaux.length) * 100)
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

  const TravailCard = ({ travail }: { travail: Travail }) => {
    const isAnnulee = travail.statut === 'annulé';
    const statusColor = getStatusColor(travail.statut);
    
    return (
      <div style={{
        background: `linear-gradient(90deg, #0d0d0d 0%, color-mix(in srgb, ${statusColor} 50%, #1a1a1a) 100%)`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        borderLeft: `4px solid ${statusColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s',
     }}
     onMouseEnter={(e) => {
        const rgba = statusColor === 'var(--blue)' ? 'rgba(37, 99, 235, 0.25)' :
                     statusColor === 'var(--orange)' ? 'rgba(255, 107, 53, 0.25)' :
                     statusColor === 'var(--green)' ? 'rgba(16, 185, 129, 0.25)' :
                     statusColor === 'var(--purple)' ? 'rgba(168, 85, 247, 0.25)' :
                     statusColor === 'var(--red)' ? 'rgba(239, 68, 68, 0.25)' :  // ← AJOUTE
                     'rgba(107, 114, 128, 0.25)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${rgba}`;
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
          {travail.statut !== 'terminé' && travail.statut !== 'annulé' && (
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexShrink: 0,
              alignItems: 'flex-start'
            }}>

              {/* Bouton X ÉTAPES (pour tous sauf annulés) */}
              {travail.etapes?.etapes && travail.etapes.etapes.length > 0 && (
                <CardButton
                  variant="primary"
                  color="var(--blue)"
                  icon="🎯"
                  label="Voir les étapes"
                  count={travail.etapes?.etapes?.length || 0}
                  href={`/chantiers/${chantierId}/travaux/${travail.id}/etapes`}
                />
              )}
              
              {/* Bouton REPORTER pour EN COURS à 0% */}
              {travail.statut === 'en_cours' && travail.progression === 0 && (
                <CardButton
                  variant="secondary"
                  color="var(--blue)"
                  icon="📅"
                  label="Reporter"
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
                />
              )}
              
              {/* Bouton TOUT TERMINER pour EN COURS - REMPLACE AJUSTER */}
              {travail.statut === 'en_cours' && (
                <CardButton
                  variant="secondary"
                  color="var(--green)"
                  icon="✓✓"
                  label="Tout terminer"
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Tout terminer ?',
                      message: `Toutes les étapes et tâches de "${travail.titre}" seront marquées comme terminées.`,
                      onConfirm: async () => {
                        // 1. Terminer toutes les étapes (et leurs tâches)
                        await terminerToutesLesEtapes(travail.id);
                        // 2. Terminer le travail
                        await terminerTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              )}

              {/* Bouton DÉBLOQUER pour BLOQUÉS */}
              {travail.statut === 'bloqué' && (
                <CardButton
                  variant="primary"
                  color="var(--orange)"
                  icon="🔓"
                  label="Débloquer"
                  onClick={() => {
                    // TODO: Implémenter debloquerTravail()
                    console.log('Débloquer travail:', travail.id);
                  }}
                />
              )}

              {/* Bouton COMMENCER pour À VENIR */}
              {travail.statut === 'à_venir' && (
                <CardButton
                  variant="primary"
                  color="var(--purple)"
                  icon="▶️"
                  label="Commencer"
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
                />
              )}
              
              {/* Bouton ANNULER (pour en_cours, bloqué, à_venir) */}
              {travail.statut !== 'terminé' && (
                <CardButton
                  variant="danger"
                  icon="🗑️"
                  label="Annuler"
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
                />
              )}
            </div>
          )}

          {/* Bouton Réactiver pour annulés */}
          {travail.statut === 'annulé' && (
            <CardButton
              variant="primary"
              color="var(--red)"
              icon="↻"
              label="Réactiver"
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
            />
          )}
        </div>

        {/* Progress bar OU Slider inline */}
        {travail.statut === 'en_cours' && (
          <>
            {/* Barre de progression AUTO */}
            {travail.statut === 'en_cours' && (
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
        top: '100px',  // Ajuster selon la hauteur du header
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.85)',    // Noir avec 85% opacité
        backdropFilter: 'blur(10px)',         // Effet flou moderne
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '1rem',
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
          padding: '0.75rem 0.75rem',
          paddingTop: '70px'  // Padding pour éviter chevauchement avec breadcrumb
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
                width: `${progressionChantier}%`,
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
              fontWeight: '700',
              marginLeft: '0.5rem'
            }}>
              {progressionChantier}% complété
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
              <span style={{ fontSize: '1.1rem' }}>✅ Lots :</span>
              <span>
                <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  {stats?.termines || 0} Terminé{stats?.termines > 1 ? 's' : ''}
                </span>
                <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  | {stats?.enCours || 0} En cours
                </span>
                <span style={{ color: 'var(--orange)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  | {stats?.bloques || 0} Bloqué{stats?.bloques > 1 ? 's' : ''}
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
              icon="🔨"
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
              color="var(--purple)" 
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

        {/* Section ANNULÉS (collapsible) */}
        {annulees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Annulés" 
              count={annulees.length} 
              color="var(--red)" 
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
