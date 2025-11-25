/**
 * useAssistantContext.ts
 * 
 * Hook React pour fournir le contexte complet à l'assistant
 * - Détection automatique du contexte selon la page
 * - Chargement dynamique du contexte travail/étapes
 * - Mapping vers les expertises
 * - Support de l'auto-détection
 * 
 * @version 2.0 (fusion)
 * @date 25 novembre 2025
 */

'use client';

import { usePathname, useParams } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';

// ==================== TYPES ====================

export type PageContext = 
  | 'home'
  | 'aide'
  | 'chantiers'
  | 'nouveau_chantier'
  | 'chantier_detail'
  | 'travail_detail'
  | 'etape_detail'
  | 'tache_detail'
  | 'profil'
  | 'chat';

export interface ExpertiseMappingConfig {
  defaultExpertise: string;
  fallbackExpertise?: string;
  autoDetectEnabled: boolean;
  autoDetectAfterMessages?: number;
  contextDescription: string;
  themeColor: string;
  placeholder: string;
  welcomeMessage: string;
}

export interface AssistantContext {
  // Contexte de base (rétrocompatibilité)
  pageContext: PageContext;
  contextColor: string;
  welcomeMessage: string;
  placeholder: string;
  additionalContext?: string;
  
  // Nouveaux champs (Phase 5)
  expertiseCode: string;
  autoDetectEnabled: boolean;
  autoDetectThreshold: number;
  promptContext: {
    chantierId?: string;
    travailId?: string;
    chantierTitre?: string;
    travailTitre?: string;
    etapeTitre?: string;
    tacheTitre?: string;
    expertiseRequise?: string;
  };
  
  // État
  isLoading: boolean;
}

// ==================== CONFIGURATION MAPPING ====================

const CONTEXT_CONFIG: Record<PageContext, ExpertiseMappingConfig> = {
  home: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Page d\'accueil',
    themeColor: '#2563eb',
    placeholder: 'Comment fonctionne l\'app ?',
    welcomeMessage: 'Bienvenue ! Comment puis-je t\'aider à découvrir Papibricole ?'
  },
  
  aide: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 2,
    contextDescription: 'Page d\'aide ponctuelle',
    themeColor: '#10b981',
    placeholder: 'Décris ton problème...',
    welcomeMessage: 'Dis-moi ce qui te bloque, je vais t\'aider ! 💡'
  },
  
  chantiers: {
    defaultExpertise: 'chef_chantier',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Liste des chantiers',
    themeColor: '#f97316',
    placeholder: 'Comment organiser mon chantier ?',
    welcomeMessage: 'Prêt à planifier ton chantier ? Je t\'aide !'
  },
  
  nouveau_chantier: {
    defaultExpertise: 'chef_chantier',
    autoDetectEnabled: false,
    contextDescription: 'Création d\'un nouveau chantier',
    themeColor: '#8b5cf6',
    placeholder: 'Décris ton projet de rénovation...',
    welcomeMessage: 'Décris-moi ton projet et je t\'aiderai à le structurer ! 📋'
  },
  
  chantier_detail: {
    defaultExpertise: 'chef_chantier',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 4,
    contextDescription: 'Détail d\'un chantier',
    themeColor: '#f97316',
    placeholder: 'Question sur ce chantier...',
    welcomeMessage: 'Je connais ce chantier. Comment puis-je t\'aider ?'
  },
  
  travail_detail: {
    defaultExpertise: 'auto', // Résolu depuis expertise_requise
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Détail d\'un lot de travaux',
    themeColor: '#10b981',
    placeholder: 'Demande-moi de l\'aide sur une étape...',
    welcomeMessage: 'Je suis ton expert bricolage ! Sur quelle étape as-tu besoin d\'aide ?'
  },
  
  etape_detail: {
    defaultExpertise: 'auto',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Détail d\'une étape',
    themeColor: '#10b981',
    placeholder: 'Besoin d\'aide sur cette étape ?',
    welcomeMessage: 'Cette étape comporte plusieurs tâches. Par quoi veux-tu commencer ?'
  },
  
  tache_detail: {
    defaultExpertise: 'auto',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Détail d\'une tâche',
    themeColor: '#10b981',
    placeholder: 'Une question sur cette tâche ?',
    welcomeMessage: 'Je vais te guider pour cette tâche. Prêt ?'
  },
  
  profil: {
    defaultExpertise: 'formateur',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Profil utilisateur',
    themeColor: '#8b5cf6',
    placeholder: 'Quel est ton niveau ?',
    welcomeMessage: 'Parlons de tes compétences bricolage !'
  },
  
  chat: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Chat général',
    themeColor: '#2563eb',
    placeholder: 'Ta question...',
    welcomeMessage: 'Salut ! Pose-moi tes questions bricolage !'
  }
};

// ==================== HELPERS ====================

/**
 * Détecte le PageContext depuis le pathname
 */
function detectPageContext(pathname: string): PageContext {
  // Travail détail : /chantiers/travaux/[id]
  if (pathname.match(/^\/chantiers\/travaux\/[^\/]+$/)) {
    return 'travail_detail';
  }
  
  // Nouveau chantier
  if (pathname === '/chantiers/nouveau') {
    return 'nouveau_chantier';
  }
  
  // Chantier détail : /chantiers/[id]
  if (pathname.match(/^\/chantiers\/[^\/]+$/) && !pathname.includes('/travaux')) {
    return 'chantier_detail';
  }
  
  // Liste chantiers
  if (pathname === '/chantiers' || pathname.startsWith('/chantiers')) {
    return 'chantiers';
  }
  
  // Aide
  if (pathname === '/aide' || pathname.startsWith('/aide')) {
    return 'aide';
  }
  
  // Profil
  if (pathname.startsWith('/profil')) {
    return 'profil';
  }
  
  // Home
  if (pathname === '/') {
    return 'home';
  }
  
  // Défaut
  return 'chat';
}

/**
 * Résout l'expertise "auto"
 */
function resolveExpertise(
  config: ExpertiseMappingConfig,
  travailExpertise?: string
): string {
  if (config.defaultExpertise === 'auto') {
    return travailExpertise || config.fallbackExpertise || 'generaliste';
  }
  return config.defaultExpertise;
}

// ==================== HOOK PRINCIPAL ====================

export function useAssistantContext(): AssistantContext {
  const pathname = usePathname();
  const params = useParams();
  
  // État pour le contexte chargé dynamiquement
  const [travailContext, setTravailContext] = useState<string>('');
  const [travailData, setTravailData] = useState<{
    id?: string;
    titre?: string;
    expertiseRequise?: string;
    chantierId?: string;
    chantierTitre?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Détecter le contexte de page
  const pageContext = useMemo(() => detectPageContext(pathname), [pathname]);
  
  // Récupérer la config
  const config = CONTEXT_CONFIG[pageContext];

  // ==================== CHARGEMENT DYNAMIQUE ====================
  
  useEffect(() => {
    async function loadTravailContext() {
      // Uniquement pour travail_detail
      if (pageContext !== 'travail_detail') {
        setTravailContext('');
        setTravailData({});
        return;
      }

      const travailId = params.id as string;
      if (!travailId) return;

      setIsLoading(true);

      try {
        // Importer dynamiquement le service
        const { getEtapesByTravail } = await import('../lib/services/travauxService');
        const data = await getEtapesByTravail(travailId);
        
        if (data) {
          const { travail, etapes } = data;
          
          // Stocker les données du travail
          setTravailData({
            id: travailId,
            titre: travail.titre,
            expertiseRequise: travail.expertise?.code || travail.expertise?.nom,
            // chantierId et chantierTitre si disponibles
          });
          
          // Construire contexte enrichi pour le prompt
          const etapesTexte = etapes.map((e: any) => 
            `Étape ${e.numero}: ${e.titre} (${e.difficulte}, ${e.duree_minutes}min)\nDescription: ${e.description}\nOutils: ${e.outils?.join(', ') || 'Non spécifié'}\nConseils: ${e.conseils || 'Aucun'}`
          ).join('\n\n');
          
          const contexte = `
CONTEXTE TRAVAIL ACTUEL :
Travail : ${travail.titre}
Description : ${travail.description || 'Non spécifiée'}
Expertise requise : ${travail.expertise?.nom || 'Généraliste'}
Progression : ${travail.progression || 0}%
Statut : ${travail.statut || 'En cours'}

ÉTAPES À SUIVRE (${etapes.length} étapes) :
${etapesTexte}

TON RÔLE :
Tu es un expert en ${travail.expertise?.nom || 'bricolage'}. Le bricoleur travaille actuellement sur ce travail et a besoin de ton aide pour suivre ces étapes. Guide-le étape par étape, donne des conseils pratiques, réponds à ses questions sur les outils, techniques et problèmes qu'il rencontre.
          `.trim();
          
          setTravailContext(contexte);
        }
      } catch (error) {
        console.error('Error loading travail context:', error);
        setTravailContext('');
      } finally {
        setIsLoading(false);
      }
    }

    loadTravailContext();
  }, [pathname, params, pageContext]);

  // ==================== RÉSULTAT ====================

  return useMemo(() => {
    // Résoudre l'expertise
    const expertiseCode = resolveExpertise(config, travailData.expertiseRequise);
    
    return {
      // Rétrocompatibilité (ancienne API)
      pageContext,
      contextColor: config.themeColor,
      welcomeMessage: config.welcomeMessage,
      placeholder: config.placeholder,
      additionalContext: travailContext || undefined,
      
      // Nouveaux champs (Phase 5)
      expertiseCode,
      autoDetectEnabled: config.autoDetectEnabled,
      autoDetectThreshold: config.autoDetectAfterMessages || 3,
      promptContext: {
        travailId: travailData.id,
        travailTitre: travailData.titre,
        expertiseRequise: travailData.expertiseRequise,
        chantierId: travailData.chantierId,
        chantierTitre: travailData.chantierTitre
      },
      
      // État
      isLoading
    };
  }, [pageContext, config, travailContext, travailData, isLoading]);
}

export default useAssistantContext;
