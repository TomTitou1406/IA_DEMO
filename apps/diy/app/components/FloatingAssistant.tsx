/**
 * FloatingAssistant.tsx
 * 
 * Assistant flottant avec :
 * - Header 3 lignes : Titre / Arborescence / Expertise
 * - Bouton "Nouvelle discussion"
 * - Support contexte "aide_decouverte" pour aide ponctuelle
 * - Support MODE EXPERT dynamique (transition Phase 2)
 * - Conservation du contexte et messages à la fermeture (fix v5.6)
 * 
 * @version 5.6
 * @date 05 décembre 2025
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAssistantContext } from '../hooks/useAssistantContext';
import ChatInterface from './ChatInterface';
import { type NoteLevel } from '../lib/services/notesService';
import { useToast } from '@/app/components/Toast';

type AssistantState = 'idle' | 'pulse' | 'thinking' | 'speaking';

const STORAGE_KEY = 'papibricole_assistant_open';

export default function FloatingAssistant() {
  const { showError, showSuccess, showWarning, showConfirm } = useToast();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });
  
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  
 // Override contexte pour aide ponctuelle
  const [overrideContext, setOverrideContext] = useState<{
    pageContext?: string;
    welcomeMessage?: string;
    contextColor?: string;
    additionalContext?: string;
  } | null>(null);
  
  // Mode Expert (transition Phase 2)
  const [expertMode, setExpertMode] = useState<{
    header: {
      title: string;
      breadcrumb: string;
      expertiseLine: string;
      contextColor: string;
      expertiseNom: string;
    };
  } | null>(null);
  
  const { 
    pageContext: defaultPageContext, 
    contextColor: defaultContextColor, 
    welcomeMessage: defaultWelcomeMessage, 
    placeholder, 
    additionalContext,
    header: defaultHeader,
    expertise: defaultExpertise,
    isLoading,
    chantierId,
    travailId,
    etapeId
  } = useAssistantContext();
  
  // Priorité : expertMode > overrideContext > default
  const pageContext = overrideContext?.pageContext || defaultPageContext;
  const welcomeMessage = overrideContext?.welcomeMessage || defaultWelcomeMessage;
  const finalAdditionalContext = overrideContext?.additionalContext || additionalContext;
  
  // Couleur : priorité au contextColor explicite, sinon logique par défaut
  const contextColor = overrideContext?.contextColor
    ? overrideContext.contextColor
    : (overrideContext?.pageContext === 'aide_decouverte' || expertMode) 
      ? 'var(--blue)' 
      : overrideContext?.pageContext === 'video_decouverte'
        ? 'var(--green)'
        : overrideContext?.pageContext === 'travaux_simple_decouverte'
          ? 'var(--blue)'  // Travaux simples = BLEU
          : defaultContextColor;
  
  const header = expertMode 
  ? { title: "Assistance Expert", breadcrumb: "", expertiseLine: `🎯 ${expertMode.header.expertiseNom}` }
  : overrideContext?.pageContext === 'aide_decouverte' 
    ? { title: "Demande d'assistance", breadcrumb: "", expertiseLine: "🔍 Diagnostic en cours..." }
    : overrideContext?.pageContext === 'video_decouverte'
      ? { title: "Trouver un tuto", breadcrumb: "", expertiseLine: "🎬 Recherche vidéo" }
      : overrideContext?.pageContext === 'travaux_simple_decouverte'
        ? { title: "Nouveaux travaux simples", breadcrumb: "", expertiseLine: "🔧 Création guidée" }
        : defaultHeader;
  
  const expertise = expertMode 
    ? { code: 'expert', nom: expertMode.header.expertiseNom, icon: '🎯' }
    : (overrideContext?.pageContext === 'aide_decouverte'
        ? { code: 'diagnosticien', nom: 'Diagnostic', icon: '🔍' }
        : defaultExpertise);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathnameRef = useRef<string>(pathname);
  const isManualResetRef = useRef<boolean>(false);
  
  // Reset auto basé sur pathname UNIQUEMENT
  useEffect(() => {
    if (isManualResetRef.current) {
      isManualResetRef.current = false;
      return;
    }
    
    if (prevPathnameRef.current !== pathname) {
      console.log('🔄 Navigation détectée, reset conversation');
      setChatKey(prev => prev + 1);
      setOverrideContext(null);
      setExpertMode(null);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

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

  // Écouter les événements custom
  useEffect(() => {
    const handleOpenAssistant = () => {
      setIsOpen(true);
      setAssistantState('idle');
    };
    
    const handleCloseAssistant = () => {
      setIsOpen(false);
    };
    
    const handleOpenAssistantWithContext = (event: CustomEvent) => {
      const { pageContext, welcomeMessage, contextColor, additionalContext } = event.detail || {};
      console.log('🎯 Ouverture assistant avec contexte:', pageContext, 'couleur:', contextColor);
      
      setOverrideContext({ pageContext, welcomeMessage, contextColor, additionalContext });
      setExpertMode(null);
      setChatKey(prev => prev + 1);
      setIsOpen(true);
      setAssistantState('idle');
    };
    
    const handleExpertModeActivated = (event: CustomEvent) => {
      const { header } = event.detail || {};
      console.log('🎓 Mode expert activé:', header?.title);
      
      if (header) {
        setExpertMode({ header });
      }
    };
    
    window.addEventListener('openAssistant', handleOpenAssistant);
    window.addEventListener('closeAssistant', handleCloseAssistant);
    window.addEventListener('openAssistantWithContext', handleOpenAssistantWithContext as EventListener);
    window.addEventListener('expertModeActivated', handleExpertModeActivated as EventListener);
    
    return () => {
      window.removeEventListener('openAssistant', handleOpenAssistant);
      window.removeEventListener('closeAssistant', handleCloseAssistant);
      window.removeEventListener('openAssistantWithContext', handleOpenAssistantWithContext as EventListener);
      window.removeEventListener('expertModeActivated', handleExpertModeActivated as EventListener);
    };
  }, []);

  const getAssistantGif = () => '/gif/papibricole_loop_attente_1.gif';

  const handleStateChange = (state: 'idle' | 'thinking' | 'speaking') => {
    setAssistantState(state);
  };

  const handleNewChat = async () => {
    const confirmed = await showConfirm({
      title: 'Nouvelle discussion',
      message: 'Démarrer une nouvelle discussion ? L\'historique actuel sera effacé.',
      confirmText: 'Nouvelle discussion',
      cancelText: 'Annuler',
      type: 'info'
    });
    
    if (confirmed) {
      isManualResetRef.current = true;
      setExpertMode(null);
      setChatKey(prev => prev + 1);
    }
  };

  const getNoteContext = (): { level: NoteLevel; id: string } | undefined => {
    if (etapeId) return { level: 'etape', id: etapeId };
    if (travailId) return { level: 'travail', id: travailId };
    if (chantierId) return { level: 'chantier', id: chantierId };
    return undefined;
  };

  const getStatusIndicator = () => {
    if (isLoading) return '⏳';
    switch (assistantState) {
      case 'thinking': return '🤔';
      case 'speaking': return '🗣️';
      default: return '✅';
    }
  };

  return (
    <>
      {/* Floating Button - visible uniquement si fermé et pas sur Home/Chantiers/Travaux */}
      {!isOpen && pathname !== '/' && pathname !== '/chantiers' && pathname !== '/travaux' && pathname !== '/chantiers/liste' && (
        <button
          onClick={() => {
            setIsOpen(true);
            setAssistantState('idle');
          }}
          className="floating-assistant-btn"
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '2rem',
            left: 'auto',
            transform: 'none',
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
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </button>
      )}

      {/* Modal Chat - TOUJOURS MONTÉ, juste caché quand fermé */}
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
        } : {
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(400px, calc(100vw - 2rem))',
          height: 'min(600px, calc(100vh - 120px))',
          maxHeight: 'calc(100vh - 120px)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }),
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `2px solid ${contextColor}`,
        boxShadow: `0 0 30px ${contextColor}40, 0 8px 32px rgba(0,0,0,0.4)`,
        zIndex: 1000,
        display: isOpen ? 'flex' : 'none',  // ← CACHÉ au lieu de démonté
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        
        {/* Header */}
        <div style={{
          background: contextColor,
          color: 'var(--white)',
          padding: '0.6rem 0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '0.6rem',
            flex: 1,
            minWidth: 0
          }}>
            
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
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
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
            
            <div style={{ 
              flex: 1, 
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.1rem'
            }}>
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
              
              <div style={{ 
                fontSize: '0.75rem', 
                opacity: 0.9,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2'
              }}>
                ✨ Expert : {expertise.nom}
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '0.3rem', 
            alignItems: 'center',
            marginTop: '0.1rem'
          }}>
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

        {/* Chat Interface - TOUJOURS MONTÉ */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface
            key={chatKey}
            pageContext={pageContext}
            contextColor={contextColor}
            placeholder={expertMode 
              ? `Question pour ${expertMode.header.title}...`
              : (overrideContext?.pageContext === 'aide_decouverte' 
                  ? "Décris ton problème ou ta question..." 
                  : overrideContext?.pageContext === 'video_decouverte'
                    ? "Quel tutoriel cherches-tu ?"
                    : placeholder)}
            welcomeMessage={welcomeMessage}
            additionalContext={finalAdditionalContext}
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
            disablePersistence={true}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes fabPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
          50% { transform: scale(1.1); box-shadow: 0 6px 30px rgba(0,0,0,0.25); }
        }
       @media (max-width: 768px) {
          .floating-assistant-btn {
            bottom: auto !important;
            top: 14px !important;
            right: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 44px !important;
            height: 44px !important;
          }
        }
      `}</style>
    </>
  );
}
