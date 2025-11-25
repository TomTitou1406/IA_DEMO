/**
 * conversationService.ts
 * 
 * Service de gestion des conversations pour Papibricole DIY
 * CRUD complet avec persistance Supabase
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';
import {
  Conversation,
  CreateConversationData,
  UpdateConversationData,
  Message,
  Decision,
  SuggestedAction,
  ExpertiseHistoryEntry,
  ConversationType,
  generateMessageId,
  generateDecisionId,
  generateActionId,
  toISOTimestamp
} from '@/app/lib/types/conversation';

// ==================== USER ID (MVP) ====================

const USER_ID_KEY = 'papi_user_id';

/**
 * Génère un ID utilisateur temporaire
 */
function generateTempUserId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Récupère ou crée l'ID utilisateur (localStorage)
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    userId = generateTempUserId();
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('🆔 Nouvel utilisateur temporaire créé:', userId);
  }
  
  return userId;
}

/**
 * Réinitialise l'ID utilisateur (pour tests)
 */
export function resetUserId(): string {
  const newId = generateTempUserId();
  localStorage.setItem(USER_ID_KEY, newId);
  return newId;
}

// ==================== CRÉATION ====================

/**
 * Crée une nouvelle conversation
 */
export async function createConversation(
  data: CreateConversationData
): Promise<Conversation | null> {
  try {
    const now = toISOTimestamp();
    
    const conversationData = {
      user_id: data.user_id,
      type: data.type,
      chantier_id: data.chantier_id || null,
      travail_id: data.travail_id || null,
      titre: data.titre || generateDefaultTitle(data.type),
      expertise_actuelle_id: data.expertise_id || null,
      code_expertise_actuelle: data.expertise_code || null,
      expertise_historique: data.expertise_id ? [{
        expertise_id: data.expertise_id,
        expertise_code: data.expertise_code || '',
        expertise_nom: '',
        activated_at: now,
        trigger: 'manual'
      }] : [],
      contexte_initial: data.contexte_initial || {},
      contexte_actuel: data.contexte_initial || {},
      messages: [],
      nombre_messages: 0,
      decisions_prises: [],
      actions_suggerees: [],
      statut: 'active',
      derniere_activite: now,
      created_at: now,
      updated_at: now
    };

    const { data: created, error } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Conversation créée:', created.id);
    return parseConversation(created);

  } catch (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
}

/**
 * Génère un titre par défaut selon le type
 */
function generateDefaultTitle(type: ConversationType): string {
  const titles: Record<ConversationType, string> = {
    aide_ponctuelle: 'Aide ponctuelle',
    chantier: 'Discussion chantier',
    travail: 'Discussion lot',
    etape: 'Aide étape',
    tache: 'Aide tâche',
    profil: 'Évaluation compétences',
    general: 'Conversation'
  };
  
  const date = new Date().toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `${titles[type]} - ${date}`;
}

// ==================== LECTURE ====================

/**
 * Récupère une conversation par son ID
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return parseConversation(data);

  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * Récupère la conversation active pour un contexte donné
 */
export async function getActiveConversation(
  userId: string,
  type: ConversationType,
  contextId?: string // chantierId ou travailId
): Promise<Conversation | null> {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('statut', 'active')
      .order('derniere_activite', { ascending: false })
      .limit(1);

    // Filtrer par contexte si fourni
    if (contextId) {
      if (type === 'chantier') {
        query = query.eq('chantier_id', contextId);
      } else if (type === 'travail' || type === 'etape' || type === 'tache') {
        query = query.eq('travail_id', contextId);
      }
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return parseConversation(data);

  } catch (error) {
    console.error('Error getting active conversation:', error);
    return null;
  }
}

/**
 * Récupère toutes les conversations d'un utilisateur
 */
export async function getUserConversations(
  userId: string,
  options?: {
    type?: ConversationType;
    statut?: 'active' | 'closed' | 'archived';
    limit?: number;
  }
): Promise<Conversation[]> {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('derniere_activite', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.statut) {
      query = query.eq('statut', options.statut);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(parseConversation);

  } catch (error) {
    console.error('Error getting user conversations:', error);
    return [];
  }
}

// ==================== MISE À JOUR ====================

/**
 * Met à jour une conversation
 */
export async function updateConversation(
  id: string,
  data: UpdateConversationData
): Promise<boolean> {
  try {
    const updateData = {
      ...data,
      updated_at: toISOTimestamp(),
      derniere_activite: toISOTimestamp()
    };

    const { error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return true;

  } catch (error) {
    console.error('Error updating conversation:', error);
    return false;
  }
}

/**
 * Ajoute un message à une conversation
 */
export async function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'timestamp'>
): Promise<Message | null> {
  try {
    // Récupérer la conversation actuelle
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Créer le message complet
    const newMessage: Message = {
      id: generateMessageId(),
      ...message,
      timestamp: toISOTimestamp()
    };

    // Ajouter au tableau de messages
    const updatedMessages = [...conversation.messages, newMessage];

    // Mettre à jour en BDD
    const { error } = await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        nombre_messages: updatedMessages.length,
        derniere_activite: toISOTimestamp(),
        updated_at: toISOTimestamp()
      })
      .eq('id', conversationId);

    if (error) throw error;

    return newMessage;

  } catch (error) {
    console.error('Error adding message:', error);
    return null;
  }
}

/**
 * Ajoute plusieurs messages d'un coup (optimisation)
 */
export async function addMessages(
  conversationId: string,
  messages: Array<Omit<Message, 'id' | 'timestamp'>>
): Promise<Message[] | null> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const now = toISOTimestamp();
    const newMessages: Message[] = messages.map((msg, index) => ({
      id: generateMessageId(),
      ...msg,
      timestamp: new Date(Date.now() + index).toISOString() // Légère différence pour l'ordre
    }));

    const updatedMessages = [...conversation.messages, ...newMessages];

    const { error } = await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        nombre_messages: updatedMessages.length,
        derniere_activite: now,
        updated_at: now
      })
      .eq('id', conversationId);

    if (error) throw error;

    return newMessages;

  } catch (error) {
    console.error('Error adding messages:', error);
    return null;
  }
}

/**
 * Met à jour l'expertise active d'une conversation
 */
export async function updateActiveExpertise(
  conversationId: string,
  expertiseId: string,
  expertiseCode: string,
  expertiseNom: string,
  trigger: 'auto' | 'manual' = 'manual'
): Promise<boolean> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const now = toISOTimestamp();

    // Clôturer l'expertise précédente si existe
    const updatedHistory = conversation.expertise_historique.map(entry => {
      if (!entry.deactivated_at) {
        return { ...entry, deactivated_at: now };
      }
      return entry;
    });

    // Ajouter la nouvelle expertise
    const newEntry: ExpertiseHistoryEntry = {
      expertise_id: expertiseId,
      expertise_code: expertiseCode,
      expertise_nom: expertiseNom,
      activated_at: now,
      trigger
    };

    updatedHistory.push(newEntry);

    // Mettre à jour en BDD
    const { error } = await supabase
      .from('conversations')
      .update({
        expertise_actuelle_id: expertiseId,
        code_expertise_actuelle: expertiseCode,
        expertise_historique: updatedHistory,
        derniere_activite: now,
        updated_at: now
      })
      .eq('id', conversationId);

    if (error) throw error;

    console.log(`✅ Expertise changée: ${expertiseCode} (${trigger})`);
    return true;

  } catch (error) {
    console.error('Error updating expertise:', error);
    return false;
  }
}

/**
 * Ajoute une décision à une conversation
 */
export async function addDecision(
  conversationId: string,
  decision: Omit<Decision, 'id' | 'created_at'>
): Promise<Decision | null> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const newDecision: Decision = {
      id: generateDecisionId(),
      ...decision,
      created_at: toISOTimestamp()
    };

    const updatedDecisions = [...conversation.decisions_prises, newDecision];

    const { error } = await supabase
      .from('conversations')
      .update({
        decisions_prises: updatedDecisions,
        derniere_activite: toISOTimestamp(),
        updated_at: toISOTimestamp()
      })
      .eq('id', conversationId);

    if (error) throw error;

    console.log(`✅ Décision enregistrée: ${decision.type}`);
    return newDecision;

  } catch (error) {
    console.error('Error adding decision:', error);
    return null;
  }
}

/**
 * Ajoute une action suggérée
 */
export async function addSuggestedAction(
  conversationId: string,
  action: Omit<SuggestedAction, 'id' | 'suggested_at' | 'status'>
): Promise<SuggestedAction | null> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const newAction: SuggestedAction = {
      id: generateActionId(),
      ...action,
      suggested_at: toISOTimestamp(),
      status: 'pending'
    };

    const updatedActions = [...conversation.actions_suggerees, newAction];

    const { error } = await supabase
      .from('conversations')
      .update({
        actions_suggerees: updatedActions,
        updated_at: toISOTimestamp()
      })
      .eq('id', conversationId);

    if (error) throw error;

    return newAction;

  } catch (error) {
    console.error('Error adding suggested action:', error);
    return null;
  }
}

/**
 * Met à jour le statut d'une action suggérée
 */
export async function updateActionStatus(
  conversationId: string,
  actionId: string,
  status: SuggestedAction['status']
): Promise<boolean> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const updatedActions = conversation.actions_suggerees.map(action => {
      if (action.id === actionId) {
        return { ...action, status };
      }
      return action;
    });

    const { error } = await supabase
      .from('conversations')
      .update({
        actions_suggerees: updatedActions,
        updated_at: toISOTimestamp()
      })
      .eq('id', conversationId);

    if (error) throw error;

    return true;

  } catch (error) {
    console.error('Error updating action status:', error);
    return false;
  }
}

/**
 * Met à jour le contexte actuel
 */
export async function updateContext(
  conversationId: string,
  contexte: Partial<Conversation['contexte_actuel']>
): Promise<boolean> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const updatedContext = {
      ...conversation.contexte_actuel,
      ...contexte
    };

    const { error } = await supabase
      .from('conversations')
      .update({
        contexte_actuel: updatedContext,
        updated_at: toISOTimestamp()
      })
      .eq('id', conversationId);

    if (error) throw error;

    return true;

  } catch (error) {
    console.error('Error updating context:', error);
    return false;
  }
}

// ==================== CLÔTURE ====================

/**
 * Clôture une conversation
 */
export async function closeConversation(
  conversationId: string,
  satisfaction?: number,
  feedback?: string
): Promise<boolean> {
  try {
    const now = toISOTimestamp();

    const updateData: any = {
      statut: 'closed',
      closed_at: now,
      updated_at: now
    };

    if (satisfaction !== undefined) {
      updateData.satisfaction_user = satisfaction;
    }

    if (feedback) {
      updateData.feedback_user = feedback;
    }

    const { error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (error) throw error;

    console.log('✅ Conversation clôturée:', conversationId);
    return true;

  } catch (error) {
    console.error('Error closing conversation:', error);
    return false;
  }
}

/**
 * Archive une conversation
 */
export async function archiveConversation(conversationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        statut: 'archived',
        updated_at: toISOTimestamp()
      })
      .eq('id', conversationId);

    if (error) throw error;

    return true;

  } catch (error) {
    console.error('Error archiving conversation:', error);
    return false;
  }
}

// ==================== UTILITAIRES ====================

/**
 * Parse une conversation depuis la BDD (gestion des JSONB)
 */
function parseConversation(data: any): Conversation {
  return {
    ...data,
    messages: Array.isArray(data.messages) ? data.messages : JSON.parse(data.messages || '[]'),
    expertise_historique: Array.isArray(data.expertise_historique) ? data.expertise_historique : JSON.parse(data.expertise_historique || '[]'),
    decisions_prises: Array.isArray(data.decisions_prises) ? data.decisions_prises : JSON.parse(data.decisions_prises || '[]'),
    actions_suggerees: Array.isArray(data.actions_suggerees) ? data.actions_suggerees : JSON.parse(data.actions_suggerees || '[]'),
    contexte_initial: typeof data.contexte_initial === 'object' ? data.contexte_initial : JSON.parse(data.contexte_initial || '{}'),
    contexte_actuel: typeof data.contexte_actuel === 'object' ? data.contexte_actuel : JSON.parse(data.contexte_actuel || '{}')
  };
}

/**
 * Supprime les conversations anciennes archivées (maintenance)
 */
export async function cleanupOldConversations(
  userId: string,
  daysOld: number = 90
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId)
      .eq('statut', 'archived')
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw error;

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`🗑️ ${count} conversations archivées supprimées`);
    }

    return count;

  } catch (error) {
    console.error('Error cleaning up conversations:', error);
    return 0;
  }
}
