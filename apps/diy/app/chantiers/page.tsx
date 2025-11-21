'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierDemo, getChantierStats } from '../lib/services/chantierService';
import { getTravauxByStatut, updateTravailProgression } from '../lib/services/travauxService';

interface Chantier {
  id: string;
  titre: string;
  progression: number;
  duree_estimee_heures: number;
  budget_initial: number;
  statut: string;
}

interface Travail {
  id: string;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  blocage_raison?: string;
  expertises?: {
    nom: string;
    code: string;
  };
  etapes?: {
    etapes: Array<{
      numero: number;
      titre: string;
      description: string;
      duree_minutes: number;
      outils: string[];
      difficulte: string;
      conseils?: string;
    }>;
  };
}

export default function ChantiersPage() {
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [travauxEnCours, setTravauxEnCours] = useState<Travail[]>([]);
  const [travauxBloques, setTravauxBloques] = useState<Travail[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTravailId, setEditingTravailId] = useState<string | null>(null);
  const [tempProgression, setTempProgression] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const chantierData = await getChantierDemo();
        
        if (chantierData) {
          setChantier(chantierData);
        
          const [statsData, enCours, bloques] = await Promise.all([
            getChantierStats(chantierData.id),
            getTravauxByStatut(chantierData.id, 'en_cours'),
            getTravauxByStatut(chantierData.id, 'bloqué')
          ]);
        
          setStats(statsData);
          setTravauxEnCours(enCours);
          setTravauxBloques(bloques);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
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

  if (!chantier) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>❌ Aucun chantier trouvé</h2>
        <p style={{ color: 'var(--gray)', marginTop: '1rem' }}>
          Il semblerait qu'il n'y ait pas encore de chantier actif.
        </p>
        <Link href="/" className="main-btn btn-orange" style={{ marginTop: '2rem', maxWidth: '200px' }}>
          ← Retour accueil
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ 
          color: 'var(--gray)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '0.9rem',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
        >
          ← Retour
        </Link>
      </div>

      {/* Header compact avec stats inline */}
      <div style={{
        marginBottom: '3rem',
        padding: '2rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{ 
              fontSize: '1.75rem', 
              marginBottom: '0.5rem',
              color: 'var(--gray-light)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              🏗️ {chantier.titre}
            </h1>
            <p style={{ 
              color: 'var(--gray)', 
              fontSize: '0.95rem',
              margin: 0 
            }}>
              Suivi détaillé de votre projet
            </p>
          </div>

          <Link 
            href="/chantiers/travaux" 
            className="main-btn btn-blue"
            style={{
              fontSize: '0.9rem',
              padding: '0.7rem 1.5rem',
              minHeight: 'auto',
              maxWidth: '200px',
              background: 'rgba(37, 99, 235, 0.15)',
              color: 'var(--blue)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--blue)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
              e.currentTarget.style.color = 'var(--blue)';
            }}
          >
            📋 Tous les lots
          </Link>
        </div>

        {/* Progress bar élégante */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${stats?.progressionMoyenne || 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)'
            }}></div>
          </div>
          <p style={{ 
            marginTop: '0.75rem', 
            color: 'var(--gray-light)', 
            fontSize: '1.1rem', 
            fontWeight: '600' 
          }}>
            {stats?.progressionMoyenne || 0}% complété
          </p>
        </div>

        {/* Stats inline compactes */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          fontSize: '0.9rem',
          color: 'var(--gray)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            <span>
              <strong style={{ color: 'var(--gray-light)' }}>
                {stats?.heuresEffectuees || 0}h
              </strong>
              <span style={{ opacity: 0.6 }}> / {stats?.heuresEstimees || 0}h</span>
              <span style={{ 
                color: 'var(--blue)', 
                marginLeft: '0.5rem',
                fontWeight: '600' 
              }}>
                {stats?.progressionHeures || 0}%
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>💰</span>
            <span>
              <strong style={{ color: 'var(--gray-light)' }}>
                {stats?.budgetReel?.toLocaleString() || 0}€
              </strong>
              <span style={{ opacity: 0.6 }}> / {stats?.budgetEstime?.toLocaleString() || 0}€</span>
              <span style={{ 
                color: 'var(--green)', 
                marginLeft: '0.5rem',
                fontWeight: '600' 
              }}>
                {stats?.progressionBudget || 0}%
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <span>
              <strong style={{ color: 'var(--gray-light)' }}>
                {stats?.termines || 0}
              </strong>
              <span style={{ opacity: 0.6 }}> / {stats?.total || 0}</span>
              <span style={{ 
                color: 'var(--orange)', 
                marginLeft: '0.75rem',
                fontWeight: '600' 
              }}>
                • {stats?.enCours || 0} en cours
              </span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Section EN COURS */}
      {travauxEnCours.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1.5rem',
            color: 'var(--gray-light)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ 
              background: 'rgba(37, 99, 235, 0.2)', 
              padding: '0.25rem 0.6rem', 
              borderRadius: '8px',
              fontSize: '1rem'
            }}>
              🎯 En cours
            </span>
            <span style={{ 
              background: 'rgba(255,255,255,0.08)', 
              padding: '0.25rem 0.6rem', 
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              {travauxEnCours.length}
            </span>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {travauxEnCours.map((travail) => (
              <div key={travail.id} style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
                borderRadius: '16px',
                padding: '1.75rem',
                borderLeft: '6px solid var(--blue)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(37, 99, 235, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                {/* Gradient overlay subtil */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ 
                      fontSize: '1.3rem', 
                      marginBottom: '0.5rem', 
                      fontWeight: '700',
                      color: 'var(--gray-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      ⚡ {travail.titre}
                    </h3>
                    <p style={{ 
                      fontSize: '0.95rem', 
                      color: 'var(--gray)', 
                      marginBottom: '1rem',
                      lineHeight: '1.5'
                    }}>
                      {travail.description}
                    </p>
                    
                    {travail.expertises && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(37, 99, 235, 0.15)',
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--blue)',
                        border: '1px solid rgba(37, 99, 235, 0.3)'
                      }}>
                        🛠️ {travail.expertises.nom}
                      </div>
                    )}
                  </div>

                  {/* Barre de progression élégante */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${travail.progression}%`,
                        height: '100%',
                        background: 'var(--blue)',
                        transition: 'width 0.5s ease',
                        boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '50%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))',
                          animation: 'shimmer 2s infinite'
                        }}></div>
                      </div>
                    </div>
                    <p style={{ 
                      marginTop: '0.75rem', 
                      fontSize: '0.95rem', 
                      fontWeight: '600',
                      color: 'var(--gray-light)'
                    }}>
                      {travail.progression}% complété
                    </p>
                  </div>

                  {/* Actions */}
                  {editingTravailId === travail.id ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '1rem',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={tempProgression}
                          onChange={(e) => setTempProgression(Number(e.target.value))}
                          style={{
                            flex: 1,
                            height: '8px',
                            borderRadius: '10px',
                            outline: 'none',
                            background: `linear-gradient(to right, var(--blue) 0%, var(--blue) ${tempProgression}%, rgba(255,255,255,0.1) ${tempProgression}%, rgba(255,255,255,0.1) 100%)`,
                            cursor: 'pointer',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                        />
                        <button
                          onClick={() => setTempProgression(100)}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: 'var(--gray-light)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                          }}
                        >
                          100%
                        </button>
                        <span style={{ 
                          fontWeight: '700', 
                          minWidth: '60px', 
                          textAlign: 'right',
                          fontSize: '1.2rem',
                          color: 'var(--blue)'
                        }}>
                          {tempProgression}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                          className="main-btn"
                          style={{
                            fontSize: '0.9rem',
                            padding: '0.7rem 1.5rem',
                            minHeight: 'auto',
                            flex: 1,
                            background: 'var(--green)',
                            color: 'white',
                            fontWeight: '700',
                            border: 'none'
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
                          className="main-btn"
                          style={{
                            fontSize: '0.9rem',
                            padding: '0.7rem 1.5rem',
                            minHeight: 'auto',
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            color: 'var(--gray-light)',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                          onClick={() => setEditingTravailId(null)}
                        >
                          ✕ Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button 
                        className="main-btn"
                        style={{
                          fontSize: '0.9rem',
                          padding: '0.7rem 1.25rem',
                          minHeight: 'auto',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--green)',
                          fontWeight: '700',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--green)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                          e.currentTarget.style.color = 'var(--green)';
                        }}
                        onClick={() => {
                          setTempProgression(travail.progression);
                          setEditingTravailId(travail.id);
                        }}
                      >
                        📊 Ajuster %
                      </button>
                      
                      {travail.etapes?.etapes && travail.etapes.etapes.length > 0 && (
                        <Link 
                          href={`/chantiers/travaux/${travail.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--gray-light)',
                            padding: '0.7rem 1.25rem',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          }}
                        >
                          🎯 {travail.etapes?.etapes?.length || 0} étapes
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section BLOQUÉ */}
      {travauxBloques.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1.5rem',
            color: 'var(--gray-light)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ 
              background: 'rgba(255, 107, 53, 0.2)', 
              padding: '0.25rem 0.6rem', 
              borderRadius: '8px',
              fontSize: '1rem'
            }}>
              ⚠️ Bloqué
            </span>
            <span style={{ 
              background: 'rgba(255,255,255,0.08)', 
              padding: '0.25rem 0.6rem', 
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              {travauxBloques.length}
            </span>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {travauxBloques.map((travail) => (
              <div key={travail.id} style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
                borderRadius: '16px',
                padding: '1.75rem',
                borderLeft: '6px solid var(--orange)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 53, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(255, 107, 53, 0.15) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{ 
                    fontSize: '1.3rem', 
                    marginBottom: '0.75rem', 
                    fontWeight: '700',
                    color: 'var(--gray-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    🚫 {travail.titre}
                  </h3>
                  <p style={{ 
                    fontSize: '0.95rem', 
                    marginBottom: '1.25rem',
                    color: 'var(--gray)',
                    lineHeight: '1.5',
                    padding: '1rem',
                    background: 'rgba(255, 107, 53, 0.1)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 107, 53, 0.2)'
                  }}>
                    💬 {travail.blocage_raison || 'Raison du blocage non spécifiée'}
                  </p>
                  <button 
                    className="main-btn"
                    style={{ 
                      fontSize: '0.9rem',
                      padding: '0.7rem 1.5rem',
                      minHeight: 'auto',
                      background: 'rgba(255, 107, 53, 0.15)',
                      color: 'var(--orange)',
                      fontWeight: '700',
                      border: '1px solid rgba(255, 107, 53, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--orange)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                      e.currentTarget.style.color = 'var(--orange)';
                    }}
                  >
                    🔓 Débloquer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Animation shimmer pour les progress bars */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
