/**
 * /chantiers/[id]/page.tsx
 * 
 * Page unifiée Création / Édition de chantier
 * - Si id === "nouveau" → mode création
 * - Sinon → mode édition
 * 
 * @version 1.0
 * @date 27 novembre 2025
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FloatingAssistant from '@/app/components/FloatingAssistant';

export default function ChantierEditPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.id as string;
  const isCreation = chantierId === 'nouveau';

  const [isAssistantReady, setIsAssistantReady] = useState(false);

  // Ouvrir l'assistant automatiquement après le montage
  useEffect(() => {
    // Petit délai pour laisser le contexte se charger
    const timer = setTimeout(() => {
      setIsAssistantReady(true);
      // Ouvrir l'assistant via sessionStorage (le FloatingAssistant lit cette valeur)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('papibricole_assistant_open', 'true');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* BREADCRUMB */}
      <div style={{ 
        position: 'fixed',
        top: '100px',
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ 
          maxWidth: '1100px', 
          margin: '0 auto', 
          padding: '1rem',
          display: 'flex', 
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1rem'
        }}>
          <Link 
            href="/chantiers" 
            style={{ 
              color: 'var(--gray)', 
              transition: 'color 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
          >
            ← Mes chantiers
          </Link>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--orange)', fontWeight: '600' }}>
            {isCreation ? '✨ Nouveau chantier' : '✏️ Modifier le chantier'}
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 1rem',
        paddingTop: '85px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        
        {/* MESSAGE D'ACCUEIL */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {isCreation ? '🏗️' : '✏️'}
          </div>
          
          <h1 style={{ 
            fontSize: '1.8rem', 
            fontWeight: '700', 
            color: 'var(--gray-light)',
            marginBottom: '0.75rem'
          }}>
            {isCreation ? 'Créons ton nouveau chantier !' : 'Modifie ton chantier'}
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', 
            color: 'var(--gray)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            {isCreation 
              ? "L'assistant IA va t'aider à définir ton projet étape par étape. Décris-lui ce que tu veux faire, il te posera les bonnes questions !"
              : "L'assistant IA a chargé les informations de ton chantier. Dis-lui ce que tu veux modifier."
            }
          </p>

          {/* Indicateur visuel vers l'assistant */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'var(--orange)',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            <span>👉</span>
            <span>Ouvre l'assistant en bas à droite pour commencer</span>
            <span style={{ 
              animation: 'bounce 1s infinite',
              display: 'inline-block'
            }}>
              ↘️
            </span>
          </div>
        </div>

        {/* TIPS / AIDE */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          <TipCard 
            icon="💬"
            title="Décris ton projet"
            description="Explique ce que tu veux faire : rénovation, création, aménagement... Sois précis sur tes attentes !"
          />
          <TipCard 
            icon="💰"
            title="Indique ton budget"
            description="L'assistant adaptera les propositions à ton budget. Précise si les matériaux sont inclus."
          />
          <TipCard 
            icon="⏰"
            title="Donne tes disponibilités"
            description="Combien d'heures par semaine ? Une deadline ? L'assistant planifiera en conséquence."
          />
          <TipCard 
            icon="🎯"
            title="Parle de tes compétences"
            description="Points forts, points faibles... L'assistant saura quels travaux te confier ou suggérer un pro."
          />
        </div>
      </div>

      {/* FLOATING ASSISTANT */}
      {isAssistantReady && <FloatingAssistant />}

      {/* ANIMATION CSS */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
      `}</style>
    </>
  );
}

// Composant TipCard
function TipCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '1.25rem',
      transition: 'all 0.2s'
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3 style={{ 
        fontSize: '1rem', 
        fontWeight: '600', 
        color: 'var(--gray-light)',
        marginBottom: '0.5rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '0.9rem', 
        color: 'var(--gray)',
        lineHeight: '1.5'
      }}>
        {description}
      </p>
    </div>
  );
}
