// /app/components/MediaButtons.tsx
// Boutons 📷🎬 réutilisables pour tous les niveaux
// v1.0 - 22/12/2024

'use client';

import { useState } from 'react';

type NiveauType = 'chantier' | 'travail' | 'etape' | 'tache';

interface MediaButtonsProps {
  niveau: NiveauType;
  niveauId: string;
  niveauTitre: string;
  photosCount?: number;
  hasVideo?: boolean;
  videoTitre?: string;
  onPhotoClick: () => void;
  onVideoClick: () => void;
  compact?: boolean;
}

export default function MediaButtons({
  niveau,
  niveauId,
  niveauTitre,
  photosCount = 0,
  hasVideo = false,
  videoTitre,
  onPhotoClick,
  onVideoClick,
  compact = false
}: MediaButtonsProps) {
  const [showVideoModal, setShowVideoModal] = useState(false);

  const handleVideoClick = () => {
    if (hasVideo) {
      // Vidéo existe → ouvrir directement
      onVideoClick();
    } else {
      // Pas de vidéo → modale de confirmation
      setShowVideoModal(true);
    }
  };

  const handleLaunchSearch = () => {
    setShowVideoModal(false);
    onVideoClick();
  };

  const buttonStyle = {
    padding: compact ? '0.25rem' : '0.35rem',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--gray)',
    fontSize: compact ? '1.1rem' : '1.3rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'all 0.2s'
  };

  const activeStyle = {
    ...buttonStyle,
    color: 'var(--orange)'
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        {/* Bouton Photos */}
        <button
          onClick={onPhotoClick}
          style={photosCount > 0 ? activeStyle : buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--blue)';
            e.currentTarget.style.transform = 'scale(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = photosCount > 0 ? 'var(--orange)' : 'var(--gray)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={photosCount > 0 ? `${photosCount} photo(s)` : 'Ajouter une photo'}
        >
          📷 {photosCount > 0 && (
            <span style={{
              background: 'var(--blue)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '700',
              minWidth: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '2px'
            }}>
              {photosCount}
            </span>
          )}
        </button>

        {/* Bouton Vidéo */}
        <button
          onClick={handleVideoClick}
          style={hasVideo ? activeStyle : buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--blue)';
            e.currentTarget.style.transform = 'scale(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = hasVideo ? 'var(--orange)' : 'var(--gray)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={hasVideo ? videoTitre || 'Voir le tuto' : 'Trouver un tuto'}
        >
          🎬 {hasVideo && (
            <span style={{
              background: 'var(--blue)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '700',
              minWidth: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '2px'
            }}>
              1
            </span>
          )}
        </button>
      </div>

      {/* Modale confirmation recherche vidéo */}
      {showVideoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--background)',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ 
              fontSize: '1.5rem', 
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              🎬
            </div>
            <h3 style={{ 
              color: 'var(--gray-light)', 
              fontSize: '1rem',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '0.75rem'
            }}>
              Trouver un tuto
            </h3>
            <p style={{ 
              color: 'var(--gray)', 
              fontSize: '0.85rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              lineHeight: '1.4'
            }}>
              Lancer la recherche de tutos pour<br/>
              <strong style={{ color: 'var(--orange)' }}>"{niveauTitre}"</strong> ?
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowVideoModal(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'var(--gray-light)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleLaunchSearch}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--orange)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                🔍 Lancer la recherche
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
