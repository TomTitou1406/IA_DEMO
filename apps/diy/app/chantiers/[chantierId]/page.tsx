/**
 * /chantiers/[chantierId]/page.tsx
 * 
 * Page unifiée Création / Édition de chantier
 * Version compacte mobile-first
 * 
 * @version 1.1
 * @date 27 novembre 2025
 */

'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ChantierEditPage() {
  const params = useParams();
  const chantierId = params.chantierId as string;
  const isCreation = chantierId === 'nouveau';

  // Ouvrir l'assistant automatiquement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('papibricole_assistant_open', 'true');
      window.dispatchEvent(new Event('storage'));
    }
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
          padding: '0.75rem 1rem',
          display: 'flex', 
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.95rem'
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
            {isCreation ? '✨ Nouveau chantier' : '✏️ Modifier'}
          </span>
        </div>
      </div>

      {/* CONTENU - CARTE UNIQUE */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        padding: '1rem',
        paddingTop: '70px',
      }}>
        
        <div style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          {/* Header compact */}
          <div style={{ 
            fontSize: '2.5rem', 
            marginBottom: '0.5rem' 
          }}>
            {isCreation ? '🏗️' : '✏️'}
          </div>
          
          <h1 style={{ 
            fontSize: '1.4rem', 
            fontWeight: '700', 
            color: 'var(--gray-light)',
            marginBottom: '0.5rem'
          }}>
            {isCreation ? 'Nouveau chantier' : 'Modifier le chantier'}
          </h1>
          
          <p style={{ 
            fontSize: '0.95rem', 
            color: 'var(--gray)',
            marginBottom: '1.25rem',
            lineHeight: '1.5'
          }}>
            {isCreation 
              ? "Je vais t'aider à décrire ton projet, prêt à démarrer ?"
              : "Dis-moi ce que tu veux modifier."
            }
          </p>
          
          {/* Tips en ligne */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            {['💬 Projet', '💰 Budget', '⏰ Dispo', '🎯 Compétences'].map((tip) => (
              <span 
                key={tip}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  color: 'var(--gray-light)'
                }}
              >
                {tip}
              </span>
            ))}
          </div>
          
          {/* Bouton vidéo explicative */}
          <button
            onClick={() => {
              // Ouvrir la vidéo dans une modal ou nouvel onglet
              window.open('/videos/Melina-Bienvenue-espace-projets.mp4', '_blank');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--gray-light)',
              fontSize: '0.9rem',
              fontWeight: '500',
              padding: '0.6rem 1.25rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '25px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            <span>🎬</span>
            <span>Voir une vidéo explicative</span>
          </button>
          
          {/* CTA bouton qui ouvre l'assistant */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAssistant'));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              padding: '0.75rem 1.5rem',
              background: 'var(--orange)',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
            }}
          >
            <span>✨ Démarrer avec l'assistant</span>
          </button>
          ```
          
          ---
          
          **Pour la vidéo, place-la ici :**
          ```
          apps/diy/public/videos/Melina-Bienvenue-espace-projets.mp4
        </div>
      </div>

      {/* Animation */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </>
  );
}
