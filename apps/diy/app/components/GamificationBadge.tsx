/**
 * /app/components/GamificationBadge.tsx
 * Badge de gamification avec couronne de progression
 * 
 * @version 1.1 - Tooltip amélioré + reset
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
  const isMaxLevel = currentLevel >= LEVELS.length;

  // Calcul du cercle SVG
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleClick = () => {
    const newProgress = progress + 25;
    
    if (newProgress >= 100) {
      if (currentLevel < LEVELS.length) {
        setCurrentLevel(prev => prev + 1);
        setProgress(0);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      } else {
        setProgress(100);
      }
    } else {
      setProgress(newProgress);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentLevel(1);
    setProgress(0);
    setShowTooltip(false);
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
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
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

      {/* Tooltip amélioré */}
      {showTooltip && !showLevelUp && (
        <div style={{
          position: 'absolute',
          top: size + 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `linear-gradient(135deg, rgba(20, 20, 20, 0.98), rgba(30, 30, 30, 0.98))`,
          border: `2px solid ${levelData.color}`,
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          minWidth: '220px',
          zIndex: 100,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${levelData.color}40`,
        }}>
          {/* Flèche */}
          <div style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `8px solid ${levelData.color}`,
          }} />

          {/* Header avec niveau */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            paddingBottom: '0.5rem',
            borderBottom: `1px solid ${levelData.color}40`
          }}>
            <span style={{ fontSize: '1.5rem' }}>{levelData.tool}</span>
            <div>
              <div style={{ 
                fontWeight: '700', 
                color: levelData.color,
                fontSize: '0.95rem'
              }}>
                Niveau {currentLevel}: {levelData.name}
              </div>
              <div style={{ 
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.5)'
              }}>
                {isMaxLevel ? '🏆 Niveau maximum !' : `${6 - currentLevel} niveau${6 - currentLevel > 1 ? 'x' : ''} restant${6 - currentLevel > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '0.25rem'
            }}>
              <span>Progression</span>
              <span style={{ color: levelData.color, fontWeight: '600' }}>{progress}%</span>
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${levelData.color}, ${levelData.color}cc)`,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
                boxShadow: `0 0 10px ${levelData.color}80`
              }} />
            </div>
          </div>

          {/* Prochain niveau */}
          {!isMaxLevel && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.6)'
            }}>
              <span>Prochain:</span>
              <span style={{ fontSize: '1rem' }}>{nextLevelData.tool}</span>
              <span style={{ color: nextLevelData.color }}>{nextLevelData.name}</span>
            </div>
          )}

          {/* Footer avec actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ 
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.4)',
              fontStyle: 'italic'
            }}>
              Clic = +25% (démo)
            </span>
            <button
              onClick={handleReset}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem',
                cursor: 'pointer',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
              }}
            >
              🔄 Reset
            </button>
          </div>
        </div>
      )}

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
