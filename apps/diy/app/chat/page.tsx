'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { sendChatMessage } from '../lib/services/openaiService';
import { getChantierDemo } from '../lib/services/chantierService';
import { transcribeAudio, textToSpeech, playAudio } from '../lib/services/audioService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chantierContext, setChantierContext] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  
  // Refs pour enregistrement
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Charger contexte chantier
  useEffect(() => {
    async function loadContext() {
      const chantier = await getChantierDemo();
      if (chantier) {
        setChantierContext(`Chantier: ${chantier.titre} (${chantier.progression}% complété)`);
      }
    }
    loadContext();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        chantierContext,
        voiceMode // Passer le mode pour adapter le prompt
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Audio si mode vocal
      if (voiceMode) {
        setIsPlaying(true);
        const audioBlob = await textToSpeech(response);
        await playAudio(audioBlob);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Peux-tu réessayer ?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Démarre/Arrête l'enregistrement (CLIC SIMPLE)
  const toggleRecording = async () => {
    if (isRecording) {
      // ARRÊTER
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } else {
      // DÉMARRER
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        setRecordingTime(0);
        setHasRecording(false);

        // Timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          recordedBlobRef.current = audioBlob;
          setIsRecording(false);
          setHasRecording(audioBlob.size > 1000);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Impossible d\'accéder au microphone');
      }
    }
  };

  // Supprimer l'enregistrement
  const cancelRecording = () => {
    recordedBlobRef.current = null;
    setHasRecording(false);
    setRecordingTime(0);
  };

  // Envoyer l'enregistrement
  const sendRecording = async () => {
    if (!recordedBlobRef.current) return;

    try {
      setLoading(true);
      setHasRecording(false);
      
      // Transcrire
      const text = await transcribeAudio(recordedBlobRef.current);
      
      if (!text.trim()) {
        alert('Aucun texte détecté');
        setLoading(false);
        return;
      }

      // AFFICHER IMMÉDIATEMENT la transcription
      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Envoyer à l'API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await sendChatMessage(
        apiMessages,
        chantierContext,
        voiceMode
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      // En mode vocal : Audio PUIS texte
      if (voiceMode) {
        setIsPlaying(true);
        const audioBlob = await textToSpeech(response);
        
        // Jouer l'audio
        await playAudio(audioBlob);
        
        // PUIS afficher le texte
        setMessages(prev => [...prev, assistantMessage]);
        setIsPlaying(false);
      } else {
        // Mode texte : afficher directement
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Reset
      recordedBlobRef.current = null;
      setRecordingTime(0);

    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Erreur lors du traitement audio');
    } finally {
      setLoading(false);
    }
  };

  // Format temps
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '100vh',
      padding: 0
    }}>
      {/* Header fixe */}
      <div style={{ 
        padding: '1rem',
        borderBottom: '1px solid var(--gray-light)',
        background: 'white'
      }}>
        <Link href="/chantiers" style={{ 
          color: 'var(--gray)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          ← Retour
        </Link>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🤖 Assistant Bricolage</h1>
      </div>

      {/* Messages zone */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        background: 'var(--bg)'
      }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem',
            color: 'var(--gray)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Salut ! Je suis ton assistant bricolage
            </h2>
            <p>Pose-moi tes questions sur ton chantier !</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '1rem'
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                background: message.role === 'user' 
                  ? 'var(--blue)' 
                  : 'white',
                color: message.role === 'user' ? 'white' : 'var(--text)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            </div>
          </div>
        )}

        {isPlaying && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              background: 'var(--blue-light)',
              color: 'var(--blue)',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🔊 Lecture en cours...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input fixe */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--gray-light)',
        background: 'white'
      }}>
        {/* Toggle Texte/Vocal */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '0.75rem' 
        }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--gray-light)',
            borderRadius: '25px',
            padding: '0.25rem'
          }}>
            <button
              onClick={() => setVoiceMode(false)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '20px',
                border: 'none',
                background: !voiceMode ? 'white' : 'transparent',
                color: !voiceMode ? 'var(--blue)' : 'var(--gray)',
                fontWeight: !voiceMode ? '600' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: !voiceMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              ✍️ Texte
            </button>
            <button
              onClick={() => setVoiceMode(true)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '20px',
                border: 'none',
                background: voiceMode ? 'white' : 'transparent',
                color: voiceMode ? 'var(--blue)' : 'var(--gray)',
                fontWeight: voiceMode ? '600' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: voiceMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🎤 Vocal
            </button>
          </div>
        </div>
      
        {/* Input selon mode */}
        {voiceMode ? (
          // MODE VOCAL - CLIC SIMPLE
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* Indicateur état */}
            {isRecording && (
              <div style={{
                fontSize: '1.5rem',
                color: 'var(--red)',
                fontWeight: '700',
                animation: 'pulse 1.5s infinite'
              }}>
                🔴 {formatTime(recordingTime)}
              </div>
            )}

            {hasRecording && !isRecording && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--green)',
                fontWeight: '600'
              }}>
                ✓ Enregistrement prêt ({formatTime(recordingTime)})
              </div>
            )}
            
            {!isRecording && !hasRecording && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--gray)',
                textAlign: 'center'
              }}>
                Clique sur le micro pour parler
              </div>
            )}
            
            {/* Boutons selon état */}
            {hasRecording ? (
              // PREVIEW : Envoyer ou Supprimer
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={sendRecording}
                  disabled={loading}
                  className="main-btn btn-green"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    fontSize: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  ▶️
                </button>
                <button
                  onClick={cancelRecording}
                  disabled={loading}
                  className="main-btn"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--gray)',
                    alignSelf: 'center'
                  }}
                >
                  🗑️
                </button>
              </div>
            ) : (
              // ENREGISTREMENT : Micro
              <button
                onClick={toggleRecording}
                disabled={loading || isPlaying}
                className="main-btn btn-blue"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  fontSize: '3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isRecording 
                    ? '0 8px 24px rgba(239, 68, 68, 0.4)' 
                    : '0 4px 12px rgba(37, 99, 235, 0.3)',
                  background: isRecording ? 'var(--red)' : 'var(--blue)',
                  cursor: loading || isPlaying ? 'not-allowed' : 'pointer'
                }}
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>
            )}
          </div>
        ) : (
          // MODE TEXTE
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pose ta question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '25px',
                border: '2px solid var(--gray-light)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-light)'}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="main-btn btn-blue"
              style={{
                minWidth: '60px',
                borderRadius: '25px',
                padding: '0.75rem 1.5rem'
              }}
            >
              ➤
            </button>
          </div>
        )}
      </div>
      
      {/* Animation pulse */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
