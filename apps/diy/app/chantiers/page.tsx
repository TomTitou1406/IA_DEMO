/**
 * /app/chantiers/page.tsx
 * 
 * Page HUB "Mes projets" - Point d'entrée vers :
 * - Travaux simples (tâches ponctuelles)
 * - Chantiers (projets structurés)
 * 
 * Design : 2 cards horizontales style Home avec images
 * 
 * @version 1.1
 * @date 04 janvier 2026
 * 
 * Changelog :
 * - v1.1 : Ajout images, texte modifié, counts
 * - v1.0 : Création du HUB avec 2 cards
 */

'use client';

import Link from "next/link";
import { useState, useEffect } from "react";

export default function ChantiersHubPage() {
  const [counts, setCounts] = useState({ travaux: 0, chantiers: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      // Compter les travaux simples
      const travauxRes = await fetch('/api/travaux-simples?count_only=true');
      if (travauxRes.ok) {
        const data = await travauxRes.json();
        setCounts(prev => ({ ...prev, travaux: data.count || 0 }));
      }
    } catch (e) {
      console.log('Compteur travaux non disponible');
    }

    try {
      // Compter les chantiers (type complexe)
      const chantiersRes = await fetch('/api/chantiers?type=complexe&count_only=true');
      if (chantiersRes.ok) {
        const data = await chantiersRes.json();
        setCounts(prev => ({ ...prev, chantiers: data.count || 0 }));
      }
    } catch (e) {
      console.log('Compteur chantiers non disponible');
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: isMobile ? '0.75rem' : '1.5rem'
    }}>
      {/* Breadcrumb */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        flexWrap: 'wrap'
      }}>
        <Link href="/" style={{ color: 'var(--gray)', textDecoration: 'none' }}>
          🏠 Home
        </Link>
        <span style={{ color: 'var(--gray)' }}>/</span>
        <span style={{ color: 'var(--orange)', fontWeight: '600' }}>
          🏗️ Mes projets
        </span>
      </nav>

      {/* Titre */}
      <h1 style={{
        fontSize: isMobile ? '1.5rem' : '2rem',
        fontWeight: '700',
        marginBottom: isMobile ? '1.5rem' : '2rem',
        color: 'var(--gray-light)'
      }}>
        Que veux-tu faire ?
      </h1>

      {/* Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        
        {/* Card Travaux Simples */}
        <Link 
          href="/travaux"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--blue)',
            borderRadius: '16px',
            textDecoration: 'none',
            color: 'white',
            transition: 'all 0.3s ease',
            border: '3px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.4)';
            e.currentTarget.style.borderColor = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {/* Image */}
          <div style={{
            width: '70px',
            height: '70px',
            minWidth: '70px',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.1)'
          }}>
            <img 
              src="/images/travaux_liste.webp" 
              alt="Travaux simples"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '1.1rem' : '1.25rem', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Mes travaux simples
              {counts.travaux > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {counts.travaux}
                </span>
              )}
            </h2>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.85rem', 
              opacity: 0.9 
            }}>
              Petits travaux faciles de bricolage
            </p>
          </div>
          <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>→</span>
        </Link>

        {/* Card Chantiers */}
        <Link 
          href="/chantiers/liste"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--orange)',
            borderRadius: '16px',
            textDecoration: 'none',
            color: 'white',
            transition: 'all 0.3s ease',
            border: '3px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(249, 115, 22, 0.4)';
            e.currentTarget.style.borderColor = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {/* Image */}
          <div style={{
            width: '70px',
            height: '70px',
            minWidth: '70px',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.1)'
          }}>
            <img 
              src="/images/chantiers_liste.webp" 
              alt="Chantiers"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '1.1rem' : '1.25rem', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Mes chantiers
              {counts.chantiers > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {counts.chantiers}
                </span>
              )}
            </h2>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.85rem', 
              opacity: 0.9 
            }}>
              Projets structurés avec suivi complet
            </p>
          </div>
          <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>→</span>
        </Link>

      </div>
    </div>
  );
}
