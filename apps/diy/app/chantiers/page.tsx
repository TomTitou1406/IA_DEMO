/**
 * Page Chantiers - Version Mobile-First
 * 
 * 2 sections :
 * - 📦 Travaux simples (type_projet = 'simple')
 * - 🏗️ Chantiers & travaux complexes (type_projet = 'complexe')
 * 
 * @version 2.0
 * @date 05 décembre 2025
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllChantiers, getChantierStats, getChantierEtapesStats, deleteChantier } from '../lib/services/chantierService';
import Breadcrumb from '@/app/components/Breadcrumb';
import { useToast } from '@/app/components/Toast';
import MediaButtons from '@/app/components/MediaButtons';
import PhotosModal from '@/app/components/PhotosModal';
import VideoPlayerModal from '@/app/components/VideoPlayerModal';

interface Chantier {
  id: string;
  titre: string;
  description?: string;
  progression: number;
  duree_estimee_heures: number;
  budget_initial: number;
  statut: string;
  type_projet?: 'simple' | 'complexe';
  created_at: string;
  brouillon_phasage?: { lots: any[] } | null;
  stats?: {
    progressionMoyenne: number;
    heuresEffectuees: number;
    heuresEstimees: number;
    total: number;
    termines: number;
    enCours: number;
  };
  photos_urls?: any[];
  video_aide?: {
    video_id: string;
    titre: string;
    url: string;
    thumbnail?: string;
  } | null;
}

// Modales photos et vidéos
const [showPhotosModal, setShowPhotosModal] = useState(false);
const [photosModalConfig, setPhotosModalConfig] = useState<{
  niveau: 'chantier' | 'travail' | 'etape' | 'tache';
  niveauId: string;
  niveauTitre: string;
  photos: any[];
}>({ niveau: 'chantier', niveauId: '', niveauTitre: '', photos: [] });

const [showVideoModal, setShowVideoModal] = useState(false);
const [videoModalConfig, setVideoModalConfig] = useState<{
  video: any;
}>({ video: null });

const handlePhotosChange = (niveauId: string, newPhotos: any[]) => {
  setChantiers(prev => prev.map(c => 
    c.id === niveauId ? { ...c, photos_urls: newPhotos } : c
  ));
};

const openPhotosModal = (chantier: Chantier) => {
  setPhotosModalConfig({
    niveau: 'chantier',
    niveauId: chantier.id,
    niveauTitre: chantier.titre,
    photos: chantier.photos_urls || []
  });
  setShowPhotosModal(true);
};

const openVideoModal = (chantier: Chantier) => {
  if (chantier.video_aide?.video_id) {
    setVideoModalConfig({
      video: {
        id: chantier.video_aide.video_id,
        title: chantier.video_aide.titre,
        thumbnail: chantier.video_aide.thumbnail,
        channelTitle: '',
        viewCount: 0,
        duration: ''
      }
    });
    setShowVideoModal(true);
  } else {
    sessionStorage.setItem('attachReturnUrl', window.location.href);
    const searchQuery = encodeURIComponent(chantier.titre);
    window.location.href = `/videos?context=chantier&id=${chantier.id}&search=${searchQuery}`;
  }
};

export default function ChantiersPage() {
  const { showError, showSuccess, showWarning, showConfirm } = useToast();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sections collapsibles
  const [showSimples, setShowSimples] = useState(false);
  const [showNouveaux, setShowNouveaux] = useState(false);
  const [showEnCours, setShowEnCours] = useState(false);
  const [showTermines, setShowTermines] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Détecter si on vient du mode "J'ai besoin d'aide" avec un travail simple suggéré
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingTravailSimpleFromAide');
    if (pendingData) {
      try {
        const travailInfo = JSON.parse(pendingData);
        // Supprimer pour ne pas re-déclencher
        sessionStorage.removeItem('pendingTravailSimpleFromAide');
        
        // Ouvrir l'assistant avec le contexte travaux simples (BLEU)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openAssistantWithContext', {
            detail: {
              pageContext: 'travaux_simple_decouverte',
              contextColor: '#2563eb',
              welcomeMessage: `Parfait ! Je vais t'aider à réaliser : "${travailInfo.titre}"\n\n${travailInfo.contexte}\n\nJ'ai juste besoin de quelques précisions pour te guider au mieux. On commence ?`,
              additionalContext: `CONTEXTE PRÉ-REMPLI:\nTitre suggéré: ${travailInfo.titre}\nDescription: ${travailInfo.description}\n\nL'utilisateur vient du mode "J'ai besoin d'aide" et a déjà décrit son besoin. Pose les questions de précision (surface, contraintes, etc.) puis génère le JSON de création.`
            }
          }));
        }, 300);
      } catch (e) {
        console.error('Erreur parsing pendingTravailSimple:', e);
      }
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const chantiersData = await getAllChantiers();
        
        const chantiersWithStats = await Promise.all(
        chantiersData.map(async (chantier: any) => {
          try {
            // Pour les travaux simples, charger les stats des étapes
            if (chantier.type_projet === 'simple') {
              const etapesStats = await getChantierEtapesStats(chantier.id);
              return { ...chantier, etapesStats };
            }
            // Pour les chantiers complexes, charger les stats des lots
            const stats = await getChantierStats(chantier.id);
            return { ...chantier, stats };
          } catch {
            return chantier;
          }
        })
      );
        
        setChantiers(chantiersWithStats);
      } catch (error) {
        console.error('Error loading chantiers:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Séparer simples et complexes
  const travauxSimples = chantiers.filter(c => c.type_projet === 'simple');
  const chantiersComplexes = chantiers.filter(c => c.type_projet !== 'simple');
  
  // Grouper les complexes par statut
  const nouveaux = chantiersComplexes.filter(c => c.statut === 'nouveau');
  const enCours = chantiersComplexes.filter(c => 
    c.statut === 'en_cours' || c.statut === 'actif' || !c.statut
  );
  const termines = chantiersComplexes.filter(c => c.statut === 'terminé');

  const handleDelete = async (id: string, titre: string) => {
    const confirmed = await showConfirm({
      title: 'Supprimer le chantier',
      message: `Supprimer "${titre}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await deleteChantier(id, true);
        setChantiers(prev => prev.filter(c => c.id !== id));
      } catch (err: any) {
        showError('Erreur: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem'
      }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb currentLevel="chantiers" />

      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '1rem',
        paddingTop: isMobile ? '0.5rem' : '4rem',
        paddingBottom: '100px' // Espace pour FloatingAssistant
      }}>
        
        {/* ==================== BOUTONS CRÉATION ==================== */}
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          {/* Bouton Travaux simples */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAssistantWithContext', {
                detail: {
                  pageContext: 'travaux_simple_decouverte',
                  contextColor: '#2563eb',
                  welcomeMessage: "Salut ! 🔨 Quels petits travaux veux-tu réaliser ?\n\nExemples : poser une étagère, fixer un miroir, monter un meuble, installer une tringle..."
                }
              }));
            }}
            style={{
              flex: 1,
              minWidth: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1rem',
              background: 'transparent',
              color: 'var(--blue)',
              borderRadius: '12px',
              border: '2px solid var(--blue)',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--blue)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(37, 99, 235, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--blue)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>🔨</span>
            <span>Travaux simples</span>
          </button>
          
          {/* Bouton Nouveau chantier */}
          <Link 
            href="/chantiers/nouveau"
            style={{
              flex: 1,
              minWidth: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1rem',
              background: 'transparent',
              color: 'var(--orange)',
              borderRadius: '12px',
              border: '2px solid var(--orange)',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--orange)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(249, 115, 22, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--orange)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>🏗️</span>
            <span>Nouveau chantier</span>
          </Link>
        </div>

        {/* ==================== SECTION TRAVAUX SIMPLES ==================== */}
        {travauxSimples.length > 0 && (
          <Section
            title="Travaux simples"
            icon="🔨"
            count={travauxSimples.length}
            color="var(--blue)"
            isExpanded={showSimples}
            onToggle={() => setShowSimples(!showSimples)}
          >
            {travauxSimples.map(travail => (
              <TravailSimpleCard
                key={travail.id}
                travail={travail}
                onDelete={() => handleDelete(travail.id, travail.titre)}
                onPhotoClick={() => openPhotosModal(travail)}
                onVideoClick={() => openVideoModal(travail)}
              />
            ))}
          </Section>
        )}

        {/* ==================== SÉPARATION ==================== */}
        {travauxSimples.length > 0 && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: '1.5rem',
            paddingTop: '1.5rem'
          }} />
        )}

        {/* ==================== SECTION CHANTIERS COMPLEXES ==================== */}
        <div>
          
          {/* Nouveaux */}
          {nouveaux.length > 0 && (
            <Section
              title="Chantiers à configurer"
              icon="✨"
              count={nouveaux.length}
              color="var(--orange)"
              isExpanded={showNouveaux}
              onToggle={() => setShowNouveaux(!showNouveaux)}
            >
              {nouveaux.map(chantier => (
                <ChantierCard 
                  key={chantier.id} 
                  chantier={chantier}
                  onDelete={() => handleDelete(chantier.id, chantier.titre)}
                  onPhotoClick={() => openPhotosModal(chantier)}
                  onVideoClick={() => openVideoModal(chantier)}
                />
              ))}
            </Section>
          )}

          {/* En cours */}
          {enCours.length > 0 && (
            <Section
              title="Chantiers en cours"
              icon="🏗️"
              count={enCours.length}
              color="var(--orange)"
              isExpanded={showEnCours}
              onToggle={() => setShowEnCours(!showEnCours)}
            >
              {enCours.map(chantier => (
                <ChantierCard 
                  key={chantier.id} 
                  chantier={chantier}
                  onDelete={() => handleDelete(chantier.id, chantier.titre)}
                  onPhotoClick={() => openPhotosModal(chantier)}
                  onVideoClick={() => openVideoModal(chantier)}
                />
              ))}
            </Section>
          )}

          {/* Terminés */}
          {termines.length > 0 && (
            <Section
              title="Terminés"
              icon="✅"
              count={termines.length}
              color="var(--orange)"
              isExpanded={showTermines}
              onToggle={() => setShowTermines(!showTermines)}
            >
              {termines.map(chantier => (
                <ChantierCard 
                  key={chantier.id} 
                  chantier={chantier}
                  onDelete={() => handleDelete(chantier.id, chantier.titre)}
                  onPhotoClick={() => openPhotosModal(chantier)}
                  onVideoClick={() => openVideoModal(chantier)}
                />
              ))}
            </Section>
          )}
        </div>

        {/* Message si vide */}
        {chantiers.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--gray)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Aucun projet pour le moment
            </p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Commence par créer un travail simple ou un chantier !
            </p>
          </div>
        )}
      </div>
      {/* Modal Photos */}
      <PhotosModal
        isOpen={showPhotosModal}
        onClose={() => setShowPhotosModal(false)}
        niveau={photosModalConfig.niveau}
        niveauId={photosModalConfig.niveauId}
        niveauTitre={photosModalConfig.niveauTitre}
        photos={photosModalConfig.photos}
        onPhotosChange={(newPhotos) => {
          handlePhotosChange(photosModalConfig.niveauId, newPhotos);
          setPhotosModalConfig(prev => ({ ...prev, photos: newPhotos }));
        }}
      />

      {/* Modal Vidéo */}
      <VideoPlayerModal
        video={videoModalConfig.video}
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        showFavoriteButton={false}
        showMettreEnOeuvreButton={false}
        onAttach={undefined}
        attachLabel={undefined}
      />
    </>
  );
}

// ==================== COMPOSANTS ====================

interface SectionProps {
  title: string;
  icon: string;
  count: number;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

// ==================== COMPOSANTS ====================

function Section({ title, icon, count, color, isExpanded, onToggle, children }: SectionProps) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      {/* Header cliquable */}
      <div 
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 0',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span style={{ 
          fontSize: '0.8rem', 
          color: 'var(--gray)',
          transition: 'transform 0.2s',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
        }}>
          ▶
        </span>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ 
          color: 'var(--gray-light)', 
          fontWeight: '600',
          fontSize: '1rem'
        }}>
          {title}
        </span>
        <span style={{
          background: color,
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: '700',
          padding: '0.2rem 0.5rem',
          borderRadius: '10px',
          minWidth: '24px',
          textAlign: 'center'
        }}>
          {count}
        </span>
      </div>
      
      {/* Séparateur dégradé */}
      <div style={{
        height: '2px',
        background: `linear-gradient(to right, transparent, ${color})`,
        marginBottom: '0.75rem'
      }} />
      
      {/* Contenu */}
      {isExpanded && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem',
          paddingLeft: '0.5rem'
        }}>
          {children}
        </div>
      )}
    </section>
  );
}

// Card pour travaux simples
function TravailSimpleCard({ 
  travail, 
  onDelete,
  onPhotoClick,
  onVideoClick
}: { 
  travail: Chantier;
  onDelete: () => void;
  onPhotoClick: () => void;
  onVideoClick: () => void;
}) {
  // Utiliser etapesStats pour les travaux simples
  const etapesStats = (travail as any).etapesStats;
  const progression = etapesStats?.total 
    ? Math.round((etapesStats.termines / etapesStats.total) * 100) 
    : 0;

  return (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: '3px solid var(--blue)',
        overflow: 'hidden'
      }}>
      {/* Header */}
      <Link 
        href={`/chantiers/${travail.id}/travaux`}
        style={{
          display: 'block',
          padding: '1rem',
          textDecoration: 'none'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              color: 'var(--gray-light)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: 0,
              marginBottom: '0.25rem'
            }}>
              {travail.titre}
            </h3>
            {travail.description && (
              <p style={{
                color: 'var(--gray)',
                fontSize: '0.85rem',
                margin: 0,
                lineHeight: 1.4
              }}>
                {travail.description.substring(0, 80)}
                {travail.description.length > 80 ? '...' : ''}
              </p>
            )}
          </div>

          {/* Badge progression */}
          <div style={{
            background: progression === 100 ? 'var(--green)' : 'rgba(255,255,255,0.1)',
            color: progression === 100 ? 'white' : 'var(--gray-light)',
            padding: '0.25rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            {progression}%
          </div>
        </div>

        {/* Barre de progression */}
        {etapesStats && etapesStats.total > 0 && (
          <div style={{
            marginTop: '0.75rem',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progression}%`,
              height: '100%',
              background: 'var(--blue)',
              transition: 'width 0.3s'
            }} />
          </div>
        )}

        {/* Stats compactes */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--gray)'
        }}>
          {etapesStats && (
            <span>✓ {etapesStats.termines}/{etapesStats.total} étapes</span>
          )}
          {etapesStats?.dureeHeures > 0 && (
            <span>⏱ {etapesStats.dureeHeures}h</span>
          )}
        </div>
      </Link>

      {/* Boutons Photos & Vidéos */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0.5rem 1rem',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <MediaButtons
          niveau="chantier"
          niveauId={travail.id}
          niveauTitre={travail.titre}
          photosCount={travail.photos_urls?.length || 0}
          hasVideo={!!travail.video_aide?.video_id}
          videoTitre={travail.video_aide?.titre}
          compact
          onPhotoClick={onPhotoClick}
          onVideoClick={onVideoClick}
        />
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Link
          href={`/chantiers/${travail.id}/travaux`}
          style={{
            flex: 1,
            padding: '0.75rem',
            textAlign: 'center',
            color: 'var(--blue)',
            fontSize: '0.85rem',
            fontWeight: '500',
            textDecoration: 'none',
            borderRight: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          Voir les étapes →
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            color: 'var(--gray)',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// Card pour chantiers complexes
function ChantierCard({ 
  chantier, 
  onDelete,
  onPhotoClick,
  onVideoClick
}: { 
  chantier: Chantier;
  onDelete: () => void;
  onPhotoClick: () => void;
  onVideoClick: () => void;
}) {
  const stats = chantier.stats;
  const progression = stats?.total 
    ? Math.round((stats.termines / stats.total) * 100) 
    : 0;

  const getStatusConfig = (statut: string) => {
    switch (statut) {
      case 'nouveau': return { color: 'var(--purple)', label: 'À configurer', icon: '✨' };
      case 'terminé': return { color: 'var(--green)', label: 'Terminé', icon: '✅' };
      default: return { color: 'var(--blue)', label: 'En cours', icon: '🏗️' };
    }
  };

  const status = getStatusConfig(chantier.statut);
  const linkHref = chantier.statut === 'nouveau' 
    ? `/chantiers/${chantier.id}` 
    : `/chantiers/${chantier.id}/travaux`;

  return (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: '3px solid var(--orange)',
        overflow: 'hidden'
      }}>
      {/* Header */}
      <Link 
        href={linkHref}
        style={{
          display: 'block',
          padding: '1rem',
          textDecoration: 'none'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              color: 'var(--gray-light)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: 0,
              marginBottom: '0.25rem'
            }}>
              {status.icon} {chantier.titre}
            </h3>
            {chantier.description && (
              <p style={{
                color: 'var(--gray)',
                fontSize: '0.85rem',
                margin: 0,
                lineHeight: 1.4
              }}>
                {chantier.description.substring(0, 80)}
                {chantier.description.length > 80 ? '...' : ''}
              </p>
            )}
          </div>

          {/* Badge */}
          {chantier.statut !== 'nouveau' && (
            <div style={{
              background: progression === 100 ? 'var(--blue)' : 'rgba(255,255,255,0.1)',
              color: progression === 100 ? 'white' : 'var(--gray-light)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              {progression}%
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {chantier.statut !== 'nouveau' && stats && stats.total > 0 && (
          <div style={{
            marginTop: '0.75rem',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progression}%`,
              height: '100%',
              background: status.color,
              transition: 'width 0.3s'
            }} />
          </div>
        )}

        {/* Stats compactes */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--gray)'
        }}>
         {chantier.statut === 'nouveau' ? (
            <>
              <span>📅 Créé le {new Date(chantier.created_at).toLocaleDateString('fr-FR')}</span>
              {(chantier as any).nombre_travaux > 0 && (
                <span style={{ color: 'var(--orange)' }}>
                  ⚠️ {(chantier as any).nombre_travaux} lots en brouillon
                </span>
              )}
            </>
          ) : (
            <>
              {stats && <span>📦 {stats.total} lots</span>}
              {stats && <span>✓ {stats.termines} terminés</span>}
              {chantier.budget_initial > 0 && (
                <span>💰 {chantier.budget_initial.toLocaleString()}€</span>
              )}
            </>
          )}
        </div>
      </Link>

      {/* Boutons Photos & Vidéos */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0.5rem 1rem',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <MediaButtons
          niveau="chantier"
          niveauId={chantier.id}
          niveauTitre={chantier.titre}
          photosCount={chantier.photos_urls?.length || 0}
          hasVideo={!!chantier.video_aide?.video_id}
          videoTitre={chantier.video_aide?.titre}
          compact
          onPhotoClick={onPhotoClick}
          onVideoClick={onVideoClick}
        />
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Link
          href={linkHref}
          style={{
            flex: 1,
            padding: '0.75rem',
            textAlign: 'center',
            color: 'var(--orange)',
            fontSize: '0.85rem',
            fontWeight: '500',
            textDecoration: 'none',
            borderRight: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          {chantier.statut === 'nouveau' ? 'Configurer →' : 'Voir les lots →'}
        </Link>
        {chantier.statut === 'nouveau' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              color: 'var(--gray)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
