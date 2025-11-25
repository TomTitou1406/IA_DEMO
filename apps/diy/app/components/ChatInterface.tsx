/**
 * ChatInterface.tsx
 * 
 * Interface de chat principale avec :
 * - Persistance des conversations (useConversation)
 * - Détection automatique d'expertise (useExpertiseDetection)
 * - Support mode vocal et texte
 * - Intégration complète du système d'expertise
 * 
 * @version 2.0
 * @date 25 novembre 2025
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sendChat, type ChatResponse, type PromptContext } from '../lib/services/openaiService';
import { transcribeAudio, textToSpeech, playAudio } from '../lib/services/audioService';
import { useConversation } from '../hooks/useConversation';
import { getUserId } from '../lib/services/conversationService';
import { useExpertiseDetection } from '../hooks/useExpertiseDetection';
import ExpertiseBanner, { ExpertiseTransitionMessage } from './ExpertiseBanner';
import type { Message, ConversationType } from '../lib/types/conversation';

// ==================== TYPES ====================

export interface ChatInterfaceProps {
  /** Contexte de la page (home, chantiers, travaux...) */
  pageContext: string;
  
  /** Couleur du thème */
  contextColor?: string;
  
  /** Placeholder du champ de saisie */
  placeholder?: string;
  
  /** Message de bienvenue */
  welcomeMessage?: string;
  
  /** Contexte additionnel (texte libre) */
  additionalContext?: string;
  
  /** Contexte structuré pour le prompt */
  promptContext?: PromptContext;
  
  /** Callback changement d'état (idle, thinking, speaking) */
  onStateChange?: (state: 'idle' | 'thinking' | 'speaking') => void;
  
  /** Mode compact (pour modal) */
  compact?: boolean;
  
  /** Désactiver la persistance */
  disablePersistence?: boolean;
  
  /** Désactiver la détection d'expertise */
  disableExpertiseDetection?: boolean;
  
  /** ID du chantier (pour contexte) */
  chantierId?: string;
  
  /** ID du travail (pour contexte) */
  travailId?: string;
}

// ==================== COMPOSANT ====================

export default function ChatInterface({
  pageContext,
  contextColor = '#2563eb',
  placeholder = 'Ta question...',
  welcomeMessage = 'Comment puis-je t\'aider ?',
  additionalContext,
  promptContext,
  onStateChange,
  compact = false,
  disablePersistence = false,
  disableExpertiseDetection = false,
  chantierId,
  travailId
}: ChatInterfaceProps) {
  
  // ==================== ÉTAT LOCAL ====================
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionExpertise, setTransitionExpertise] = useState<string | null>(null);
  
  // ==================== REFS ====================
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // ==================== HOOKS PERSONNALISÉS ====================
  
  // Déterminer le type de conversation
  const getConversationType = (): ConversationType => {
    if (chantierId) return 'chantier';
    if (travailId) return 'travail';
    if (pageContext === 'aide' || pageContext === 'home') return 'aide_ponctuelle';
    if (pageContext === 'profil') return 'profil';
    return 'general';
  };

  // Hook persistance (conditionnel)
  const {
    conversation,
    messages: persistedMessages,
    loading: conversationLoading,
    currentExpertise,
    addMessage: persistMessage,
    updateExpertise: updateConversationExpertise,
    addDecision
  } = disablePersistence 
    ? {
        conversation: null,
        messages: [],
        loading: false,
        currentExpertise: null,
        addMessage: async () => {},
        updateExpertise: async () => {},
        addDecision: async () => {}
      }
    : useConversation({
        userId: getUserId(),
        type: getConversationType(),
        contextId: chantierId || travailId,
        autoCreate: true,
        autoSave: true
      });

  // Messages locaux (si pas de persistance)
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Messages à afficher
  const displayMessages = disablePersistence ? localMessages : persistedMessages;

  // Hook détection expertise
  const {
    detectedExpertise,
    confidence,
    matchedKeywords,
    isDetecting,
    suggestionShown,
    confirmExpertise,
    dismissSuggestion
  } = disableExpertiseDetection
    ? {
        detectedExpertise: null,
        confidence: 0,
        matchedKeywords: [],
        isDetecting: false,
        suggestionShown: false,
        confirmExpertise: async () => null,
        dismissSuggestion: () => {}
      }
    : useExpertiseDetection(displayMessages, {
        minMessages: 3,
        autoDetect: true,
        currentExpertiseCode: currentExpertise?.code,
        displayThreshold: 65,
        debounceDelay: 1500
      });

  // Expertise active (conversation ou détectée confirmée)
  const [activeExpertise, setActiveExpertise] = useState<{
    id?: string;
    code?: string;
    nom?: string;
  } | null>(null);

  // Sync expertise depuis conversation
  useEffect(() => {
    if (currentExpertise?.code) {
      setActiveExpertise(currentExpertise);
    }
  }, [currentExpertise]);

  // ==================== EFFETS ====================

  // Notifier parent du changement d'état
  useEffect(() => {
    if (onStateChange) {
      if (isGeneratingAudio || loading) {
        onStateChange('thinking');
      } else if (isPlaying) {
        onStateChange('speaking');
      } else {
        onStateChange('idle');
      }
    }
  }, [isGeneratingAudio, isPlaying, loading, onStateChange]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, showTransition]);

  // Écouter événements audio
  useEffect(() => {
    const handleAudioStarted = () => {
      setIsGeneratingAudio(false);
      setIsPlaying(true);
    };
    
    const handleAudioEnded = () => {
      setIsPlaying(false);
    };
    
    window.addEventListener('audioStarted', handleAudioStarted);
    window.addEventListener('audioEnded', handleAudioEnded);
    
    return () => {
      window.removeEventListener('audioStarted', handleAudioStarted);
      window.removeEventListener('audioEnded', handleAudioEnded);
    };
  }, []);

  // ==================== HELPERS ====================

  // Stop audio
  const stopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    setIsPlaying(false);
    setIsGeneratingAudio(false);
  };

  // Format temps enregistrement
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== GESTION EXPERTISE ====================

  /**
   * Confirme l'expertise détectée et l'active
   */
  const handleConfirmExpertise = useCallback(async () => {
    if (!detectedExpertise) return;

    // Confirmer dans le hook
    const confirmed = await confirmExpertise();
    if (!confirmed) return;

    // Afficher la transition
    setTransitionExpertise(confirmed.nom);
    setShowTransition(true);

    // Mettre à jour l'expertise active
    setActiveExpertise({
      id: confirmed.id,
      code: confirmed.code,
      nom: confirmed.nom
    });

    // Sauvegarder dans la conversation
    if (!disablePersistence) {
      await updateConversationExpertise(
        confirmed.id,
        confirmed.code,
        confirmed.nom,
        'auto'
      );

      // Enregistrer la décision
      await addDecision({
        type: 'expertise_switched',
        description: `Passage à l'expert ${confirmed.nom}`,
        data: { expertise_code: confirmed.code },
        validated_by_user: true
      });
    }

    // Masquer la transition après 2s
    setTimeout(() => {
      setShowTransition(false);
    }, 2000);

  }, [detectedExpertise, confirmExpertise, disablePersistence, updateConversationExpertise, addDecision]);

  // ==================== ENVOI MESSAGE ====================

  /**
   * Envoie un message et récupère la réponse
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Message utilisateur
    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      expertise_code: activeExpertise?.code
    };

    // Ajouter à l'affichage
    if (disablePersistence) {
      setLocalMessages(prev => [...prev, userMessage]);
    } else {
      await persistMessage(userMessage);
    }

    setLoading(true);

    try {
      // Préparer les messages pour l'API
      const apiMessages = [...displayMessages, userMessage].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      // Appel API avec expertise si active
      const response: ChatResponse = await sendChat({
        messages: apiMessages,
        context: additionalContext,
        isVoiceMode: voiceMode,
        pageContext,
        expertiseCode: activeExpertise?.code,
        promptContext: {
          ...promptContext,
          chantierId,
          travailId
        }
      });

      // Message assistant
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        expertise_code: activeExpertise?.code,
        expertise_nom: response.expertiseNom || activeExpertise?.nom,
        metadata: {
          isVoiceMode: voiceMode,
          promptSource: response.promptSource
        }
      };

      // Ajouter à l'affichage
      if (disablePersistence) {
        setLocalMessages(prev => [...prev, assistantMessage]);
      } else {
        await persistMessage(assistantMessage);
      }

      // Lecture audio si mode vocal
      if (voiceMode && autoPlayAudio) {
        setIsGeneratingAudio(true);
        try {
          const audioBlob = await textToSpeech(response.message);
          await playAudio(audioBlob, audioElementRef);
        } catch (audioError) {
          console.error('Erreur audio:', audioError);
          setIsGeneratingAudio(false);
        }
      }

    } catch (error) {
      console.error('Erreur envoi message:', error);
      
      // Message d'erreur
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Peux-tu reformuler ta question ?',
        timestamp: new Date().toISOString()
      };

      if (disablePersistence) {
        setLocalMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
    }
  }, [
    displayMessages, 
    activeExpertise, 
    additionalContext, 
    voiceMode, 
    pageContext, 
    promptContext,
    chantierId,
    travailId,
    autoPlayAudio, 
    disablePersistence, 
    persistMessage
  ]);

  // ==================== HANDLERS ====================

  // Envoi texte
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input;
    setInput('');
    await sendMessage(content);
  };

  // Gestion vocal
  const handleVoiceAction = async () => {
    if (isPlaying) {
      stopAudio();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (loading) return;

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsRecording(false);

          if (audioBlob.size < 1000) {
            alert('Enregistrement trop court');
            setRecordingTime(0);
            return;
          }

          try {
            setLoading(true);
            const text = await transcribeAudio(audioBlob);
            
            if (!text.trim()) {
              alert('Aucun texte détecté');
              setLoading(false);
              setRecordingTime(0);
              return;
            }

            setRecordingTime(0);
            await sendMessage(text);

          } catch (error) {
            console.error('Erreur transcription:', error);
            setLoading(false);
            setRecordingTime(0);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);

      } catch (error) {
        console.error('Erreur micro:', error);
        alert('Impossible d\'accéder au microphone');
      }
    }
  };

  // ==================== RENDU ====================

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'white'
    }}>
      
      {/* Zone messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: compact ? '1rem' : '1.5rem',
        background: '#f8f9fa'
      }}>
        
        {/* Message de bienvenue */}
        {displayMessages.length === 0 && !conversationLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: compact ? '2rem 1rem' : '3rem 1rem',
            color: 'var(--gray)'
          }}>
            <div style={{ fontSize: compact ? '2rem' : '3rem', marginBottom: '1rem' }}>👋</div>
            <p style={{ fontSize: compact ? '0.9rem' : '1rem', fontWeight: '500' }}>
              {welcomeMessage}
            </p>
            {activeExpertise?.nom && (
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: contextColor }}>
                🔧 Expert {activeExpertise.nom} à votre service
              </p>
            )}
          </div>
        )}

        {/* Banner détection expertise */}
        {suggestionShown && detectedExpertise && !activeExpertise?.code && (
          <ExpertiseBanner
            expertise={detectedExpertise}
            confidence={confidence}
            matchedKeywords={matchedKeywords}
            onConfirm={handleConfirmExpertise}
            onDismiss={dismissSuggestion}
            themeColor={contextColor}
            compact={compact}
          />
        )}

        {/* Message transition expertise */}
        {showTransition && transitionExpertise && (
          <ExpertiseTransitionMessage
            expertiseNom={transitionExpertise}
            themeColor={contextColor}
          />
        )}

        {/* Messages */}
        {displayMessages.map((message, index) => (
          <div
            key={message.id || index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '0.75rem'
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                padding: compact ? '0.6rem 0.9rem' : '0.75rem 1rem',
                borderRadius: compact ? '12px' : '16px',
                background: message.role === 'user' ? contextColor : 'white',
                color: message.role === 'user' ? 'white' : 'var(--text)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: compact ? '0.85rem' : '0.95rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {/* Badge expertise si différente */}
              {message.role === 'assistant' && message.expertise_nom && (
                <div style={{
                  fontSize: '0.7rem',
                  color: contextColor,
                  marginBottom: '0.3rem',
                  fontWeight: '600'
                }}>
                  🔧 {message.expertise_nom}
                </div>
              )}
              {message.content}
            </div>
          </div>
        ))}

        {/* Loader */}
        {loading && !isGeneratingAudio && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{
              padding: '0.75rem',
              borderRadius: '16px',
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            </div>
          </div>
        )}

        {/* Génération audio */}
        {isGeneratingAudio && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              background: `${contextColor}15`,
              color: contextColor,
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: contextColor }}></div>
              Génération audio...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Zone input */}
      <div style={{
        padding: compact ? '0.75rem' : '1rem',
        borderTop: '1px solid var(--gray-light)',
        background: 'white'
      }}>
        
        {/* Toggles mode */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <button
              onClick={() => setVoiceMode(false)}
              style={{
                flex: 1,
                padding: compact ? '0.4rem' : '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: !voiceMode ? contextColor : 'var(--gray-light)',
                color: !voiceMode ? 'white' : 'var(--gray)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✍️ Texte
            </button>
            <button
              onClick={() => setVoiceMode(true)}
              style={{
                flex: 1,
                padding: compact ? '0.4rem' : '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: voiceMode ? contextColor : 'var(--gray-light)',
                color: voiceMode ? 'white' : 'var(--gray)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🎤 Vocal
            </button>
          </div>

          {voiceMode && (
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              style={{
                padding: compact ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: autoPlayAudio ? '#10b981' : 'var(--gray-light)',
                color: autoPlayAudio ? 'white' : 'var(--gray)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {autoPlayAudio ? '🔊' : '🔇'}
            </button>
          )}
        </div>

        {/* Input zone */}
        {voiceMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            {isRecording && (
              <div style={{
                fontSize: compact ? '0.85rem' : '0.9rem',
                color: '#ef4444',
                fontWeight: '700'
              }}>
                🔴 {formatTime(recordingTime)}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleVoiceAction}
                disabled={loading}
                style={{
                  padding: compact ? '0.75rem 1.5rem' : '0.875rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isRecording ? '#3b82f6' : '#10b981',
                  color: 'white',
                  fontSize: compact ? '0.9rem' : '1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isRecording ? '📤 Envoyer' : '🎤 Parler'}
              </button>

              {(isGeneratingAudio || isPlaying) && (
                <button
                  onClick={stopAudio}
                  style={{
                    padding: compact ? '0.75rem 1.25rem' : '0.875rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: compact ? '0.9rem' : '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⏹️ Interrompre
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeExpertise?.nom 
                ? `Question pour l'expert ${activeExpertise.nom}...`
                : placeholder
              }
              disabled={loading}
              style={{
                flex: 1,
                padding: compact ? '0.6rem' : '0.75rem',
                borderRadius: '12px',
                border: `2px solid ${contextColor}30`,
                fontSize: compact ? '0.85rem' : '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = contextColor}
              onBlur={(e) => e.target.style.borderColor = `${contextColor}30`}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                padding: compact ? '0.6rem 1.25rem' : '0.75rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                background: contextColor,
                color: 'white',
                fontSize: compact ? '1.1rem' : '1.25rem',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || loading ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
