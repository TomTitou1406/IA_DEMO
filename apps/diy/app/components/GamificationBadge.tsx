/**
 * /app/components/GamificationBadge.tsx
 * Badge de gamification avec couronne de progression
 * 
 * @version 1.0 - Version démo (clic = +25%)
 */

'use client';

import { useState, useEffect } from 'react';

// Niveaux et outils associés
const LEVELS = [
  { level: 1, tool: '🪛', name: 'Tournevis', color: '#6b7280' },
  { level: 2, tool: '🔨', name: 'Marteau', color: '#3b82f6' },
  { level: 3, tool: '🪚', name: 'Scie', color: '#10b981' },
  { level: 4, tool: '🖌️', name: 'Pinceau', color: '#f59e0b' },
  { level: 5, tool: '🔧', name: 'Clé à molette', color: '#8b5cf6' },
  { level: 6, tool: '⚡', name: 'Pro', color: '#ef4444' },
];

interface GamificationBadgeProps {
  size?: number;
}

export default function GamificationBadge({ size = 44 }: GamificationBadgeProps) {
  // État persisté en localStorage pour la démo
  const [currentLevel, setCurrentLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gamification');
    if (saved) {
      const data = JSON.parse(saved);
      setCurrentLevel(data.level || 1);
      setProgress(data.progress || 0);
    }
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    localStorage.setItem('gamification', JSON.stringify({
      level: currentLevel,
      progress: progress
    }));
  }, [currentLevel, progress]);

  const levelData = LEVELS[Math.min(currentLevel - 1, LEVELS.length - 1)];
  const nextLevelData = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];

  // Calcul du cercle SVG
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleClick = () => {
    const newProgress = progress + 25;
    
    if (newProgress >= 100) {
      // Level up !
      if (currentLevel < LEVELS.length) {
        setCurrentLevel(prev => prev + 1);
        setProgress(0);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      } else {
        // Max level atteint
        setProgress(100);
      }
    } else {
      setProgress(newProgress);
    }
  };

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge principal */}
      <div
        onClick={handleClick}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = `0 0 20px ${levelData.color}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Cercle de progression SVG */}
        <svg
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'rotate(-90deg)',
          }}
        >
          {/* Cercle de fond */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Cercle de progression */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={levelData.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
            }}
          />
        </svg>

        {/* Outil au centre */}
        <span style={{ 
          fontSize: size * 0.45, 
          zIndex: 1,
          filter: showLevelUp ? 'drop-shadow(0 0 10px gold)' : 'none',
          transition: 'filter 0.3s'
        }}>
          {levelData.tool}
        </span>
      </div>

      {/* Animation Level Up */}
      {showLevelUp && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          animation: 'levelUpPulse 0.5s ease',
          boxShadow: '0 2px 10px rgba(245, 158, 11, 0.5)',
          zIndex: 100
        }}>
          🎉 LEVEL UP!
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && !showLevelUp && (
        <div style={{
          position: 'absolute',
          top: size + 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          border: `1px solid ${levelData.color}`,
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            fontWeight: '700', 
            color: levelData.color,
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            {levelData.tool} Niveau {currentLevel}: {levelData.name}
          </div>
          <div style={{ color: 'var(--gray)' }}>
            {progress}% → {currentLevel < LEVELS.length ? `Prochain: ${nextLevelData.tool} ${nextLevelData.name}` : '🏆 Max atteint!'}
          </div>
          <div style={{ 
            marginTop: '0.35rem',
            paddingTop: '0.35rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.65rem',
            color: 'var(--gray)',
            fontStyle: 'italic'
          }}>
            Clic pour simuler +25%
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes levelUpPulse {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          50% { transform: translateX(-50%) scale(1.2); }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
