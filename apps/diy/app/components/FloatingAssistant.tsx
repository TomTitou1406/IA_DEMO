/**
 * FloatingAssistant.tsx
 * 
 * Assistant flottant avec :
 * - Header 3 lignes : Titre / Arborescence / Expertise
 * - Bouton "Nouvelle discussion"
 * - Couleur selon le contexte fonctionnel
 * - Persistence de l'état ouvert/fermé (sessionStorage)
 * 
 * @version 5.0
 * @date 26 novembre 2025
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAssistantContext } from '../hooks/useAssistantContext';
import ChatInterface from './ChatInterface';
import { type NoteLevel } from '../lib/services/notesService';

type AssistantState = 'idle' | 'pulse' | 'thinking' | 'speaking';

const STORAGE_KEY = 'papibricole_assistant_open';

export default function FloatingAssistant() {
  // Initialiser depuis sessionStorage
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });
  
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatKey, setChatKey] = useState(0); // Pour forcer le reset du chat
  
  const { 
    pageContext, 
    contextColor, 
    welcomeMessage, 
    placeholder, 
    additionalContext,
    header,
    expertise,
    isLoading,
    // IDs pour les notes
    chantierId,
    travailId,
    etapeId
  } = useAssistantContext();
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persister l'état isOpen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, isOpen.toString());
    }
  }, [isOpen]);

  // Détection inactivité pour pulse
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      if (!isOpen) {
        inactivityTimerRef.current = setTimeout(() => {
          setAssistantState('pulse');
          setTimeout(() => setAssistantState('idle'), 5000);
        }, 30000);
      }
    };

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

  // Écouter l'événement custom pour ouvrir l'assistant
   useEffect(() => {
    const handleOpenAssistant = () => {
      setIsOpen(true);
      setAssistantState('idle');
    };
    
    const handleCloseAssistant = () => {
      setIsOpen(false);
    };
    
    window.addEventListener('openAssistant', handleOpenAssistant);
    window.addEventListener('closeAssistant', handleCloseAssistant);
    
    return () => {
      window.removeEventListener('openAssistant', handleOpenAssistant);
      window.removeEventListener('closeAssistant', handleCloseAssistant);
    };
  }, []);

  // GIF selon état
  const getAssistantGif = () => {
    switch (assistantState) {
      case 'thinking':
        return '/gif/papibricole_loop_attente_1.gif';
      case 'speaking':
        return '/gif/papibricole_loop_attente_1.gif';
      case 'pulse':
        return '/gif/papibricole_loop_attente_1.gif';
      case 'idle':
      default:
        return '/gif/papibricole_loop_attente_1.gif';
    }
  };

  // Gérer les changements d'état du chat
  const handleStateChange = (state: 'idle' | 'thinking' | 'speaking') => {
    setAssistantState(state);
  };

  // Nouvelle discussion
  const handleNewChat = () => {
    if (confirm('Démarrer une nouvelle discussion ? L\'historique actuel sera effacé.')) {
      setChatKey(prev => prev + 1);
    }
  };

  // Contexte pour les notes (niveau et ID où attacher)
  const getNoteContext = (): { level: NoteLevel; id: string } | undefined => {
    if (etapeId) return { level: 'etape', id: etapeId };
    if (travailId) return { level: 'travail', id: travailId };
    if (chantierId) return { level: 'chantier', id: chantierId };
    return undefined;
  };

  // Indicateur d'état
  const getStatusIndicator = () => {
    if (isLoading) return '⏳';
    switch (assistantState) {
      case 'thinking':
        return '🤔';
      case 'speaking':
        return '🗣️';
      default:
        return '✅';
    }
  };

  return (
    <>
      {/* Floating Button */}
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
            background: 'var(--white)',
            border: `3px solid ${contextColor}`,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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

      {/* Modal Chat */}
      {isOpen && (
        <div style={{
          ...(isFullscreen ? {
            position: 'fixed',
            top: typeof window !== 'undefined' && window.innerWidth < 768 ? '100px' : '2rem',
            left: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : '50%',
            right: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 'auto',
            bottom: 0,
            transform: typeof window !== 'undefined' && window.innerWidth < 768 ? 'none' : 'translateX(-50%)',
            width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100vw' : 'min(95vw, 1200px)',
            height: typeof window !== 'undefined' && window.innerWidth < 768 ? 'auto' : 'calc(100vh - 4rem)',
            maxHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(100vh - 100px)' : '900px',
            borderRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : '16px',
            boxShadow: typeof window !== 'undefined' && window.innerWidth < 768 ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
         } : {
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            width: 'min(400px, calc(100vw - 2rem))',
            height: 'min(600px, calc(100vh - 120px))',
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }),
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `2px solid ${contextColor}`,
          boxShadow: `0 0 30px ${contextColor}40, 0 8px 32px rgba(0,0,0,0.4)`,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          
          {/* ==================== HEADER 3 LIGNES ==================== */}
          <div style={{
            background: contextColor,
            color: 'var(--white)',
            padding: '0.6rem 0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            
            {/* Partie gauche : Avatar + Textes */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.6rem',
              flex: 1,
              minWidth: 0
            }}>
              
              {/* Avatar */}
              <div style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                marginTop: '0.1rem'
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
                {/* Badge état */}
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  fontSize: '0.7rem',
                  background: 'var(--white)',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getStatusIndicator()}
                </div>
              </div>
              
              {/* Textes 3 lignes */}
              <div style={{ 
                flex: 1, 
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.1rem'
              }}>
                {/* Ligne 1 : Titre (gras) */}
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.2'
                }}>
                  {header.title}
                </div>
                
                {/* Ligne 2 : Arborescence */}
                {header.breadcrumb && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: '600',
                    opacity: 0.9,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                  }}>
                    {header.breadcrumb}
                  </div>
                )}
                
                {/* Ligne 3 : Expertise */}
                <div style={{ 
                  fontSize: '0.75rem', 
                  opacity: 0.9,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.2'
                }}>
                  ✨ Assistant IA : {expertise.nom}
                </div>
              </div>
            </div>

            {/* Partie droite : Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '0.3rem', 
              alignItems: 'center',
              marginTop: '0.1rem'
            }}>
              {/* Bouton Nouvelle discussion */}
              <button
                onClick={handleNewChat}
                title="Nouvelle discussion"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'var(--white)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ➕
              </button>

              {/* Bouton Fullscreen */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Réduire' : 'Agrandir'}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'var(--white)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '0.85rem',
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
                    setIsFullscreen(false);
                  } else {
                    setIsOpen(false);
                  }
                }}
                title={isFullscreen ? 'Réduire' : 'Fermer'}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'var(--white)',
                  width: '28px',
                  height: '28px',
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
                ✕
              </button>
            </div>
          </div>

          {/* Chat Interface - key force le remount */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatInterface
              key={chatKey}
              pageContext={pageContext}
              contextColor={contextColor}
              placeholder={placeholder}
              welcomeMessage={welcomeMessage}
              additionalContext={additionalContext}
              promptContext={{
                chantierId,
                travailId,
                etapeId
              }}
              onStateChange={handleStateChange}
              compact={true}
              chantierId={chantierId}
              travailId={travailId}
              noteContext={getNoteContext()}
            />
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes fabPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(0,0,0,0.25);
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
