/**
 * Page Travaux Simples
 * 
 * Liste des travaux simples (type_projet = 'simple')
 * avec cards compactes et progress bar
 * 
 * @version 1.2
 * @date 04 janvier 2026
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/app/components/Breadcrumb';
import MediaButtons from '@/app/components/MediaButtons';
import PhotosModal from '@/app/components/PhotosModal';
import VideoPlayerModal from '@/app/components/VideoPlayerModal';
import { useToast } from '@/app/components/Toast';

interface TravailSimple {
  id: string;
  chantier_id: string;
  titre: string;
  description?: string;
  statut: string;
  progression: number;
  nombre_etapes: number;
  etapes_terminees: number;
  duree_estimee_heures?: number;
  duree_reelle_heures?: number;
  updated_at: string;
  photos_urls?: any[];
  video_aide?: {
    video_id: string;
    titre: string;
    url: string;
    thumbnail?: string;
  } | null;
}

export default function TravauxSimplesPage() {
  const { showError, showSuccess, showConfirm } = useToast();
  const [travaux, setTravaux] = useState<TravailSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Sections collapsibles
  const [sectionsOpen, setSectionsOpen] = useState({
    en_cours: true,
    a_faire: true,
    bloque: true,
    termine: false
  });

  // Modales photos et vidéos
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [photosModalConfig, setPhotosModalConfig] = useState<{
    niveau: 'chantier' | 'travail' | 'etape' | 'tache';
    niveauId: string;
    niveauTitre: string;
    photos: any[];
  }>({ niveau: 'travail', niveauId: '', niveauTitre: '', photos: [] });

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
    loadTravaux();
  }, []);

  const loadTravaux = async () => {
    try {
      const response = await fetch('/api/travaux-simples');
      const data = await response.json();
      if (data.success) {
        setTravaux(data.travaux || []);
      }
    } catch (error) {
      console.error('Erreur chargement travaux:', error);
      showError('Erreur lors du chargement des travaux');
    } finally {
      setLoading(false);
    }
  };

  // Gestion des photos
  const openPhotosModal = (travail: TravailSimple) => {
    setPhotosModalConfig({
      niveau: 'travail',
      niveauId: travail.id,
      niveauTitre: travail.titre,
      photos: travail.photos_urls || []
    });
    setShowPhotosModal(true);
  };

  const handlePhotosChange = (niveauId: string, newPhotos: any[]) => {
    setTravaux(prev => prev.map(t => 
      t.id === niveauId ? { ...t, photos_urls: newPhotos } : t
    ));
  };

  // Gestion des vidéos
  const openVideoModal = (travail: TravailSimple) => {
    if (travail.video_aide?.video_id) {
      setVideoModalConfig({
        video: {
          id: travail.video_aide.video_id,
          title: travail.video_aide.titre,
          thumbnail: travail.video_aide.thumbnail,
          channelTitle: '',
          viewCount: 0,
          duration: ''
        }
      });
      setShowVideoModal(true);
    } else {
      sessionStorage.setItem('attachReturnUrl', window.location.href);
      const searchQuery = encodeURIComponent(travail.titre);
      window.location.href = `/videos?context=travail&id=${travail.id}&search=${searchQuery}`;
    }
  };

  // Suppression
  const handleDelete = async (travail: TravailSimple) => {
    const confirmed = await showConfirm({
      title: 'Supprimer ce travail',
      message: `Supprimer "${travail.titre}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/chantiers/${travail.chantier_id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setTravaux(prev => prev.filter(t => t.id !== travail.id));
          showSuccess('Travail supprimé');
        }
      } catch (error) {
        showError('Erreur lors de la suppression');
      }
    }
  };

  // Grouper par statut
  const enCours = travaux.filter(t => t.statut === 'en_cours' || !t.statut);
  const aFaire = travaux.filter(t => t.statut === 'a_faire');
  const bloques = travaux.filter(t => t.statut === 'bloque');
  const termines = travaux.filter(t => t.statut === 'termine' || t.statut === 'terminé');

  // Helpers
  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'termine':
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloque': return 'var(--orange)';
      case 'annule': return 'var(--red)';
      default: return 'var(--blue)';
    }
  };

  const formatDuree = (heures?: number) => {
    if (!heures) return null;
    if (heures < 1) return `${Math.round(heures * 60)}min`;
    return `${heures}h`;
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
    items: TravailSimple[];
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
        default: return '107, 114, 128';
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
            {items.map(travail => (
              <TravailCard key={travail.id} travail={travail} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Composant TravailCard
  const TravailCard = ({ travail }: { travail: TravailSimple }) => {
    const progression = travail.nombre_etapes > 0 
      ? Math.round((travail.etapes_terminees / travail.nombre_etapes) * 100)
      : 0;

    const statusColor = getStatusColor(travail.statut);
    
    const getStatusRgb = (statut: string) => {
      switch (statut) {
        case 'termine':
        case 'terminé': return '16, 185, 129';
        case 'en_cours': return '37, 99, 235';
        case 'bloque': return '249, 115, 22';
        case 'annule': return '239, 68, 68';
        default: return '37, 99, 235';
      }
    };

    const rgb = getStatusRgb(travail.statut);

    return (
      <div style={{
        background: `linear-gradient(90deg, transparent 0%, rgba(${rgb}, 0.15) 50%, rgba(${rgb}, 0.4) 100%)`,
        borderRadius: '12px',
        borderLeft: `5px solid rgb(${rgb})`,
        marginBottom: '0.75rem',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Zone cliquable - lien vers étapes */}
        <Link
          href={`/chantiers/${travail.chantier_id}/travaux/${travail.id}/etapes`}
          style={{
            display: 'block',
            padding: '0.75rem 1rem',
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
            marginBottom: '0.75rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white',
              lineHeight: '1.4',
              flex: 1
            }}>
              {travail.titre}
            </h3>
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
          </div>

          {/* Ligne 2 : Progress bar */}
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
                : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
              borderRadius: '3px',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
        </Link>

        {/* Stats + MediaButtons + Delete - EN DEHORS du Link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 1rem',
          paddingTop: '0.25rem',
          fontSize: '0.85rem',
          color: 'white'
        }}>
          {/* Stats gauche */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>✅ {travail.etapes_terminees}/{travail.nombre_etapes} étapes</span>
            {travail.duree_estimee_heures && (
              <span>⏱️ {formatDuree(travail.duree_estimee_heures)}</span>
            )}
          </div>

          {/* MediaButtons + Delete droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MediaButtons
              niveau="travail"
              niveauId={travail.id}
              niveauTitre={travail.titre}
              photosCount={travail.photos_urls?.length || 0}
              hasVideo={!!travail.video_aide?.video_id}
              videoTitre={travail.video_aide?.titre}
              compact
              onPhotoClick={() => openPhotosModal(travail)}
              onVideoClick={() => openVideoModal(travail)}
            />
            <button
              onClick={() => handleDelete(travail)}
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
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
      <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--gray-light)' }}>
        Aucun travail simple
      </p>
      <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Créez votre première tâche ponctuelle !
      </p>
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
            detail: { 
              pageContext: 'travaux_simple_decouverte',
              welcomeMessage: "Salut ! Décris-moi le petit travail que tu veux faire..."
            } 
          }));
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.875rem 1.5rem',
          background: 'var(--blue)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        + Créer un travail simple
      </button>
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
        paddingTop: isMobile ? '2rem' : '5rem',
        paddingBottom: '100px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
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
            🔧 Travaux simples
          </h1>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
                detail: { 
                  pageContext: 'travaux_simple_decouverte',
                  welcomeMessage: "Salut ! Décris-moi le petit travail que tu veux faire..."
                } 
              }));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              background: 'var(--blue)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span>+ Nouveau</span>
          </button>
        </div>

        {/* Contenu */}
        {travaux.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Section
              title="En cours"
              icon="🔧"
              color="var(--blue)"
              items={enCours}
              sectionKey="en_cours"
            />
            <Section
              title="À faire"
              icon="📋"
              color="var(--purple)"
              items={aFaire}
              sectionKey="a_faire"
            />
            <Section
              title="Bloqués"
              icon="⚠️"
              color="var(--orange)"
              items={bloques}
              sectionKey="bloque"
            />
            <Section
              title="Terminés"
              icon="✅"
              color="var(--green)"
              items={termines}
              sectionKey="termine"
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
