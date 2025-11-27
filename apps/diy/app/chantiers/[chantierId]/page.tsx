/**
 * /chantiers/[chantierId]/page.tsx
 * 
 * Page unifiée Création / Édition / Récap de chantier
 * - Si id === "nouveau" → mode création (conversation IA)
 * - Sinon → mode récap/édition (affiche le chantier + actions)
 * 
 * @version 2.0
 * @date 27 novembre 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ChantierData {
  id: string;
  titre: string;
  description?: string;
  budget_initial?: number;
  duree_estimee_heures?: number;
  statut: string;
  progression: number;
  metadata?: {
    budget_inclut_materiaux?: boolean;
    disponibilite_heures_semaine?: number;
    deadline_semaines?: number;
    competences_ok?: string[];
    competences_faibles?: string[];
    travaux_pro_suggeres?: string[];
    contraintes?: string;
  };
  created_at: string;
}

export default function ChantierEditPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.chantierId as string;
  const isCreation = chantierId === 'nouveau';

  // États
  const [chantier, setChantier] = useState<ChantierData | null>(null);
  const [loading, setLoading] = useState(!isCreation);
  const [error, setError] = useState<string | null>(null);
  const [isLaunchingPhasage, setIsLaunchingPhasage] = useState(false);

  // Charger le chantier si mode édition
  useEffect(() => {
    if (isCreation) return;

    async function loadChantier() {
      setLoading(true);
      setError(null);
      
      try {
        const { getChantierById } = await import('@/app/lib/services/chantierService');
        const data = await getChantierById(chantierId);
        
        if (!data) {
          setError('Chantier non trouvé');
          return;
        }
        
        setChantier(data);
      } catch (err) {
        console.error('Erreur chargement chantier:', err);
        setError('Erreur lors du chargement du chantier');
      } finally {
        setLoading(false);
      }
    }

    loadChantier();
  }, [chantierId, isCreation]);

  // Ouvrir l'assistant pour modifier
  const handleModifier = () => {
    window.dispatchEvent(new CustomEvent('openAssistant'));
  };

  // Lancer le phasage (génération des lots)
  const handleLancerPhasage = async () => {
    setIsLaunchingPhasage(true);
    
    try {
      // TODO: Étape suivante - appeler generatorService pour générer les lots
      console.log('Lancement du phasage pour:', chantier);
      alert('🚧 Phasage en cours de développement...');
      
      // Après génération des lots, rediriger vers la page travaux
      // router.push(`/chantiers/${chantierId}/travaux`);
      
    } catch (err) {
      console.error('Erreur phasage:', err);
      alert('Erreur lors du phasage');
    } finally {
      setIsLaunchingPhasage(false);
    }
  };

  // ==================== MODE CRÉATION ====================
  if (isCreation) {
    return (
      <>
        {/* BREADCRUMB */}
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
            padding: '0.75rem 1rem',
            display: 'flex', 
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem'
          }}>
            <Link 
              href="/chantiers" 
              style={{ color: 'var(--gray)', fontWeight: '500' }}
            >
              ← Mes chantiers
            </Link>
            <span style={{ color: 'var(--gray)' }}>/</span>
            <span style={{ color: 'var(--orange)', fontWeight: '600' }}>
              ✨ Nouveau chantier
            </span>
          </div>
        </div>

        {/* CONTENU CRÉATION */}
        <div style={{ 
          maxWidth: '500px', 
          margin: '0 auto', 
          padding: '1rem',
          paddingTop: '70px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏗️</div>
            
            <h1 style={{ 
              fontSize: '1.4rem', 
              fontWeight: '700', 
              color: 'var(--gray-light)',
              marginBottom: '0.5rem'
            }}>
              Nouveau chantier
            </h1>
            
            <p style={{ 
              fontSize: '0.95rem', 
              color: 'var(--gray)',
              marginBottom: '1.25rem',
              lineHeight: '1.5'
            }}>
              Je vais t'aider à décrire ton projet, prêt à démarrer ?
            </p>

            {/* Tips */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              {['💬 Projet', '💰 Budget', '⏰ Dispo', '🎯 Compétences'].map((tip) => (
                <span key={tip} style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  color: 'var(--gray-light)'
                }}>
                  {tip}
                </span>
              ))}
            </div>

            {/* Boutons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openAssistant'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  padding: '0.75rem 1.5rem',
                  width: '100%',
                  maxWidth: '280px',
                  background: 'var(--orange)',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                }}
              >
                <span>✨ Démarrer avec l'assistant</span>
              </button>

              <button
                onClick={() => {/* TODO: ouvrir vidéo */}}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: 'var(--gray-light)',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  padding: '0.6rem 1.25rem',
                  width: '100%',
                  maxWidth: '280px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span>🎬 Voir une vidéo explicative</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ==================== MODE CHARGEMENT ====================
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        color: 'var(--gray)'
      }}>
        <div className="spinner" style={{ marginRight: '1rem' }}></div>
        Chargement du chantier...
      </div>
    );
  }

  // ==================== MODE ERREUR ====================
  if (error || !chantier) {
    return (
      <div style={{ 
        maxWidth: '500px', 
        margin: '0 auto', 
        padding: '2rem 1rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
        <h2 style={{ color: 'var(--gray-light)', marginBottom: '0.5rem' }}>
          {error || 'Chantier non trouvé'}
        </h2>
        <Link href="/chantiers" style={{ color: 'var(--orange)' }}>
          ← Retour aux chantiers
        </Link>
      </div>
    );
  }

  // ==================== MODE RÉCAP/ÉDITION ====================
  const meta = chantier.metadata || {};

  return (
    <>
      {/* BREADCRUMB */}
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
          padding: '0.75rem 1rem',
          display: 'flex', 
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.95rem'
        }}>
          <Link href="/chantiers" style={{ color: 'var(--gray)', fontWeight: '500' }}>
            ← Mes chantiers
          </Link>
          <span style={{ color: 'var(--gray)' }}>/</span>
          <span style={{ color: 'var(--orange)', fontWeight: '600' }}>
            🏗️ {chantier.titre}
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        padding: '1rem',
        paddingTop: '70px'
      }}>
        
        {/* CARTE RÉCAP */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(249, 115, 22, 0.04) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          
          {/* Header */}
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: 'var(--gray-light)',
                margin: 0,
                marginBottom: '0.25rem'
              }}>
                🏗️ {chantier.titre}
              </h1>
              <span style={{
                display: 'inline-block',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: chantier.statut === 'nouveau' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: chantier.statut === 'nouveau' ? '#a855f7' : '#3b82f6'
              }}>
                {chantier.statut === 'nouveau' ? '✨ Nouveau' : '🔄 En cours'}
              </span>
            </div>
          </div>

          {/* Contenu */}
          <div style={{ padding: '1.25rem' }}>
            
            {/* Description */}
            {chantier.description && (
              <RecapItem 
                icon="📋" 
                label="Projet" 
                value={chantier.description}
              />
            )}

            {/* Budget */}
            {chantier.budget_initial && (
              <RecapItem 
                icon="💰" 
                label="Budget maximum" 
                value={`${chantier.budget_initial.toLocaleString()} € ${meta.budget_inclut_materiaux ? '(matériaux inclus)' : ''}`}
              />
            )}

            {/* Disponibilité */}
            {meta.disponibilite_heures_semaine && (
              <RecapItem 
                icon="⏰" 
                label="Disponibilité" 
                value={`${meta.disponibilite_heures_semaine}h / semaine`}
              />
            )}

            {/* Deadline */}
            {meta.deadline_semaines && (
              <RecapItem 
                icon="📅" 
                label="Objectif" 
                value={`Terminer en ${meta.deadline_semaines} semaines`}
              />
            )}

            {/* Compétences OK */}
            {meta.competences_ok && meta.competences_ok.length > 0 && (
              <RecapItem icon="✅" label="À l'aise avec">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {meta.competences_ok.map((comp, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '15px',
                      fontSize: '0.8rem'
                    }}>
                      {comp}
                    </span>
                  ))}
                </div>
              </RecapItem>
            )}

            {/* Compétences faibles */}
            {meta.competences_faibles && meta.competences_faibles.length > 0 && (
              <RecapItem icon="⚠️" label="Moins à l'aise avec">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {meta.competences_faibles.map((comp, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '15px',
                      fontSize: '0.8rem'
                    }}>
                      {comp}
                    </span>
                  ))}
                </div>
              </RecapItem>
            )}

            {/* Travaux pro */}
            {meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0 && (
              <RecapItem icon="👷" label="À confier à un pro (si nécessaire)">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {meta.travaux_pro_suggeres.map((travail, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#818cf8',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '15px',
                      fontSize: '0.8rem'
                    }}>
                      {travail}
                    </span>
                  ))}
                </div>
              </RecapItem>
            )}

            {/* Contraintes */}
            {meta.contraintes && (
              <RecapItem 
                icon="📝" 
                label="Contraintes" 
                value={meta.contraintes}
              />
            )}

          </div>

          {/* Footer - Actions */}
          <div style={{
            padding: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={handleModifier}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'var(--gray-light)',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              ✏️ Modifier
            </button>
            <button
              onClick={handleLancerPhasage}
              disabled={isLaunchingPhasage}
              style={{
                flex: 2,
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--orange)',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: isLaunchingPhasage ? 'not-allowed' : 'pointer',
                opacity: isLaunchingPhasage ? 0.7 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {isLaunchingPhasage ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                  Phasage en cours...
                </>
              ) : (
                <>🚀 Lancer le phasage</>
              )}
            </button>
          </div>
        </div>

        {/* Info supplémentaire */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--gray)',
            margin: 0
          }}>
            💡 Le phasage va générer automatiquement les <strong>lots de travaux</strong> adaptés à ton projet.
            Tu pourras ensuite les ajuster et démarrer ton chantier !
          </p>
        </div>
      </div>
    </>
  );
}

// Composant pour chaque item du récap
function RecapItem({ 
  icon, 
  label, 
  value, 
  children 
}: { 
  icon: string; 
  label: string; 
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      marginBottom: '1rem',
      padding: '0.75rem',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--gray)',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
          </div>
          {value && (
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--gray-light)',
              lineHeight: '1.4'
            }}>
              {value}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
