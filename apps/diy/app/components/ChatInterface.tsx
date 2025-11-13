'use client';

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../lib/services/openaiService';
import { transcribeAudio, textToSpeech, playAudio } from '../lib/services/audioService';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatInterfaceProps {
  pageContext: string;
  contextColor?: string;
  placeholder?: string;
  welcomeMessage?: string;
  additionalContext?: string;
  onStateChange?: (state: 'idle' | 'thinking' | 'speaking') => void;
  compact?: boolean; // Pour modal vs full page
}

export default function ChatInterface({
  pageContext,
  contextColor = '#2563eb',
  placeholder = 'Ta question...',
  welcomeMessage = 'Comment puis-je t\'aider ?',
  additionalContext,
  onStateChange,
  compact = false
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Notifier le parent du changement d'état
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

      // DEBUG TEMPORAIRE
      console.log('📤 Sending to API with context:', {
        hasAdditionalContext: !!additionalContext,
        contextLength: additionalContext?.length || 0
      });
      const response = await sendChatMessage(
        [...apiMessages, { role: 'user', content: input }],
        additionalContext,
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
              additionalContext,
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%'
    }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: compact ? '1rem' : '1.5rem',
        background: '#f8f9fa'
      }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: compact ? '2rem 1rem' : '3rem 1rem',
            color: 'var(--gray)'
          }}>
            <div style={{ fontSize: compact ? '2rem' : '3rem', marginBottom: '1rem' }}>👋</div>
            <p style={{ fontSize: compact ? '0.9rem' : '1rem', fontWeight: '500' }}>
              {welcomeMessage}
            </p>
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
        padding: compact ? '0.75rem' : '1rem',
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
              placeholder={placeholder}
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
