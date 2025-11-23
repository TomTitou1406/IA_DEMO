// apps/diy/app/components/CardButton.tsx
'use client';

import Link from 'next/link';

interface CardButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  color?: string;  // var(--blue), var(--orange), etc. (optionnel, déduit du variant si absent)
  icon?: string;
  label: string;
  onClick?: () => void;  // Optionnel si href est fourni
  href?: string;         // Si présent, utilise Link au lieu de button
  count?: number;        // Affiche un count (ex: "5 étapes" ou "Voir lots (20)")
  disabled?: boolean;
}

export default function CardButton({ 
  variant, 
  color, 
  icon, 
  label, 
  onClick,
  href,
  count,
  disabled = false
}: CardButtonProps) {
  
  // Déterminer le style selon le variant
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        // Bouton plein avec couleur de la carte
        return {
          background: color || 'var(--blue)',
          color: 'white',
          border: 'none',
          fontWeight: '700' as const
        };
      
      case 'secondary': {
        const bgColor = color || 'var(--blue)';
        return {
          background: `${bgColor}40`,
          // color: color || 'var(--blue)',
          color: 'white',
          border: `1.5px solid ${bgColor}`,
          fontWeight: '700' as const
        };
      }
      
      case 'danger': {
        const bgColor = color || 'var(--red)';
        return {
          background: `${bgColor}30`,
          color: 'var(--red)',
          border: `1.5px solid ${bgColor}`,
          fontWeight: '700' as const
        };
      }
    }
  };

  const buttonStyle = getButtonStyle();

  const commonStyle = {
    fontSize: '0.75rem',
    padding: '0.45rem 0.75rem',
    minHeight: 'auto',
    whiteSpace: 'nowrap' as const,
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    textDecoration: 'none',
    ...buttonStyle
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
  if (!disabled && variant === 'primary') {
    // Primary se VIDE au hover (inverse de secondary)
    const hoverColor = color || 'var(--blue)';
    e.currentTarget.style.background = `${hoverColor}40`;  // Devient transparent
    e.currentTarget.style.color = 'white';  // Texte reste blanc
    e.currentTarget.style.border = `1.5px solid ${hoverColor}`;  // Ajoute bordure
    e.currentTarget.style.transform = 'translateY(-2px)';
    
    // Glow adapté
    const glowColor = color === 'var(--blue)' ? 'rgba(37, 99, 235, 0.4)' :
                      color === 'var(--orange)' ? 'rgba(255, 107, 53, 0.4)' :
                      color === 'var(--green)' ? 'rgba(16, 185, 129, 0.4)' :
                      color === 'var(--gray)' ? 'rgba(107, 114, 128, 0.4)' :
                      color === 'var(--purple)' ? 'rgba(168, 85, 247, 0.4)' :
                      color === 'var(--red)' ? 'rgba(239, 68, 68, 0.4)' :
                      'rgba(37, 99, 235, 0.4)';
    e.currentTarget.style.boxShadow = `0 6px 20px ${glowColor}`;
    
  } else if (!disabled && variant === 'secondary') {
    // Secondary se REMPLIT au hover (déjà fait)
    e.currentTarget.style.background = color || 'var(--blue)';
    e.currentTarget.style.color = 'white';
    e.currentTarget.style.borderColor = color || 'var(--blue)';
    e.currentTarget.style.transform = 'translateY(-1px)';
    
  } else if (!disabled && variant === 'danger') {
    e.currentTarget.style.background = 'var(--red)';
    e.currentTarget.style.color = 'white';
    e.currentTarget.style.transform = 'translateY(-1px)';
  }
};

const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
  if (!disabled && variant === 'primary') {
    // Primary retourne à plein
    e.currentTarget.style.background = color || 'var(--blue)';
    e.currentTarget.style.color = 'white';
    e.currentTarget.style.border = 'none';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
    
  } else if (!disabled && variant === 'secondary') {
    // Secondary retourne à transparent
    const bgColor = color || 'var(--blue)';
    e.currentTarget.style.background = `${bgColor}40`;
    e.currentTarget.style.color = 'white';
    e.currentTarget.style.borderColor = bgColor;
    e.currentTarget.style.transform = 'translateY(0)';
    
  } else if (!disabled && variant === 'danger') {
    const bgColor = color || 'var(--red)';
    e.currentTarget.style.background = `${bgColor}30`;
    e.currentTarget.style.color = 'var(--red)';
    e.currentTarget.style.transform = 'translateY(0)';
  }
};

  // Contenu du bouton/link
  const content = (
    <>
      {icon && <span>{icon}</span>}
      <span>
        {label}
        {count !== undefined && ` (${count})`}
      </span>
    </>
  );

  // Si href fourni, utiliser Link
  if (href) {
    return (
      <Link
        href={disabled ? '#' : href}
        style={commonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
          }
        }}
      >
        {content}
      </Link>
    );
  }

  // Sinon, bouton classique
  return (
    <button
      className="card-btn"
      disabled={disabled}
      onClick={onClick}
      style={commonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
    </button>
  );
}
