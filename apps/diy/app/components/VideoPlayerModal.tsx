/**
 * /app/components/VideoPlayerModal.tsx
 * Modal de lecture vidéo YouTube réutilisable
 * 
 * @version 1.0
 * 
 * Usage :
 * <VideoPlayerModal
 *   video={selectedVideo}
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onFavoriteToggle={(video) => handleFavorite(video)}
 *   onMettreEnOeuvre={(video) => handleMettreEnOeuvre(video)}
 *   isFavorite={favoriteIds.has(video.id)}
 *   showActions={true}
 * />
 */

'use client';

import React, { useEffect } from 'react';

// ============================================
// TYPES
// ============================================

interface VideoChapter {
  title: string;
  start_seconds: number;
  start_formatted: string;
}

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: number;
  duration: string;
  durationSeconds?: number;
  isTrusted?: boolean;
  isShort?: boolean;
  publishedAt?: string;
  likeCount?: number;
  isHD?: boolean;
  hasChapters?: boolean;
  chapters?: VideoChapter[];
}

interface VideoPlayerModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onFavoriteToggle?: (video: Video) => void;
  onMettreEnOeuvre?: (video: Video) => void;
  onAttach?: (video: Video) => void;
  attachLabel?: string;
  isFavorite?: boolean;
  showActions?: boolean;
  showFavoriteButton?: boolean;
  showMettreEnOeuvreButton?: boolean;
}

// ============================================
// HELPERS
// ============================================

const formatViews = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const formatLikes = (count: number): string | null => {
  if (!count) return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffYears = now.getFullYear() - date.getFullYear();
  
  if (diffYears === 0) {
    return date.toLocaleDateString('fr-FR', { month: 'short' });
  } else if (diffYears === 1) {
    return "l'an dernier";
  } else {
    return date.getFullYear().toString();
  }
};

// ============================================
// COMPOSANT
// ============================================

export default function VideoPlayerModal({
  video,
  isOpen,
  onClose,
  onFavoriteToggle,
  onMettreEnOeuvre,
  onAttach,
  attachLabel,
  isFavorite = false,
  showActions = true,
  showFavoriteButton = true,
  showMettreEnOeuvreButton = true,
}: VideoPlayerModalProps) {
  
  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Bloquer le scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !video) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      {/* Contenu du modal - stop propagation pour éviter fermeture au clic */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header avec bouton fermer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {video.isTrusted && (
              <span style={{
                background: 'var(--green)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                ✓ Recommandé
              </span>
            )}
            {video.hasChapters && (
              <span style={{
                background: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                📑 {video.chapters?.length || 0} chapitres
              </span>
            )}
            {video.isHD && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                HD
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.2rem',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ✕
          </button>
        </div>

        {/* Player YouTube */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // Ratio 16:9
          background: '#000',
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>

        {/* Infos vidéo */}
        <div style={{ padding: '1.25rem' }}>
          <h2 style={{
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            lineHeight: '1.4',
          }}>
            {video.title}
          </h2>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.85rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{video.channelTitle}</span>
            <span>•</span>
            <span>👁️ {formatViews(video.viewCount)}</span>
            {video.likeCount && video.likeCount > 0 && (
              <>
                <span>•</span>
                <span>👍 {formatLikes(video.likeCount)}</span>
              </>
            )}
            {video.publishedAt && (
              <>
                <span>•</span>
                <span>📅 {formatDate(video.publishedAt)}</span>
              </>
            )}
            <span>•</span>
            <span>⏱️ {video.duration}</span>
          </div>

          {/* Boutons d'action */}
          {showActions && (
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              {showFavoriteButton && onFavoriteToggle && (
                <button
                  onClick={() => onFavoriteToggle(video)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: isFavorite 
                      ? '2px solid #ef4444' 
                      : '2px solid rgba(255,255,255,0.3)',
                    background: isFavorite 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : 'transparent',
                    color: isFavorite ? '#ef4444' : 'white',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  {isFavorite ? '❤️ Dans mes favoris' : '🤍 Ajouter aux favoris'}
                </button>
              )}
              
              {showMettreEnOeuvreButton && onMettreEnOeuvre && (
                <button
                  onClick={() => onMettreEnOeuvre(video)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: '2px solid var(--green)',
                    background: 'transparent',
                    color: 'var(--green)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--green)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--green)';
                  }}
                >
                  🚀 Mettre en œuvre
                </button>
                {onAttach && (
                  <button
                    onClick={() => onAttach(video)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--orange)',
                      color: 'white',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(249, 115, 22, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    📌 {attachLabel || 'Attacher'}
                  </button>
                )}
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
