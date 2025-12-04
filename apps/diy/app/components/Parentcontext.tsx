'use client';

interface ParentContextProps {
  chantier?: {
    titre: string;
  };
  lot?: {
    titre: string;
  };
  etape?: {
    titre: string;
  };
}

export default function ParentContext({ chantier, lot, etape }: ParentContextProps) {
  // Ne rien afficher s'il n'y a pas de parent
  if (!chantier && !lot && !etape) {
    return null;
  }

  return (
    <div style={{
      marginBottom: '0.75rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    }}>
      {/* Chantier parent */}
      {chantier && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--gray)'
        }}>
          <span style={{ opacity: 0.7 }}>🏗️</span>
          <span style={{ opacity: 0.7 }}>Chantier :</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '500' }}>
            {chantier.titre}
          </span>
        </div>
      )}

      {/* Lot parent */}
      {lot && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--gray)'
        }}>
          <span style={{ opacity: 0.7 }}>📦</span>
          <span style={{ opacity: 0.7 }}>Lot :</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '500' }}>
            {lot.titre}
          </span>
        </div>
      )}

      {/* Étape parent */}
      {etape && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--gray)'
        }}>
          <span style={{ opacity: 0.7 }}>📋</span>
          <span style={{ opacity: 0.7 }}>Étape :</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '500' }}>
            {etape.titre}
          </span>
        </div>
      )}
    </div>
  );
}
