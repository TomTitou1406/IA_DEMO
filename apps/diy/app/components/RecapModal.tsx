/**
 * RecapModal.tsx
 * 
 * Modal de récapitulatif avant création/modification du chantier
 * Affiche les infos collectées (version enrichie) et permet de valider/modifier
 * 
 * @version 1.2
 * @date 27 novembre 2025
 */

'use client';

import { useState } from 'react';

export interface RecapData {
  // Infos de base
  projet: string;
  surface_m2?: number;
  
  // Budget et timing
  budget_max: number;
  budget_inclut_materiaux: boolean;
  disponibilite_heures_semaine: number;
  deadline_semaines: number;
  
  // État existant (nouveau)
  etat_existant?: string;
  elements_a_deposer?: string[];
  elements_a_conserver?: string[];
  
  // Résultat souhaité (nouveau)
  equipements_souhaites?: string[];
  style_souhaite?: string;
  
  // Réseaux (nouveau)
  reseaux?: {
    electricite_a_refaire: boolean;
    plomberie_a_refaire: boolean;
    ventilation_a_prevoir: boolean;
  };
  
  // Compétences
  competences_ok: string[];
  competences_faibles: string[];
  travaux_pro_suggeres: string[];
  
  // Contraintes
  contraintes: string;
}

interface RecapModalProps {
  isOpen: boolean;
  recap: RecapData;
  onClose: () => void;
  onValidate: (recap: RecapData) => void;
  onModify: () => void;
  isLoading?: boolean;
  themeColor?: string;
  isModification?: boolean;
}

export default function RecapModal({
  isOpen,
  recap,
  onClose,
  onValidate,
  onModify,
  isLoading = false,
  themeColor = 'var(--orange)',
  isModification = false
}: RecapModalProps) {
  
  if (!isOpen) return null;

  // Compter les lots à générer basé sur les infos collectées
  const estimatedLots = (() => {
    const lots: string[] = [];
    
    // Démolition si éléments à déposer
    if (recap.elements_a_deposer && recap.elements_a_deposer.length > 0) {
      lots.push('Démolition');
    }
    
    // Réseaux
    if (recap.reseaux?.plomberie_a_refaire) lots.push('Plomberie');
    if (recap.reseaux?.electricite_a_refaire) lots.push('Électricité');
    if (recap.reseaux?.ventilation_a_prevoir) lots.push('Ventilation');
    
    // Selon équipements
    if (recap.equipements_souhaites?.some(e => 
      e.toLowerCase().includes('carrelage') || 
      e.toLowerCase().includes('faïence')
    )) {
      lots.push('Carrelage');
    }
    
    // Finitions
    lots.push('Finitions');
    
    return lots;
  })();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${themeColor}40`
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📋</span>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '700',
                color: 'var(--gray-light)'
              }}>
                Récapitulatif du projet
              </h2>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--gray)'
              }}>
                ~{estimatedLots.length} lots à générer
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gray)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content - Scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.25rem'
        }}>
          
          {/* SECTION 1 : Projet */}
          <SectionTitle icon="🏗️" title="Le projet" />
          
          <RecapItem 
            icon="📋" 
            label="Description" 
            value={recap.projet}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {recap.surface_m2 && (
              <RecapChip icon="📐" value={`${recap.surface_m2} m²`} />
            )}
            {recap.style_souhaite && (
              <RecapChip icon="🎨" value={recap.style_souhaite} />
            )}
          </div>

          {/* SECTION 2 : État existant */}
          {(recap.etat_existant || recap.elements_a_deposer?.length) && (
            <>
              <SectionTitle icon="🔨" title="Existant / Démolition" />
              
              {recap.etat_existant && (
                <RecapItem 
                  icon="🏚️" 
                  label="État actuel" 
                  value={recap.etat_existant}
                />
              )}
              
              {recap.elements_a_deposer && recap.elements_a_deposer.length > 0 && (
                <RecapItem icon="🗑️" label="À déposer">
                  <TagList tags={recap.elements_a_deposer} color="#ef4444" />
                </RecapItem>
              )}
              
              {recap.elements_a_conserver && recap.elements_a_conserver.length > 0 && (
                <RecapItem icon="✅" label="À conserver">
                  <TagList tags={recap.elements_a_conserver} color="#10b981" />
                </RecapItem>
              )}
            </>
          )}

          {/* SECTION 3 : Équipements souhaités */}
          {recap.equipements_souhaites && recap.equipements_souhaites.length > 0 && (
            <>
              <SectionTitle icon="🛁" title="Équipements à installer" />
              <TagList tags={recap.equipements_souhaites} color="#3b82f6" />
            </>
          )}

          {/* SECTION 4 : Réseaux */}
          {recap.reseaux && (
            <>
              <SectionTitle icon="🔌" title="Réseaux" />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <NetworkChip 
                  icon="⚡" 
                  label="Électricité" 
                  active={recap.reseaux.electricite_a_refaire} 
                />
                <NetworkChip 
                  icon="💧" 
                  label="Plomberie" 
                  active={recap.reseaux.plomberie_a_refaire} 
                />
                <NetworkChip 
                  icon="💨" 
                  label="Ventilation" 
                  active={recap.reseaux.ventilation_a_prevoir} 
                />
              </div>
            </>
          )}

          {/* SECTION 5 : Budget & Planning */}
          {(recap.budget_max || recap.disponibilite_heures_semaine || recap.deadline_semaines) && (
            <>
              <SectionTitle icon="💰" title="Budget & Planning" />
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {recap.budget_max && (
                  <RecapChip 
                    icon="💰" 
                    value={`${recap.budget_max.toLocaleString()} €`}
                    subValue={recap.budget_inclut_materiaux ? 'matériaux inclus' : 'hors matériaux'}
                  />
                )}
                {recap.disponibilite_heures_semaine && (
                  <RecapChip icon="⏰" value={`${recap.disponibilite_heures_semaine}h/sem`} />
                )}
                {recap.deadline_semaines && (
                  <RecapChip icon="📅" value={`${recap.deadline_semaines} semaines`} />
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer - Actions */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={onModify}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'var(--gray-light)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            ✏️ Modifier
          </button>
          <button
            onClick={() => onValidate(recap)}
            disabled={isLoading}
            style={{
              flex: 2,
              padding: '0.75rem',
              borderRadius: '10px',
              border: 'none',
              background: themeColor,
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                {isModification ? 'Mise à jour...' : 'Création en cours...'}
              </>
            ) : (
              <>{isModification ? '✅ Mettre à jour' : '🚀 Créer le chantier'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== SOUS-COMPOSANTS ====================

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1rem',
      marginBottom: '0.5rem',
      paddingBottom: '0.35rem',
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      <span style={{ fontSize: '0.9rem' }}>{icon}</span>
      <span style={{
        fontSize: '0.75rem',
        fontWeight: '700',
        color: 'var(--gray)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </span>
    </div>
  );
}

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
      marginBottom: '0.6rem',
      padding: '0.5rem 0.6rem',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          {label && (
            <div style={{
              fontSize: '0.65rem',
              color: 'var(--gray)',
              marginBottom: '0.15rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              {label}
            </div>
          )}
          {value && (
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--gray-light)',
              lineHeight: '1.35'
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

function RecapChip({ 
  icon, 
  value,
  subValue
}: { 
  icon: string; 
  value: string;
  subValue?: string;
}) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.35rem 0.6rem',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      fontSize: '0.8rem',
      color: 'var(--gray-light)'
    }}>
      <span>{icon}</span>
      <span style={{ fontWeight: '600' }}>{value}</span>
      {subValue && (
        <span style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>({subValue})</span>
      )}
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
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.35rem 0.6rem',
      background: active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
      border: active ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
      borderRadius: '8px',
      fontSize: '0.8rem',
      color: active ? '#ef4444' : 'var(--gray)'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
      <span style={{ 
        fontSize: '0.7rem',
        fontWeight: '600'
      }}>
        {active ? 'À refaire' : 'OK'}
      </span>
    </div>
  );
}

function TagList({ tags, color }: { tags: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.25rem' }}>
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
  );
}
