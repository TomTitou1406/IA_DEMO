/**
 * expertiseMapping.ts
 * 
 * Configuration du mapping entre contextes de page et expertises
 * Permet à l'assistant de s'adapter automatiquement selon la navigation
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

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
  | 'parametres';

export interface ExpertiseMappingConfig {
  /** Expertise par défaut pour ce contexte */
  defaultExpertise: string | 'auto' | 'generaliste';
  
  /** Expertise de fallback si la principale n'est pas disponible */
  fallbackExpertise?: string;
  
  /** Activer la détection automatique après quelques messages */
  autoDetectEnabled: boolean;
  
  /** Nombre de messages avant détection auto (si activée) */
  autoDetectAfterMessages?: number;
  
  /** Description du contexte pour le prompt */
  contextDescription: string;
  
  /** Couleur associée au contexte */
  themeColor: string;
  
  /** Placeholder du champ de saisie */
  placeholder: string;
  
  /** Message de bienvenue */
  welcomeMessage: string;
}

// ==================== CONFIGURATION ====================

/**
 * Table de mapping contexte → expertise
 */
export const CONTEXT_TO_EXPERTISE: Record<PageContext, ExpertiseMappingConfig> = {
  
  // ===== PAGES GÉNÉRALES =====
  
  home: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Page d\'accueil - L\'utilisateur découvre l\'application ou cherche de l\'aide générale',
    themeColor: '#2563eb',
    placeholder: 'Comment puis-je t\'aider ?',
    welcomeMessage: 'Salut ! Je suis ton assistant bricolage. Décris-moi ton projet ou pose-moi une question ! 🔨'
  },

  aide: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 2,
    contextDescription: 'Page d\'aide - L\'utilisateur a un problème ponctuel à résoudre',
    themeColor: '#10b981',
    placeholder: 'Décris ton problème...',
    welcomeMessage: 'Dis-moi ce qui te bloque, je vais t\'aider à trouver une solution ! 💡'
  },

  // ===== GESTION CHANTIERS =====

  chantiers: {
    defaultExpertise: 'chef_chantier',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Liste des chantiers - Vue globale des projets',
    themeColor: '#8b5cf6',
    placeholder: 'Une question sur tes chantiers ?',
    welcomeMessage: 'Je peux t\'aider à organiser tes projets. Que veux-tu savoir ?'
  },

  nouveau_chantier: {
    defaultExpertise: 'chef_chantier',
    autoDetectEnabled: false,
    contextDescription: 'Création d\'un nouveau chantier - Planification et structuration',
    themeColor: '#8b5cf6',
    placeholder: 'Décris ton projet de rénovation...',
    welcomeMessage: 'Décris-moi ton projet en détail et je t\'aiderai à le structurer en étapes ! 📋'
  },

  chantier_detail: {
    defaultExpertise: 'chef_chantier',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 4,
    contextDescription: 'Détail d\'un chantier - Suivi global du projet',
    themeColor: '#8b5cf6',
    placeholder: 'Question sur ce chantier...',
    welcomeMessage: 'Je connais ce chantier. Comment puis-je t\'aider à avancer ?'
  },

  // ===== TRAVAUX / LOTS =====

  travail_detail: {
    defaultExpertise: 'auto', // Sera résolu depuis expertise_requise du lot
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: true,
    autoDetectAfterMessages: 3,
    contextDescription: 'Détail d\'un lot de travaux - Expertise spécifique requise',
    themeColor: '#f59e0b',
    placeholder: 'Question sur ce lot...',
    welcomeMessage: 'Je suis l\'expert pour ce lot. Pose-moi tes questions techniques !'
  },

  etape_detail: {
    defaultExpertise: 'auto', // Hérité du lot parent
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Détail d\'une étape - Guidance pas à pas',
    themeColor: '#f59e0b',
    placeholder: 'Besoin d\'aide sur cette étape ?',
    welcomeMessage: 'Cette étape comporte plusieurs tâches. Par quoi veux-tu commencer ?'
  },

  tache_detail: {
    defaultExpertise: 'auto', // Hérité du lot parent
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Détail d\'une tâche - Instructions précises',
    themeColor: '#f59e0b',
    placeholder: 'Une question sur cette tâche ?',
    welcomeMessage: 'Je vais te guider pour cette tâche. Prêt ?'
  },

  // ===== PROFIL =====

  profil: {
    defaultExpertise: 'formateur',
    fallbackExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Profil utilisateur - Évaluation des compétences',
    themeColor: '#ec4899',
    placeholder: 'Parle-moi de ton expérience...',
    welcomeMessage: 'Parlons de ton niveau en bricolage pour que je puisse mieux t\'accompagner ! 🎓'
  },

  // ===== PARAMÈTRES =====

  parametres: {
    defaultExpertise: 'generaliste',
    autoDetectEnabled: false,
    contextDescription: 'Paramètres de l\'application',
    themeColor: '#6b7280',
    placeholder: 'Une question sur les paramètres ?',
    welcomeMessage: 'Besoin d\'aide avec les paramètres ?'
  }
};

// ==================== FONCTIONS ====================

/**
 * Récupère la configuration pour un contexte donné
 */
export function getContextConfig(context: PageContext): ExpertiseMappingConfig {
  return CONTEXT_TO_EXPERTISE[context] || CONTEXT_TO_EXPERTISE.home;
}

/**
 * Détermine le PageContext depuis une URL/pathname
 */
export function getPageContextFromPath(pathname: string): PageContext {
  // Nettoyer le pathname
  const cleanPath = pathname.replace(/\/$/, '').toLowerCase();
  
  // Patterns de matching
  if (cleanPath === '' || cleanPath === '/') {
    return 'home';
  }
  
  if (cleanPath === '/aide' || cleanPath.startsWith('/aide')) {
    return 'aide';
  }
  
  if (cleanPath === '/chantiers') {
    return 'chantiers';
  }
  
  if (cleanPath === '/chantiers/nouveau') {
    return 'nouveau_chantier';
  }
  
  if (/^\/chantiers\/[a-z0-9-]+$/i.test(cleanPath)) {
    return 'chantier_detail';
  }
  
  if (/^\/travaux\/[a-z0-9-]+$/i.test(cleanPath)) {
    return 'travail_detail';
  }
  
  if (/^\/etapes\/[a-z0-9-]+$/i.test(cleanPath)) {
    return 'etape_detail';
  }
  
  if (/^\/taches\/[a-z0-9-]+$/i.test(cleanPath)) {
    return 'tache_detail';
  }
  
  if (cleanPath === '/profil' || cleanPath.startsWith('/profil')) {
    return 'profil';
  }
  
  if (cleanPath === '/parametres' || cleanPath.startsWith('/parametres')) {
    return 'parametres';
  }
  
  // Par défaut
  return 'home';
}

/**
 * Résout l'expertise "auto" en expertise concrète
 * Utilisé quand defaultExpertise = 'auto'
 */
export function resolveAutoExpertise(
  context: PageContext,
  travailExpertise?: string | null
): string {
  const config = getContextConfig(context);
  
  // Si pas "auto", retourner directement
  if (config.defaultExpertise !== 'auto') {
    return config.defaultExpertise;
  }
  
  // Pour les contextes travail/étape/tâche : utiliser l'expertise du lot
  if (['travail_detail', 'etape_detail', 'tache_detail'].includes(context)) {
    if (travailExpertise) {
      return travailExpertise;
    }
  }
  
  // Fallback
  return config.fallbackExpertise || 'generaliste';
}

/**
 * Vérifie si la détection auto est activée pour un contexte
 */
export function isAutoDetectEnabled(context: PageContext): boolean {
  const config = getContextConfig(context);
  return config.autoDetectEnabled;
}

/**
 * Récupère le nombre de messages avant détection auto
 */
export function getAutoDetectThreshold(context: PageContext): number {
  const config = getContextConfig(context);
  return config.autoDetectAfterMessages || 3;
}

// ==================== HOOK HELPERS ====================

/**
 * Interface pour le contexte enrichi
 */
export interface EnrichedContext {
  pageContext: PageContext;
  config: ExpertiseMappingConfig;
  resolvedExpertise: string;
  autoDetectEnabled: boolean;
  autoDetectThreshold: number;
}

/**
 * Construit le contexte enrichi complet
 * Utilisé par useAssistantContext
 */
export function buildEnrichedContext(
  pathname: string,
  travailExpertise?: string | null
): EnrichedContext {
  const pageContext = getPageContextFromPath(pathname);
  const config = getContextConfig(pageContext);
  const resolvedExpertise = resolveAutoExpertise(pageContext, travailExpertise);
  
  return {
    pageContext,
    config,
    resolvedExpertise,
    autoDetectEnabled: config.autoDetectEnabled,
    autoDetectThreshold: config.autoDetectAfterMessages || 3
  };
}

// ==================== CONSTANTES UTILES ====================

/**
 * Liste des expertises "artisan" (pour filtrage)
 */
export const ARTISAN_EXPERTISES = [
  'electricien',
  'plaquiste',
  'peintre',
  'menuisier_fenetres',
  'isolateur',
  'ragreeur_solier',
  'demolition_preparation'
] as const;

/**
 * Liste des expertises "coordination" (pour filtrage)
 */
export const COORDINATION_EXPERTISES = [
  'chef_chantier',
  'economiste'
] as const;

/**
 * Expertise généraliste par défaut
 */
export const DEFAULT_EXPERTISE = 'generaliste';

/**
 * Couleurs par catégorie d'expertise
 */
export const EXPERTISE_CATEGORY_COLORS: Record<string, string> = {
  artisan: '#f59e0b',      // Orange
  coordination: '#8b5cf6', // Violet
  economiste: '#10b981',   // Vert
  formateur: '#ec4899',    // Rose
  generaliste: '#2563eb'   // Bleu
};

/**
 * Récupère la couleur selon la catégorie d'expertise
 */
export function getExpertiseColor(expertiseCode: string): string {
  if (ARTISAN_EXPERTISES.includes(expertiseCode as any)) {
    return EXPERTISE_CATEGORY_COLORS.artisan;
  }
  if (COORDINATION_EXPERTISES.includes(expertiseCode as any)) {
    return EXPERTISE_CATEGORY_COLORS.coordination;
  }
  if (expertiseCode === 'economiste') {
    return EXPERTISE_CATEGORY_COLORS.economiste;
  }
  if (expertiseCode === 'formateur') {
    return EXPERTISE_CATEGORY_COLORS.formateur;
  }
  return EXPERTISE_CATEGORY_COLORS.generaliste;
}
