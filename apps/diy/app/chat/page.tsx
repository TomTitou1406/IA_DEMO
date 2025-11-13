'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { sendChatMessage } from '../lib/services/openaiService';
import { getChantierDemo } from '../lib/services/chantierService';
import { recordAudio, transcribeAudio, textToSpeech, playAudio } from '../lib/services/audioService';

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

  const handleVoiceMessage = async () => {
  if (isRecording) return;

  setIsRecording(true);
  
  try {
    // Enregistrer
    const audioBlob = await recordAudio();
    
    // Transcrire
    const text = await transcribeAudio(audioBlob);
    
    if (!text.trim()) {
      alert('Aucun texte détecté');
      setIsRecording(false);
      return;
    }

    // Créer message user
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setIsRecording(false);

    // Envoyer à l'API
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await sendChatMessage(
      [...apiMessages, { role: 'user', content: text }],
      chantierContext
    );

    const assistantMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Synthèse vocale si mode vocal
    if (voiceMode) {
      setIsPlaying(true);
      const audioBlob = await textToSpeech(response);
      await playAudio(audioBlob);
      setIsPlaying(false);
    }

  } catch (error) {
    console.error('Error in voice message:', error);
    alert('Erreur lors de l\'enregistrement');
    setIsRecording(false);
  } finally {
    setLoading(false);
  }
};

const stopRecording = () => {
  if ((window as any).__stopRecording) {
    (window as any).__stopRecording();
  }
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
          // MODE VOCAL
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {isRecording && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--red)',
                fontWeight: '600',
                animation: 'pulse 1.5s infinite'
              }}>
                🔴 Enregistrement en cours...
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {!isRecording ? (
                <button
                  onClick={handleVoiceMessage}
                  disabled={loading || isPlaying}
                  className="main-btn btn-blue"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  🎤
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="main-btn"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--red)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  ⏹️
                </button>
              )}
            </div>
            
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--gray)',
              textAlign: 'center'
            }}>
              {isRecording 
                ? 'Appuie sur stop ou attends 30s max' 
                : 'Appuie pour parler'}
            </p>
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
