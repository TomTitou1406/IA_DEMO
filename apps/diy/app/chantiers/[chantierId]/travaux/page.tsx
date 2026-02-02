'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChantierById, getChantierStats } from '@/app/lib/services/chantierService';
import ConfirmModal from '@/app/components/ConfirmModal';
import { useParams, useRouter } from 'next/navigation';
import CardButton from '@/app/components/CardButton';
import { terminerToutesLesEtapes } from '@/app/lib/services/etapesService';
import { getTravauxByChantier, annulerTravail, reactiverTravail, commencerTravail, reporterTravail, terminerTravail } from '@/app/lib/services/travauxService';
import NotesButton from '@/app/components/NotesButton';
import Breadcrumb from '@/app/components/Breadcrumb';
import ParentContext from '@/app/components/ParentContext';
import MediaButtons from '@/app/components/MediaButtons';
import PhotosModal from '@/app/components/PhotosModal';
import VideoPlayerModal from '@/app/components/VideoPlayerModal';

interface Chantier {
  id: string;
  titre: string;
  type_projet?: 'simple' | 'complexe';
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
  phase: string;
  ordre: number;
  blocage_raison?: string;
  duree_estimee_heures?: number;
  nombre_etapes?: number;        
  etapes_terminees?: number;     
  etapes_en_cours?: number;
  etapes_brouillon?: number;
  etapes_bloquees?: number;
  forcages?: {
    forcages: Array<{
      date: string;
      type: string;
      niveau_risque: string;
      action_demandee: string;
      avertissement_affiche: string;
      regle_concernee?: string;
      confirme_par_utilisateur: boolean;
    }>;
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
  photos_urls?: any[];
  video_aide?: {
    video_id: string;
    titre: string;
    url: string;
    thumbnail?: string;
  } | null;
  cout_estime?: number;
  cout_materiaux_estime?: number;
  cout_mo_pro_estime?: number;
  economie_diy?: number;
}

// ==================== MODALE FORÇAGE ====================
function ForcageModal({ 
  isOpen, 
  travail, 
  onClose 
}: { 
  isOpen: boolean; 
  travail: Travail | null; 
  onClose: () => void;
}) {
  if (!isOpen || !travail) return null;
  
  const forcages = travail.forcages?.forcages || [];
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        border: '1px solid #ef4444',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, color: 'var(--gray-light)', fontSize: '1rem', fontWeight: '600' }}>
                Forçage(s) enregistré(s)
              </h3>
              <p style={{ margin: 0, color: 'var(--gray)', fontSize: '0.85rem' }}>
                {travail.titre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gray)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
          {forcages.map((f: any, idx: number) => (
            <div 
              key={idx}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: idx < forcages.length - 1 ? '0.75rem' : 0
              }}
            >
              {/* Date et type */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <span style={{
                  background: f.niveau_risque === 'technique' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: f.niveau_risque === 'technique' ? '#ef4444' : '#f59e0b',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {f.niveau_risque === 'technique' ? '🔧 Technique' : '💡 Conseil'}
                </span>
                <span style={{ color: 'var(--gray)', fontSize: '0.75rem' }}>
                  {new Date(f.date).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {/* Action demandée */}
              <p style={{ 
                color: 'var(--gray-light)', 
                fontSize: '0.9rem', 
                fontWeight: '600',
                margin: '0 0 0.5rem 0' 
              }}>
                📝 {f.action_demandee}
              </p>
              
              {/* Avertissement */}
              <p style={{ 
                color: 'var(--gray)', 
                fontSize: '0.85rem', 
                margin: '0 0 0.5rem 0',
                lineHeight: '1.4'
              }}>
                ⚠️ {f.avertissement_affiche}
              </p>
              
              {/* Règle concernée */}
              {f.regle_concernee && (
                <p style={{ 
                  color: 'var(--gray)', 
                  fontSize: '0.75rem', 
                  margin: 0,
                  opacity: 0.7
                }}>
                  Règle : {f.regle_concernee}
                </p>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 2rem',
              background: '#ef4444',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MODALE PANIER TECHNIQUE ====================
function PanierModal({ 
  isOpen, 
  config,
  onClose,
  onGenerer
}: { 
  isOpen: boolean; 
  config: {
    travail: any | null;
    loading: boolean;
    panier: any | null;
    error: string | null;
  };
  onClose: () => void;
  onGenerer: () => void;
}) {
  if (!isOpen || !config.travail) return null;
  
  const { travail, loading, panier, error } = config;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        border: '1px solid var(--green)',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            <div>
              <h3 style={{ margin: 0, color: 'var(--gray-light)', fontSize: '1rem', fontWeight: '600' }}>
                Panier technique
              </h3>
              <p style={{ margin: 0, color: 'var(--gray)', fontSize: '0.85rem' }}>
                {travail.titre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gray)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--gray)', margin: 0 }}>
                Calcul des matériaux en cours...
              </p>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <p style={{ color: '#ef4444', margin: 0 }}>❌ {error}</p>
            </div>
          )}

          {/* Pas de panier - Proposer de générer */}
          {!loading && !error && !panier && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ color: 'var(--gray)', marginBottom: '1.5rem' }}>
                Aucun panier généré pour ce lot.<br/>
                Cliquez sur le bouton pour estimer les matériaux nécessaires.
              </p>
              <button
                onClick={onGenerer}
                style={{
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🛒 Générer le panier
              </button>
            </div>
          )}

          {/* Panier avec articles */}
          {!loading && panier && (
            <>
              {/* Note explicative */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: '#fbbf24'
              }}>
                ⚠️ <strong>Estimation indicative</strong> basée sur des moyennes GSB. 
                Quantités et prix à affiner selon votre configuration réelle.
              </div>

              {/* Matériaux */}
              {panier.articles?.filter((a: any) => (a.categorie || '').toLowerCase() === 'materiau').length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{ 
                      color: 'var(--green)', 
                      fontSize: '0.9rem', 
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      📦 Matériaux
                    </h4>
                    <span style={{ 
                      color: 'var(--green)', 
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      Total TTC
                    </span>
                  </div>
                  {panier.articles
                    .filter((a: any) => (a.categorie || '').toLowerCase() === 'materiau')
                    .map((article: any, idx: number) => {
                      const quantite = article.quantite ?? article.quantite_prevue ?? 0;
                      const unite = article.unite ?? '';
                      const prixUnitaire = article.prix_unitaire ?? article.cout_unitaire_prevu ?? 0;
                      const prixTotal = article.prix_total ?? article.cout_total_prevu ?? 0;
                      
                      return (
                        <div 
                          key={idx}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              color: 'var(--gray-light)', 
                              margin: 0, 
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}>
                              {article.nom}
                            </p>
                            <p style={{ 
                              color: 'var(--gray-light)', 
                              margin: '0.25rem 0 0 0', 
                              fontSize: '0.75rem',
                              opacity: 0.8
                            }}>
                              {prixUnitaire}€/{unite} × {quantite}
                            </p>
                          </div>
                          <span style={{ 
                            color: 'var(--green)', 
                            fontWeight: '700',
                            fontSize: '0.95rem'
                          }}>
                            {prixTotal}€
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Consommables */}
              {panier.articles?.filter((a: any) => (a.categorie || '').toLowerCase() === 'consommable').length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{ 
                      color: 'var(--green)', 
                      fontSize: '0.9rem', 
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      🧴 Consommables
                    </h4>
                    <span style={{ 
                      color: 'var(--greeb)', 
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}>
                      Total TTC
                    </span>
                  </div>
                  {panier.articles
                    .filter((a: any) => (a.categorie || '').toLowerCase() === 'consommable')
                    .map((article: any, idx: number) => {
                      const quantite = article.quantite ?? article.quantite_prevue ?? 0;
                      const unite = article.unite ?? '';
                      const prixUnitaire = article.prix_unitaire ?? article.cout_unitaire_prevu ?? 0;
                      const prixTotal = article.prix_total ?? article.cout_total_prevu ?? 0;
                      
                      return (
                        <div 
                          key={idx}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              color: 'var(--gray-light)', 
                              margin: 0, 
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}>
                              {article.nom}
                            </p>
                            <p style={{ 
                              color: 'var(--gray-light)', 
                              margin: '0.25rem 0 0 0', 
                              fontSize: '0.75rem',
                              opacity: 0.8
                            }}>
                              {prixUnitaire}€/{unite} × {quantite}
                            </p>
                          </div>
                          <span style={{ 
                            color: 'var(--green)', 
                            fontWeight: '700',
                            fontSize: '0.95rem'
                          }}>
                            {prixTotal}€
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Note IA si présente */}
              {panier.notes && (
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  color: '#a78bfa'
                }}>
                  📝 {panier.notes}
                </div>
              )}

              {/* Message outils */}
              <div style={{
                background: 'rgba(107, 114, 128, 0.1)',
                border: '1px solid rgba(107, 114, 128, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: 'var(--gray)'
              }}>
                🔧 Pour voir les outils nécessaires, génère les étapes détaillées de ce lot.
              </div>
            </>
          )}
        </div>
        
        {/* Footer avec totaux */}
        {!loading && panier && (
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(16, 185, 129, 0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--gray-light)' }}>Matériaux</span>
              <span style={{ color: 'var(--green)', fontWeight: '600' }}>{panier.total_materiaux || 0}€</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--gray-light)' }}>Consommables</span>
              <span style={{ color: 'var(--green)', fontWeight: '600' }}>{panier.total_consommables || 0}€</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '1rem' }}>
                Total estimé
              </span>
              <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '1.2rem' }}>
                {panier.total_general}€
              </span>
            </div>
          </div>
        )}

        {/* Bouton fermer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              padding: '0.6rem 2rem',
              borderRadius: '8px',
              color: 'var(--gray-light)',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MODALE RECAP PANIERS CHANTIER ====================
function PanierChantierModal({ 
  isOpen, 
  chantier,
  travaux,
  onClose,
  onGenererPanier,
  onVoirPanier
}: { 
  isOpen: boolean; 
  chantier: any;
  travaux: any[];
  onClose: () => void;
  onGenererPanier: (travail: any) => void;
  onVoirPanier: (travail: any) => void;
}) {
  if (!isOpen || !chantier) return null;
  
  const totalPaniers = travaux.reduce((sum, t) => sum + (t.cout_materiaux_estime || 0), 0);
  const lotsAvecPanier = travaux.filter(t => t.cout_materiaux_estime && t.cout_materiaux_estime > 0).length;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        border: '1px solid var(--green)',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            <div>
              <h3 style={{ margin: 0, color: 'var(--gray-light)', fontSize: '1rem', fontWeight: '600' }}>
                Paniers techniques
              </h3>
              <p style={{ margin: 0, color: 'var(--gray)', fontSize: '0.85rem' }}>
                {chantier.titre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gray)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Body - Liste des lots */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Disclaimer */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: '#fbbf24'
          }}>
            ⚠️ <strong>Estimations indicatives</strong> basées sur des moyennes GSB. 
            À affiner selon votre configuration réelle.
          </div>

          {/* Liste des lots */}
          {travaux
            .sort((a, b) => a.ordre - b.ordre)
            .map((travail) => {
              const hasPanier = travail.cout_materiaux_estime && travail.cout_materiaux_estime > 0;
              
              return (
                <div 
                  key={travail.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid transparent'
                  }}
                  onClick={() => {
                    onClose();
                    if (hasPanier) {
                      onVoirPanier(travail);
                    } else {
                      onGenererPanier(travail);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      background: hasPanier ? 'var(--green)' : 'var(--gray)',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {travail.ordre}
                    </span>
                    <div>
                      <p style={{ 
                        color: 'var(--gray-light)', 
                        margin: 0, 
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>
                        {travail.titre}
                      </p>
                    </div>
                  </div>
                  
                  {hasPanier ? (
                    <span style={{ 
                      color: 'var(--green)', 
                      fontWeight: '700',
                      fontSize: '0.95rem'
                    }}>
                      {travail.cout_materiaux_estime}€
                    </span>
                  ) : (
                    <span style={{ 
                      color: 'var(--gray)', 
                      fontSize: '0.8rem',
                      fontStyle: 'italic'
                    }}>
                      À calculer →
                    </span>
                  )}
                </div>
              );
            })}
        </div>
        
        {/* Footer avec total */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: 'var(--gray-light)', fontWeight: '600' }}>
              Total estimé ({lotsAvecPanier}/{travaux.length} lots)
            </span>
            <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '1.3rem' }}>
              {totalPaniers.toLocaleString()}€
            </span>
          </div>
        </div>

        {/* Bouton fermer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              padding: '0.6rem 2rem',
              borderRadius: '8px',
              color: 'var(--gray-light)',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TravauxPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params.chantierId as string;
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [travaux, setTravaux] = useState<Travail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnCours, setShowEnCours] = useState(true);
  const [showBloques, setShowBloques] = useState(true);
  const [showTermines, setShowTermines] = useState(false);
  const [showAVenir, setShowAVenir] = useState(false);
  const [showAnnulees, setShowAnnulees] = useState(false);
  const [chantierPhotos, setChantierPhotos] = useState<any[]>([]);
  const [chantierVideo, setChantierVideo] = useState<any>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // ✅ AJOUT DU STATE POUR LA MODALE FORÇAGE
  const [showForcageModal, setShowForcageModal] = useState<{
    isOpen: boolean;
    travail: Travail | null;
  }>({ isOpen: false, travail: null });

  // Modales photos et vidéos
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [photosModalConfig, setPhotosModalConfig] = useState<{
    niveau: 'chantier' | 'travail' | 'etape' | 'tache';
    niveauId: string;
    niveauTitre: string;
    photos: any[];
  }>({ niveau: 'chantier', niveauId: '', niveauTitre: '', photos: [] });
  
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoModalConfig, setVideoModalConfig] = useState<{
    niveau: 'chantier' | 'travail' | 'etape' | 'tache';
    niveauId: string;
    video: any;
  }>({ niveau: 'chantier', niveauId: '', video: null });

  const [showVideoChoiceModal, setShowVideoChoiceModal] = useState(false);
  const [videoChoiceContext, setVideoChoiceContext] = useState<{
    niveau: string;
    id: string;
    titre: string;
  } | null>(null);

  // État pour le panier technique
  const [showPanierModal, setShowPanierModal] = useState(false);
  const [panierModalConfig, setPanierModalConfig] = useState<{
    travail: Travail | null;
    loading: boolean;
    panier: any | null;
    error: string | null;
  }>({ travail: null, loading: false, panier: null, error: null });
  
  // État pour la modale récap paniers chantier
  const [showPanierChantierModal, setShowPanierChantierModal] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePhotosChange = (niveau: string, niveauId: string, newPhotos: any[]) => {
    if (niveau === 'chantier') {
      setChantierPhotos(newPhotos);
    } else if (niveau === 'travail') {
      setTravaux(prev => prev.map(t => 
        t.id === niveauId ? { ...t, photos_urls: newPhotos } : t
      ));
    }
  };
  
  const handleDetachVideo = async (niveau: string, niveauId: string) => {
    try {
      await fetch('/api/medias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_video',
          niveau,
          niveau_id: niveauId
        })
      });
      
      if (niveau === 'chantier') {
        setChantierVideo(null);
      } else if (niveau === 'travail') {
        setTravaux(prev => prev.map(t => 
          t.id === niveauId ? { ...t, video_aide: null } : t
        ));
      }
      setShowVideoModal(false);
    } catch (error) {
      console.error('Erreur détachement vidéo:', error);
    }
  };

  // Génération du panier technique
  const handleGenererPanier = async (travail: Travail) => {
    setPanierModalConfig({ travail, loading: true, panier: null, error: null });
    setShowPanierModal(true);

    try {
      const response = await fetch(`/api/lots/${travail.id}/panier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamme_prix: 'standard' })
      });

      const data = await response.json();

      if (data.success) {
        setPanierModalConfig(prev => ({ 
          ...prev, 
          loading: false, 
          panier: data.panier 
        }));
        // Mettre à jour le coût dans la liste locale
        setTravaux(prev => prev.map(t => 
          t.id === travail.id 
            ? { ...t, cout_materiaux_estime: data.panier.total_general } 
            : t
        ));
      } else {
        setPanierModalConfig(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error || 'Erreur génération panier' 
        }));
      }
    } catch (error) {
      setPanierModalConfig(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erreur réseau' 
      }));
    }
  };

  // Consultation du panier existant
  const handleVoirPanier = async (travail: Travail) => {
    setPanierModalConfig({ travail, loading: true, panier: null, error: null });
    setShowPanierModal(true);

    try {
      const response = await fetch(`/api/lots/${travail.id}/panier`);
      const data = await response.json();

      if (data.success && data.articles.length > 0) {
        setPanierModalConfig(prev => ({ 
          ...prev, 
          loading: false, 
          panier: {
            articles: data.articles,
            total_materiaux: data.totaux.materiaux,
            total_consommables: data.totaux.consommables,
            total_general: data.totaux.total
          }
        }));
      } else {
        // Pas de panier existant, proposer de générer
        setPanierModalConfig(prev => ({ 
          ...prev, 
          loading: false, 
          panier: null 
        }));
      }
    } catch (error) {
      setPanierModalConfig(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erreur chargement panier' 
      }));
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const chantierData = await getChantierById(chantierId);
        if (chantierData) {
          const allTravaux = await getTravauxByChantier(chantierData.id);
          
          // Si travail simple avec un seul lot → rediriger IMMÉDIATEMENT
          if (chantierData.type_projet === 'simple' && allTravaux.length === 1) {
            router.replace(`/chantiers/${chantierId}/travaux/${allTravaux[0].id}/etapes`);
            return; // Stop ici, ne pas continuer le chargement
          }
          
          // Sinon, charger normalement
          setChantier(chantierData);
          const statsData = await getChantierStats(chantierData.id);
          setStats(statsData);
          setTravaux(allTravaux);
          // Charger les médias du chantier
          setChantierPhotos(chantierData.photos_urls || []);
          setChantierVideo(chantierData.video_aide?.video_id ? chantierData.video_aide : null);
        }
      } catch (error) {
        console.error('Error loading travaux:', error);
      } finally {
        setLoading(false);
      }
    }
  
    loadData();
  }, [chantierId, router]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  // Grouper par statut
  const termines = travaux.filter(t => t.statut === 'terminé');
  const enCours = travaux.filter(t => t.statut === 'en_cours');
  const bloques = travaux.filter(t => t.statut === 'bloqué');
  const aVenir = travaux.filter(t => t.statut === 'à_venir');
  const annulees = travaux.filter(t => t.statut === 'annulé');
  const progressionChantier = travaux.length > 0
    ? Math.round((termines.length / travaux.length) * 100)
    : 0;

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloqué': return 'var(--orange)';
      case 'annulé': return 'var(--red)';
      case 'à_venir': return 'var(--purple)';
      default: return 'var(--gray)';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'terminé': return '✓';
      case 'en_cours': return '🔨';
      case 'bloqué': return '🚫';
      case 'annulé': return '🗑️';
      case 'à_venir': return '📅';
      default: return '✅';
    }
  };

  const TravailCard = ({ travail }: { travail: Travail }) => {
    const isAnnulee = travail.statut === 'annulé';
    const statusColor = getStatusColor(travail.statut);
    const progression = travail.progression || 0;
    const [isExpanded, setIsExpanded] = useState(false);
    
    // RGB pour le dégradé
    const getStatusRgb = (statut: string) => {
      switch (statut) {
        case 'terminé': return '16, 185, 129';
        case 'en_cours': return '37, 99, 235';
        case 'bloqué': return '249, 115, 22';
        case 'annulé': return '239, 68, 68';
        case 'à_venir': return '139, 92, 246';
        default: return '139, 92, 246';
      }
    };
    const rgb = getStatusRgb(travail.statut);
    
    return (
      <div style={{
        background: `linear-gradient(90deg, transparent 0%, rgba(${rgb}, 0.15) 50%, rgba(${rgb}, 0.4) 100%)`,
        borderRadius: '12px',
        borderLeft: `5px solid rgb(${rgb})`,
        padding: '1rem 1.25rem',
        marginBottom: '0.75rem',
        transition: 'all 0.3s ease'
      }}>
        
        {/* LIGNE 1 : Header - Titre + Boutons (SANS Annuler) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'flex-start',
          marginBottom: '0.5rem',
          gap: isMobile ? '0.75rem' : '1rem'
        }}>
          <div 
            onClick={() => isMobile && setIsExpanded(!isExpanded)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: isMobile ? 'pointer' : 'default' }}>
            <span style={{
              background: statusColor,
              color: 'white',
              minWidth: isMobile ? '26px' : '32px',
              width: isMobile ? '26px' : '32px',
              height: isMobile ? '26px' : '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              flexShrink: 0
            }}>
              {travail.ordre}
            </span>
            <h3 style={{ 
              fontSize: isMobile ? '0.9rem' : '1.05rem', 
              margin: 0,
              color: 'white',
              fontWeight: '700',
              lineHeight: '1.2'
            }}>
              {getStatusIcon(travail.statut)} {travail.titre}
              {travail.forcages?.forcages && travail.forcages.forcages.length > 0 && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowForcageModal({ isOpen: true, travail });
                  }}
                  style={{ 
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    padding: '0.15rem 0.4rem',
                    color: '#ef4444',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Cliquez pour voir les forçages"
                >
                  ⚡ Forcé
                </span>
             )}
            </h3>
            {isMobile && (
              <span style={{ 
                fontSize: '1rem',
                color: 'var(--gray)',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                marginLeft: 'auto'
              }}>
                ▼
              </span>
            )}
          </div>
          
          {/* Boutons action (SANS Annuler) - sur mobile uniquement si expanded */}
          {travail.statut !== 'terminé' && travail.statut !== 'annulé' && (!isMobile || isExpanded) && (
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {/* Bouton VOIR LES ÉTAPES */}
              {(travail.statut === 'en_cours' || travail.statut === 'à_venir') && 
               travail.nombre_etapes !== undefined && travail.nombre_etapes > 0 && 
               (!travail.etapes_brouillon || travail.etapes_brouillon === 0) && (
                <CardButton
                  variant="primary"
                  color="var(--orange)"
                  icon={isMobile ? "" : "🎯"}
                  label={isMobile ? "Étapes" : "Voir les étapes"}
                  count={travail.nombre_etapes}
                  href={`/chantiers/${chantierId}/travaux/${travail.id}/etapes`}
                />
              )}
              
              {/* Bouton REPORTER */}
              {travail.statut === 'en_cours' && travail.progression === 0 && (
                <CardButton
                  variant="secondary"
                  color="var(--blue)"
                  icon="📅"
                  label={isMobile ? "" : "Reporter"}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Reporter cette tâche ?',
                      message: `"${travail.titre}" reviendra dans "À venir".`,
                      onConfirm: async () => {
                        await reporterTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              )}
              
              {/* Bouton TOUT TERMINER */}
              {travail.statut === 'en_cours' && (
                <CardButton
                  variant="secondary"
                  color="var(--green)"
                  icon={isMobile ? "" : "✓✓"}
                  label={isMobile ? "Terminer" : "Tout terminer"}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Tout terminer ?',
                      message: `Toutes les étapes de "${travail.titre}" seront marquées terminées.`,
                      onConfirm: async () => {
                        await terminerToutesLesEtapes(travail.id);
                        await terminerTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              )}

              {/* Bouton DÉBLOQUER */}
              {travail.statut === 'bloqué' && (
                <CardButton
                  variant="primary"
                  color="var(--orange)"
                  icon="🔓"
                  label={isMobile ? "" : "Débloquer"}
                  onClick={() => console.log('Débloquer:', travail.id)}
                />
              )}

              {/* Bouton REPRENDRE MISE EN ŒUVRE */}
              {(travail.etapes_brouillon || 0) > 0 && (
                <CardButton
                  variant="primary"
                  color="var(--orange)"
                  icon={isMobile ? "" : "🔧"}
                  label={isMobile ? "Reprendre" : "Reprendre mise en œuvre"}
                  count={travail.etapes_brouillon}
                  onClick={() => router.push(`/chantiers/${chantierId}/travaux/${travail.id}/mise-en-oeuvre`)}
                />
              )}

              {/* Bouton METTRE EN ŒUVRE */}
              {travail.statut === 'à_venir' && (!travail.nombre_etapes || travail.nombre_etapes === 0) && (!travail.etapes_brouillon || travail.etapes_brouillon === 0) && (
                <CardButton
                  variant="primary"
                  color="var(--green)"
                  icon={isMobile ? "" : "🔧"}
                  label={isMobile ? "Démarrer" : "Mettre en œuvre"}
                  onClick={() => router.push(`/chantiers/${chantierId}/travaux/${travail.id}/mise-en-oeuvre`)}
                />
              )}

              {/* Bouton COMMENCER */}
              {travail.statut === 'à_venir' && travail.nombre_etapes !== undefined && travail.nombre_etapes > 0 && (
                <CardButton
                  variant="primary"
                  color="var(--purple)"
                  icon="▶️"
                  label={isMobile ? "" : "Commencer"}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Démarrer cette tâche ?',
                      message: `"${travail.titre}" passera en cours.`,
                      onConfirm: async () => {
                        await commencerTravail(travail.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* Bouton Réactiver pour annulés */}
          {travail.statut === 'annulé' && (
            <CardButton
              variant="primary"
              color="var(--red)"
              icon="↻"
              label="Réactiver"
              onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: 'Réactiver cette tâche ?',
                  message: `"${travail.titre}" reviendra dans "À venir".`,
                  onConfirm: async () => {
                    await reactiverTravail(travail.id);
                    setModalConfig({ ...modalConfig, isOpen: false });
                    window.location.reload();
                  }
                });
              }}
            />
          )}
        </div>

      {/* LIGNE 2 : Description - masquée sur mobile */}
        {!isMobile && travail.description && (
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'rgba(255,255,255,0.7)', 
            margin: 0,
            marginBottom: '0.75rem',
            marginLeft: '40px',
            lineHeight: '1.4'
          }}>
            {travail.description}
          </p>
        )}

        {/* Blocage raison si présent */}
        {travail.blocage_raison && (
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--orange)', 
            margin: 0,
            marginBottom: '0.75rem',
            marginLeft: '40px',
            fontStyle: 'italic',
            padding: '0.5rem',
            background: 'rgba(255, 107, 53, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 107, 53, 0.2)'
          }}>
            💬 {travail.blocage_raison}
          </p>
        )}

        {/* LIGNE 3 : Progress bar */}
        <div style={{
          height: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '0.75rem'
        }}>
          <div style={{
            width: `${Math.max(progression, 2)}%`,
            height: '100%',
            background: progression === 100 
              ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
              : `linear-gradient(90deg, rgb(${rgb}) 0%, #10b981 100%)`,
            borderRadius: '3px',
            transition: 'width 0.5s ease'
          }}></div>
        </div>

         {/* LIGNE 4 : Stats + Panier + MediaButtons + Poubelle */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '0.5rem' : '0',
          fontSize: isMobile ? '0.75rem' : '0.85rem',
          color: 'white'
        }}>
          {/* Gauche : %, Panier, Durée, Étapes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700' }}>{progression}%</span>
            
            {/* Bouton Panier */}
            {(travail.statut === 'à_venir' || travail.statut === 'en_cours') && !travail.cout_materiaux_estime && !travail.cout_estime ? (
              <button
                onClick={() => handleGenererPanier(travail)}
                style={{
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                🛒{!isMobile && ' Générer panier'}
              </button>
            ) : (travail.cout_materiaux_estime || travail.cout_estime) ? (
              <button
                onClick={() => handleVoirPanier(travail)}
                style={{
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                🛒 {travail.cout_materiaux_estime || travail.cout_estime}€
              </button>
            ) : null}
            
            {/* Durée (sans fond) */}
            {travail.duree_estimee_heures && (
              <span>⏱️ {travail.duree_estimee_heures}h</span>
            )}
            
            {/* Étapes */}
            {travail.nombre_etapes !== undefined && travail.nombre_etapes > 0 && (
              <span>✅ {travail.etapes_terminees || 0}/{travail.nombre_etapes} étapes</span>
            )}
          </div>

         {/* Droite : MediaButtons + Poubelle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: isMobile ? 'auto' : '0' }}>
            <MediaButtons
              niveau="travail"
              niveauId={travail.id}
              niveauTitre={travail.titre}
              photosCount={travail.photos_urls?.length || 0}
              hasVideo={!!travail.video_aide?.video_id}
              videoTitre={travail.video_aide?.titre}
              compact
              onPhotoClick={() => {
                setPhotosModalConfig({
                  niveau: 'travail',
                  niveauId: travail.id,
                  niveauTitre: travail.titre,
                  photos: travail.photos_urls || []
                });
                setShowPhotosModal(true);
              }}
              onVideoClick={() => {
                if (travail.video_aide?.video_id) {
                  setVideoModalConfig({
                    niveau: 'travail',
                    niveauId: travail.id,
                    video: {
                      id: travail.video_aide.video_id,
                      title: travail.video_aide.titre,
                      thumbnail: travail.video_aide.thumbnail,
                      channelTitle: '',
                      viewCount: 0,
                      duration: ''
                    }
                  });
                  setShowVideoModal(true);
                } else {
                  setVideoChoiceContext({
                    niveau: 'travail',
                    id: travail.id,
                    titre: travail.titre
                  });
                  setShowVideoChoiceModal(true);
                }
              }}
            />
            
            {/* Poubelle (remplace bouton Annuler) */}
            {travail.statut !== 'terminé' && travail.statut !== 'annulé' && (
              <button
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: 'Annuler cette tâche ?',
                    message: `"${travail.titre}" sera marquée comme annulée.`,
                    onConfirm: async () => {
                      await annulerTravail(travail.id);
                      setModalConfig({ ...modalConfig, isOpen: false });
                      window.location.reload();
                    }
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.3rem',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                title="Annuler"
              >
                🗑️
              </button>
            )}
          </div>
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
      {/* ========== NOUVEAU BREADCRUMB ========== */}
      <Breadcrumb 
        currentLevel="lots" 
        chantierId={chantierId} 
      />

      {/* CONTENU PRINCIPAL avec padding-top pour breadcrumb */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 0.75rem',
        paddingTop: isMobile ? '35px' : '70px'
      }}>
        {/* ========== NOUVEAU PARENT CONTEXT ========== */}
        {/* Note: Ici on a déjà le chantier chargé, pas besoin de ParentContext 
            car on est au niveau Lots et le chantier est affiché dans l'état des lieux */}

        {/* État d'avancement du chantier - PLUS VISIBLE */}
        <div style={{
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Header avec titre + bouton notes */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
            gap: '1rem'
          }}>
            <h1 style={{ 
              fontSize: isMobile ? '1.2rem' : '1.5rem', 
              margin: 0,
              color: 'var(--gray-light)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {chantier?.type_projet === 'simple' ? '🔧' : '🏗️'}
              {chantier?.type_projet === 'simple' ? '' : 'Chantier : '}
              {chantier?.titre}
            </h1>
            
            {/* Bouton Notes du chantier */}
            <NotesButton level="chantier" id={chantierId} />
          </div>

         {/* Progress bar */}
          <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem' }}>
            <div style={{
              width: '100%',
              height: isMobile ? '10px' : '16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressionChantier}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </div>

         {/* Stats TOUT EN LIGNE - PLUS VISIBLE */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '0.5rem' : '2rem',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            color: 'var(--gray)'
          }}>
            {/* Stats groupées à gauche */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: isMobile ? '0.75rem' : '2rem' }}>
                {/* % complété */}
                <span style={{
                color: 'var(--gray-light)', 
                fontSize: isMobile ? '0.95rem' : '1.1rem', 
                fontWeight: '700',
                marginLeft: '0.5rem'
              }}>
                {progressionChantier}%{!isMobile && ' complété'}
              </span>
  
              {/* Heures - SANS COULEUR BLEUE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                <span>
                  <strong style={{ color: 'var(--gray-light)', fontWeight: '700' }}>
                    {stats?.heuresEffectuees || 0}h
                  </strong>
                  <span style={{ opacity: 0.6 }}> / {stats?.heuresEstimees || 0}h</span>
                  <span style={{ color: 'var(--gray-light)', marginLeft: '0.5rem', fontWeight: '700' }}>
                    {stats?.progressionHeures || 0}%
                  </span>
                </span>
              </div>
              
            {/* Total Paniers techniques - Cliquable - Masqué sur mobile */}
              {!isMobile && (() => {
                const totalPaniers = travaux.reduce((sum, t) => sum + (t.cout_materiaux_estime || 0), 0);
                const lotsAvecPanier = travaux.filter(t => t.cout_materiaux_estime && t.cout_materiaux_estime > 0).length;
                return (
                  <div 
                    onClick={() => setShowPanierChantierModal(true)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      transition: 'all 0.2s',
                      color: 'var(--green)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      // Passer tous les textes en blanc
                      e.currentTarget.querySelectorAll('strong, span').forEach((el: any) => {
                        el.dataset.originalColor = el.style.color;
                        el.style.color = 'white';
                      });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                      // Restaurer les couleurs originales
                      e.currentTarget.querySelectorAll('strong, span').forEach((el: any) => {
                        el.style.color = el.dataset.originalColor || '';
                      });
                    }}
                    title="Voir tous les paniers"
                  >
                    <span style={{ fontSize: '1.1rem' }}>🛒</span>
                    <span>
                      <strong style={{ fontWeight: '700' }}>
                        {totalPaniers > 0 ? `${totalPaniers.toLocaleString()}€` : 'Paniers'}
                      </strong>
                      <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>({lotsAvecPanier}/{travaux.length})</span>
                    </span>
                  </div>
                );
              })()}
  
             {/* Lots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: isMobile ? '1rem' : '1.1rem' }}>✅</span>
                <span>
                  {isMobile ? (
                    <>
                      <span style={{ fontWeight: '700' }}>{stats?.termines || 0}/{travaux.length}</span>
                      <span style={{ color: 'var(--blue)', marginLeft: '0.5rem' }}>• {stats?.enCours || 0} en cours</span>
                    </>
                  ) : (
                    <>
                      <span>Lots :</span>
                      <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                        {stats?.termines || 0} Terminé{stats?.termines > 1 ? 's' : ''}
                      </span>
                      <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                        | {stats?.enCours || 0} En cours
                      </span>
                      <span style={{ color: 'var(--orange)', marginLeft: '0.6rem', fontWeight: '700' }}>
                        | {stats?.bloques || 0} Bloqué{stats?.bloques > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
            {/* Photos et Vidéos du chantier */}
            <div style={{ marginLeft: 'auto' }}>
              <MediaButtons
                niveau="chantier"
                niveauId={chantierId}
                niveauTitre={chantier?.titre || ''}
                photosCount={chantierPhotos.length}
                hasVideo={!!chantierVideo?.video_id}
                videoTitre={chantierVideo?.titre}
                onPhotoClick={() => {
                  setPhotosModalConfig({
                    niveau: 'chantier',
                    niveauId: chantierId,
                    niveauTitre: chantier?.titre || '',
                    photos: chantierPhotos
                  });
                  setShowPhotosModal(true);
                }}
                onVideoClick={() => {
                  if (chantierVideo?.video_id) {
                    setVideoModalConfig({
                      niveau: 'chantier',
                      niveauId: chantierId,
                      video: {
                        id: chantierVideo.video_id,
                        title: chantierVideo.titre,
                        thumbnail: chantierVideo.thumbnail,
                        channelTitle: '',
                        viewCount: 0,
                        duration: ''
                      }
                    });
                    setShowVideoModal(true);
                  } else {
                    // Ouvrir modale de choix
                    setVideoChoiceContext({
                      niveau: 'chantier',
                      id: chantierId,
                      titre: chantier?.titre || ''
                    });
                    setShowVideoChoiceModal(true);
                  }
                }}
              />
            </div>
          </div>
        </div>
       
        {/* Section EN COURS (collapsible) */}
        {enCours.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="En cours" 
              count={enCours.length} 
              color="var(--blue)" 
              icon="🔨"
              isExpanded={showEnCours}
              onToggle={() => setShowEnCours(!showEnCours)}
            />
            {showEnCours && enCours.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section BLOQUÉS (collapsible) */}
        {bloques.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Bloqués" 
              count={bloques.length} 
              color="var(--orange)" 
              icon="⚠️"
              isExpanded={showBloques}
              onToggle={() => setShowBloques(!showBloques)}
            />
            {showBloques && bloques.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section À VENIR (collapsible) */}
        {aVenir.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="À venir" 
              count={aVenir.length} 
              color="var(--purple)" 
              icon="📅"
              isExpanded={showAVenir}
              onToggle={() => setShowAVenir(!showAVenir)}
            />
            {showAVenir && aVenir.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section TERMINÉS (collapsible) */}
        {termines.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Terminés" 
              count={termines.length} 
              color="var(--green)" 
              icon="✅"
              isExpanded={showTermines}
              onToggle={() => setShowTermines(!showTermines)}
            />
            {showTermines && termines.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}

        {/* Section ANNULÉS (collapsible) */}
        {annulees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Annulés" 
              count={annulees.length} 
              color="var(--red)" 
              icon="🗑️"
              isExpanded={showAnnulees}
              onToggle={() => setShowAnnulees(!showAnnulees)}
            />
            {showAnnulees && annulees.map(travail => <TravailCard key={travail.id} travail={travail} />)}
          </section>
        )}
        
        {/* Modal de confirmation */}
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText="Confirmer"
          cancelText="Annuler"
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
          type="warning"
        />

        {/* Modale Forçage */}
        <ForcageModal 
          isOpen={showForcageModal.isOpen}
          travail={showForcageModal.travail}
          onClose={() => setShowForcageModal({ isOpen: false, travail: null })}
        />

        {/* Modal Photos */}
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          niveau={photosModalConfig.niveau}
          niveauId={photosModalConfig.niveauId}
          niveauTitre={photosModalConfig.niveauTitre}
          photos={photosModalConfig.photos}
          onPhotosChange={(newPhotos) => {
            handlePhotosChange(photosModalConfig.niveau, photosModalConfig.niveauId, newPhotos);
            setPhotosModalConfig(prev => ({ ...prev, photos: newPhotos }));
          }}
        />
  
        {/* Modal Vidéo */}
        <VideoPlayerModal
          video={videoModalConfig.video}
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          showFavoriteButton={false}
          showMettreEnOeuvreButton={false}
          onAttach={undefined}
          attachLabel={undefined}
        />

        {/* Modale choix source vidéo */}
        {showVideoChoiceModal && videoChoiceContext && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
          onClick={() => setShowVideoChoiceModal(false)}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '340px',
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ 
                color: 'white', 
                margin: '0 0 0.5rem 0',
                fontSize: '1.1rem',
                textAlign: 'center'
              }}>
                🎬 Ajouter un tuto vidéo
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                textAlign: 'center',
                margin: '0 0 1.5rem 0'
              }}>
                Pour : {videoChoiceContext.titre}
              </p>
  
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Option 1 : Rechercher */}
                <button
                  onClick={() => {
                    setShowVideoChoiceModal(false);
                    sessionStorage.setItem('attachReturnUrl', window.location.href);
                    const searchQuery = encodeURIComponent(videoChoiceContext.titre);
                    window.location.href = `/videos?context=${videoChoiceContext.niveau}&id=${videoChoiceContext.id}&search=${searchQuery}`;
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid var(--green)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--green)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>🔍</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Rechercher un tuto</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Trouver une nouvelle vidéo</div>
                  </div>
                </button>
  
                {/* Option 2 : Favoris */}
                <button
                  onClick={() => {
                    setShowVideoChoiceModal(false);
                    sessionStorage.setItem('attachReturnUrl', window.location.href);
                    window.location.href = `/videos/favorites?context=${videoChoiceContext.niveau}&id=${videoChoiceContext.id}&titre=${encodeURIComponent(videoChoiceContext.titre)}`;
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>❤️</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Mes favoris</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Choisir parmi mes vidéos sauvées</div>
                  </div>
                </button>
              </div>
  
              {/* Bouton Annuler */}
              <button
                onClick={() => setShowVideoChoiceModal(false)}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        {/* Modal Panier Technique */}
        <PanierModal
          isOpen={showPanierModal}
          config={panierModalConfig}
          onClose={() => {
            setShowPanierModal(false);
            setPanierModalConfig({ travail: null, loading: false, panier: null, error: null });
          }}
          onGenerer={() => {
            if (panierModalConfig.travail) {
              handleGenererPanier(panierModalConfig.travail);
            }
          }}
        />
        {/* Modal Récap Paniers Chantier */}
        <PanierChantierModal
          isOpen={showPanierChantierModal}
          chantier={chantier}
          travaux={travaux}
          onClose={() => setShowPanierChantierModal(false)}
          onGenererPanier={(travail) => handleGenererPanier(travail)}
          onVoirPanier={(travail) => handleVoirPanier(travail)}
        />
       </div>
    </>
  );
}
