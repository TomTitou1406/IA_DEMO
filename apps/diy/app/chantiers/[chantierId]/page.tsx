/**
 * /chantiers/[chantierId]/page.tsx
 * 
 * Page unifiée Création / Édition / Récap de chantier
 * - Si id === "nouveau" → mode création (conversation IA)
 * - Sinon → mode récap/édition (affiche le chantier + actions)
 * 
 * Design compact avec 2 colonnes sur desktop
 * Affiche tous les champs enrichis (surface, équipements, réseaux, etc.)
 * 
 * @version 2.2
 * @date 28 novembre 2025
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
    // Budget & Planning
    budget_inclut_materiaux?: boolean;
    disponibilite_heures_semaine?: number;
    deadline_semaines?: number;
    // Infos enrichies
    surface_m2?: number;
    style_souhaite?: string;
    etat_existant?: string;
    elements_a_deposer?: string[];
    elements_a_conserver?: string[];
    equipements_souhaites?: string[];
    reseaux?: {
      electricite_a_refaire: boolean;
      plomberie_a_refaire: boolean;
      ventilation_a_prevoir: boolean;
    };
    // Compétences
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
  const handleLancerPhasage = () => {
    router.push(`/chantiers/${chantierId}/phasage`);
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

  // ==================== MODE ÉDITION/RÉCAP ====================

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  if (error || !chantier) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
        <p style={{ color: 'var(--red)', marginBottom: '1rem' }}>{error || 'Chantier non trouvé'}</p>
        <Link href="/chantiers" style={{ color: 'var(--blue)' }}>
          ← Retour aux chantiers
        </Link>
      </div>
    );
  }

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
          <Link 
            href="/chantiers" 
            style={{ color: 'var(--gray)', fontWeight: '500' }}
          >
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
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '1rem',
        paddingTop: '70px',
      }}>
        
        {/* CARTE PRINCIPALE - Style cohérent avec les autres pages */}
        <div style={{
          background: 'linear-gradient(90deg, #0d0d0d 0%, color-mix(in srgb, var(--orange) 30%, #1a1a1a) 100%)',
          borderRadius: '16px',
          borderLeft: '4px solid var(--orange)',
          boxShadow: '0 4px 16px rgba(249, 115, 22, 0.15)',
          overflow: 'hidden'
        }}>
          
          {/* Header avec titre et badge */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏗️</span>
              <div>
                <h1 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700',
                  color: 'var(--gray-light)',
                  margin: 0
                }}>
                  {chantier.titre}
                </h1>
                <span style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  marginTop: '0.25rem',
                  background: chantier.statut === 'nouveau' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: chantier.statut === 'nouveau' ? '#a855f7' : '#3b82f6'
                }}>
                  {chantier.statut === 'nouveau' ? '✨ Nouveau' : '🔄 En cours'}
                </span>
              </div>
            </div>
            
            {/* Boutons d'action - TOUJOURS VISIBLES */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleModifier}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--gray-light)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.borderColor = 'var(--gray-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                ✏️ Modifier
              </button>
              <button
                onClick={handleLancerPhasage}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--orange)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🚀 Lancer le phasage
              </button>
            </div>
          </div>

          {/* Contenu en GRID 2 colonnes sur desktop */}
          <div style={{
            padding: '1rem 1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.75rem'
          }}>
            
            {/* COLONNE GAUCHE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              {/* Description */}
              {chantier.description && (
                <CompactItem 
                  icon="📋" 
                  label="Projet" 
                  value={chantier.description}
                  fullWidth
                />
              )}

              {/* Surface + Style sur même ligne */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {meta.surface_m2 && (
                  <CompactItem 
                    icon="📐" 
                    label="Surface" 
                    value={`${meta.surface_m2} m²`}
                  />
                )}
                {meta.style_souhaite && (
                  <CompactItem 
                    icon="🎨" 
                    label="Style" 
                    value={meta.style_souhaite}
                  />
                )}
              </div>

              {/* Budget + Dispo + Deadline */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {chantier.budget_initial && (
                  <CompactItem 
                    icon="💰" 
                    label="Budget" 
                    value={`${chantier.budget_initial.toLocaleString()} €`}
                    subValue={meta.budget_inclut_materiaux ? '(matériaux inclus)' : ''}
                  />
                )}
                {meta.disponibilite_heures_semaine && (
                  <CompactItem 
                    icon="⏰" 
                    label="Dispo" 
                    value={`${meta.disponibilite_heures_semaine}h/sem`}
                  />
                )}
                {meta.deadline_semaines && (
                  <CompactItem 
                    icon="📅" 
                    label="Objectif" 
                    value={`${meta.deadline_semaines} sem`}
                  />
                )}
              </div>

              {/* État existant */}
              {meta.etat_existant && (
                <CompactItem 
                  icon="🏚️" 
                  label="État existant" 
                  value={meta.etat_existant}
                  fullWidth
                />
              )}

              {/* Éléments à déposer */}
              {meta.elements_a_deposer && meta.elements_a_deposer.length > 0 && (
                <TagsItem 
                  icon="🗑️" 
                  label="À déposer"
                  tags={meta.elements_a_deposer}
                  color="#ef4444"
                />
              )}

              {/* Contraintes */}
              {meta.contraintes && (
                <CompactItem 
                  icon="📝" 
                  label="Contraintes" 
                  value={meta.contraintes}
                  fullWidth
                />
              )}
            </div>

            {/* COLONNE DROITE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

              {/* Équipements souhaités */}
              {meta.equipements_souhaites && meta.equipements_souhaites.length > 0 && (
                <TagsItem 
                  icon="🛁" 
                  label="Équipements à installer"
                  tags={meta.equipements_souhaites}
                  color="#3b82f6"
                />
              )}

              {/* Réseaux */}
              {meta.reseaux && (
                <div style={{
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '0.4rem'
                  }}>
                    <span style={{ fontSize: '0.85rem' }}>🔌</span>
                    <span style={{
                      fontSize: '0.65rem',
                      color: 'var(--gray)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Réseaux
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <NetworkChip icon="⚡" label="Élec" active={meta.reseaux.electricite_a_refaire} />
                    <NetworkChip icon="💧" label="Plomb" active={meta.reseaux.plomberie_a_refaire} />
                    <NetworkChip icon="💨" label="Ventil" active={meta.reseaux.ventilation_a_prevoir} />
                  </div>
                </div>
              )}
              
              {/* Compétences OK */}
              {meta.competences_ok && meta.competences_ok.length > 0 && (
                <TagsItem 
                  icon="✅" 
                  label="À l'aise avec"
                  tags={meta.competences_ok}
                  color="#10b981"
                />
              )}

              {/* Compétences faibles */}
              {meta.competences_faibles && meta.competences_faibles.length > 0 && (
                <TagsItem 
                  icon="⚠️" 
                  label="Moins à l'aise"
                  tags={meta.competences_faibles}
                  color="#f59e0b"
                />
              )}

              {/* Travaux pro */}
              {meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0 && (
                <TagsItem 
                  icon="👷" 
                  label="Pro suggéré"
                  tags={meta.travaux_pro_suggeres}
                  color="#818cf8"
                />
              )}
            </div>
          </div>
        </div>

        {/* Info phasage - Plus discret */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1rem' }}>💡</span>
          <p style={{ 
            fontSize: '0.8rem', 
            color: 'var(--gray)',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Le phasage génère automatiquement les <strong style={{ color: 'var(--gray-light)' }}>lots de travaux</strong> adaptés. 
            Tu pourras les ajuster ensuite.
          </p>
        </div>
      </div>
    </>
  );
}

// ==================== COMPOSANTS COMPACTS ====================

function CompactItem({ 
  icon, 
  label, 
  value,
  subValue,
  fullWidth = false
}: { 
  icon: string; 
  label: string; 
  value: string;
  subValue?: string;
  fullWidth?: boolean;
}) {
  return (
    <div style={{
      flex: fullWidth ? '1 1 100%' : '1 1 auto',
      minWidth: fullWidth ? '100%' : '120px',
      padding: '0.6rem 0.75rem',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem'
    }}>
      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--gray)',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          marginBottom: '0.15rem'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: 'var(--gray-light)',
          lineHeight: '1.3',
          wordBreak: 'break-word'
        }}>
          {value}
          {subValue && (
            <span style={{ fontSize: '0.75rem', color: 'var(--gray)', marginLeft: '0.25rem' }}>
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TagsItem({ 
  icon, 
  label, 
  tags,
  color
}: { 
  icon: string; 
  label: string; 
  tags: string[];
  color: string;
}) {
  return (
    <div style={{
      padding: '0.6rem 0.75rem',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '8px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginBottom: '0.4rem'
      }}>
        <span style={{ fontSize: '0.85rem' }}>{icon}</span>
        <span style={{
          fontSize: '0.65rem',
          color: 'var(--gray)',
          textTransform: 'uppercase',
          letterSpacing: '0.3px'
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {tags.map((tag, idx) => (
          <span key={idx} style={{
            background: `${color}20`,
            color: color,
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function NetworkChip({ 
  icon, 
  label, 
  active 
}: { 
  icon: string; 
  label: string; 
  active: boolean;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.2rem 0.5rem',
      background: active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
      border: active ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      fontSize: '0.7rem',
      color: active ? '#ef4444' : '#10b981'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
      <span style={{ fontWeight: '600' }}>{active ? '⚠️' : '✓'}</span>
    </span>
  );
}
