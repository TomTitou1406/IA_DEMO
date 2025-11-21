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
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'var(--gray-light)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Retour
        </Link>
      </div>

      {/* Header Chantier */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(5px)',
        borderRadius: 'var(--card-radius)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        maxWidth: '900px',
        margin: '0 auto 2rem auto'
      }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: 'var(--gray-dark)' }}>
          🏗️ {chantier.titre}
        </h1>
      
        {/* Progress Bar principale */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            width: '100%',
            height: '12px',
            background: 'var(--gray-light)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${stats?.progressionMoyenne || 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
              transition: 'width 0.3s'
            }}></div>
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--gray-dark)', fontSize: '1rem', fontWeight: '600' }}>
            {stats?.progressionMoyenne || 0}% complété
          </p>
        </div>
      
        {/* Stats détaillées */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem', 
          fontSize: '0.9rem',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--gray-light)'
        }}>
          <div style={{ color: 'var(--gray-dark)' }}>
            <span style={{ color: 'var(--gray)' }}>⏱️ Heures :</span>{' '}
            <span style={{ fontWeight: '600' }}>
              {stats?.heuresEffectuees || 0}h / {stats?.heuresEstimees || 0}h
            </span>
            <span style={{ color: 'var(--blue)', marginLeft: '0.5rem', fontWeight: '600' }}>
              ({stats?.progressionHeures || 0}%)
            </span>
          </div>
          
          <div style={{ color: 'var(--gray-dark)' }}>
            <span style={{ color: 'var(--gray)' }}>💰 Budget :</span>{' '}
            <span style={{ fontWeight: '600' }}>
              {stats?.budgetReel?.toLocaleString() || 0}€ / {stats?.budgetEstime?.toLocaleString() || 0}€
            </span>
            <span style={{ color: 'var(--green)', marginLeft: '0.5rem', fontWeight: '600' }}>
              ({stats?.progressionBudget || 0}%)
            </span>
          </div>
        
          <div style={{ color: 'var(--gray-dark)' }}>
            <span style={{ color: 'var(--gray)' }}>✅ Tâches :</span>{' '}
            <span style={{ fontWeight: '600' }}>
              {stats?.termines || 0} / {stats?.total || 0}
            </span>
            <span style={{ color: 'var(--orange)', marginLeft: '0.5rem', fontWeight: '600' }}>
              • {stats?.enCours || 0} en cours
            </span>
          </div>
        </div>
      </div>
      
      {/* Section EN COURS */}
      {travauxEnCours.length > 0 && (
        <section style={{ marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          <h2 style={{ 
            fontSize: '1.3rem', 
            marginBottom: '1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: 'var(--gray-light)',
            fontWeight: '700'
          }}>
            🎯 En cours ({travauxEnCours.length})
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {travauxEnCours.map((travail) => (
              <div key={travail.id} style={{
                background: 'var(--blue)',
                color: 'white',
                borderRadius: 'var(--card-radius)',
                padding: '1.5rem',
                borderLeft: '4px solid #1e40af',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '700' }}>
                    ⚡ {travail.titre}
                  </h3>
                  <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '1rem' }}>
                    {travail.description}
                  </p>
                  
                  {travail.expertises && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'rgba(255,255,255,0.2)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      🛠️ {travail.expertises.nom}
                    </div>
                  )}
                </div>

                {/* Barre de progression */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    width: '100%',
                    height: '10px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${travail.progression}%`,
                      height: '100%',
                      background: 'rgba(255,255,255,0.9)',
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                    {travail.progression}% complété
                  </p>
                </div>

                {/* Actions */}
                {editingTravailId === travail.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tempProgression}
                        onChange={(e) => setTempProgression(Number(e.target.value))}
                        style={{
                          flex: 1,
                          width: '100%',
                          height: '12px',
                          borderRadius: '10px',
                          outline: 'none',
                          background: `linear-gradient(to right, white 0%, white ${tempProgression}%, rgba(255,255,255,0.3) ${tempProgression}%, rgba(255,255,255,0.3) 100%)`,
                          cursor: 'pointer',
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                      />
                      <button
                        onClick={() => setTempProgression(100)}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          color: 'white'
                        }}
                      >
                        100%
                      </button>
                      <span style={{ fontWeight: '700', minWidth: '50px', textAlign: 'right', fontSize: '1.1rem' }}>
                        {tempProgression}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="main-btn"
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.5rem 1rem',
                          minHeight: 'auto',
                          flex: 1,
                          background: 'white',
                          color: 'var(--blue)',
                          fontWeight: '700'
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
                          fontSize: '0.85rem',
                          padding: '0.5rem 1rem',
                          minHeight: 'auto',
                          flex: 1,
                          background: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          border: '2px solid rgba(255,255,255,0.4)'
                        }}
                        onClick={() => setEditingTravailId(null)}
                      >
                        ✕ Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      className="main-btn"
                      style={{
                        fontSize: '0.85rem',
                        padding: '0.5rem 1rem',
                        minHeight: 'auto',
                        maxWidth: '160px',
                        background: 'white',
                        color: 'var(--blue)',
                        fontWeight: '700',
                        border: '2px solid white'
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
                          background: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '10px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          border: '2px solid rgba(255,255,255,0.3)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        🎯 {travail.etapes?.etapes?.length || 0} étapes
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section BLOQUÉ */}
      {travauxBloques.length > 0 && (
        <section style={{ marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          <h2 style={{ 
            fontSize: '1.3rem', 
            marginBottom: '1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: 'var(--gray-light)',
            fontWeight: '700'
          }}>
            ⚠️ Bloqué ({travauxBloques.length})
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {travauxBloques.map((travail) => (
              <div key={travail.id} style={{
                background: 'var(--orange)',
                color: 'white',
                borderRadius: 'var(--card-radius)',
                padding: '1.5rem',
                borderLeft: '4px solid #e54e20',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '700' }}>
                  🚫 {travail.titre}
                </h3>
                <p style={{ fontSize: '0.95rem', marginBottom: '1rem', opacity: 0.95, fontWeight: '500' }}>
                  {travail.blocage_raison || 'Raison du blocage non spécifiée'}
                </p>
                <button 
                  className="main-btn"
                  style={{ 
                    maxWidth: '200px',
                    fontSize: '0.9rem',
                    padding: '0.6rem 1rem',
                    minHeight: 'auto',
                    background: 'white',
                    color: 'var(--orange)',
                    fontWeight: '700',
                    border: '2px solid white'
                  }}
                >
                  💬 Débloquer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions rapides */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginTop: '2rem',
        maxWidth: '800px',
        margin: '2rem auto'
      }}>
        <Link href="/chantiers/travaux" className="main-btn btn-blue">
          📋 Tous les lots (travaux)
        </Link>
      </div>
    </div>
  );
}
