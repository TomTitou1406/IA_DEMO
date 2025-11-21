'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getEtapesByTravail } from '../../../lib/services/travauxService';

interface Etape {
  numero: number;
  titre: string;
  description: string;
  duree_minutes: number;
  outils: string[];
  difficulte: string;
  conseils?: string;
}

interface Travail {
  id: string;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  expertise?: {
    nom: string;
    code: string;
  };
}

export default function TravailDetailPage() {
  const params = useParams();
  const travailId = params.id as string;
  
  const [travail, setTravail] = useState<Travail | null>(null);
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEtape, setExpandedEtape] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getEtapesByTravail(travailId);
        if (data) {
          setTravail(data.travail);
          setEtapes(data.etapes);
        }
      } catch (error) {
        console.error('Error loading travail detail:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [travailId]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  if (!travail) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>❌ Travail introuvable</h2>
        <Link href="/chantiers/travaux" className="main-btn btn-blue" style={{ marginTop: '2rem' }}>
          ← Retour aux lots (travaux)
        </Link>
      </div>
    );
  }

  const getDifficultyColor = (difficulte: string) => {
    switch (difficulte) {
      case 'facile': return '#10b981';
      case 'moyen': return '#f59e0b';
      case 'difficile': return '#ef4444';
      default: return 'var(--gray)';
    }
  };

  const getDifficultyIcon = (difficulte: string) => {
    switch (difficulte) {
      case 'facile': return '✓';
      case 'moyen': return '⚡';
      case 'difficile': return '🔥';
      default: return '●';
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/chantiers/travaux" style={{ color: 'var(--gray)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Tous les lots (travaux)
        </Link>
      </div>

      {/* Travail Header */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(5px)',
        borderRadius: 'var(--card-radius)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        borderLeft: '4px solid var(--blue)'
      }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              ⚡ {travail.titre}
              <span style={{
                background: 'var(--blue-light)',
                color: 'var(--blue)',
                padding: '0.25rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                {travail.progression}%
              </span>
            </h1>
            <p style={{ color: 'var(--gray)', marginBottom: '1rem' }}>
              {travail.description}
            </p>
            {travail.expertise && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f59e0b15',
                color: '#f59e0b',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                🛠️ Expertise : {travail.expertise.nom}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '8px',
          background: '#DBEAFE',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${travail.progression}%`,
            height: '100%',
            background: 'var(--blue)',
            transition: 'width 0.3s'
          }}></div>
        </div>
      </div>

      {/* Étapes */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎯 Étapes à suivre ({etapes.length})
        </h2>

        {etapes.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 'var(--card-radius)',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--gray)'
          }}>
            <p>Aucune étape définie pour ce travail.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {etapes.map((etape) => (
              <div
                key={etape.numero}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(5px)',
                  borderRadius: 'var(--card-radius)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  borderLeft: `4px solid ${getDifficultyColor(etape.difficulte)}`
                }}
                className="fade-in"
              >
                {/* Header étape - cliquable */}
                <div
                  onClick={() => setExpandedEtape(expandedEtape === etape.numero ? null : etape.numero)}
                  style={{
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: expandedEtape === etape.numero ? '#f8f9fa' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (expandedEtape !== etape.numero) {
                      e.currentTarget.style.background = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (expandedEtape !== etape.numero) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        background: getDifficultyColor(etape.difficulte),
                        color: 'white',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                      }}>
                        {etape.numero}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '600' }}>
                        {etape.titre}
                      </h3>
                      <span style={{
                        background: `${getDifficultyColor(etape.difficulte)}15`,
                        color: getDifficultyColor(etape.difficulte),
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {getDifficultyIcon(etape.difficulte)} {etape.difficulte}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--gray)', marginLeft: '40px' }}>
                      <span>⏱️ {etape.duree_minutes} min</span>
                      {etape.outils.length > 0 && (
                        <span>🔧 {etape.outils.length} outil{etape.outils.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    color: 'var(--gray)',
                    transition: 'transform 0.2s',
                    transform: expandedEtape === etape.numero ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>
                    ▼
                  </div>
                </div>

                {/* Contenu étape - expandable */}
                {expandedEtape === etape.numero && (
                  <div style={{
                    padding: '0 1.25rem 1.25rem 1.25rem',
                    borderTop: '1px solid var(--gray-light)',
                    background: '#f8f9fa'
                  }}>
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--gray-dark)' }}>
                        📝 Description
                      </h4>
                      <p style={{ color: 'var(--gray-dark)', lineHeight: '1.6', marginBottom: '1rem' }}>
                        {etape.description}
                      </p>

                      {etape.outils.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--gray-dark)' }}>
                            🔧 Outils nécessaires
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {etape.outils.map((outil, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: 'white',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  color: 'var(--gray-dark)',
                                  border: '1px solid var(--gray-light)'
                                }}
                              >
                                {outil}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {etape.conseils && (
                        <div style={{
                          background: '#fef3c7',
                          border: '1px solid #fbbf24',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          marginTop: '1rem'
                        }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            💡 Conseil pro
                          </h4>
                          <p style={{ color: '#78350f', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
                            {etape.conseils}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info contextuelle */}
      <div style={{
        background: '#10b98115',
        border: '1px solid #10b98140',
        borderRadius: 'var(--card-radius)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        color: '#065f46'
      }}>
        <div style={{ fontSize: '2rem' }}>💡</div>
        <div>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500' }}>
            <strong>Astuce :</strong> Utilisez l'assistant IA en bas à droite pour obtenir de l'aide en temps réel sur chaque étape !
          </p>
        </div>
      </div>
    </div>
  );
}
