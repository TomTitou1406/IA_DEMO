/**
 * /app/travaux/page.tsx
 * 
 * Page liste des travaux simples (tâches ponctuelles mono-lot)
 * Design : Cards compactes avec progress bar visible
 * 
 * @version 1.0
 * @date 04 janvier 2026
 * 
 * Changelog :
 * - v1.0 : Création avec cards compactes et progress bar
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MediaButtons from '@/app/components/MediaButtons';

interface TravailSimple {
  id: string;
  chantier_id: string;
  titre: string;
  description?: string;
  statut: string;
  progression: number;
  nombre_etapes: number;
  etapes_terminees: number;
  duree_estimee_heures?: number;
  duree_reelle_heures?: number;
  updated_at: string;
}

export default function TravauxSimplesPage() {
  const [travaux, setTravaux] = useState<TravailSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadTravaux();
  }, []);

  const loadTravaux = async () => {
    try {
      const res = await fetch('/api/travaux-simples');
      if (res.ok) {
        const data = await res.json();
        setTravaux(data.travaux || []);
      }
    } catch (e) {
      console.error('Erreur chargement travaux simples:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloqué': return 'var(--orange)';
      case 'annulé': return 'var(--red)';
      default: return 'var(--purple)';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'Terminé';
      case 'en_cours': return 'En cours';
      case 'bloqué': return 'Bloqué';
      case 'annulé': return 'Annulé';
      default: return 'À faire';
    }
  };

  const formatDuree = (heures?: number) => {
    if (!heures) return '';
    if (heures < 1) return `${Math.round(heures * 60)}min`;
    return `${heures}h`;
  };

  // Grouper par statut
  const enCours = travaux.filter(t => t.statut === 'en_cours');
  const aFaire = travaux.filter(t => t.statut === 'à_venir' || !t.statut);
  const bloques = travaux.filter(t => t.statut === 'bloqué');
  const termines = travaux.filter(t => t.statut === 'terminé');

  // Card compacte pour un travail simple
  const TravailCard = ({ travail }: { travail: TravailSimple }) => {
    const progression = travail.nombre_etapes > 0 
      ? Math.round((travail.etapes_terminees / travail.nombre_etapes) * 100)
      : 0;

    const statusColor = getStatusColor(travail.statut);
    
    const getStatusRgb = (statut: string) => {
      switch (statut) {
        case 'terminé': return '16, 185, 129';
        case 'en_cours': return '37, 99, 235';
        case 'bloqué': return '249, 115, 22';
        case 'annulé': return '239, 68, 68';
        default: return '139, 92, 246';
      }
    };

    const rgb = getStatusRgb(travail.statut);

    return (
      <Link
        href={`/chantiers/${travail.chantier_id}/travaux/${travail.id}/etapes`}
        style={{
          display: 'block',
          background: `linear-gradient(90deg, transparent 0%, rgba(${rgb}, 0.15) 50%, rgba(${rgb}, 0.4) 100%)`,
          borderRadius: '12px',
          borderLeft: `5px solid rgb(${rgb})`,
          padding: '1rem 1.25rem',
          marginBottom: '0.75rem',
          textDecoration: 'none',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `linear-gradient(90deg, rgba(${rgb}, 0.05) 0%, rgba(${rgb}, 0.25) 50%, rgba(${rgb}, 0.5) 100%)`;
          e.currentTarget.style.transform = 'translateX(4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = `linear-gradient(90deg, transparent 0%, rgba(${rgb}, 0.15) 50%, rgba(${rgb}, 0.4) 100%)`;
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        {/* Ligne 1 : Titre + Badge % */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '0.75rem'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            lineHeight: '1.4',
            flex: 1
          }}>
            {travail.titre}
          </h3>
          <span style={{
            background: statusColor,
            color: 'white',
            padding: '0.25rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '700',
            minWidth: '45px',
            textAlign: 'center'
          }}>
            {progression}%
          </span>
        </div>

        {/* Ligne 2 : Progress bar */}
        <div style={{
          height: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '0.75rem'
        }}>
          <div style={{
            width: `${Math.max(progression, 2)}%`,
            height: '100%',
            background: progression === 100 
              ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
              : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
            borderRadius: '3px',
            transition: 'width 0.5s ease'
          }}></div>
        </div>

        {/* Ligne 3 : Stats + MediaButtons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}>
          {/* Stats gauche */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'white' }}>
            <span>✅ {travail.etapes_terminees}/{travail.nombre_etapes} étapes</span>
            {travail.duree_estimee_heures && (
              <span>⏱️ {formatDuree(travail.duree_estimee_heures)}</span>
            )}
          </div>

          {/* MediaButtons droite */}
          <div onClick={(e) => e.preventDefault()}>
            <MediaButtons
              niveau="travail"
              niveauId={travail.id}
              niveauTitre={travail.titre}
              photosCount={0}
              hasVideo={false}
              onPhotoClick={() => {
                console.log('Photos:', travail.id);
              }}
              onVideoClick={() => {
                const searchQuery = encodeURIComponent(travail.titre);
                window.location.href = `/videos?context=travail&id=${travail.id}&search=${searchQuery}`;
              }}
            />
          </div>
        </div>
      </Link>
    );
  };

  // Section collapsable
  const Section = ({ 
    title, 
    icon, 
    color, 
    items, 
    defaultOpen = true 
  }: { 
    title: string; 
    icon: string; 
    color: string; 
    items: TravailSimple[];
    defaultOpen?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (items.length === 0) return null;

    // Convertir la couleur en RGB pour le dégradé
    const getColorRgb = (cssColor: string) => {
      switch (cssColor) {
        case 'var(--green)': return '16, 185, 129';
        case 'var(--blue)': return '37, 99, 235';
        case 'var(--orange)': return '249, 115, 22';
        case 'var(--red)': return '239, 68, 68';
        case 'var(--purple)': return '139, 92, 246';
        default: return '107, 114, 128';
      }
    };

    const rgb = getColorRgb(color);

    return (
      <div style={{ marginBottom: '1.5rem' }}>
        {/* Header avec dégradé */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: `2px solid transparent`,
            borderImage: `linear-gradient(90deg, transparent 0%, rgb(${rgb}) 100%) 1`,
            cursor: 'pointer',
            padding: '0.5rem 0',
            paddingBottom: '0.75rem',
            width: '100%',
            textAlign: 'left'
          }}
        >
          <span style={{
            color: 'var(--gray)',
            fontSize: '0.8rem',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
          }}>
            ▶
          </span>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span style={{
            color: 'var(--gray-light)',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}>
            {title}
          </span>
          <span style={{
            background: color,
            color: 'white',
            padding: '0.15rem 0.5rem',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {items.length}
          </span>
        </button>
        
        {isOpen && (
          <div style={{ marginTop: '0.75rem' }}>
            {items.map(travail => (
              <TravailCard key={travail.id} travail={travail} />
            ))}
          </div>
        )}
      </div>
    );
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
        <Link href="/chantiers" style={{ color: 'var(--gray)', textDecoration: 'none' }}>
          🏗️ Mes projets
        </Link>
        <span style={{ color: 'var(--gray)' }}>/</span>
        <span style={{ color: 'var(--blue)', fontWeight: '600' }}>
          🔧 Travaux simples
        </span>
      </nav>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '1.75rem',
          fontWeight: '700',
          color: 'var(--gray-light)',
          margin: 0
        }}>
          🔧 Mes travaux simples
        </h1>

        {/* Bouton nouveau */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
              detail: { 
                pageContext: 'travaux_simple_decouverte',
                welcomeMessage: "Salut ! Décris-moi le petit travail que tu veux faire et je vais t'aider à le planifier. 🔧"
              } 
            }));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1e40af';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--blue)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>+</span>
          <span>Nouveau</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && travaux.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔧</span>
          <h3 style={{ color: 'var(--gray-light)', marginBottom: '0.5rem' }}>
            Aucun travail simple
          </h3>
          <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
            Créez votre première tâche ponctuelle !
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
                detail: { 
                  pageContext: 'travaux_simple_decouverte',
                  welcomeMessage: "Salut ! Décris-moi le petit travail que tu veux faire et je vais t'aider à le planifier. 🔧"
                } 
              }));
            }}
            style={{
              background: 'var(--blue)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            + Créer un travail simple
          </button>
        </div>
      )}

      {/* Sections */}
      {!loading && travaux.length > 0 && (
        <>
          <Section 
            title="En cours" 
            icon="🔨" 
            color="var(--blue)" 
            items={enCours}
            defaultOpen={true}
          />
          <Section 
            title="À faire" 
            icon="📋" 
            color="var(--purple)" 
            items={aFaire}
            defaultOpen={true}
          />
          <Section 
            title="Bloqués" 
            icon="⚠️" 
            color="var(--orange)" 
            items={bloques}
            defaultOpen={true}
          />
          <Section 
            title="Terminés" 
            icon="✅" 
            color="var(--green)" 
            items={termines}
            defaultOpen={false}
          />
        </>
      )}
    </div>
  );
}
