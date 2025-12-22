// /app/components/MediaButtons.tsx
// Boutons 📷🎬 réutilisables pour tous les niveaux
// v1.1 - 22/12/2024 - Suppression modale interne (gérée par les pages)

'use client';

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
        onClick={onVideoClick}
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
  );
}
