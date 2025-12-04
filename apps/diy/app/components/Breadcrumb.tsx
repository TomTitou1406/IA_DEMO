'use client';

import Link from 'next/link';

// Types pour les niveaux de navigation
export type NavigationLevel = 'home' | 'chantiers' | 'lots' | 'etapes' | 'taches';

interface BreadcrumbProps {
  currentLevel: NavigationLevel;
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
}

// Configuration des niveaux
const LEVELS_CONFIG: Record<NavigationLevel, { label: string; icon: string }> = {
  home: { label: 'Home', icon: '🏠' },
  chantiers: { label: 'Chantiers', icon: '🏗️' },
  lots: { label: 'Lots', icon: '📦' },
  etapes: { label: 'Étapes', icon: '📋' },
  taches: { label: 'Tâches', icon: '✅' }
};

// Ordre des niveaux pour la navigation
const LEVELS_ORDER: NavigationLevel[] = ['home', 'chantiers', 'lots', 'etapes', 'taches'];

export default function Breadcrumb({ 
  currentLevel, 
  chantierId, 
  travailId, 
  etapeId 
}: BreadcrumbProps) {
  
  // Construire le chemin jusqu'au niveau actuel
  const currentIndex = LEVELS_ORDER.indexOf(currentLevel);
  const visibleLevels = LEVELS_ORDER.slice(0, currentIndex + 1);

  // Générer l'URL pour chaque niveau
  const getUrlForLevel = (level: NavigationLevel): string | null => {
    switch (level) {
      case 'home':
        return '/';
      case 'chantiers':
        return '/chantiers';
      case 'lots':
        return chantierId ? `/chantiers/${chantierId}/travaux` : null;
      case 'etapes':
        return chantierId && travailId 
          ? `/chantiers/${chantierId}/travaux/${travailId}/etapes` 
          : null;
      case 'taches':
        return chantierId && travailId && etapeId 
          ? `/chantiers/${chantierId}/travaux/${travailId}/etapes/${etapeId}/taches` 
          : null;
      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 100,
      left: 0,
      right: 0,
      background: 'linear-gradient(180deg, rgba(13,13,13,0.98) 0%, rgba(13,13,13,0.95) 100%)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      zIndex: 100
    }}>
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 1rem',
        display: 'flex', 
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem'
      }}>
        {visibleLevels.map((level, index) => {
          const config = LEVELS_CONFIG[level];
          const url = getUrlForLevel(level);
          const isLast = index === visibleLevels.length - 1;
          const isClickable = !isLast && url !== null;

          return (
            <span key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Séparateur sauf pour le premier */}
              {index > 0 && (
                <span style={{ color: 'var(--gray)', opacity: 0.5 }}>/</span>
              )}
              
              {/* Lien ou texte selon si cliquable */}
              {isClickable && url ? (
                <Link 
                  href={url}
                  style={{ 
                    color: 'var(--gray)', 
                    transition: 'color 0.2s',
                    fontWeight: '500',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </Link>
              ) : (
                <span style={{ 
                  color: isLast ? 'var(--gray-light)' : 'var(--gray)',
                  fontWeight: isLast ? '600' : '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
