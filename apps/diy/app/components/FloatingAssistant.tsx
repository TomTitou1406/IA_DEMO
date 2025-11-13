'use client';

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../lib/services/openaiService';
import { transcribeAudio, textToSpeech, playAudio } from '../lib/services/audioService';
import { useAssistantContext } from '../hooks/useAssistantContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type AssistantState = 'idle' | 'pulse' | 'thinking' | 'speaking';

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true); // Activé par défaut
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  
  const { pageContext, contextColor, welcomeMessage, placeholder } = useAssistantContext();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Gérer les états de l'assistant
  useEffect(() => {
    if (isGeneratingAudio) {
      setAssistantState('thinking');
    } else if (isPlaying) {
      setAssistantState('speaking');
    } else if (loading) {
      setAssistantState('thinking');
    } else {
      setAssistantState('idle');
    }
  }, [isGeneratingAudio, isPlaying, loading]);

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

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Envoyer message texte
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await sendChatMessage(
        [...apiMessages, { role: 'user', content: input }],
        undefined,
        voiceMode,
        pageContext
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (voiceMode && autoPlayAudio) {
        setIsGeneratingAudio(true);
        const audioBlob = await textToSpeech(response);
        await playAudio(audioBlob, audioElementRef);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gestion vocal (identique à chat/page.tsx)
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

            const userMessage: Message = {
              role: 'user',
              content: text,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, userMessage]);
            setRecordingTime(0);

            const apiMessages = [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }));

            const response = await sendChatMessage(
              apiMessages,
              undefined,
              voiceMode,
              pageContext
            );

            const assistantMessage: Message = {
              role: 'assistant',
              content: response,
              timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (autoPlayAudio) {
              setIsGeneratingAudio(true);
              textToSpeech(response)
                .then(audioBlob => playAudio(audioBlob, audioElementRef))
                .catch(err => {
                  console.error('Audio error:', err);
                  setIsPlaying(false);
                  setIsGeneratingAudio(false);
                  stopAudio();
                });
            }

          } catch (error) {
            console.error('Error:', error);
            alert('Erreur lors du traitement');
            setRecordingTime(0);
          } finally {
            setLoading(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error:', error);
        alert('Impossible d\'accéder au microphone');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // GIF selon état
  const getAssistantGif = () => {
    switch (assistantState) {
      case 'thinking':
        return '/gif/papibricole_loop_attente_1.gif'; // Ton GIF actuel
      case 'speaking':
        return '/gif/papibricole_loop_attente_1.gif'; // À remplacer
      case 'pulse':
        return '/gif/papibricole_loop_attente_1.gif'; // À remplacer
      case 'idle':
      default:
        return '/gif/papibricole_loop_attente_1.gif'; // À remplacer
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

      {/* Modal Chat */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: 'min(420px, calc(100vw - 2rem))',
          height: 'min(650px, calc(100vh - 4rem))',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
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
            <button
              onClick={() => setIsOpen(false)}
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

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            background: '#f8f9fa'
          }}>
            {messages.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem',
                color: 'var(--gray)'
              }}>
                <div style={{ 
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1rem',
                  borderRadius: '50%',
                  overflow: 'hidden'
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
                <p style={{ fontSize: '1rem', fontWeight: '500' }}>{welcomeMessage}</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '0.75rem'
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '0.75rem 1rem',
                    borderRadius: '16px',
                    background: message.role === 'user' ? contextColor : 'white',
                    color: message.role === 'user' ? 'white' : 'var(--text)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}

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

          {/* Input */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid var(--gray-light)',
            background: 'white'
          }}>
            {/* Toggles */}
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
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: !voiceMode ? contextColor : 'var(--gray-light)',
                    color: !voiceMode ? 'white' : 'var(--gray)',
                    fontSize: '0.85rem',
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
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: voiceMode ? contextColor : 'var(--gray-light)',
                    color: voiceMode ? 'white' : 'var(--gray)',
                    fontSize: '0.85rem',
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
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: autoPlayAudio ? '#10b981' : 'var(--gray-light)',
                    color: autoPlayAudio ? 'white' : 'var(--gray)',
                    fontSize: '0.85rem',
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
                    fontSize: '0.9rem',
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
                      padding: '0.875rem 2rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: isRecording ? '#3b82f6' : '#10b981',
                      color: 'white',
                      fontSize: '1rem',
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
                        padding: '0.875rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ⏹️ Stop
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
                  placeholder={placeholder}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: `2px solid ${contextColor}30`,
                    fontSize: '0.95rem',
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
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: contextColor,
                    color: 'white',
                    fontSize: '1.25rem',
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
