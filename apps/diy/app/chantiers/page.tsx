/**
 * /app/chantiers/page.tsx
 * 
 * Page HUB "Mes projets" - Point d'entrée vers :
 * - Travaux simples (tâches ponctuelles)
 * - Chantiers (projets structurés)
 * 
 * Design : 2 cards horizontales avec pastilles sur images
 * 
 * @version 1.2
 * @date 07 janvier 2026
 * 
 * Changelog :
 * - v1.2 : Breadcrumb standard, pastilles sur images, polish UI
 * - v1.1 : Ajout images, texte modifié, counts
 * - v1.0 : Création du HUB avec 2 cards
 */

'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import Breadcrumb from '@/app/components/Breadcrumb';

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

  // Composant Card réutilisable
  const HubCard = ({ 
    href, 
    image, 
    imageAlt,
    title, 
    description, 
    count, 
    bgColor,
    shadowColor 
  }: {
    href: string;
    image: string;
    imageAlt: string;
    title: string;
    description: string;
    count: number;
    bgColor: string;
    shadowColor: string;
  }) => (
    <Link 
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        background: bgColor,
        borderRadius: '16px',
        textDecoration: 'none',
        color: 'white',
        transition: 'all 0.3s ease',
        border: '3px solid transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 40px ${shadowColor}`;
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
    {/* Image avec pastille */}
      <div style={{
        position: 'relative',
        width: '80px',
        height: '80px',
        minWidth: '80px',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.1)'
        }}>
          <img 
            src={image} 
            alt={imageAlt}
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
        {/* Pastille qui déborde */}
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#10b981',
            color: 'white',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            fontSize: '0.7rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            zIndex: 1
          }}>
            {count}
          </span>
        )}
      </div>
      
      {/* Contenu texte */}
      <div style={{ flex: 1 }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: isMobile ? '1.05rem' : '1.2rem', 
          fontWeight: '700',
          lineHeight: '1.3'
        }}>
          {title}
        </h2>
        <p style={{ 
          margin: '0.3rem 0 0 0', 
          fontSize: '0.85rem', 
          opacity: 0.85,
          lineHeight: '1.4'
        }}>
          {description}
        </p>
      </div>
      
      {/* Flèche */}
      <span style={{ 
        fontSize: '1.5rem', 
        opacity: 0.7,
        transition: 'transform 0.2s ease'
      }}>
        →
      </span>
    </Link>
  );

  return (
    <>
      <Breadcrumb currentLevel="chantiers" />
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: isMobile ? '0.75rem' : '1.5rem',
          paddingTop: isMobile ? '2rem' : '5rem'
      }}>
        {/* Titre */}
        <h1 style={{
          fontSize: isMobile ? '1.4rem' : '1.75rem',
          fontWeight: '700',
          marginBottom: isMobile ? '1.25rem' : '1.5rem',
          color: 'var(--gray-light)'
        }}>
          Mes projets de bricolage
        </h1>

        {/* Cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          
          {/* Card Travaux Simples */}
          <HubCard
            href="/travaux"
            image="/images/travaux_liste.webp"
            imageAlt="Travaux simples"
            title="Mes Travaux simples"
            description="Petits travaux faciles de bricolage"
            count={counts.travaux}
            bgColor="var(--blue)"
            shadowColor="rgba(37, 99, 235, 0.4)"
          />

          {/* Card Chantiers */}
          <HubCard
            href="/chantiers/liste"
            image="/images/chantiers_liste.webp"
            imageAlt="Chantiers"
            title="Mes chantiers"
            description="Projets structurés avec suivi complet"
            count={counts.chantiers}
            bgColor="var(--orange)"
            shadowColor="rgba(249, 115, 22, 0.4)"
          />

        </div>
      </div>
    </>
  );
}
