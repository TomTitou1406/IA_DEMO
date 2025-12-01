/**
 * types/conversation.ts
 * 
 * Types TypeScript pour le système de conversations Papibricole DIY
 * Alignés sur la table conversations en BDD
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

// ==================== TYPES PRINCIPAUX ====================

/**
 * Types de conversation possibles
 */
export type ConversationType = 
  | 'aide_ponctuelle'  // Homepage "J'ai besoin d'aide"
  | 'chantier'         // Conversation liée à un chantier
  | 'travail'          // Conversation liée à un lot
  | 'etape'            // Conversation liée à une étape
  | 'tache'            // Conversation liée à une tâche
  | 'profil'           // Évaluation compétences
  | 'general';         // Conversation générale

/**
 * Statuts possibles d'une conversation
 */
export type ConversationStatus = 'active' | 'closed' | 'archived';

/**
 * Message dans une conversation
 */
export interface Message {
  id?: string;                    // ID unique (optionnel, généré côté client)
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;              // ISO string
  expertise_code?: string;        // Expertise active lors de ce message
  expertise_nom?: string;         // Nom de l'expertise pour affichage
  metadata?: {
    isVoiceMode?: boolean;        // Message vocal ou texte
    promptSource?: string;        // Source du prompt utilisé
    tokens_used?: number;         // Tokens consommés
    phase1_complete?: boolean;    // ← AJOUTER
    synthese?: any;               // ← AJOUTER
  };
}

/**
 * Entrée dans l'historique des expertises
 */
export interface ExpertiseHistoryEntry {
  expertise_id: string;
  expertise_code: string;
  expertise_nom: string;
  activated_at: string;           // ISO string
  deactivated_at?: string;        // ISO string, null si encore active
  trigger: 'auto' | 'manual';     // Comment l'expertise a été activée
}

/**
 * Décision prise durant la conversation
 */
export interface Decision {
  id: string;
  type: DecisionType;
  description: string;
  data?: Record<string, any>;     // Données structurées (ex: structure chantier générée)
  validated_by_user: boolean;
  created_at: string;             // ISO string
  applied_at?: string;            // ISO string, quand la décision a été appliquée
}

/**
 * Types de décisions possibles
 */
export type DecisionType = 
  | 'chantier_created'            // Chantier créé
  | 'structure_generated'         // Structure lots/étapes/tâches générée
  | 'structure_modified'          // Structure modifiée
  | 'task_completed'              // Tâche marquée terminée
  | 'expertise_switched'          // Changement d'expertise
  | 'recommendation_accepted'     // Recommandation acceptée
  | 'recommendation_rejected';    // Recommandation rejetée

/**
 * Action suggérée par l'IA
 */
export interface SuggestedAction {
  id: string;
  type: ActionType;
  description: string;
  priority: 'low' | 'medium' | 'high';
  data?: Record<string, any>;
  suggested_at: string;           // ISO string
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

/**
 * Types d'actions suggérées
 */
export type ActionType = 
  | 'switch_expertise'            // Proposer changement d'expert
  | 'create_chantier'             // Proposer création chantier
  | 'generate_structure'          // Proposer génération structure
  | 'call_professional'           // Recommander un pro
  | 'safety_warning'              // Avertissement sécurité
  | 'next_step';                  // Proposer étape suivante

/**
 * Contexte initial/actuel de la conversation
 */
export interface ConversationContext {
  // Contexte de navigation
  page_context?: string;
  chantier_id?: string;
  travail_id?: string;
  etape_id?: string;
  tache_id?: string;
  
  // Détails pour enrichir le prompt
  chantier_titre?: string;
  chantier_description?: string;
  travail_titre?: string;
  etape_titre?: string;
  tache_titre?: string;
  
  // Niveau utilisateur
  user_level?: 'debutant' | 'intermediaire' | 'expert';
  
  // Métadonnées
  device?: 'mobile' | 'tablet' | 'desktop';
  started_from?: string;          // D'où vient l'utilisateur
}

/**
 * Conversation complète
 */
export interface Conversation {
  id: string;
  user_id: string;
  chantier_id?: string;
  travail_id?: string;
  type: ConversationType;
  titre?: string;
  
  // Expertise
  expertise_actuelle_id?: string;
  code_expertise_actuelle?: string;
  expertise_historique: ExpertiseHistoryEntry[];
  
  // Contexte
  contexte_initial?: ConversationContext;
  contexte_actuel?: ConversationContext;
  
  // Messages
  messages: Message[];
  nombre_messages: number;
  
  // Décisions et actions
  decisions_prises: Decision[];
  actions_suggerees: SuggestedAction[];
  
  // Statut
  statut: ConversationStatus;
  derniere_activite: string;      // ISO string
  
  // Feedback
  satisfaction_user?: number;     // 1-5
  feedback_user?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

// ==================== TYPES POUR CRÉATION/UPDATE ====================

/**
 * Données pour créer une nouvelle conversation
 */
export interface CreateConversationData {
  user_id: string;
  type: ConversationType;
  chantier_id?: string;
  travail_id?: string;
  titre?: string;
  expertise_id?: string;
  expertise_code?: string;
  contexte_initial?: ConversationContext;
}

/**
 * Données pour mettre à jour une conversation
 */
export interface UpdateConversationData {
  titre?: string;
  expertise_actuelle_id?: string;
  code_expertise_actuelle?: string;
  contexte_actuel?: ConversationContext;
  statut?: ConversationStatus;
  satisfaction_user?: number;
  feedback_user?: string;
}

// ==================== TYPES POUR LE HOOK ====================

/**
 * Options du hook useConversation
 */
export interface UseConversationOptions {
  userId: string;
  type: ConversationType;
  contextId?: string;             // chantierId ou travailId selon le type
  autoCreate?: boolean;           // Créer automatiquement si n'existe pas (défaut: true)
  autoSave?: boolean;             // Sauvegarder automatiquement les messages (défaut: true)
}

/**
 * Retour du hook useConversation
 */
export interface UseConversationReturn {
  // État
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  
  // Expertise
  currentExpertise: {
    id?: string;
    code?: string;
    nom?: string;
  } | null;
  
  // Actions
  addMessage: (message: Omit<Message, 'timestamp'>) => Promise<void>;
  updateExpertise: (expertiseId: string, expertiseCode: string, expertiseNom: string, trigger?: 'auto' | 'manual') => Promise<void>;
  addDecision: (decision: Omit<Decision, 'id' | 'created_at'>) => Promise<void>;
  addSuggestedAction: (action: Omit<SuggestedAction, 'id' | 'suggested_at' | 'status'>) => Promise<void>;
  updateActionStatus: (actionId: string, status: SuggestedAction['status']) => Promise<void>;
  close: (satisfaction?: number, feedback?: string) => Promise<void>;
  
  // Utilitaires
  refresh: () => Promise<void>;
  clearError: () => void;
}

// ==================== UTILITAIRES ====================

/**
 * Génère un ID unique pour les messages côté client
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Génère un ID unique pour les décisions côté client
 */
export function generateDecisionId(): string {
  return `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Génère un ID unique pour les actions côté client
 */
export function generateActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formatte un timestamp ISO
 */
export function toISOTimestamp(date?: Date): string {
  return (date || new Date()).toISOString();
}
