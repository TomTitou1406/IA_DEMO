/**
 * /chantiers/[chantierId]/page.tsx
 * 
 * Page unifiée Création / Édition / Récap de chantier
 * - Si id === "nouveau" → mode création (conversation IA)
 * - Sinon → mode récap/édition avec accordéons
 * 
 * Design responsive avec accordéons pour mobile
 * 
 * @version 3.0
 * @date 20 décembre 2025
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
    // Type & Dimensions
    type_piece?: string;
    dimensions?: {
      longueur_m: number;
      largeur_m: number;
      hauteur_m: number;
    };
    surface_m2?: number;
    surface_sol_m2?: number;
    surface_murs_m2?: number;
    
    // État actuel
    sol_actuel?: string;
    murs_actuels?: string;
    etat_existant?: string;
    elements_a_deposer?: string[];
    elements_a_conserver?: string[];
    
    // Travaux prévus
    travaux_sol?: string;
    travaux_murs?: string;
    travaux_plafond?: string;
    
    // Équipements & Réseaux
    equipements_souhaites?: string[];
    style_souhaite?: string;
    reseaux?: {
      electricite_a_refaire: boolean;
      plomberie_a_refaire: boolean;
      ventilation_a_prevoir: boolean;
    };
    points_techniques?: {
      nb_prises_a_ajouter?: number;
      nb_interrupteurs_a_ajouter?: number;
      nb_points_eau_a_ajouter?: number;
      nb_evacuations_a_ajouter?: number;
      nb_points_lumineux_a_ajouter?: number;
      nb_spots_led?: number;
    };
    
    // Budget & Planning
    budget_inclut_materiaux?: boolean;
    disponibilite_heures_semaine?: number;
    deadline_semaines?: number;
    
    // Compétences
    competences_ok?: string[];
    competences_faibles?: string[];
    travaux_pro_suggeres?: string[];
    
    // Logistique
    acces_chantier?: string;
    disponibilite_piece?: string;
    contraintes?: string;
  };
  created_at: string;
}

// ==================== COMPOSANT ACCORDÉON ====================

function AccordionSection({
  icon,
  title,
  count,
  isOpen,
  onToggle,
  children
}: {
  icon: string;
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      {/* Header cliquable */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '0.875rem 1rem',
          background: isOpen ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{icon}</span>
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: '600', 
            color: isOpen ? 'var(--orange)' : 'var(--gray-light)' 
          }}>
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
              fontSize: '0.7rem',
              color: 'var(--gray)'
            }}>
              {count}
            </span>
          )}
        </div>
        <span style={{ 
          color: 'var(--gray)', 
          fontSize: '0.8rem',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </button>
      
      {/* Contenu */}
      {isOpen && (
        <div style={{
          padding: '0.75rem 1rem 1rem',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ==================== COMPOSANTS D'AFFICHAGE ====================

function InfoChip({ 
  icon, 
  label, 
  value, 
  subValue 
}: { 
  icon: string; 
  label: string; 
  value: string;
  subValue?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      flex: '1 1 auto',
      minWidth: '120px'
    }}>
      <span style={{ fontSize: '0.9rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.65rem', color: 'var(--gray)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--gray-light)', fontWeight: '600' }}>
          {value}
          {subValue && <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginLeft: '0.25rem' }}>{subValue}</span>}
        </div>
      </div>
    </div>
  );
}

function TagsList({ 
  tags, 
  color 
}: { 
  tags: string[]; 
  color: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {tags.map((tag, idx) => (
        <span key={idx} style={{
          background: `${color}20`,
          color: color,
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ 
  icon, 
  label, 
  value 
}: { 
  icon: string; 
  label: string; 
  value: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      padding: '0.4rem 0'
    }}>
      <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ fontSize: '0.85rem', color: 'var(--gray-light)', lineHeight: '1.4' }}>{value}</div>
      </div>
    </div>
  );
}

function NetworkBadge({ 
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
      padding: '0.25rem 0.6rem',
      background: active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
      border: `1px solid ${active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
      borderRadius: '12px',
      fontSize: '0.75rem',
      color: active ? '#ef4444' : '#10b981'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
      <span style={{ fontWeight: '600' }}>{active ? '⚠️' : '✓'}</span>
    </span>
  );
}

// ==================== COMPOSANT PRINCIPAL ====================

export default function ChantierEditPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.chantierId as string;
  const isCreation = chantierId === 'nouveau';

  // États
  const [chantier, setChantier] = useState<ChantierData | null>(null);
  const [loading, setLoading] = useState(!isCreation);
  const [error, setError] = useState<string | null>(null);
  const [hasBrouillon, setHasBrouillon] = useState(false);
  
  // États accordéons
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    projet: true,
    caracteristiques: false,
    travaux: false,
    competences: false
  });

  // Toggle une section
  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Tout déplier / replier
  const toggleAll = () => {
    const allOpen = Object.values(openSections).every(v => v);
    const newState = Object.keys(openSections).reduce((acc, key) => {
      acc[key] = !allOpen;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenSections(newState);
  };

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
        
        // Vérifier s'il y a un brouillon de phasage
        try {
          const brouillonRes = await fetch('/api/phasage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chantierId, action: 'load_brouillon' }),
          });
          const brouillonData = await brouillonRes.json();
          setHasBrouillon(brouillonData.hasBrouillon || false);
        } catch (e) {
          console.error('Erreur vérification brouillon:', e);
        }
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

  // Lancer le phasage
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
          top: '60px',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.98)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
          paddingTop: '120px',
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

  // Calculer les compteurs pour les badges
  const countCaracteristiques = [
    meta.type_piece,
    meta.dimensions,
    meta.surface_sol_m2 || meta.surface_m2,
    meta.acces_chantier,
    meta.contraintes
  ].filter(Boolean).length;

  const countTravaux = [
    meta.elements_a_deposer?.length,
    meta.equipements_souhaites?.length,
    meta.reseaux,
    meta.points_techniques,
    meta.travaux_sol,
    meta.travaux_murs,
    meta.travaux_plafond,
    meta.sol_actuel,
    meta.murs_actuels
  ].filter(Boolean).length;

  const countCompetences = [
    meta.competences_ok?.length,
    meta.competences_faibles?.length,
    meta.travaux_pro_suggeres?.length
  ].filter(Boolean).length;

  const allOpen = Object.values(openSections).every(v => v);

  return (
    <>
      {/* BREADCRUMB */}
      <div style={{ 
        position: 'fixed',
        top: '60px',
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.98)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ 
          maxWidth: '800px', 
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
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '1rem',
        paddingTop: '120px',
        paddingBottom: '2rem'
      }}>
        
        {/* HEADER COMPACT */}
        <div style={{
          background: 'linear-gradient(90deg, #0d0d0d 0%, color-mix(in srgb, var(--orange) 25%, #1a1a1a) 100%)',
          borderRadius: '16px',
          borderLeft: '4px solid var(--orange)',
          padding: '1rem 1.25rem',
          marginBottom: '1rem'
        }}>
          {/* Ligne 1: Titre + Badge + Boutons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem' }}>🏗️</span>
              <h1 style={{ 
                fontSize: '1.15rem', 
                fontWeight: '700',
                color: 'var(--gray-light)',
                margin: 0
              }}>
                {chantier.titre}
              </h1>
              <span style={{
                padding: '0.15rem 0.5rem',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: '600',
                background: chantier.statut === 'nouveau' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: chantier.statut === 'nouveau' ? '#a855f7' : '#3b82f6'
              }}>
                {chantier.statut === 'nouveau' ? '✨ Nouveau' : '🔄 En cours'}
              </span>
            </div>
            
            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleModifier}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--gray-light)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                ✏️ Modifier
              </button>
              <button
                onClick={handleLancerPhasage}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--orange)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                {hasBrouillon ? '🔄 Reprendre le phasage' : '🚀 Lancer le phasage'}
              </button>
            </div>
          </div>

          {/* Ligne 2: Résumé rapide (toujours visible) */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            {chantier.budget_initial && (
              <InfoChip 
                icon="💰" 
                label="Budget" 
                value={`${chantier.budget_initial.toLocaleString()} €`}
                subValue={meta.budget_inclut_materiaux ? '(mat. inclus)' : ''}
              />
            )}
            {meta.disponibilite_heures_semaine && (
              <InfoChip 
                icon="⏰" 
                label="Dispo" 
                value={`${meta.disponibilite_heures_semaine}h/sem`}
              />
            )}
            {meta.deadline_semaines && (
              <InfoChip 
                icon="📅" 
                label="Objectif" 
                value={`${meta.deadline_semaines} sem`}
              />
            )}
          </div>
        </div>

        {/* BOUTON TOUT DÉPLIER/REPLIER */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '0.5rem' 
        }}>
          <button
            onClick={toggleAll}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'var(--gray)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {allOpen ? '▲ Tout replier' : '▼ Tout déplier'}
          </button>
        </div>

        {/* SECTIONS ACCORDÉON */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          {/* Section PROJET */}
          <AccordionSection
            icon="📋"
            title="Projet"
            isOpen={openSections.projet}
            onToggle={() => toggleSection('projet')}
          >
            {chantier.description && (
              <p style={{ 
                fontSize: '0.9rem', 
                color: 'var(--gray-light)', 
                margin: 0,
                lineHeight: '1.5'
              }}>
                {chantier.description}
              </p>
            )}
            {meta.etat_existant && (
              <InfoRow icon="🏚️" label="État existant" value={meta.etat_existant} />
            )}
            {meta.style_souhaite && (
              <InfoRow icon="🎨" label="Style souhaité" value={meta.style_souhaite} />
            )}
          </AccordionSection>

          {/* Section CARACTÉRISTIQUES */}
          <AccordionSection
            icon="🏠"
            title="Caractéristiques"
            count={countCaracteristiques}
            isOpen={openSections.caracteristiques}
            onToggle={() => toggleSection('caracteristiques')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {meta.type_piece && (
                  <InfoChip icon="🏠" label="Type" value={meta.type_piece} />
                )}
                {meta.dimensions && (
                  <InfoChip icon="📏" label="Dimensions" value={`${meta.dimensions.longueur_m}×${meta.dimensions.largeur_m}×${meta.dimensions.hauteur_m}m`} />
                )}
                {(meta.surface_sol_m2 || meta.surface_m2) && (
                  <InfoChip icon="📐" label="Surface" value={`${meta.surface_sol_m2 || meta.surface_m2} m²`} />
                )}
              </div>
              {meta.acces_chantier && (
                <InfoRow icon="🚚" label="Accès chantier" value={meta.acces_chantier} />
              )}
              {meta.contraintes && (
                <InfoRow icon="⚠️" label="Contraintes" value={meta.contraintes} />
              )}
              {(meta.sol_actuel || meta.murs_actuels) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {meta.sol_actuel && (
                    <InfoChip icon="🟫" label="Sol actuel" value={meta.sol_actuel} />
                  )}
                  {meta.murs_actuels && (
                    <InfoChip icon="🧱" label="Murs actuels" value={meta.murs_actuels} />
                  )}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Section TRAVAUX & ÉQUIPEMENTS */}
          <AccordionSection
            icon="🛠️"
            title="Travaux & Équipements"
            count={countTravaux}
            isOpen={openSections.travaux}
            onToggle={() => toggleSection('travaux')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* À déposer */}
              {meta.elements_a_deposer && meta.elements_a_deposer.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    🗑️ À déposer
                  </div>
                  <TagsList tags={meta.elements_a_deposer} color="#ef4444" />
                </div>
              )}

              {/* Équipements à installer */}
              {meta.equipements_souhaites && meta.equipements_souhaites.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    🛁 Équipements à installer
                  </div>
                  <TagsList tags={meta.equipements_souhaites} color="#3b82f6" />
                </div>
              )}

              {/* Réseaux */}
              {meta.reseaux && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    🔌 Réseaux
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <NetworkBadge icon="⚡" label="Élec" active={meta.reseaux.electricite_a_refaire} />
                    <NetworkBadge icon="💧" label="Plomb" active={meta.reseaux.plomberie_a_refaire} />
                    <NetworkBadge icon="💨" label="Ventil" active={meta.reseaux.ventilation_a_prevoir} />
                  </div>
                </div>
              )}

              {/* Points techniques */}
              {meta.points_techniques && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    🔧 Points techniques
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {meta.points_techniques.nb_prises_a_ajouter !== undefined && meta.points_techniques.nb_prises_a_ajouter > 0 && (
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                        🔌 {meta.points_techniques.nb_prises_a_ajouter} prises
                      </span>
                    )}
                    {meta.points_techniques.nb_spots_led !== undefined && meta.points_techniques.nb_spots_led > 0 && (
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                        💡 {meta.points_techniques.nb_spots_led} spots
                      </span>
                    )}
                    {meta.points_techniques.nb_points_eau_a_ajouter !== undefined && meta.points_techniques.nb_points_eau_a_ajouter > 0 && (
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                        💧 {meta.points_techniques.nb_points_eau_a_ajouter} pts eau
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Travaux prévus */}
              {(meta.travaux_sol || meta.travaux_murs || meta.travaux_plafond) && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    🔨 Travaux prévus
                  </div>
                  {meta.travaux_sol && <InfoRow icon="🟫" label="Sol" value={meta.travaux_sol} />}
                  {meta.travaux_murs && <InfoRow icon="🧱" label="Murs" value={meta.travaux_murs} />}
                  {meta.travaux_plafond && <InfoRow icon="⬜" label="Plafond" value={meta.travaux_plafond} />}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Section COMPÉTENCES */}
          <AccordionSection
            icon="👷"
            title="Compétences"
            count={countCompetences}
            isOpen={openSections.competences}
            onToggle={() => toggleSection('competences')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {meta.competences_ok && meta.competences_ok.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    ✅ À l'aise avec
                  </div>
                  <TagsList tags={meta.competences_ok} color="#10b981" />
                </div>
              )}
              {meta.competences_faibles && meta.competences_faibles.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    ⚠️ Moins à l'aise
                  </div>
                  <TagsList tags={meta.competences_faibles} color="#f59e0b" />
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  👷 Pro suggéré
                </div>
                <TagsList 
                  tags={meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0 ? meta.travaux_pro_suggeres : ['Aucun']} 
                  color={meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0 ? '#818cf8' : '#6b7280'} 
                />
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Info phasage */}
        <div style={{
          marginTop: '1rem',
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
