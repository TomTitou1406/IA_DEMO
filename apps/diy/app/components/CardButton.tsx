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
      
      case 'secondary':
        // Bouton transparent avec bordure
        const bgColor = color || 'var(--blue)';
        return {
          background: `${bgColor}15`,  // 15% opacity
          color: color || 'var(--blue)',
          border: `1px solid ${bgColor}30`,
          fontWeight: '600' as const
        };
      
      case 'danger':
        // Bouton danger (rouge)
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontWeight: '600' as const
        };
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
      e.currentTarget.style.filter = 'brightness(1.15)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    } else if (!disabled && variant === 'secondary') {
      e.currentTarget.style.background = color ? `${color}25` : 'rgba(37, 99, 235, 0.25)';
    } else if (!disabled && variant === 'danger') {
      e.currentTarget.style.background = '#ef4444';
      e.currentTarget.style.color = 'white';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled && variant === 'primary') {
      e.currentTarget.style.filter = 'brightness(1)';
      e.currentTarget.style.transform = 'translateY(0)';
    } else if (!disabled && variant === 'secondary') {
      const bgColor = color || 'var(--blue)';
      e.currentTarget.style.background = `${bgColor}15`;
    } else if (!disabled && variant === 'danger') {
      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
      e.currentTarget.style.color = '#ef4444';
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
