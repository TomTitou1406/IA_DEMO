'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierById, getChantierStats } from '@/app/lib/services/chantierService';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useParams, useRouter } from 'next/navigation';
import CardButton from '@/app/components/CardButton';
import { terminerToutesLesEtapes } from '@/app/lib/services/etapesService';
import { getTravauxByChantier, annulerTravail, reactiverTravail, commencerTravail, reporterTravail, terminerTravail } from '@/app/lib/services/travauxService';
import NotesButton from '@/app/components/NotesButton';
// NOUVEAUX IMPORTS
import Breadcrumb from '@/app/components/Breadcrumb';
import ParentContext from '@/app/components/ParentContext';

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
  nombre_etapes?: number;        
  etapes_terminees?: number;     
  etapes_en_cours?: number;
  etapes_brouillon?: number;
  etapes_bloquees?: number;       
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
  const router = useRouter();
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
        const chantierData = await getChantierById(chantierId);
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
  }, [chantierId]);

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
                     statusColor === 'var(--red)' ? 'rgba(239, 68, 68, 0.25)' :
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{
                background: statusColor,
                color: 'white',
                minWidth: '32px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.9rem',
                flexShrink: 0
              }}>
                {travail.ordre}
              </span>
              <h3 style={{ 
                fontSize: '1.05rem', 
                margin: 0,
                color: 'var(--gray-light)',
                fontWeight: '700',
                lineHeight: '1.2'
              }}>
                {getStatusIcon(travail.statut)} {travail.titre}
              </h3>
            </div>
            {/* Description en dessous */}
            {travail.description && (
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--gray)', 
                margin: 0,
                marginLeft: '40px',
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
                marginLeft: '40px',
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

              {/* Bouton VOIR LES ÉTAPES (seulement si étapes VALIDÉES, pas brouillon) */}
              {(travail.statut === 'en_cours' || travail.statut === 'à_venir') && 
               travail.nombre_etapes !== undefined && travail.nombre_etapes > 0 && 
               (!travail.etapes_brouillon || travail.etapes_brouillon === 0) && (
                <CardButton
                  variant="primary"
                  color="var(--orange)"
                  icon="🎯"
                  label="Voir les étapes"
                  count={travail.nombre_etapes}
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
              
              {/* Bouton TOUT TERMINER pour EN COURS */}
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
                        await terminerToutesLesEtapes(travail.id);
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
                    console.log('Débloquer travail:', travail.id);
                  }}
                />
              )}

              {/* Bouton REPRENDRE MISE EN ŒUVRE (si étapes brouillon) */}
              {travail.etapes_brouillon && travail.etapes_brouillon > 0 && (
                <CardButton
                  variant="primary"
                  color="var(--orange)"
                  icon="🔧"
                  label="Reprendre mise en œuvre"
                  count={travail.etapes_brouillon}
                  onClick={() => {
                    router.push(`/chantiers/${chantierId}/travaux/${travail.id}/mise-en-oeuvre`);
                  }}
                />
              )}

              {/* Bouton METTRE EN ŒUVRE pour À VENIR SANS étapes ET sans brouillon */}
              {travail.statut === 'à_venir' && (!travail.nombre_etapes || travail.nombre_etapes === 0) && (!travail.etapes_brouillon || travail.etapes_brouillon === 0) && (
                <CardButton
                  variant="primary"
                  color="var(--green)"
                  icon="🔧"
                  label="Mettre en œuvre"
                  onClick={() => {
                    router.push(`/chantiers/${chantierId}/travaux/${travail.id}/mise-en-oeuvre`);
                  }}
                />
              )}

              {/* Bouton COMMENCER pour À VENIR AVEC étapes */}
              {travail.statut === 'à_venir' && travail.nombre_etapes !== undefined && travail.nombre_etapes > 0 && (
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
              </div>
            )}

            {/* Stats en ligne - TOUJOURS VISIBLE */}
            <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--gray)'
            }}>
              {/* % complété */}
              <span style={{ 
                color: 'var(--gray-light)', 
                fontWeight: '700'
              }}>
                {travail.progression}% complété
              </span>
            
              {/* Durée estimée */}
              {travail.duree_estimee_heures && (
                <span>⏱️ {travail.duree_estimee_heures}h estimées</span>
              )}
            
              {/* Étapes avec détail */}
              {travail.nombre_etapes && travail.nombre_etapes > 0 && (
                <span>
                  ✅ {travail.etapes_terminees || 0}/{travail.nombre_etapes}
                  {(travail.etapes_terminees || 0) > 0 && (
                    <span style={{ color: 'var(--green)', marginLeft: '0.5rem', fontWeight: '600' }}>
                      • {travail.etapes_terminees} terminée{(travail.etapes_terminees || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {(travail.etapes_en_cours || 0) > 0 && (
                    <span style={{ color: 'var(--blue)', marginLeft: '0.5rem', fontWeight: '600' }}>
                      • {travail.etapes_en_cours} en cours
                    </span>
                  )}
                  {(travail.etapes_bloquees || 0) > 0 && (
                    <span style={{ color: 'var(--orange)', marginLeft: '0.5rem', fontWeight: '600' }}>
                      • {travail.etapes_bloquees} bloquée{(travail.etapes_bloquees || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              )}
            </div>
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
      {/* ========== NOUVEAU BREADCRUMB ========== */}
      <Breadcrumb 
        currentLevel="lots" 
        chantierId={chantierId} 
      />

      {/* CONTENU PRINCIPAL avec padding-top pour breadcrumb */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 0.75rem',
        paddingTop: '70px'
      }}>
        {/* ========== NOUVEAU PARENT CONTEXT ========== */}
        {/* Note: Ici on a déjà le chantier chargé, pas besoin de ParentContext 
            car on est au niveau Lots et le chantier est affiché dans l'état des lieux */}

        {/* État d'avancement du chantier - PLUS VISIBLE */}
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
            marginBottom: '1rem',
            gap: '1rem'
          }}>
            <h1 style={{ 
              fontSize: '1.5rem', 
              margin: 0,
              color: 'var(--gray-light)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {chantier.type_projet === 'simple' ? '🔧' : '🏗️'} 
              {chantier.type_projet === 'simple' ? '' : 'Chantier : '}
              {chantier.titre}
            </h1>
            
            {/* Bouton Notes du chantier */}
            <NotesButton level="chantier" id={chantierId} />
          </div>

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
