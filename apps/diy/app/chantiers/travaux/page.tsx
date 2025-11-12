'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierDemo } from '../../lib/services/chantierService';
import { getTravauxByChantier, updateTravailProgression } from '../../lib/services/travauxService';

interface Travail {
  id: string;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  phase: string;
  ordre: number;
  blocage_raison?: string;
  duree_estimee_heures?: number;
}

export default function TravauxPage() {
  const [travaux, setTravaux] = useState<Travail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTermines, setShowTermines] = useState(false);
  const [showAVenir, setShowAVenir] = useState(false);
  const [editingTravailId, setEditingTravailId] = useState<string | null>(null);
  const [tempProgression, setTempProgression] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const chantier = await getChantierDemo();
        if (chantier) {
          const allTravaux = await getTravauxByChantier(chantier.id);
          setTravaux(allTravaux);
        }
      } catch (error) {
        console.error('Error loading travaux:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  // Grouper par statut
  const termines = travaux.filter(t => t.statut === 'terminé');
  const enCours = travaux.filter(t => t.statut === 'en_cours');
  const bloques = travaux.filter(t => t.statut === 'bloqué');
  const aVenir = travaux.filter(t => t.statut === 'à_venir');

  const TravailCard = ({ travail }: { travail: Travail }) => {
    const getStatusColor = (statut: string) => {
      switch (statut) {
        case 'terminé': return 'var(--green)';
        case 'en_cours': return 'var(--blue)';
        case 'bloqué': return 'var(--orange)';
        default: return 'var(--gray)';
      }
    };

    const getStatusIcon = (statut: string) => {
      switch (statut) {
        case 'terminé': return '✓';
        case 'en_cours': return '⚡';
        case 'bloqué': return '🚫';
        default: return '⚪';
      }
    };

    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(5px)',
        borderRadius: 'var(--card-radius)',
        padding: '1rem',
        marginBottom: '0.75rem',
        borderLeft: `4px solid ${getStatusColor(travail.statut)}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{getStatusIcon(travail.statut)} {travail.titre}</span>
            {travail.statut !== 'terminé' && (
              <span style={{
                background: getStatusColor(travail.statut) + '22',
                color: getStatusColor(travail.statut),
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {travail.progression}%
              </span>
            )}
          </h3>
          {travail.description && (
            <p style={{ fontSize: '0.85rem', color: 'var(--gray)', margin: 0, marginBottom: '0.5rem' }}>
              {travail.description}
            </p>
          )}
          {travail.blocage_raison && (
            <p style={{ fontSize: '0.85rem', color: 'var(--orange)', margin: 0, fontStyle: 'italic' }}>
              {travail.blocage_raison}
            </p>
          )}
        </div>

        {/* Progress bar pour non-terminés */}
        {travail.statut !== 'terminé' && (
          <div style={{
            width: '100%',
            height: '4px',
            background: 'var(--gray-light)',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '0.75rem'
          }}>
            <div style={{
              width: `${travail.progression}%`,
              height: '100%',
              background: getStatusColor(travail.statut),
              transition: 'width 0.3s'
            }}></div>
          </div>
        )}

        {/* Actions */}
        {travail.statut !== 'terminé' && (
          <>
            {editingTravailId === travail.id ? (
              // MODE ÉDITION : Slider
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempProgression}
                    onChange={(e) => setTempProgression(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '10px',
                      outline: 'none',
                      background: `linear-gradient(to right, var(--blue) 0%, var(--blue) ${tempProgression}%, #DBEAFE ${tempProgression}%, #DBEAFE 100%)`,
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <span style={{ 
                    fontWeight: '600', 
                    color: 'var(--blue)',
                    minWidth: '50px',
                    textAlign: 'right'
                  }}>
                    {tempProgression}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="main-btn btn-green"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.4rem 0.8rem',
                      minHeight: 'auto',
                      maxWidth: '120px'
                    }}
                    onClick={async () => {
                      await updateTravailProgression(travail.id, tempProgression);
                      setEditingTravailId(null);
                      window.location.reload();
                    }}
                  >
                    ✓ Valider
                  </button>
                  <button 
                    className="main-btn btn-disabled"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.4rem 0.8rem',
                      minHeight: 'auto',
                      maxWidth: '120px',
                      background: 'var(--gray)'
                    }}
                    onClick={() => setEditingTravailId(null)}
                  >
                    ✕ Annuler
                  </button>
                </div>
              </div>
            ) : (
              // MODE NORMAL : Boutons
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {travail.statut === 'en_cours' && (
                  <button 
                    className="main-btn btn-green"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.4rem 0.8rem',
                      minHeight: 'auto',
                      maxWidth: '140px'
                    }}
                    onClick={() => {
                      setTempProgression(travail.progression);
                      setEditingTravailId(travail.id);
                    }}
                  >
                    📊 Ajuster %
                  </button>
                )}
                <button className="main-btn btn-blue" style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  minHeight: 'auto',
                  maxWidth: '140px'
                }}>
                  💬 Discuter
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/chantiers" style={{ color: 'var(--gray)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>📋 Tous les travaux ({travaux.length})</h1>

      {/* Section TERMINÉS */}
      {termines.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} className="fade-in">
          <div 
            onClick={() => setShowTermines(!showTermines)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
              padding: '0.5rem 0',
              marginBottom: '0.75rem'
            }}
          >
            <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>{showTermines ? '▽' : '▶'}</span>
              ✅ Terminés ({termines.length})
            </h2>
          </div>
          {showTermines && (
            <div>
              {termines.map(travail => <TravailCard key={travail.id} travail={travail} />)}
            </div>
          )}
        </section>
      )}

      {/* Section EN COURS */}
      {enCours.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} className="fade-in">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--blue)' }}>
            ⚡ En cours ({enCours.length})
          </h2>
          {enCours.map(travail => <TravailCard key={travail.id} travail={travail} />)}
        </section>
      )}

      {/* Section BLOQUÉS */}
      {bloques.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} className="fade-in">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--orange)' }}>
            ⚠️ Bloqués ({bloques.length})
          </h2>
          {bloques.map(travail => <TravailCard key={travail.id} travail={travail} />)}
        </section>
      )}

      {/* Section À VENIR */}
      {aVenir.length > 0 && (
        <section style={{ marginBottom: '2rem' }} className="fade-in">
          <div 
            onClick={() => setShowAVenir(!showAVenir)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
              padding: '0.5rem 0',
              marginBottom: '0.75rem'
            }}
          >
            <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>{showAVenir ? '▽' : '▶'}</span>
              📅 À venir ({aVenir.length})
            </h2>
          </div>
          {showAVenir && (
            <div>
              {aVenir.map(travail => <TravailCard key={travail.id} travail={travail} />)}
            </div>
          )}
        </section>
      )}

      {/* CTA bas de page */}
      <div style={{ 
        marginTop: '2rem',
        display: 'flex',
        gap: '1rem'
      }}>
        <Link href="/chat" className="main-btn btn-green" style={{ flex: 1 }}>
          🤖 Parler à l'assistant
        </Link>
      </div>
    </div>
  );
}
