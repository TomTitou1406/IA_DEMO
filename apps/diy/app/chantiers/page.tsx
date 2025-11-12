'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierDemo, getChantierStats } from '../lib/services/chantierService';
import { getTravauxByStatut } from '../lib/services/travauxService';

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
}

export default function ChantiersPage() {
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [travauxEnCours, setTravauxEnCours] = useState<Travail[]>([]);
  const [travauxBloques, setTravauxBloques] = useState<Travail[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Récupère le chantier
        const chantierData = await getChantierDemo();
        
        if (chantierData) {
          setChantier(chantierData);
        
          // Récupère stats ET travaux en parallèle
          const [statsData, enCours, bloques] = await Promise.all([
            getChantierStats(chantierData.id),  // ← AJOUTÉ
            getTravauxByStatut(chantierData.id, 'en_cours'),
            getTravauxByStatut(chantierData.id, 'bloqué')
          ]);
        
          setStats(statsData);  // ← AJOUTÉ
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
    <div className="container">
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'var(--gray)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Retour
        </Link>
      </div>

      {/* Header Chantier */}
      <div className="chantier-header fade-in" style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(5px)',
        borderRadius: 'var(--card-radius)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
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
      
        {/* Stats détaillées - VERSION COMPACTE ALIGNÉE */}
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
            <span style={{ color: 'var(--gray)' }}>Heures :</span>{' '}
            <span style={{ fontWeight: '600' }}>
              ⏱️ {stats?.heuresEffectuees || 0}h / {stats?.heuresEstimees || 0}h
            </span>
            <span style={{ color: 'var(--blue)', marginLeft: '0.5rem', fontWeight: '600' }}>
              ({stats?.progressionHeures || 0}%)
            </span>
          </div>
          
          <div style={{ color: 'var(--gray-dark)' }}>
            <span style={{ color: 'var(--gray)' }}>Budget :</span>{' '}
            <span style={{ fontWeight: '600' }}>
              💰 {stats?.budgetReel?.toLocaleString() || 0}€ / {stats?.budgetEstime?.toLocaleString() || 0}€
            </span>
            <span style={{ color: 'var(--green)', marginLeft: '0.5rem', fontWeight: '600' }}>
              ({stats?.progressionBudget || 0}%)
            </span>
          </div>
        
          <div style={{ color: 'var(--gray-dark)' }}>
            <span style={{ color: 'var(--gray)' }}>Tâches :</span>{' '}
            <span style={{ fontWeight: '600' }}>
              ✅ {stats?.termines || 0} / {stats?.total || 0}
            </span>
            <span style={{ color: 'var(--orange)', marginLeft: '0.5rem', fontWeight: '600' }}>
              • {stats?.enCours || 0} en cours
            </span>
          </div>
        </div>
      
      {/* Section EN COURS */}
      {travauxEnCours.length > 0 && (
        <section style={{ marginBottom: '2rem' }} className="fade-in">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎯 En cours ({travauxEnCours.length})
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {travauxEnCours.map((travail) => (
              <div key={travail.id} style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(5px)',
                borderRadius: 'var(--card-radius)',
                padding: '1.25rem',
                borderLeft: '4px solid var(--blue)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚡ {travail.titre}</span>
                    <span style={{
                      background: 'var(--blue-light)',
                      color: 'var(--blue)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {travail.progression}%
                    </span>
                  </h3>
                </div>

                {/* Progress bar mini */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--gray-light)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                </div>

                <button className="main-btn btn-blue" style={{ 
                  maxWidth: '200px',
                  fontSize: '0.9rem',
                  padding: '0.6rem 1rem',
                  minHeight: 'auto'
                }}>
                  💬 Discuter
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section BLOQUÉ */}
      {travauxBloques.length > 0 && (
        <section style={{ marginBottom: '2rem' }} className="fade-in">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ Bloqué ({travauxBloques.length})
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {travauxBloques.map((travail) => (
              <div key={travail.id} style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(5px)',
                borderRadius: 'var(--card-radius)',
                padding: '1.25rem',
                borderLeft: '4px solid var(--orange)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>🚫 {travail.titre}</h3>
                <p style={{ color: 'var(--orange)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {travail.blocage_raison || 'Raison du blocage non spécifiée'}
                </p>
                <button className="main-btn btn-orange" style={{ 
                  maxWidth: '200px',
                  fontSize: '0.9rem',
                  padding: '0.6rem 1rem',
                  minHeight: 'auto'
                }}>
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
        marginTop: '2rem'
      }} className="fade-in">
        <Link href="/chantiers/travaux" className="main-btn btn-blue">
          📋 Tous les travaux
        </Link>
        <Link href="/chat" className="main-btn btn-green">
          🤖 Parler à l'assistant
        </Link>
      </div>
    </div>
  );
}
