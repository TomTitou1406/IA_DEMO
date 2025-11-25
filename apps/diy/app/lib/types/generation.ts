/**
 * types/generation.ts
 * 
 * Types TypeScript pour la génération IA de structures de chantiers
 * Utilisés par generationService et les composants de validation
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

// ==================== TYPES GÉNÉRÉS ====================

/**
 * Tâche générée par l'IA
 */
export interface GeneratedTache {
  /** Titre court de la tâche */
  titre: string;
  
  /** Description détaillée */
  description?: string;
  
  /** Durée estimée en minutes */
  duree_estimee: number;
  
  /** Ordre dans l'étape */
  ordre: number;
  
  /** Points de vigilance / sécurité */
  points_vigilance?: string[];
  
  /** Matériel nécessaire */
  materiel?: string[];
  
  /** Niveau de difficulté (1-5) */
  difficulte?: number;
}

/**
 * Étape générée par l'IA
 */
export interface GeneratedEtape {
  /** Titre de l'étape */
  titre: string;
  
  /** Description de l'étape */
  description?: string;
  
  /** Ordre dans le lot */
  ordre: number;
  
  /** Durée totale estimée en minutes */
  duree_estimee: number;
  
  /** Tâches de l'étape */
  taches: GeneratedTache[];
  
  /** Points de contrôle qualité */
  controles_qualite?: string[];
}

/**
 * Lot/Travail généré par l'IA
 */
export interface GeneratedTravail {
  /** Titre du lot */
  titre: string;
  
  /** Description du lot */
  description?: string;
  
  /** Code expertise requise (electricien, plaquiste...) */
  expertise_requise: string;
  
  /** Ordre dans le chantier */
  ordre: number;
  
  /** Durée totale estimée en heures */
  duree_estimee_heures: number;
  
  /** Estimation budget en euros (fourchette basse) */
  budget_estime_min?: number;
  
  /** Estimation budget en euros (fourchette haute) */
  budget_estime_max?: number;
  
  /** Niveau de difficulté global (1-5) */
  difficulte: number;
  
  /** Niveau de risque (faible, moyen, élevé) */
  niveau_risque: 'faible' | 'moyen' | 'eleve';
  
  /** Dépendances (indices des lots qui doivent être faits avant) */
  dependances?: number[];
  
  /** Étapes du lot */
  etapes: GeneratedEtape[];
  
  /** Matériaux principaux nécessaires */
  materiaux_principaux?: string[];
  
  /** Outillage spécifique requis */
  outillage_specifique?: string[];
}

/**
 * Chantier complet généré par l'IA
 */
export interface GeneratedChantier {
  /** Titre du chantier */
  titre: string;
  
  /** Description générale */
  description: string;
  
  /** Type de chantier */
  type: 'renovation' | 'construction' | 'amenagement' | 'reparation' | 'entretien';
  
  /** Pièce ou zone concernée */
  zone?: string;
  
  /** Surface estimée en m² */
  surface_m2?: number;
  
  /** Durée totale estimée en jours */
  duree_estimee_jours: number;
  
  /** Budget total estimé (fourchette basse) */
  budget_total_min?: number;
  
  /** Budget total estimé (fourchette haute) */
  budget_total_max?: number;
  
  /** Niveau de difficulté global (1-5) */
  difficulte_globale: number;
  
  /** Lots de travaux */
  travaux: GeneratedTravail[];
  
  /** Conseils généraux */
  conseils?: string[];
  
  /** Avertissements importants */
  avertissements?: string[];
  
  /** Points nécessitant un professionnel */
  points_pro_requis?: string[];
}

// ==================== TYPES POUR LA GÉNÉRATION ====================

/**
 * Entrée pour la génération
 */
export interface GenerationInput {
  /** Description libre du projet par l'utilisateur */
  description: string;
  
  /** Niveau de l'utilisateur */
  niveau_utilisateur: 'debutant' | 'intermediaire' | 'expert';
  
  /** Budget maximum (optionnel) */
  budget_max?: number;
  
  /** Contraintes de temps (optionnel) */
  delai_max_jours?: number;
  
  /** Préférences (ex: "écologique", "économique", "durable") */
  preferences?: string[];
  
  /** ID du chantier existant (si ajout de lots) */
  chantier_existant_id?: string;
}

/**
 * Résultat de la génération
 */
export interface GenerationResult {
  /** Succès de la génération */
  success: boolean;
  
  /** Structure générée */
  structure?: GeneratedChantier;
  
  /** Message d'erreur si échec */
  error?: string;
  
  /** Avertissements (non bloquants) */
  warnings?: string[];
  
  /** Métadonnées */
  metadata?: {
    /** Temps de génération en ms */
    generation_time_ms: number;
    
    /** Modèle utilisé */
    model: string;
    
    /** Tokens consommés */
    tokens_used?: number;
    
    /** Confiance de la génération (0-100) */
    confidence?: number;
  };
}

/**
 * Résultat de la sauvegarde
 */
export interface SaveResult {
  /** Succès de la sauvegarde */
  success: boolean;
  
  /** ID du chantier créé/mis à jour */
  chantier_id?: string;
  
  /** IDs des travaux créés */
  travaux_ids?: string[];
  
  /** Message d'erreur si échec */
  error?: string;
  
  /** Nombre d'éléments créés */
  counts?: {
    travaux: number;
    etapes: number;
    taches: number;
  };
}

// ==================== TYPES POUR LA VALIDATION UI ====================

/**
 * État de validation d'un élément
 */
export type ValidationStatus = 'pending' | 'approved' | 'modified' | 'rejected';

/**
 * Élément avec état de validation
 */
export interface ValidatableItem<T> {
  /** Données de l'élément */
  data: T;
  
  /** Statut de validation */
  status: ValidationStatus;
  
  /** Modifications apportées par l'utilisateur */
  modifications?: Partial<T>;
  
  /** Commentaire utilisateur */
  comment?: string;
}

/**
 * Structure complète avec validation
 */
export interface ValidatableStructure {
  /** Chantier avec validation */
  chantier: ValidatableItem<Omit<GeneratedChantier, 'travaux'>>;
  
  /** Travaux avec validation */
  travaux: Array<ValidatableItem<Omit<GeneratedTravail, 'etapes'>> & {
    etapes: Array<ValidatableItem<Omit<GeneratedEtape, 'taches'>> & {
      taches: Array<ValidatableItem<GeneratedTache>>;
    }>;
  }>;
  
  /** Validation globale complète */
  isFullyValidated: boolean;
  
  /** Nombre d'éléments rejetés */
  rejectedCount: number;
  
  /** Nombre d'éléments modifiés */
  modifiedCount: number;
}

// ==================== CONSTANTES ====================

/**
 * Mapping niveau difficulté → label
 */
export const DIFFICULTE_LABELS: Record<number, string> = {
  1: 'Très facile',
  2: 'Facile',
  3: 'Moyen',
  4: 'Difficile',
  5: 'Expert'
};

/**
 * Mapping niveau risque → couleur
 */
export const RISQUE_COLORS: Record<string, string> = {
  faible: '#10b981',  // Vert
  moyen: '#f59e0b',   // Orange
  eleve: '#ef4444'    // Rouge
};

/**
 * Types de chantier disponibles
 */
export const CHANTIER_TYPES = [
  { value: 'renovation', label: 'Rénovation', icon: '🔨' },
  { value: 'construction', label: 'Construction', icon: '🏗️' },
  { value: 'amenagement', label: 'Aménagement', icon: '🪑' },
  { value: 'reparation', label: 'Réparation', icon: '🔧' },
  { value: 'entretien', label: 'Entretien', icon: '🧹' }
] as const;

// ==================== HELPERS ====================

/**
 * Calcule les statistiques d'une structure générée
 */
export function calculateStructureStats(structure: GeneratedChantier): {
  totalTravaux: number;
  totalEtapes: number;
  totalTaches: number;
  totalDureeHeures: number;
  difficulteMax: number;
  hasHighRisk: boolean;
} {
  let totalEtapes = 0;
  let totalTaches = 0;
  let totalDureeHeures = 0;
  let difficulteMax = 1;
  let hasHighRisk = false;

  for (const travail of structure.travaux) {
    totalEtapes += travail.etapes.length;
    totalDureeHeures += travail.duree_estimee_heures;
    
    if (travail.difficulte > difficulteMax) {
      difficulteMax = travail.difficulte;
    }
    
    if (travail.niveau_risque === 'eleve') {
      hasHighRisk = true;
    }

    for (const etape of travail.etapes) {
      totalTaches += etape.taches.length;
    }
  }

  return {
    totalTravaux: structure.travaux.length,
    totalEtapes,
    totalTaches,
    totalDureeHeures,
    difficulteMax,
    hasHighRisk
  };
}

/**
 * Formate une durée en heures/jours
 */
export function formatDuree(heures: number): string {
  if (heures < 1) {
    return `${Math.round(heures * 60)} min`;
  } else if (heures < 8) {
    return `${heures.toFixed(1)}h`;
  } else {
    const jours = Math.ceil(heures / 8);
    return `${jours} jour${jours > 1 ? 's' : ''}`;
  }
}

/**
 * Formate un budget
 */
export function formatBudget(min?: number, max?: number): string {
  if (!min && !max) return 'Non estimé';
  
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  });
  
  if (min && max && min !== max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  
  return formatter.format(min || max || 0);
}
