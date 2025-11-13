'use client';

import { useState, useEffect, useRef } from 'react';
import { useAssistantContext } from '../hooks/useAssistantContext';
import ChatInterface from './ChatInterface';

type AssistantState = 'idle' | 'pulse' | 'thinking' | 'speaking';

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { pageContext, contextColor, welcomeMessage, placeholder } = useAssistantContext();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Détection inactivité pour pulse
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      // Pulse après 30s d'inactivité (si pas ouvert)
      if (!isOpen) {
        inactivityTimerRef.current = setTimeout(() => {
          setAssistantState('pulse');
          // Retour idle après 5s
          setTimeout(() => setAssistantState('idle'), 5000);
        }, 30000);
      }
    };

    // Reset sur interaction
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
    };
  }, [isOpen]);

  // GIF selon état
  const getAssistantGif = () => {
    switch (assistantState) {
      case 'thinking':
        return '/gif/papibricole_loop_attente_1.gif';
      case 'speaking':
        return '/gif/papibricole_loop_attente_1.gif'; // À remplacer
      case 'pulse':
        return '/gif/papibricole_loop_attente_1.gif'; // À remplacer
      case 'idle':
      default:
        return '/gif/papibricole_loop_attente_1.gif'; // À remplacer
    }
  };

  // Gérer les changements d'état du chat
  const handleStateChange = (state: 'idle' | 'thinking' | 'speaking') => {
    setAssistantState(state);
  };

  return (
    <>
      {/* Floating Button - Caché si ouvert */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setAssistantState('idle');
          }}
          className="floating-assistant-btn"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'white',
            border: `3px solid ${contextColor}`,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${contextColor}40`,
            zIndex: 1000,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            overflow: 'hidden',
            animation: assistantState === 'pulse' ? 'fabPulse 2s infinite' : 'none'
          }}
        >
          <img 
            src={getAssistantGif()}
            alt="Assistant"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </button>
      )}

      {/* Modal Chat - Responsive modal/fullscreen */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: isFullscreen ? 0 : 'auto',
          bottom: isFullscreen ? 0 : '2rem',
          left: isFullscreen ? 0 : 'auto',
          right: isFullscreen ? 0 : '2rem',
          width: isFullscreen ? '100vw' : 'min(420px, calc(100vw - 2rem))',
          height: isFullscreen ? '100vh' : 'min(650px, calc(100vh - 4rem))',
          borderRadius: isFullscreen ? 0 : '20px',
          background: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--gray-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: contextColor,
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={getAssistantGif()}
                  alt="Assistant"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>PapiBricole</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {assistantState === 'thinking' && '🤔 Réflexion...'}
                  {assistantState === 'speaking' && '🗣️ En train de parler...'}
                  {assistantState === 'idle' && '✅ En ligne'}
                </div>
              </div>
            </div>

            {/* Actions header */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Bouton Toggle Fullscreen */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Réduire' : 'Passer en plein écran'}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                {isFullscreen ? '◱' : '⛶'}
              </button>

              {/* Bouton Fermer */}
              <button
                onClick={() => {
                  if (isFullscreen) {
                    setIsFullscreen(false); // Retour modal
                  } else {
                    setIsOpen(false); // Fermer complètement
                  }
                }}
                title={isFullscreen ? 'Réduire en fenêtre' : 'Fermer'}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Interface */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatInterface
              pageContext={pageContext}
              contextColor={contextColor}
              placeholder={placeholder}
              welcomeMessage={welcomeMessage}
              onStateChange={handleStateChange}
              compact={!isFullscreen}
            />
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes fabPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 20px ${contextColor}40;
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 6px 30px ${contextColor}60;
          }
        }

        @media (max-width: 768px) {
          .floating-assistant-btn {
            bottom: 1rem !important;
            right: 1rem !important;
            width: 64px !important;
            height: 64px !important;
          }
        }
      `}</style>
    </>
  );
}
