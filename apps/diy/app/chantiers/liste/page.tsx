/**
 * Page Liste Chantiers - Version Mobile-First
 * 
 * Liste des chantiers complexes (type_projet = 'complexe')
 * avec cards style moderne et progress bar
 * 
 * @version 2.1
 * @date 04 janvier 2026
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllChantiers, getChantierStats, deleteChantier } from '@/app/lib/services/chantierService';
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

export default function ChantiersListePage() {
  const { showError, showSuccess, showConfirm } = useToast();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Sections collapsibles
  const [sectionsOpen, setSectionsOpen] = useState({
    nouveaux: false,
    en_cours: true,
    termines: false
  });
  
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadChantiers();
  }, []);

  const loadChantiers = async () => {
    try {
      const chantiersData = await getAllChantiers();
      
      // Filtrer uniquement les chantiers complexes
      const chantiersComplexes = chantiersData.filter((c: any) => c.type_projet !== 'simple');
      
      const chantiersWithStats = await Promise.all(
        chantiersComplexes.map(async (chantier: any) => {
          try {
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
      showError('Erreur lors du chargement des chantiers');
    } finally {
      setLoading(false);
    }
  };

  // Grouper par statut
  const nouveaux = chantiers.filter(c => c.statut === 'nouveau');
  const enCours = chantiers.filter(c => 
    c.statut === 'en_cours' || c.statut === 'actif' || !c.statut
  );
  const termines = chantiers.filter(c => c.statut === 'terminé');

  // Gestion des photos
  const openPhotosModal = (chantier: Chantier) => {
    setPhotosModalConfig({
      niveau: 'chantier',
      niveauId: chantier.id,
      niveauTitre: chantier.titre,
      photos: chantier.photos_urls || []
    });
    setShowPhotosModal(true);
  };

  const handlePhotosChange = (niveauId: string, newPhotos: any[]) => {
    setChantiers(prev => prev.map(c => 
      c.id === niveauId ? { ...c, photos_urls: newPhotos } : c
    ));
  };

  // Gestion des vidéos
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

  // Suppression
  const handleDelete = async (chantier: Chantier) => {
    const confirmed = await showConfirm({
      title: 'Supprimer le chantier',
      message: `Supprimer "${chantier.titre}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (confirmed) {
      try {
        await deleteChantier(chantier.id, true);
        setChantiers(prev => prev.filter(c => c.id !== chantier.id));
        showSuccess('Chantier supprimé');
      } catch (err: any) {
        showError('Erreur: ' + err.message);
      }
    }
  };

  // Helpers
  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'nouveau': return 'var(--purple)';
      default: return 'var(--orange)';
    }
  };

  const getStatusRgb = (statut: string) => {
    switch (statut) {
      case 'terminé': return '16, 185, 129';
      case 'nouveau': return '139, 92, 246';
      default: return '249, 115, 22';
    }
  };

  const getStatusConfig = (statut: string) => {
    switch (statut) {
      case 'nouveau': return { label: 'À configurer', icon: '✨' };
      case 'terminé': return { label: 'Terminé', icon: '✅' };
      default: return { label: 'En cours', icon: '🏗️' };
    }
  };

  // Composant Section
  const Section = ({ 
    title, 
    icon, 
    color, 
    items, 
    sectionKey
  }: { 
    title: string; 
    icon: string; 
    color: string; 
    items: Chantier[];
    sectionKey: keyof typeof sectionsOpen;
  }) => {
    if (items.length === 0) return null;

    const isOpen = sectionsOpen[sectionKey];

    const getColorRgb = (cssColor: string) => {
      switch (cssColor) {
        case 'var(--green)': return '16, 185, 129';
        case 'var(--blue)': return '37, 99, 235';
        case 'var(--orange)': return '249, 115, 22';
        case 'var(--red)': return '239, 68, 68';
        case 'var(--purple)': return '139, 92, 246';
        default: return '249, 115, 22';
      }
    };

    const rgb = getColorRgb(color);

    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setSectionsOpen(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: '2px solid transparent',
            borderImage: `linear-gradient(90deg, transparent 0%, rgb(${rgb}) 100%) 1`,
            cursor: 'pointer',
            padding: '0.5rem 0',
            paddingBottom: '0.75rem',
            width: '100%',
            textAlign: 'left'
          }}
        >
          <span style={{
            color: 'var(--gray)',
            fontSize: '0.8rem',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
          }}>
            ▶
          </span>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span style={{
            color: 'var(--gray-light)',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}>
            {title}
          </span>
          <span style={{
            background: color,
            color: 'white',
            padding: '0.15rem 0.5rem',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {items.length}
          </span>
        </button>
        
        {isOpen && (
          <div style={{ marginTop: '0.75rem' }}>
            {items.map(chantier => (
              <ChantierCard key={chantier.id} chantier={chantier} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Composant ChantierCard
  const ChantierCard = ({ chantier }: { chantier: Chantier }) => {
    const stats = chantier.stats;
    const progression = stats?.total 
      ? Math.round((stats.termines / stats.total) * 100) 
      : 0;

    const statusColor = getStatusColor(chantier.statut);
    const rgb = getStatusRgb(chantier.statut);
    const status = getStatusConfig(chantier.statut);

    const linkHref = chantier.statut === 'nouveau' 
      ? `/chantiers/${chantier.id}` 
      : `/chantiers/${chantier.id}/travaux`;

    return (
      <div style={{
        background: `linear-gradient(90deg, transparent 0%, rgba(${rgb}, 0.15) 50%, rgba(${rgb}, 0.4) 100%)`,
        borderRadius: '12px',
        borderLeft: `5px solid rgb(${rgb})`,
        marginBottom: '0.75rem',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Zone cliquable - lien vers lots */}
        <Link
          href={linkHref}
          style={{
            display: 'block',
            padding: '1rem 1.25rem',
            paddingBottom: '0.5rem',
            textDecoration: 'none'
          }}
        >
          {/* Ligne 1 : Titre + Badge % */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white',
              lineHeight: '1.4',
              flex: 1
            }}>
              {status.icon} {chantier.titre}
            </h3>
            {chantier.statut !== 'nouveau' && (
              <span style={{
                background: statusColor,
                color: 'white',
                padding: '0.25rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: '700',
                minWidth: '45px',
                textAlign: 'center'
              }}>
                {progression}%
              </span>
            )}
          </div>

          {/* Description (si présente) */}
          {chantier.description && (
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.85rem',
              margin: 0,
              marginBottom: '0.75rem',
              lineHeight: 1.4
            }}>
              {chantier.description.substring(0, 100)}
              {chantier.description.length > 100 ? '...' : ''}
            </p>
          )}

          {/* Progress bar (si pas nouveau) */}
          {chantier.statut !== 'nouveau' && stats && stats.total > 0 && (
            <div style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.max(progression, 2)}%`,
                height: '100%',
                background: progression === 100 
                  ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
                  : 'linear-gradient(90deg, #f97316 0%, #10b981 100%)',
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          )}
        </Link>

        {/* Stats + MediaButtons + Delete - EN DEHORS du Link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1.25rem',
          paddingTop: '0.25rem',
          fontSize: '0.85rem',
          color: 'white'
        }}>
          {/* Stats gauche */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
                {stats && <span>✅ {stats.termines} terminés</span>}
                {chantier.budget_initial > 0 && (
                  <span>💰 {chantier.budget_initial.toLocaleString()}€</span>
                )}
              </>
            )}
          </div>

          {/* MediaButtons + Delete droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MediaButtons
              niveau="chantier"
              niveauId={chantier.id}
              niveauTitre={chantier.titre}
              photosCount={chantier.photos_urls?.length || 0}
              hasVideo={!!chantier.video_aide?.video_id}
              videoTitre={chantier.video_aide?.titre}
              compact
              onPhotoClick={() => openPhotosModal(chantier)}
              onVideoClick={() => openVideoModal(chantier)}
            />
            <button
              onClick={() => handleDelete(chantier)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.3rem',
                opacity: 0.6,
                transition: 'opacity 0.2s',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
              title="Supprimer"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Empty state
  const EmptyState = () => (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1rem',
      color: 'var(--gray)'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
      <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--gray-light)' }}>
        Aucun chantier
      </p>
      <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Créez votre premier projet de rénovation !
      </p>
      <Link
        href="/chantiers/nouveau"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.875rem 1.5rem',
          background: 'var(--orange)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '600',
          textDecoration: 'none'
        }}
      >
        + Créer un chantier
      </Link>
    </div>
  );

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
      <Breadcrumb 
        currentLevel="chantiers"
      />

      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '1rem',
        paddingTop: isMobile ? '1rem' : '3.5rem',
        paddingBottom: '100px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'var(--gray-light)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🏗️ Mes chantiers
          </h1>
          <Link
            href="/chantiers/nouveau"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.9rem',
              textDecoration: 'none'
            }}
          >
            <span>+ Nouveau</span>
          </Link>
        </div>

        {/* Contenu */}
        {chantiers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Section
              title="À configurer"
              icon="✨"
              color="var(--purple)"
              items={nouveaux}
              sectionKey="nouveaux"
            />
            <Section
              title="En cours"
              icon="🏗️"
              color="var(--orange)"
              items={enCours}
              sectionKey="en_cours"
            />
            <Section
              title="Terminés"
              icon="✅"
              color="var(--green)"
              items={termines}
              sectionKey="termines"
            />
          </>
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
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        video={videoModalConfig.video}
      />
    </>
  );
}
