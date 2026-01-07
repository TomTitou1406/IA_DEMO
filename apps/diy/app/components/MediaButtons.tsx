// /app/components/MediaButtons.tsx
// Boutons 📷🎬 réutilisables pour tous les niveaux
// v1.2 - 07/01/2026 - Pastilles en superposition style notification

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

  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    padding: compact ? '0.25rem' : '0.35rem',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--gray)',
    fontSize: compact ? '1.1rem' : '1.3rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    minWidth: compact ? '28px' : '32px',
    height: compact ? '28px' : '32px'
  };

  const activeStyle: React.CSSProperties = {
    ...buttonStyle,
    color: 'var(--orange)'
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: 'var(--blue)',
    color: 'white',
    fontSize: '0.55rem',
    fontWeight: '700',
    minWidth: '14px',
    height: '14px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    border: '1.5px solid rgba(0,0,0,0.2)'
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
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
        📷
        {photosCount > 0 && (
          <span style={badgeStyle}>
            {photosCount > 9 ? '9+' : photosCount}
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
        🎬
        {hasVideo && (
          <span style={{
            ...badgeStyle,
            background: 'var(--green)'
          }}>
            ✓
          </span>
        )}
      </button>
    </div>
  );
}
