/**
 * useAssistantContext.ts
 * 
 * Hook React pour fournir le contexte complet à l'assistant
 * - Détection automatique du contexte selon la page
 * - Chargement dynamique du contexte travail/étapes
 * - Infos de navigation pour le header (breadcrumb, niveau)
 * - Mapping vers les expertises
 * 
 * @version 3.0
 * @date 26 novembre 2025
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

export type NavigationLevel = 'home' | 'chantiers' | 'chantier' | 'lot' | 'etape' | 'tache';

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

export interface NavigationInfo {
  /** Niveau actuel (home, chantiers, chantier, lot, etape, tache) */
  level: NavigationLevel;
  
  /** Breadcrumb à afficher (ex: "../Lot 1/3 • Électricité") */
  breadcrumb: string;
  
  /** Titre court du contexte actuel */
  title: string;
  
  /** Numéro de l'élément courant (si applicable) */
  currentNumber?: number;
  
  /** Total d'éléments au même niveau (si applicable) */
  totalCount?: number;
}

export interface ExpertiseInfo {
  /** Code de l'expertise */
  code: string;
  
  /** Nom affiché */
  nom: string;
  
  /** Icône associée */
  icon: string;
}

export interface AssistantContext {
  // Contexte de base
  pageContext: PageContext;
  contextColor: string;
  welcomeMessage: string;
  placeholder: string;
  additionalContext?: string;
  
  // Navigation (nouveau)
  navigation: NavigationInfo;
  
  // Expertise (nouveau)
  expertise: ExpertiseInfo;
  
  // Détection auto
  autoDetectEnabled: boolean;
  autoDetectThreshold: number;
  
  // Contexte structuré pour le prompt
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

// ==================== CONFIGURATION ====================

const CONTEXT_CONFIG: Record<PageContext, ExpertiseMappingConfig> = {
  home: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Page d\'accueil',
    themeColor: 'var(--blue)',
    placeholder: 'Comment puis-je t\'aider ?',
    welcomeMessage: 'Salut ! Je suis ton assistant bricolage. Pose-moi tes questions ! 🔨'
  },
  
  aide: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 2,
    contextDescription: 'Aide ponctuelle',
    themeColor: 'var(--blue)',
    placeholder: 'Décris ton problème...',
    welcomeMessage: 'Dis-moi ce qui te bloque, je vais t\'aider ! 💡'
  },
  
  chantiers: {
    defaultExpertise: 'chef_chantier',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Liste des chantiers',
    themeColor: 'var(--orange)',
    placeholder: 'Une question sur tes projets ?',
    welcomeMessage: 'Je peux t\'aider à organiser tes projets !'
  },
  
  nouveau_chantier: {
    defaultExpertise: 'chef_chantier',
    autoDetectEnabled: false,
    contextDescription: 'Nouveau chantier',
    themeColor: 'var(--orange)',
    placeholder: 'Décris ton projet...',
    welcomeMessage: 'Décris-moi ton projet et je t\'aide à le structurer ! 📋'
  },
  
  chantier_detail: {
    defaultExpertise: 'chef_chantier',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 4,
    contextDescription: 'Détail chantier',
    themeColor: 'var(--orange)',
    placeholder: 'Question sur ce chantier...',
    welcomeMessage: 'Je connais ce chantier. Comment puis-je t\'aider ?'
  },
  
  travail_detail: {
    defaultExpertise: 'auto',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Détail lot',
    themeColor: 'var(--orange)',
    placeholder: 'Question sur ce lot...',
    welcomeMessage: 'Je suis ton expert pour ce lot. Pose-moi tes questions !'
  },
  
  etape_detail: {
    defaultExpertise: 'auto',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Détail étape',
    themeColor: 'var(--orange)',
    placeholder: 'Besoin d\'aide sur cette étape ?',
    welcomeMessage: 'Je vais te guider sur cette étape !'
  },
  
  tache_detail: {
    defaultExpertise: 'auto',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Détail tâche',
    themeColor: 'var(--orange)',
    placeholder: 'Une question sur cette tâche ?',
    welcomeMessage: 'Prêt à t\'aider pour cette tâche !'
  },
  
  profil: {
    defaultExpertise: 'formateur',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Profil',
    themeColor: 'var(--purple)',
    placeholder: 'Parle-moi de ton expérience...',
    welcomeMessage: 'Parlons de ton niveau en bricolage ! 🎓'
  },
  
  chat: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Chat',
    themeColor: 'var(--blue)',
    placeholder: 'Ta question...',
    welcomeMessage: 'Comment puis-je t\'aider ?'
  }
};

// ==================== EXPERTISE ICONS ====================

const EXPERTISE_ICONS: Record<string, string> = {
  generaliste: '🏠',
  chef_chantier: '📋',
  electricien: '⚡',
  plombier: '💧',
  plaquiste: '🧱',
  peintre: '🎨',
  menuisier: '🪚',
  carreleur: '🔲',
  maçon: '🧱',
  couvreur: '🏠',
  chauffagiste: '🔥',
  climaticien: '❄️',
  serrurier: '🔑',
  vitrier: '🪟',
  isolation: '🧤',
  formateur: '🎓',
  economiste: '📊'
};

function getExpertiseIcon(code: string): string {
  return EXPERTISE_ICONS[code] || '🔧';
}

// ==================== HELPERS ====================

function detectPageContext(pathname: string): PageContext {
  if (pathname.match(/^\/chantiers\/travaux\/[^\/]+$/)) {
    return 'travail_detail';
  }
  if (pathname === '/chantiers/nouveau') {
    return 'nouveau_chantier';
  }
  if (pathname.match(/^\/chantiers\/[^\/]+$/) && !pathname.includes('/travaux')) {
    return 'chantier_detail';
  }
  if (pathname === '/chantiers' || pathname.startsWith('/chantiers')) {
    return 'chantiers';
  }
  if (pathname === '/aide' || pathname.startsWith('/aide')) {
    return 'aide';
  }
  if (pathname.startsWith('/profil')) {
    return 'profil';
  }
  if (pathname === '/') {
    return 'home';
  }
  return 'chat';
}

function detectNavigationLevel(pageContext: PageContext): NavigationLevel {
  switch (pageContext) {
    case 'home':
    case 'aide':
    case 'profil':
    case 'chat':
      return 'home';
    case 'chantiers':
    case 'nouveau_chantier':
      return 'chantiers';
    case 'chantier_detail':
      return 'chantier';
    case 'travail_detail':
      return 'lot';
    case 'etape_detail':
      return 'etape';
    case 'tache_detail':
      return 'tache';
    default:
      return 'home';
  }
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
    expertiseNom?: string;
    chantierId?: string;
    chantierTitre?: string;
    numero?: number;
    total?: number;
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
        const { getEtapesByTravail } = await import('../lib/services/travauxService');
        const data = await getEtapesByTravail(travailId);
        
        if (data) {
          const { travail, etapes } = data;
          
          // Stocker les données du travail
          setTravailData({
            id: travailId,
            titre: travail.titre,
            expertiseRequise: travail.expertise?.code || travail.expertise?.nom,
            expertiseNom: travail.expertise?.nom || 'Généraliste',
            numero: (travail as any).ordre || 1,
            total: (travail as any).total_lots || 1
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

  // ==================== CONSTRUCTION NAVIGATION ====================

  const navigation = useMemo((): NavigationInfo => {
    const level = detectNavigationLevel(pageContext);
    
    switch (level) {
      case 'home':
        return {
          level: 'home',
          breadcrumb: '',
          title: 'Accueil'
        };
        
      case 'chantiers':
        return {
          level: 'chantiers',
          breadcrumb: '',
          title: 'Mes projets'
        };
        
      case 'chantier':
        return {
          level: 'chantier',
          breadcrumb: '',
          title: travailData.chantierTitre || 'Chantier'
        };
        
      case 'lot':
        const lotNum = travailData.numero || 1;
        const lotTotal = travailData.total || 1;
        const lotTitre = travailData.titre || 'Lot';
        return {
          level: 'lot',
          breadcrumb: `../Lot ${lotNum}/${lotTotal}`,
          title: lotTitre,
          currentNumber: lotNum,
          totalCount: lotTotal
        };
        
      case 'etape':
        // TODO: charger les infos d'étape
        return {
          level: 'etape',
          breadcrumb: '../Étape 1/5',
          title: 'Étape'
        };
        
      case 'tache':
        // TODO: charger les infos de tâche
        return {
          level: 'tache',
          breadcrumb: '../Tâche 1/8',
          title: 'Tâche'
        };
        
      default:
        return {
          level: 'home',
          breadcrumb: '',
          title: 'Assistant'
        };
    }
  }, [pageContext, travailData]);

  // ==================== CONSTRUCTION EXPERTISE ====================

  const expertise = useMemo((): ExpertiseInfo => {
    let code = config.defaultExpertise;
    
    // Résoudre "auto" depuis l'expertise du travail
    if (code === 'auto' && travailData.expertiseRequise) {
      code = travailData.expertiseRequise;
    } else if (code === 'auto') {
      code = config.fallbackExpertise || 'generaliste';
    }
    
    // Nom affiché
    let nom = 'Assistant Papibricole';
    switch (code) {
      case 'generaliste':
        nom = 'Assistant Papibricole';
        break;
      case 'chef_chantier':
        nom = 'Chef de chantier';
        break;
      case 'formateur':
        nom = 'Formateur';
        break;
      default:
        nom = travailData.expertiseNom || `Expert ${code}`;
    }
    
    return {
      code,
      nom,
      icon: getExpertiseIcon(code)
    };
  }, [config, travailData]);

  // ==================== RÉSULTAT ====================

  return useMemo(() => ({
    // Contexte de base (rétrocompatibilité)
    pageContext,
    contextColor: config.themeColor,
    welcomeMessage: config.welcomeMessage,
    placeholder: config.placeholder,
    additionalContext: travailContext || undefined,
    
    // Navigation (nouveau)
    navigation,
    
    // Expertise (nouveau)
    expertise,
    
    // Détection auto
    autoDetectEnabled: config.autoDetectEnabled,
    autoDetectThreshold: config.autoDetectAfterMessages || 3,
    
    // Contexte structuré
    promptContext: {
      travailId: travailData.id,
      travailTitre: travailData.titre,
      expertiseRequise: travailData.expertiseRequise,
      chantierId: travailData.chantierId,
      chantierTitre: travailData.chantierTitre
    },
    
    // État
    isLoading
  }), [pageContext, config, travailContext, travailData, navigation, expertise, isLoading]);
}

export default useAssistantContext;
