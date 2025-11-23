'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllChantiers, getChantierStats } from '../lib/services/chantierService';
import CardButton from '@/app/components/CardButton';

interface Chantier {
  id: string;
  titre: string;
  description?: string;
  progression: number;
  duree_estimee_heures: number;
  duree_reelle_heures?: number;
  budget_initial: number;
  budget_consomme?: number;
  statut: string;
  created_at: string;
  date_debut_reelle?: string;
  date_fin_reelle?: string;
  nombre_travaux?: number;
  travaux_termines?: number;
  stats?: {
    progressionMoyenne: number;
    heuresEffectuees: number;
    heuresEstimees: number;
    progressionHeures: number;
    budgetReel: number;
    budgetEstime: number;
    progressionBudget: number;
    total: number;
    termines: number;
    enCours: number;
    bloques: number;
    aVenir: number;
  };
}

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNouveaux, setShowNouveaux] = useState(true);
  const [showEnCours, setShowEnCours] = useState(true);
  const [showTermines, setShowTermines] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const chantiersData = await getAllChantiers();
        
        // Charger les stats pour chaque chantier
        const chantiersWithStats = await Promise.all(
          chantiersData.map(async (chantier: any) => {
            try {
              const stats = await getChantierStats(chantier.id);
              return { ...chantier, stats };
            } catch (error) {
              console.error(`Error loading stats for chantier ${chantier.id}:`, error);
              return chantier;
            }
          })
        );
        
        setChantiers(chantiersWithStats);
      } catch (error) {
        console.error('Error loading chantiers:', error);
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

  // Grouper par statut - GÉRER LES ANCIENS STATUTS
  const nouveaux = chantiers.filter(c => c.statut === 'nouveau');
  const enCours = chantiers.filter(c => 
    c.statut === 'en_cours' || 
    c.statut === 'actif' || 
    !c.statut || 
    c.statut === null
  );
  const termines = chantiers.filter(c => c.statut === 'terminé');

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'nouveau': return 'var(--purple)';   // En paramétrage (violet)
      case 'en_cours': return 'var(--blue)';    // Actif/démarré (bleu)
      case 'terminé': return 'var(--green)';    // Fini (vert)
      case 'annulé': return 'var(--gray)';      // Abandonné (gris)
      case null: return 'var(--blue)';          // Chantiers sans statut = actif
      default: return 'var(--gray)';
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloqué': return 'var(--orange)';
      case 'annulé': return 'var(--gray)';
      case 'à_venir': return 'var(--purple)';
      default: return 'var(--gray)';
    }
  };

  

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'nouveau': return '✨';
      case 'en_cours':
      case 'actif':
      case null:
        return '🔨';
      case 'terminé': return '✅';
      default: return '🏗️';
    }
  };

  const ChantierCard = ({ chantier }: { chantier: Chantier }) => {
    const statusColor = getStatusColor(chantier.statut);
    const stats = chantier.stats;
    
    return (
      <div style={{
        background: `linear-gradient(90deg, #0d0d0d 0%, color-mix(in srgb, ${statusColor} 50%, #1a1a1a) 100%)`,
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
        borderLeft: `4px solid ${statusColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        const rgba = statusColor === 'var(--blue)' ? 'rgba(37, 99, 235, 0.25)' :
             statusColor === 'var(--green)' ? 'rgba(16, 185, 129, 0.25)' :
             'rgba(107, 114, 128, 0.25)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${rgba}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }}>
        {/* Header : Titre + Boutons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '1rem',
          gap: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              margin: 0, 
              marginBottom: '0.5rem',
              color: 'var(--gray-light)',
              fontWeight: '700',
              lineHeight: '1.2'
            }}>
              {getStatusIcon(chantier.statut)} {chantier.titre}
            </h3>
            {chantier.description && (
              <p style={{ 
                fontSize: '0.9rem', 
                color: 'var(--gray)', 
                margin: 0,
                lineHeight: '1.4'
              }}>
                {chantier.description}
              </p>
            )}
          </div>

          {/* BOUTONS SELON STATUT */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexShrink: 0,
            alignItems: 'flex-start'
          }}>
            {/* NOUVEAU */}
            {chantier.statut === 'nouveau' && (
              <>
                <CardButton
                  variant="secondary"
                  color="var(--green)"
                  icon="🚀"
                  label="Démarrer"
                  onClick={() => console.log('Démarrer chantier')}
                />
                <CardButton
                  variant="secondary"
                  color="var(--blue)"
                  icon="📝"
                  label="Configurer"
                  onClick={() => console.log('Configurer chantier')}
                />
                <CardButton
                  variant="danger"
                  icon="🗑️"
                  label="Supprimer"
                  onClick={() => console.log('Supprimer chantier')}
                />
              </>
            )}

            {/* EN COURS (ou ACTIF ou NULL - anciens statuts) */}
            {(chantier.statut === 'en_cours' || chantier.statut === 'actif' || !chantier.statut) && (
              <>
                <CardButton
                  variant="primary"
                  color="var(--blue)"
                  icon="📋"
                  label="Voir lots"
                  count={stats?.total || 0}
                  href={`/chantiers/${chantier.id}/travaux`}
                />
                <CardButton
                  variant="secondary"
                  color="var(--blue)"
                  icon="✏️"
                  label="Modifier"
                  onClick={() => console.log('Modifier chantier')}
                />
              </>
            )}

            {/* TERMINÉ */}
            {chantier.statut === 'terminé' && (
              <>
                <CardButton
                  variant="primary"
                  color="var(--blue)"
                  icon="📋"
                  label="Voir lots"
                  href={`/chantiers/${chantier.id}/travaux`}
                />
                <CardButton
                  variant="secondary"
                  color="var(--green)"
                  icon="📊"
                  label="Rapport"
                  onClick={() => console.log('Voir rapport')}
                />
              </>
            )}
          </div>
        </div>

        {/* BARRE DE PROGRESSION (si en cours ou terminé) */}
        {chantier.statut !== 'nouveau' && stats && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              width: '100%',
              height: '16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${stats.progressionMoyenne || 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </div>
        )}

        {/* Stats inline - COMPLÈTES COMME PAGE TRAVAUX */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '2rem',
          fontSize: '0.85rem',
          color: 'var(--gray)',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Progression */}
          {chantier.statut !== 'nouveau' && stats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>📊</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats.progressionMoyenne || 0}%
                </strong>
                <span style={{ opacity: 0.8, marginLeft: '0.3rem' }}>complété</span>
              </span>
            </div>
          )}

          {/* Heures */}
          {chantier.statut !== 'nouveau' && stats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>⏱️</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats.heuresEffectuees || 0}h
                </strong>
                <span style={{ opacity: 0.8 }}> / {stats.heuresEstimees || 0}h</span>
                <span style={{ color: 'var(--gray-light)', marginLeft: '0.5rem', fontWeight: '700' }}>
                  {stats.progressionHeures || 0}%
                </span>
              </span>
            </div>
          )}

          {/* Budget */}
          {chantier.statut !== 'nouveau' && stats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>💰</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats.budgetReel?.toLocaleString() || 0}€
                </strong>
                <span style={{ opacity: 0.8 }}> / {stats.budgetEstime?.toLocaleString() || 0}€</span>
                <span style={{ color: 'var(--gray-light)', marginLeft: '0.5rem', fontWeight: '700' }}>
                  {stats.progressionBudget || 0}%
                </span>
              </span>
            </div>
          )}

          {/* Tâches avec détails */}
          {chantier.statut !== 'nouveau' && stats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>✅</span>
              <span>
                <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                  {stats.termines || 0}
                </strong>
                <span style={{ opacity: 0.8 }}> / {stats.total || 0}</span>
                <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {stats.termines || 0} terminé{stats.termines > 1 ? 's' : ''}
                </span>
                <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {stats.enCours || 0} en cours
                </span>
                <span style={{ color: 'var(--orange)', marginLeft: '0.6rem', fontWeight: '700' }}>
                  • {stats.bloques || 0} bloqué{stats.bloques > 1 ? 's' : ''}
                </span>
              </span>
            </div>
          )}

          {/* Date création pour nouveaux */}
          {chantier.statut === 'nouveau' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>📅</span>
              <span style={{ color: 'var(--gray-light)' }}>
                Créé le {new Date(chantier.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionHeader = ({ 
    title, 
    count, 
    color, 
    icon, 
    isExpanded, 
    onToggle 
  }: { 
    title: string; 
    count: number; 
    color: string; 
    icon: string;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div 
        onClick={onToggle}
        style={{ 
          fontSize: '1.15rem', 
          marginBottom: '0.75rem',
          color: color,
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          padding: '0.5rem 0',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>
          {isExpanded ? '▽' : '▶'}
        </span>
        <span>{icon} {title}</span>
        <span style={{ 
          background: `${color}88`,
          color: color,
          border: `2px solid ${color}`,
          minWidth: '28px',
          height: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: '0.9rem',
          fontWeight: '700',
          padding: '0 0.35rem'
        }}>
          {count}
        </span>
      </div>
      <div style={{
        height: '2px',
        background: `linear-gradient(90deg, transparent 0%, ${color} 80%)`,
        marginBottom: '0.75rem'
      }}></div>
    </div>
  );

  return (
    <>
      {/* BREADCRUMB FIXED - PADDING COHÉRENT */}
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
          padding: '1rem',
          display: 'flex', 
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1rem'
        }}>
          <Link href="/" style={{ 
            color: 'var(--gray)', 
            transition: 'color 0.2s',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-light)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray)'}
          >
            ← Accueil
          </Link>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--gray-light)', fontWeight: '600' }}>
            🏗️ Mes chantiers ({chantiers.length})
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 1rem',
        paddingTop: '85px'
      }}>
    
        {/* BOUTON NOUVEAU CHANTIER - AU DESSUS DES SECTIONS */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '1rem',
        }}>
          <CardButton
            variant="primary"
            color="var(--orange)"
            icon="✨"
            label="Nouveau chantier"
            onClick={() => {
              // TODO: Implémenter plus tard
              console.log('Créer nouveau chantier');
            }}
          />
        </div>

        {/* Section NOUVEAUX */}
        {nouveaux.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <SectionHeader 
              title="Nouveaux" 
              count={nouveaux.length} 
              color="var(--gray)" 
              icon="✨"
              isExpanded={showNouveaux}
              onToggle={() => setShowNouveaux(!showNouveaux)}
            />
            {showNouveaux && nouveaux.map(chantier => <ChantierCard key={chantier.id} chantier={chantier} />)}
          </section>
        )}

        {/* Section EN COURS - BLEU */}
        {enCours.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <SectionHeader 
              title="En cours" 
              count={enCours.length} 
              color="var(--blue)" 
              icon="🏗️"
              isExpanded={showEnCours}
              onToggle={() => setShowEnCours(!showEnCours)}
            />
            {showEnCours && enCours.map(chantier => <ChantierCard key={chantier.id} chantier={chantier} />)}
          </section>
        )}

        {/* Section TERMINÉS */}
        {termines.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <SectionHeader 
              title="Terminés" 
              count={termines.length} 
              color="var(--green)" 
              icon="✅"
              isExpanded={showTermines}
              onToggle={() => setShowTermines(!showTermines)}
            />
            {showTermines && termines.map(chantier => <ChantierCard key={chantier.id} chantier={chantier} />)}
          </section>
        )}
      </div>
    </>
  );
}
