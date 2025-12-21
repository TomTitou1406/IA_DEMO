/**
 * /chantiers/[chantierId]/page.tsx
 * 
 * Page unifiée Création / Édition / Récap de chantier
 * - Si id === "nouveau" → mode création (conversation IA)
 * - Sinon → mode récap/édition (affiche le chantier + actions)
 * 
 * Design compact avec accordéons pour mobile
 * Affiche tous les champs enrichis (surface, équipements, réseaux, etc.)
 * 
 * @version 3.0
 * @date 20 décembre 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';

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
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '0.5rem'
    }}>
      {/* Header cliquable */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '0.6rem 0.75rem',
          background: isOpen ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.85rem' }}>{icon}</span>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: '600', 
            color: isOpen ? 'var(--orange)' : 'var(--gray-light)' 
          }}>
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '0.1rem 0.35rem',
              borderRadius: '8px',
              fontSize: '0.65rem',
              color: 'var(--gray)'
            }}>
              {count}
            </span>
          )}
        </div>
        <span style={{ 
          color: 'var(--gray)', 
          fontSize: '0.7rem',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </button>
      
      {/* Contenu */}
      {isOpen && (
        <div style={{
          padding: '0.5rem 0.75rem 0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          {children}
        </div>
      )}
    </div>
  );
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
  const [hasBrouillon, setHasBrouillon] = useState(false);
  const [nbLotsBrouillon, setNbLotsBrouillon] = useState(0);
  const [showPrePhasageModal, setShowPrePhasageModal] = useState(false);
  const [champsManquants, setChampsManquants] = useState<string[]>([]);
  const [prePhasageContext, setPrePhasageContext] = useState<string>('');
  
  // États accordéons
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    projet: true,
    caracteristiques: false,
    travaux: false,
    competences: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const allOpen = Object.values(openSections).every(v => v);
    const newState = Object.keys(openSections).reduce((acc, key) => {
      acc[key] = !allOpen;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenSections(newState);
  };

  // Détection contexte vidéo (depuis "Mettre en œuvre")
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromVideo = urlParams.get('from') === 'video';
    
    if (fromVideo && chantierId === 'nouveau') {
      const videoInspirationStr = sessionStorage.getItem('videoInspiration');
      
      if (videoInspirationStr) {
        try {
          const videoData = JSON.parse(videoInspirationStr);
          const inspiration = videoData.inspiration;
          
          // Formater le contexte vidéo pour le prompt
          const chapitresText = inspiration.chapters?.length > 0
            ? `Chapitres détectés :\n${inspiration.chapters.map((c: any, i: number) => `${i + 1}. ${c.title}`).join('\n')}`
            : 'Pas de chapitres détectés';
          
          const videoContext = `
          === CONTEXTE VIDÉO ===
          Le bricoleur a regardé un tutoriel et veut RÉALISER ce projet chez lui.
          
          SON PROJET : ${inspiration.title.replace(/^(Comment |Tuto |DIY |Tutoriel )?/i, '')}
          Source vidéo : ${inspiration.channel}
          Durée du tuto : ${Math.round((inspiration.duration_seconds || 0) / 60)} minutes
          
          ${chapitresText}
          
          IMPORTANT - INTERPRÉTATION :
          - Le TITRE de la vidéo = CE QUE le bricoleur veut FAIRE (pas apprendre)
          - Les CHAPITRES = les étapes potentielles du projet
          - Ton rôle : adapter ce projet à SA situation (dimensions, budget, compétences)
          
          COMPORTEMENT ATTENDU :
          - Confirme en 1 phrase : "Tu veux [action du titre], c'est ça ?"
          - NE REDEMANDE PAS le type de projet (on le connaît déjà)
          - Pose directement les questions contextuelles : dimensions, emplacement, budget, dispo, compétences
          - Objectif : 3-4 échanges maximum
          === FIN CONTEXTE VIDÉO ===
          `.trim();
          
          // Ouvrir l'assistant avec le contexte vidéo
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openAssistantWithContext', {
              detail: {
                pageContext: 'chantier_edit',
                welcomeMessage: `🎬 Tu veux reproduire "${inspiration.title}" ?\n\nJ'ai analysé la vidéo. Quelques questions pour adapter à ta situation...`,
                contextColor: 'var(--orange)',
                additionalContext: videoContext
              }
            }));
          }, 500);
          
          // Nettoyer le sessionStorage
          sessionStorage.removeItem('videoInspiration');
          
          // Nettoyer l'URL (retirer ?from=video)
          window.history.replaceState({}, '', '/chantiers/nouveau');
          
        } catch (e) {
          console.error('Erreur parsing videoInspiration:', e);
        }
      }
    }
  }, [chantierId]);
  
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
          setNbLotsBrouillon(brouillonData.nbLots || 0);
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

  // Vérifier les prérequis avant phasage
  const checkPrePhasageRequirements = async (): Promise<boolean | { ready: boolean; context: string; manquants: string[] }> => {
    if (!chantier) return { ready: true, context: '', manquants: [] };
  
    try {
      // 1. Qualifier le type du chantier (via API)
      console.log('🔍 Qualification du type de chantier...');
      const qualifyResponse = await fetch('/api/chantiers/qualify-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chantierId })
      });
  
      if (!qualifyResponse.ok) {
        console.error('❌ Erreur qualification type');
        return { ready: true, context: '', manquants: [] };
      }
  
      const { code, isNew, typeConfig } = await qualifyResponse.json();
      console.log(`✅ Type qualifié: ${code} (${isNew ? 'nouveau' : 'existant'})`);
  
      // Mettre à jour le state local
      if (chantier.metadata) {
        chantier.metadata.type_piece = code;
      }
  
      // 2. Vérifier les champs critiques manquants
      if (!typeConfig?.champs_critiques_phasage?.length) {
        console.log('✅ Pas de champs critiques définis, phasage direct');
        return { ready: true, context: '', manquants: [] };
      }
  
      const champsCritiques: string[] = typeConfig.champs_critiques_phasage;
      const metadata = chantier.metadata || {};
      const manquants: string[] = [];
  
      for (const champ of champsCritiques) {
        const valeur = (metadata as any)[champ];
        if (valeur === undefined || valeur === null || valeur === '') {
          manquants.push(champ);
        }
      }
  
      if (manquants.length === 0) {
        console.log('✅ Tous les champs critiques sont renseignés');
        return { ready: true, context: '', manquants: [] };
      }
  
      // 3. Construire le contexte pour l'assistant
      const champsLabels: Record<string, string> = {
        hauteur_sous_plafond: 'Hauteur sous plafond',
        hauteur_exacte: 'Hauteur exacte',
        isolation_type: 'Type d\'isolation',
        gaines_techniques: 'Gaines techniques à passer',
        ouvertures_portes: 'Portes ou ouvertures prévues',
        fixation_plafond: 'Type de fixation au plafond',
        fixation_plafond_type: 'Type de fixation au plafond',
        points_eau_existants: 'Points d\'eau existants',
        evacuation_existante: 'Évacuation existante',
        ventilation_existante: 'Ventilation existante',
        tableau_electrique_proche: 'Proximité tableau électrique',
        nature_terrain: 'Nature du terrain',
        pente_evacuation: 'Pente pour évacuation',
        dalle_existante: 'Dalle existante',
        acces_materiaux: 'Accès pour matériaux',
        revetement_choisi: 'Revêtement choisi',
        longueur_totale: 'Longueur totale',
        isolation_phonique_requise: 'Isolation phonique requise',
        nombre_prises_souhaitees: 'Nombre de prises souhaitées',
        placard_integre: 'Placard intégré prévu',
        cheminee_existante: 'Cheminée existante',
        points_lumineux_plafond: 'Points lumineux au plafond',
        hauteur_faitage: 'Hauteur au faîtage',
        type_charpente: 'Type de charpente',
        isolation_existante: 'Isolation existante',
        acces_combles: 'Accès aux combles',
        plancher_existant: 'Plancher existant',
        fenetre_toit_prevue: 'Fenêtre de toit prévue',
        electricite_existante: 'Électricité existante',
        ventilation_requise: 'Ventilation requise',
        porte_type: 'Type de porte',
        point_eau_prevu: 'Point d\'eau prévu',
        arrivee_gaz: 'Arrivée de gaz',
        hotte_evacuation_type: 'Type d\'évacuation hotte',
      };
  
      const manquantsLabels = manquants.map(c => champsLabels[c] || c.replace(/_/g, ' '));
      const questionsSpecifiques = typeConfig.questions_specifiques || [];
  
      const context = `
  === PRÉ-PHASAGE : INFORMATIONS COMPLÉMENTAIRES ===
  Avant de générer les lots de travaux, j'ai besoin de quelques précisions.
  
  TYPE DE CHANTIER : ${typeConfig.icone} ${typeConfig.nom}
  
  INFORMATIONS MANQUANTES :
  ${manquantsLabels.map(l => `- ${l}`).join('\n')}
  
  QUESTIONS SUGGÉRÉES :
  ${questionsSpecifiques.map((q: string) => `- ${q}`).join('\n')}
  
  DONNÉES DÉJÀ CONNUES :
  ${JSON.stringify(metadata, null, 2)}
  
  COMPORTEMENT :
  - Pose 2-3 questions max par message, de manière conversationnelle
  - Adapte les questions selon ce qui est déjà connu
  - Quand TOUTES les infos manquantes sont collectées, génère ce JSON :
  
  \`\`\`json
  {
    "pre_phasage_complete": true,
    "metadata_updates": {
      "champ1": "valeur1",
      "champ2": "valeur2"
    }
  }
  \`\`\`
  
  Ensuite confirme que tu vas lancer le phasage.
  === FIN CONTEXTE PRÉ-PHASAGE ===
      `.trim();
  
      console.log('⚠️ Champs manquants pour phasage:', manquants);
      setChampsManquants(manquants);
      setPrePhasageContext(context);
  
      return { ready: false, context, manquants };
  
    } catch (err) {
      console.error('Erreur vérification pré-phasage:', err);
      return { ready: true, context: '', manquants: [] };
    }
  };

  // Lancer le phasage (génération des lots)
  const handleLancerPhasage = async () => {
    const result = await checkPrePhasageRequirements();
  
    // Gérer le cas boolean (compatibilité) ou objet
    const isReady = typeof result === 'boolean' ? result : result.ready;
    const context = typeof result === 'boolean' ? '' : result.context;
    const manquants = typeof result === 'boolean' ? [] : result.manquants;
    
    if (isReady) {
      router.push(`/chantiers/${chantierId}/phasage`);
    } else {
      // Construire un message d'accueil avec les premières questions
      const champsLabels: Record<string, string> = {
        hauteur_exacte: 'la hauteur exacte de la cloison',
        hauteur_sous_plafond: 'la hauteur sous plafond',
        longueur_totale: 'la longueur totale',
        isolation_type: 'le type d\'isolation souhaité (phonique, thermique, aucune)',
        gaines_techniques: 'les gaines à passer (élec, eau...)',
        ouvertures_portes: 'les portes ou ouvertures prévues',
        fixation_plafond_type: 'le type de fixation au plafond',
        points_eau_existants: 'les points d\'eau existants',
        evacuation_existante: 'l\'évacuation existante',
        ventilation_existante: 'la ventilation',
      };
  
      // Prendre les 2-3 premiers champs manquants pour les questions
      const premieresQuestions = manquants
        .slice(0, 3)
        .map(c => champsLabels[c] || c.replace(/_/g, ' '));
  
      const welcomeMsg = `🔍 Avant de générer les lots de travaux, j'ai besoin de quelques précisions :\n\n• ${premieresQuestions.join('\n• ')} ?`;
  
      // Ouvrir l'assistant avec le contexte pré-phasage
      window.dispatchEvent(new CustomEvent('openAssistantWithContext', {
        detail: {
          pageContext: 'pre_phasage',
          welcomeMessage: welcomeMsg,
          contextColor: 'var(--orange)',
          additionalContext: context
        }
      }));
    }
  };

  // Reprendre un phasage existant (brouillon) - pas de pré-phasage
  const handleReprendrePhasage = () => {
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
            maxWidth: '700px', 
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
  const allOpen = Object.values(openSections).every(v => v);

  // Compteurs pour badges
  const countCarac = [
    meta.type_piece, meta.dimensions, meta.surface_sol_m2 || meta.surface_m2,
    meta.acces_chantier, meta.contraintes, meta.sol_actuel, meta.murs_actuels,
    meta.travaux_sol, meta.travaux_murs, meta.travaux_plafond
  ].filter(Boolean).length;

  const countTravaux = [
    meta.elements_a_deposer?.length,
    meta.equipements_souhaites?.length,
    meta.reseaux,
    meta.points_techniques
  ].filter(Boolean).length;

  const countComp = [
    meta.competences_ok?.length,
    meta.competences_faibles?.length,
    meta.travaux_pro_suggeres?.length
  ].filter(Boolean).length;

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
          maxWidth: '700px', 
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
        maxWidth: '700px', 
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
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* Ligne 1 : Titre + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏗️</span>
              <div style={{ flex: 1 }}>
                <h1 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700',
                  color: 'var(--gray-light)',
                  margin: 0
                }}>
                  {chantier.titre}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    background: chantier.statut === 'nouveau' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: chantier.statut === 'nouveau' ? '#a855f7' : '#3b82f6'
                  }}>
                    {chantier.statut === 'nouveau' ? '✨ Nouveau' : '🔄 En cours'}
                  </span>
                  {hasBrouillon && (
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: 'rgba(249, 115, 22, 0.2)',
                      color: 'var(--orange)'
                    }}>
                      ⚠️ {nbLotsBrouillon} lots en brouillon
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Ligne 2 : Boutons d'action + Tout déplier */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 1.25rem 0'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleModifier}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--gray-light)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap'
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
                  onClick={hasBrouillon ? handleReprendrePhasage : handleLancerPhasage}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--orange)',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap'
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
                  {hasBrouillon ? '🔄 Reprendre' : '🚀 Phasage'}
                </button>
              </div>
              
              <button
                onClick={toggleAll}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--gray-light)',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                {allOpen ? '▲ Tout replier' : '▼ Tout déplier'}
              </button>
            </div>
          </div>

          {/* Contenu avec ACCORDÉONS */}
          <div style={{ padding: '0.75rem 1.25rem 1rem' }}>
            
            {/* ACCORDÉON 1: PROJET & BUDGET */}
            <AccordionSection
              icon="📋"
              title="Projet & Budget"
              isOpen={openSections.projet}
              onToggle={() => toggleSection('projet')}
            >
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
              </div>
            </AccordionSection>

            {/* ACCORDÉON 2: CARACTÉRISTIQUES */}
            <AccordionSection
              icon="🏠"
              title="Caractéristiques"
              count={countCarac}
              isOpen={openSections.caracteristiques}
              onToggle={() => toggleSection('caracteristiques')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Type + Dimensions + Surfaces */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {meta.type_piece && (
                    <CompactItem icon="🏠" label="Type" value={meta.type_piece} />
                  )}
                  {meta.dimensions && (
                    <CompactItem 
                      icon="📏" 
                      label="Dimensions" 
                      value={[
                        meta.dimensions.longueur_m,
                        meta.dimensions.largeur_m,
                        meta.dimensions.hauteur_m
                      ].filter(v => v != null).join('×') + 'm'} 
                    />
                  )}
                  {(meta.surface_sol_m2 || meta.surface_m2) && (
                  <CompactItem 
                    icon="📐" 
                    label="Surface" 
                    value={`${meta.surface_sol_m2 || meta.surface_m2} m²${meta.surface_murs_m2 ? ` (murs: ${meta.surface_murs_m2} m²)` : ''}`}
                  />
                )}
                </div>
                
                {/* Accès + Contraintes */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {meta.acces_chantier && (
                    <CompactItem 
                      icon="🚚" 
                      label="Accès" 
                      value={meta.acces_chantier}
                    />
                  )}
                  <CompactItem 
                    icon="📝" 
                    label="Contraintes" 
                    value={meta.contraintes || 'Aucune'}
                  />
                </div>

                {/* Sol et murs actuels */}
                {(meta.sol_actuel || meta.murs_actuels) && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {meta.sol_actuel && (
                      <CompactItem 
                        icon="🟫" 
                        label="Sol actuel" 
                        value={meta.sol_actuel}
                      />
                    )}
                    {meta.murs_actuels && (
                      <CompactItem 
                        icon="🧱" 
                        label="Murs actuels" 
                        value={meta.murs_actuels}
                      />
                    )}
                  </div>
                )}
                
                {/* Travaux prévus */}
                {(meta.travaux_sol || meta.travaux_murs || meta.travaux_plafond) && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {meta.travaux_sol && (
                      <CompactItem 
                        icon="🔨" 
                        label="Travaux sol" 
                        value={meta.travaux_sol}
                      />
                    )}
                    {meta.travaux_murs && (
                      <CompactItem 
                        icon="🔨" 
                        label="Travaux murs" 
                        value={meta.travaux_murs}
                      />
                    )}
                    {meta.travaux_plafond && (
                      <CompactItem 
                        icon="🔨" 
                        label="Travaux plafond" 
                        value={meta.travaux_plafond}
                      />
                    )}
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* ACCORDÉON 3: TRAVAUX & ÉQUIPEMENTS */}
            <AccordionSection
              icon="🛠️"
              title="Travaux & Équipements"
              count={countTravaux}
              isOpen={openSections.travaux}
              onToggle={() => toggleSection('travaux')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Éléments à déposer */}
                {meta.elements_a_deposer && meta.elements_a_deposer.length > 0 && (
                  <TagsItem 
                    icon="🗑️" 
                    label="À déposer"
                    tags={meta.elements_a_deposer}
                    color="#ef4444"
                  />
                )}
                
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

                {/* Points techniques */}
                {meta.points_techniques && (
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
                      <span style={{ fontSize: '0.85rem' }}>🔧</span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--gray)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        Points techniques
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {meta.points_techniques.nb_prises_a_ajouter !== undefined && meta.points_techniques.nb_prises_a_ajouter > 0 && (
                        <TechChip icon="🔌" value={`${meta.points_techniques.nb_prises_a_ajouter} prises`} />
                      )}
                      {meta.points_techniques.nb_interrupteurs_a_ajouter !== undefined && meta.points_techniques.nb_interrupteurs_a_ajouter > 0 && (
                        <TechChip icon="💡" value={`${meta.points_techniques.nb_interrupteurs_a_ajouter} inter.`} />
                      )}
                      {meta.points_techniques.nb_points_lumineux_a_ajouter !== undefined && meta.points_techniques.nb_points_lumineux_a_ajouter > 0 && (
                        <TechChip icon="💡" value={`${meta.points_techniques.nb_points_lumineux_a_ajouter} pts lum.`} />
                      )}
                      {meta.points_techniques.nb_spots_led !== undefined && meta.points_techniques.nb_spots_led > 0 && (
                        <TechChip icon="💡" value={`${meta.points_techniques.nb_spots_led} spots`} />
                      )}
                      {meta.points_techniques.nb_points_eau_a_ajouter !== undefined && meta.points_techniques.nb_points_eau_a_ajouter > 0 && (
                        <TechChip icon="💧" value={`${meta.points_techniques.nb_points_eau_a_ajouter} pts eau`} />
                      )}
                      {meta.points_techniques.nb_evacuations_a_ajouter !== undefined && meta.points_techniques.nb_evacuations_a_ajouter > 0 && (
                        <TechChip icon="🚿" value={`${meta.points_techniques.nb_evacuations_a_ajouter} évac.`} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* ACCORDÉON 4: COMPÉTENCES */}
            <AccordionSection
              icon="👷"
              title="Compétences"
              count={countComp}
              isOpen={openSections.competences}
              onToggle={() => toggleSection('competences')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

                {/* Pro suggéré - Toujours affiché */}
                <TagsItem 
                  icon="👷" 
                  label="Pro suggéré"
                  tags={meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0 ? meta.travaux_pro_suggeres : ['Aucun']}
                  color={meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0 ? '#818cf8' : '#6b7280'}
                />
              </div>
            </AccordionSection>

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
function TechChip({ 
  icon, 
  value 
}: { 
  icon: string; 
  value: string;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.2rem 0.5rem',
      background: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      fontSize: '0.7rem',
      color: '#3b82f6'
    }}>
      <span>{icon}</span>
      <span>{value}</span>
    </span>
  );
}

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
