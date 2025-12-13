/**
 * Page Création Travaux Simples
 * 
 * Flow simplifié :
 * 1. Description du travail
 * 2. 2-3 questions IA pour préciser
 * 3. Génération des étapes
 * 4. Création en BDD
 * 
 * @version 1.0
 * @date 05 décembre 2025
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/app/components/Breadcrumb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TravailSimpleData {
  titre: string;
  description: string;
  duree_estimee_minutes: number;
  difficulte: string;
  outils_necessaires: string[];
  materiaux_necessaires: string[];
  etapes: {
    ordre: number;
    titre: string;
    description: string;
    duree_minutes: number;
    points_attention?: string;
  }[];
  securite: string[];
  conseils_pro: string;
}

export default function NouveauTravailSimplePage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [travailData, setTravailData] = useState<TravailSimpleData | null>(null);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Message de bienvenue
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Salut ! 🔧 Quel petit travail veux-tu réaliser ?\n\nExemples : poser une étagère, fixer un miroir, monter un meuble, installer une tringle..."
    }]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/travaux-simple/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        })
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Désolé, j'ai rencontré un problème. Peux-tu reformuler ?" 
        }]);
        return;
      }

      // Ajouter la réponse
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message 
      }]);

      // Si ready_to_create, extraire les données
      if (data.travail_simple) {
        setTravailData(data.travail_simple);
        setShowPreview(true);
      }

    } catch (error) {
      console.error('Erreur chat:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oups, une erreur est survenue. Réessaie !" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!travailData || creating) return;

    setCreating(true);

    try {
      const response = await fetch('/api/travaux-simple/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(travailData)
      });

      const data = await response.json();

      if (data.success && data.chantierId) {
        router.push(`/chantiers/${data.chantierId}/simple`);
      } else {
        alert('Erreur lors de la création: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Breadcrumb 
        currentLevel="chantiers" 
      />

      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '1rem',
        paddingTop: '80px',
        paddingBottom: '100px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'var(--gray-light)',
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            🔧 Nouveau travail simple
          </h1>
          <p style={{
            color: 'var(--gray)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Décris ton projet, je te guide étape par étape
          </p>
        </div>

        {/* Zone de chat */}
        <div style={{
          flex: 1,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '16px',
          padding: '1rem',
          marginBottom: '1rem',
          overflowY: 'auto',
          maxHeight: '50vh'
        }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '0.75rem'
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' 
                  ? 'var(--green)' 
                  : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--gray)'
              }}>
                <span className="typing-indicator">●●●</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preview du travail si prêt */}
        {showPreview && travailData && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
            border: '1px solid var(--green)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              color: 'var(--green)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: 0,
              marginBottom: '0.75rem'
            }}>
              ✅ Travail prêt à créer
            </h3>

            <div style={{ 
              fontSize: '0.9rem', 
              color: 'var(--gray-light)',
              marginBottom: '0.75rem'
            }}>
              <strong>{travailData.titre}</strong>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--gray)',
              marginBottom: '1rem'
            }}>
              <span>⏱ {travailData.duree_estimee_minutes} min</span>
              <span>📊 {travailData.difficulte}</span>
              <span>📋 {travailData.etapes.length} étapes</span>
            </div>

            {/* Liste des étapes en preview */}
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--gray)',
                marginBottom: '0.5rem'
              }}>
                Étapes prévues :
              </div>
              {travailData.etapes.slice(0, 4).map((etape, idx) => (
                <div key={idx} style={{
                  fontSize: '0.85rem',
                  color: 'var(--gray-light)',
                  padding: '0.25rem 0',
                  borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                }}>
                  {etape.ordre}. {etape.titre}
                </div>
              ))}
              {travailData.etapes.length > 4 && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--gray)',
                  paddingTop: '0.25rem'
                }}>
                  + {travailData.etapes.length - 4} autres étapes
                </div>
              )}
            </div>

            {/* Boutons */}
            <div style={{
              display: 'flex',
              gap: '0.75rem'
            }}>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: creating ? 'var(--gray)' : 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: creating ? 'wait' : 'pointer'
                }}
              >
                {creating ? '⏳ Création...' : '✅ Créer ce travail'}
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setTravailData(null);
                }}
                style={{
                  padding: '0.875rem 1rem',
                  background: 'transparent',
                  color: 'var(--gray)',
                  border: '1px solid var(--gray)',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                ↩ Modifier
              </button>
            </div>
          </div>
        )}

        {/* Input zone */}
        {!showPreview && (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '0.5rem'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Décris ton travail..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1rem',
                padding: '0.75rem',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.75rem 1.25rem',
                background: loading || !input.trim() ? 'var(--gray)' : 'var(--green)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              ➤
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .typing-indicator {
          animation: blink 1.4s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
