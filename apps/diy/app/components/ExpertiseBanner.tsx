/**
 * ExpertiseBanner.tsx
 * 
 * Composant UI pour afficher la suggestion d'expertise détectée
 * Permet à l'utilisateur de confirmer ou refuser le switch d'expert
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

'use client';

import { useState } from 'react';

// ==================== TYPES ====================

export interface ExpertiseBannerProps {
  /** Expertise détectée */
  expertise: {
    id: string;
    code: string;
    nom: string;
    description?: string;
    categorie?: string;
    niveau_risque?: string;
  };
  
  /** Score de confiance (0-100) */
  confidence: number;
  
  /** Mots-clés qui ont matché (optionnel) */
  matchedKeywords?: string[];
  
  /** Callback quand l'utilisateur confirme */
  onConfirm: () => void | Promise<void>;
  
  /** Callback quand l'utilisateur refuse */
  onDismiss: () => void;
  
  /** Transition en cours */
  isTransitioning?: boolean;
  
  /** Couleur du thème (optionnel) */
  themeColor?: string;
  
  /** Mode compact pour les petits écrans */
  compact?: boolean;
}

// ==================== COMPOSANT ====================

export default function ExpertiseBanner({
  expertise,
  confidence,
  matchedKeywords = [],
  onConfirm,
  onDismiss,
  isTransitioning = false,
  themeColor = '#10b981', // Vert par défaut
  compact = false
}: ExpertiseBannerProps) {
  
  const [isConfirming, setIsConfirming] = useState(false);

  // Handler confirmation avec loading
  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  // Icône selon catégorie
  const getCategoryIcon = (categorie?: string): string => {
    const icons: Record<string, string> = {
      'artisan': '🔧',
      'coordination': '📋',
      'economiste': '📊',
      'formateur': '🎓',
      'default': '💡'
    };
    return icons[categorie || 'default'] || icons.default;
  };

  // Badge niveau de risque
  const getRiskBadge = (niveau?: string) => {
    if (!niveau || niveau === 'faible') return null;
    
    const colors: Record<string, { bg: string; text: string }> = {
      'moyen': { bg: '#fef3c7', text: '#d97706' },
      'eleve': { bg: '#fee2e2', text: '#dc2626' },
      'élevé': { bg: '#fee2e2', text: '#dc2626' }
    };
    
    const style = colors[niveau] || colors.moyen;
    
    return (
      <span style={{
        fontSize: '0.7rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        background: style.bg,
        color: style.text,
        fontWeight: '600',
        marginLeft: '0.5rem'
      }}>
        ⚠️ Risque {niveau}
      </span>
    );
  };

  const isLoading = isTransitioning || isConfirming;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
        borderRadius: compact ? '12px' : '16px',
        padding: compact ? '1rem' : '1.25rem',
        margin: compact ? '0.5rem' : '1rem',
        boxShadow: `0 4px 20px ${themeColor}40`,
        color: 'white',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: compact ? '0.75rem' : '1rem'
      }}>
        {/* Icône */}
        <div style={{
          fontSize: compact ? '1.5rem' : '2rem',
          lineHeight: 1,
          flexShrink: 0
        }}>
          {getCategoryIcon(expertise.categorie)}
        </div>

        {/* Titre et description */}
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: compact ? '1rem' : '1.1rem',
              fontWeight: '700'
            }}>
              Expert {expertise.nom} détecté
            </h3>
            {getRiskBadge(expertise.niveau_risque)}
          </div>
          
          {/* Score de confiance */}
          <div style={{
            fontSize: '0.8rem',
            opacity: 0.9,
            marginTop: '0.25rem'
          }}>
            Confiance : {confidence}%
            {matchedKeywords.length > 0 && (
              <span style={{ opacity: 0.8 }}>
                {' '}• Mots-clés : {matchedKeywords.slice(0, 3).join(', ')}
                {matchedKeywords.length > 3 && '...'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      <p style={{
        margin: `0 0 ${compact ? '0.75rem' : '1rem'} 0`,
        fontSize: compact ? '0.85rem' : '0.95rem',
        lineHeight: 1.5,
        opacity: 0.95
      }}>
        {expertise.description || 
          `Je peux vous mettre en relation avec un expert ${expertise.nom.toLowerCase()} pour vous guider plus précisément.`
        }
      </p>

      {/* Boutons */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        {/* Bouton Confirmer */}
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          style={{
            flex: compact ? '1' : 'none',
            minWidth: compact ? 'auto' : '140px',
            padding: compact ? '0.6rem 1rem' : '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'white',
            color: themeColor,
            fontWeight: '700',
            fontSize: compact ? '0.85rem' : '0.95rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {isLoading ? (
            <>
              <span className="spinner-small" style={{
                width: '14px',
                height: '14px',
                border: `2px solid ${themeColor}30`,
                borderTopColor: themeColor,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Connexion...
            </>
          ) : (
            <>✓ Parler à l'expert</>
          )}
        </button>

        {/* Bouton Refuser */}
        <button
          onClick={onDismiss}
          disabled={isLoading}
          style={{
            flex: compact ? '1' : 'none',
            minWidth: compact ? 'auto' : '120px',
            padding: compact ? '0.6rem 1rem' : '0.75rem 1.5rem',
            borderRadius: '8px',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            background: 'transparent',
            color: 'white',
            fontWeight: '600',
            fontSize: compact ? '0.85rem' : '0.95rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          ✕ Continuer sans
        </button>
      </div>

      {/* Styles d'animation */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// ==================== VARIANTES ====================

/**
 * Version minimale pour afficher juste un badge
 */
export function ExpertiseBadge({
  expertise,
  onClick,
  themeColor = '#10b981'
}: {
  expertise: { code: string; nom: string };
  onClick?: () => void;
  themeColor?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '20px',
        background: `${themeColor}15`,
        color: themeColor,
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
    >
      🔧 Expert {expertise.nom}
    </div>
  );
}

/**
 * Message de transition lors du switch d'expertise
 */
export function ExpertiseTransitionMessage({
  expertiseNom,
  isNew = false,
  themeColor = '#10b981'
}: {
  expertiseNom: string;
  isNew?: boolean;
  themeColor?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '1rem',
      margin: '0.5rem 0'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        borderRadius: '20px',
        background: `${themeColor}10`,
        color: themeColor,
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>
        {isNew ? (
          <>✨ Expert {expertiseNom} créé et connecté</>
        ) : (
          <>🔧 Expert {expertiseNom} connecté</>
        )}
      </div>
    </div>
  );
}
