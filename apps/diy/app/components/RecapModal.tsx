/**
 * RecapModal.tsx
 * 
 * Modal de récapitulatif avant création du chantier
 * Affiche les infos collectées et permet de valider/modifier
 * 
 * @version 1.0
 * @date 27 novembre 2025
 */

'use client';

import { useState } from 'react';

export interface RecapData {
  projet: string;
  budget_max: number;
  budget_inclut_materiaux: boolean;
  disponibilite_heures_semaine: number;
  deadline_semaines: number;
  competences_ok: string[];
  competences_faibles: string[];
  travaux_pro_suggeres: string[];
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
}

export default function RecapModal({
  isOpen,
  recap,
  onClose,
  onValidate,
  onModify,
  isLoading = false,
  themeColor = 'var(--orange)'
}: RecapModalProps) {
  
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
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
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${themeColor}40`
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.25rem',
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
            <h2 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '700',
              color: 'var(--gray-light)'
            }}>
              Récapitulatif du projet
            </h2>
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
          padding: '1.25rem'
        }}>
          
          {/* Projet */}
          <RecapSection 
            icon="🏗️" 
            label="Projet" 
            value={recap.projet}
          />

          {/* Budget */}
          <RecapSection 
            icon="💰" 
            label="Budget maximum" 
            value={`${recap.budget_max.toLocaleString()} € ${recap.budget_inclut_materiaux ? '(matériaux inclus)' : '(hors matériaux)'}`}
          />

          {/* Disponibilité */}
          <RecapSection 
            icon="⏰" 
            label="Disponibilité" 
            value={`${recap.disponibilite_heures_semaine}h / semaine`}
          />

          {/* Deadline */}
          <RecapSection 
            icon="📅" 
            label="Objectif" 
            value={`Terminer en ${recap.deadline_semaines} semaines`}
          />

          {/* Compétences OK */}
          {recap.competences_ok.length > 0 && (
            <RecapSection 
              icon="✅" 
              label="À l'aise avec"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {recap.competences_ok.map((comp, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}>
                    {comp}
                  </span>
                ))}
              </div>
            </RecapSection>
          )}

          {/* Compétences faibles */}
          {recap.competences_faibles.length > 0 && (
            <RecapSection 
              icon="⚠️" 
              label="Moins à l'aise avec"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {recap.competences_faibles.map((comp, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}>
                    {comp}
                  </span>
                ))}
              </div>
            </RecapSection>
          )}

          {/* Travaux pro */}
          {recap.travaux_pro_suggeres.length > 0 && (
            <RecapSection 
              icon="👷" 
              label="À confier à un pro (si nécessaire)"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {recap.travaux_pro_suggeres.map((travail, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#818cf8',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}>
                    {travail}
                  </span>
                ))}
              </div>
            </RecapSection>
          )}

          {/* Contraintes */}
          {recap.contraintes && (
            <RecapSection 
              icon="📝" 
              label="Contraintes" 
              value={recap.contraintes}
            />
          )}

        </div>

        {/* Footer - Actions */}
        <div style={{
          padding: '1.25rem',
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
              fontSize: '0.95rem',
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
              fontSize: '0.95rem',
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
                Création en cours...
              </>
            ) : (
              <>🚀 Créer le chantier</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sous-composant pour chaque section
function RecapSection({ 
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
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '10px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--gray)',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
          </div>
          {value && (
            <div style={{
              fontSize: '0.95rem',
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
