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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.75rem 1rem' }}>
      {/* Back button + Header compact inline */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <Link href="/" style={{ 
          color: 'var(--gray)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.35rem',
          fontSize: '0.85rem',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
        >
          ← Retour
        </Link>

        <Link 
          href="/chantiers/travaux" 
          className="main-btn btn-blue"
          style={{
            fontSize: '0.8rem',
            padding: '0.5rem 1rem',
            minHeight: 'auto',
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

      {/* État des lieux compact */}
      <div style={{
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '0.5rem',
          color: 'var(--gray-light)',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🏗️ {chantier.titre}
        </h1>

        {/* Progress bar */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${stats?.progressionMoyenne || 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <p style={{ 
            marginTop: '0.4rem', 
            color: 'var(--gray-light)', 
            fontSize: '0.95rem', 
            fontWeight: '600' 
          }}>
            {stats?.progressionMoyenne || 0}% complété
          </p>
        </div>

        {/* Stats inline ultra compact */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--gray)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>⏱️</span>
            <span>
              <strong style={{ color: 'var(--gray-light)' }}>
                {stats?.heuresEffectuees || 0}h
              </strong>
              <span style={{ opacity: 0.5 }}> / {stats?.heuresEstimees || 0}h</span>
              <span style={{ color: 'var(--blue)', marginLeft: '0.4rem', fontWeight: '600' }}>
                {stats?.progressionHeures || 0}%
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>💰</span>
            <span>
              <strong style={{ color: 'var(--gray-light)' }}>
                {stats?.budgetReel?.toLocaleString() || 0}€
              </strong>
              <span style={{ opacity: 0.5 }}> / {stats?.budgetEstime?.toLocaleString() || 0}€</span>
              <span style={{ color: 'var(--green)', marginLeft: '0.4rem', fontWeight: '600' }}>
                {stats?.progressionBudget || 0}%
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>✅</span>
            <span>
              <strong style={{ color: 'var(--gray-light)' }}>
                {stats?.termines || 0}
              </strong>
              <span style={{ opacity: 0.5 }}> / {stats?.total || 0}</span>
              <span style={{ color: 'var(--orange)', marginLeft: '0.5rem', fontWeight: '600' }}>
                • {stats?.enCours || 0} en cours
              </span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Section EN COURS */}
      {travauxEnCours.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontSize: '1.05rem', 
            marginBottom: '0.75rem',
            color: 'var(--gray-light)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ 
              background: 'rgba(37, 99, 235, 0.2)', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              🎯 En cours
            </span>
            <span style={{ 
              background: 'rgba(255,255,255,0.08)', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              {travauxEnCours.length}
            </span>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {travauxEnCours.map((travail) => (
              <div key={travail.id} style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
                borderRadius: '12px',
                padding: '1rem',
                borderLeft: '4px solid var(--blue)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
              }}>
                {/* Header avec titre + boutons */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '0.75rem',
                  gap: '1rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      marginBottom: '0.35rem', 
                      fontWeight: '700',
                      color: 'var(--gray-light)',
                      lineHeight: '1.2'
                    }}>
                      ⚡ {travail.titre}
                    </h3>
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--gray)', 
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      {travail.description}
                    </p>
                  </div>

                  {/* Boutons à droite */}
                  {editingTravailId !== travail.id && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button 
                        className="main-btn"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.5rem 0.85rem',
                          minHeight: 'auto',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--green)',
                          fontWeight: '600',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          whiteSpace: 'nowrap'
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
                        📊 Ajuster
                      </button>
                      
                      {travail.etapes?.etapes && travail.etapes.etapes.length > 0 && (
                        <Link 
                          href={`/chantiers/travaux/${travail.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--gray-light)',
                            padding: '0.5rem 0.85rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          }}
                        >
                          🎯 {travail.etapes?.etapes?.length || 0}
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Barre de progression OU Slider inline */}
                {editingTravailId === travail.id ? (
                  // MODE ÉDITION : Slider inline remplace la barre
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                          borderRadius: '6px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
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
                        minWidth: '50px', 
                        textAlign: 'right',
                        fontSize: '1rem',
                        color: 'var(--blue)'
                      }}>
                        {tempProgression}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="main-btn"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.5rem 1rem',
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
                          fontSize: '0.8rem',
                          padding: '0.5rem 1rem',
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
                  // MODE NORMAL : Barre de progression simple
                  <div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginBottom: '0.4rem'
                    }}>
                      <div style={{
                        width: `${travail.progression}%`,
                        height: '100%',
                        background: 'var(--blue)',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                    <p style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      color: 'var(--gray-light)',
                      margin: 0
                    }}>
                      {travail.progression}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section BLOQUÉ */}
      {travauxBloques.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontSize: '1.05rem', 
            marginBottom: '0.75rem',
            color: 'var(--gray-light)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ 
              background: 'rgba(255, 107, 53, 0.2)', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              ⚠️ Bloqué
            </span>
            <span style={{ 
              background: 'rgba(255,255,255,0.08)', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              {travauxBloques.length}
            </span>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {travauxBloques.map((travail) => (
              <div key={travail.id} style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
                borderRadius: '12px',
                padding: '1rem',
                borderLeft: '4px solid var(--orange)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 107, 53, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      marginBottom: '0.35rem', 
                      fontWeight: '700',
                      color: 'var(--gray-light)',
                      lineHeight: '1.2'
                    }}>
                      🚫 {travail.titre}
                    </h3>
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--gray)',
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      💬 {travail.blocage_raison || 'Raison du blocage non spécifiée'}
                    </p>
                  </div>

                  <button 
                    className="main-btn"
                    style={{ 
                      fontSize: '0.8rem',
                      padding: '0.5rem 0.85rem',
                      minHeight: 'auto',
                      background: 'rgba(255, 107, 53, 0.15)',
                      color: 'var(--orange)',
                      fontWeight: '600',
                      border: '1px solid rgba(255, 107, 53, 0.3)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
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
    </div>
  );
}
