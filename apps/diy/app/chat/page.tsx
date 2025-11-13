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
  const [voiceMode, setVoiceMode] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  // Refs pour enregistrement
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
        chantierContext
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Audio si mode vocal ET autoplay activé
      if (voiceMode && autoPlayAudio) {
        setIsPlaying(true);
        const audioBlob = await textToSpeech(response);
        await playAudio(audioBlob, audioElementRef);
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

  // Stopper l'audio en cours
  const stopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.src = ''; // Vider la source
      audioElementRef.current = null; // Libérer la ref
    }
    setIsPlaying(false);
  };

  const handleVoiceAction = async () => {
  // Auto-stop audio si en cours
  if (isPlaying) {
    stopAudio();
    // Attendre un peu que l'audio se libère
    await new Promise(resolve => setTimeout(resolve, 100));
  }
    
  if (loading) return;

  if (isRecording) {
      // ENVOYER
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      // DÉMARRER ENREGISTREMENT
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        setRecordingTime(0);

        // Timer
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

          // Vérifier taille minimale
          if (audioBlob.size < 1000) {
            alert('Enregistrement trop court');
            setRecordingTime(0);
            return;
          }

          // Traiter l'audio
          try {
            setLoading(true);
            
            // Transcrire
            const text = await transcribeAudio(audioBlob);
            
            if (!text.trim()) {
              alert('Aucun texte détecté');
              setLoading(false);
              setRecordingTime(0);
              return;
            }

            // Ajouter message user
            const userMessage: Message = {
              role: 'user',
              content: text,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, userMessage]);

            // Reset
            setRecordingTime(0);

            // Envoyer à l'API
            const apiMessages = [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }));

            const response = await sendChatMessage(
              apiMessages,
              chantierContext
            );

            const assistantMessage: Message = {
              role: 'assistant',
              content: response,
              timestamp: new Date()
            };

            // AFFICHER LE TEXTE D'ABORD
            setMessages(prev => [...prev, assistantMessage]);

            // PUIS jouer l'audio si activé (en parallèle)
            if (autoPlayAudio) {
              setIsPlaying(true);
              textToSpeech(response).then(audioBlob => {
                return playAudio(audioBlob, audioElementRef);
              }).then(() => {
                setIsPlaying(false);
              }).catch(err => {
                console.error('Audio playback error:', err);
                setIsPlaying(false);
              });
            }

          } catch (error) {
            console.error('Error processing audio:', error);
            alert('Erreur lors du traitement audio');
            setRecordingTime(0);
          } finally {
            setLoading(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Impossible d\'accéder au microphone');
      }
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
        {/* Contrôles - Style pro */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {/* Ligne 1 : Mode saisie */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{
              fontSize: '0.9rem',
              color: 'var(--gray)',
              fontWeight: '500'
            }}>
              Mode :
            </span>
            <div style={{
              display: 'inline-flex',
              background: 'var(--gray-light)',
              borderRadius: '8px',
              padding: '0.25rem'
            }}>
              <button
                onClick={() => setVoiceMode(false)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: !voiceMode ? 'white' : 'transparent',
                  color: !voiceMode ? 'var(--blue)' : 'var(--gray)',
                  fontSize: '0.9rem',
                  fontWeight: !voiceMode ? '600' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: !voiceMode ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                ✍️ J'écris
              </button>
              <button
                onClick={() => setVoiceMode(true)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: voiceMode ? 'white' : 'transparent',
                  color: voiceMode ? 'var(--blue)' : 'var(--gray)',
                  fontSize: '0.9rem',
                  fontWeight: voiceMode ? '600' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: voiceMode ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                🎤 Je dicte
              </button>
            </div>
          </div>

          {/* Ligne 2 : Lecture audio (seulement si mode vocal) */}
          {voiceMode && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{
                fontSize: '0.9rem',
                color: 'var(--gray)',
                fontWeight: '500'
              }}>
                Réponse vocalisée :
              </span>
              <div style={{
                display: 'inline-flex',
                background: 'var(--gray-light)',
                borderRadius: '8px',
                padding: '0.25rem'
              }}>
                <button
                  onClick={() => setAutoPlayAudio(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: autoPlayAudio ? 'white' : 'transparent',
                    color: autoPlayAudio ? 'var(--green)' : 'var(--gray)',
                    fontSize: '0.9rem',
                    fontWeight: autoPlayAudio ? '600' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: autoPlayAudio ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  🔊 Oui
                </button>
                <button
                  onClick={() => setAutoPlayAudio(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: !autoPlayAudio ? 'white' : 'transparent',
                    color: !autoPlayAudio ? 'var(--gray-dark)' : 'var(--gray)',
                    fontSize: '0.9rem',
                    fontWeight: !autoPlayAudio ? '600' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: !autoPlayAudio ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  🔇 Non
                </button>
              </div>
            </div>
          )}
        </div>
      
        {/* Input selon mode */}
        {voiceMode ? (
          // MODE VOCAL
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* Timer */}
            {isRecording && (
              <div style={{
                fontSize: '1.2rem',
                color: 'var(--red)',
                fontWeight: '700',
                animation: 'pulse 1.5s infinite'
              }}>
                🔴 Enregistrement : {formatTime(recordingTime)}
              </div>
            )}

            {!isRecording && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--gray-dark)',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {isRecording ? 'Cliquez pour envoyer vos instructions' : 'Cliquez pour donner vos instructions'}
              </div>
            )}
            
            {/* Boutons - Parler/Envoyer + Interrompre si audio */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              alignItems: 'center' 
            }}>
              <button
                onClick={handleVoiceAction}
                disabled={loading}
                className={`main-btn ${isRecording ? 'btn-blue' : 'btn-green'}`}
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  padding: '1.25rem 3rem',
                  minHeight: 'auto',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {isRecording ? 'Envoyer' : 'Parler'}
              </button>

              {/* Bouton Interrompre (visible seulement si audio en cours) */}
              {isPlaying && (
                <button
                  onClick={stopAudio}
                  className="main-btn btn-red"
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    padding: '1.25rem 2rem',
                    minHeight: 'auto',
                    cursor: 'pointer'
                  }}
                >
                  Interrompre
                </button>
              )}
            </div>
          </div>
        ) : (
          // MODE TEXTE
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Écrivez votre question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
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
                padding: '0.75rem 1.5rem',
                minHeight: 'auto',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Envoyer
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
