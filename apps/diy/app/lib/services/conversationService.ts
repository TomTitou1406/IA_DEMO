/**
 * conversationService.ts
 * 
 * Service de gestion des conversations avec :
 * - Génération UUID valide pour user anonyme
 * - Persistance par chantier
 * - Journal de chantier (décisions, problèmes, points attention)
 * - Sliding window (20 derniers messages)
 * - Résumé automatique si > 25 messages
 * 
 * @version 2.0
 * @date 26 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  expertise_code?: string;
  expertise_nom?: string;
  metadata?: Record<string, any>;
}

export interface Decision {
  id: string;
  date: string;
  description: string;
  categorie: 'technique' | 'materiel' | 'planning' | 'securite' | 'autre';
  validee: boolean;
}

export interface ProblemeResolu {
  id: string;
  date: string;
  probleme: string;
  solution: string;
  expertise_code?: string;
}

export interface Journal {
  decisions: Decision[];
  problemes_resolus: ProblemeResolu[];
  points_attention: string[];
  preferences_bricoleur: {
    niveau?: 'debutant' | 'intermediaire' | 'expert';
    disponibilites?: string;
    outillage?: string[];
    notes?: string;
  };
  resume_conversation?: string;
  derniere_mise_a_jour?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  chantier_id?: string;
  travail_id?: string;
  type: ConversationType;
  titre?: string;
  expertise_actuelle_id?: string;
  code_expertise_actuelle?: string;
  messages: Message[];
  nombre_messages: number;
  journal: Journal;
  decisions_prises?: any[];
  statut: 'active' | 'closed' | 'archived';
  derniere_activite: string;
  created_at: string;
  updated_at: string;
}

export type ConversationType = 
  | 'chantier'      // Conversation liée à un chantier complet
  | 'travail'       // Conversation liée à un lot spécifique
  | 'aide_ponctuelle' // Question rapide sans contexte
  | 'profil'        // Discussion sur le profil/niveau
  | 'general';      // Autre

// ==================== CONSTANTES ====================

const STORAGE_KEY_USER_ID = 'papibricole_user_id';
const MAX_MESSAGES_DISPLAY = 20;  // Sliding window
const RESUME_THRESHOLD = 25;       // Seuil pour générer un résumé

// ==================== HELPERS ====================

/**
 * Génère un UUID v4 valide
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Récupère ou crée un ID utilisateur persistant (UUID valide)
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return generateUUID();
  }
  
  let userId = localStorage.getItem(STORAGE_KEY_USER_ID);
  
  // Si pas d'ID ou format invalide (ancien format temp_xxx), en créer un nouveau
  if (!userId || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    userId = generateUUID();
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    console.log('🆔 Nouvel ID utilisateur généré:', userId);
  }
  
  return userId;
}

/**
 * Journal par défaut
 */
function getDefaultJournal(): Journal {
  return {
    decisions: [],
    problemes_resolus: [],
    points_attention: [],
    preferences_bricoleur: {},
    derniere_mise_a_jour: new Date().toISOString()
  };
}

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupère une conversation active par chantier
 */
export async function getConversationByChantier(
  userId: string, 
  chantierId: string
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('chantier_id', chantierId)
      .eq('statut', 'active')
      .order('derniere_activite', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de conversation trouvée
        return null;
      }
      throw error;
    }

    return data as Conversation;
  } catch (error) {
    console.error('Erreur récupération conversation:', error);
    return null;
  }
}

/**
 * Récupère une conversation active générale (sans chantier)
 */
export async function getActiveConversation(
  userId: string,
  type: ConversationType = 'general'
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .is('chantier_id', null)
      .eq('statut', 'active')
      .order('derniere_activite', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as Conversation;
  } catch (error) {
    console.error('Erreur récupération conversation active:', error);
    return null;
  }
}

/**
 * Crée une nouvelle conversation
 */
export async function createConversation(params: {
  userId: string;
  type: ConversationType;
  chantierId?: string;
  travailId?: string;
  titre?: string;
  expertiseCode?: string;
  expertiseId?: string;
}): Promise<Conversation | null> {
  try {
    const now = new Date().toISOString();
    
    const newConversation = {
      user_id: params.userId,
      type: params.type,
      chantier_id: params.chantierId || null,
      travail_id: params.travailId || null,
      titre: params.titre || `Conversation ${params.type}`,
      expertise_actuelle_id: params.expertiseId || null,
      code_expertise_actuelle: params.expertiseCode || null,
      messages: [],
      nombre_messages: 0,
      journal: getDefaultJournal(),
      decisions_prises: [],
      expertise_historique: [],
      contexte_initial: {},
      contexte_actuel: {},
      actions_suggerees: [],
      statut: 'active',
      derniere_activite: now,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Conversation créée:', data.id);
    return data as Conversation;
  } catch (error) {
    console.error('Erreur création conversation:', error);
    return null;
  }
}

/**
 * Ajoute un message à la conversation
 */
export async function addMessage(
  conversationId: string,
  message: Message
): Promise<boolean> {
  try {
    // Récupérer la conversation actuelle
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('messages, nombre_messages')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    // Ajouter le nouveau message
    const messages = [...(conv.messages || []), {
      ...message,
      id: message.id || generateUUID(),
      timestamp: message.timestamp || new Date().toISOString()
    }];

    // Mettre à jour
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        messages,
        nombre_messages: messages.length,
        derniere_activite: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Erreur ajout message:', error);
    return false;
  }
}

/**
 * Met à jour l'expertise active
 */
export async function updateExpertise(
  conversationId: string,
  expertiseId: string | null,
  expertiseCode: string,
  expertiseNom: string,
  source: 'auto' | 'manual' = 'auto'
): Promise<boolean> {
  try {
    // Récupérer l'historique actuel
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('expertise_historique')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    // Ajouter à l'historique
    const historique = [...(conv.expertise_historique || []), {
      expertise_id: expertiseId,
      expertise_code: expertiseCode,
      expertise_nom: expertiseNom,
      activated_at: new Date().toISOString(),
      source
    }];

    // Mettre à jour
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        expertise_actuelle_id: expertiseId,
        code_expertise_actuelle: expertiseCode,
        expertise_historique: historique,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Erreur mise à jour expertise:', error);
    return false;
  }
}

/**
 * Ajoute une décision au journal
 */
export async function addDecisionToJournal(
  conversationId: string,
  decision: Omit<Decision, 'id' | 'date'>
): Promise<boolean> {
  try {
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('journal')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    const journal: Journal = conv.journal || getDefaultJournal();
    
    journal.decisions.push({
      ...decision,
      id: generateUUID(),
      date: new Date().toISOString()
    });
    journal.derniere_mise_a_jour = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        journal,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    console.log('📝 Décision ajoutée au journal');
    return true;
  } catch (error) {
    console.error('Erreur ajout décision:', error);
    return false;
  }
}

/**
 * Ajoute un problème résolu au journal
 */
export async function addProblemeResoluToJournal(
  conversationId: string,
  probleme: Omit<ProblemeResolu, 'id' | 'date'>
): Promise<boolean> {
  try {
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('journal')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    const journal: Journal = conv.journal || getDefaultJournal();
    
    journal.problemes_resolus.push({
      ...probleme,
      id: generateUUID(),
      date: new Date().toISOString()
    });
    journal.derniere_mise_a_jour = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        journal,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    console.log('🔧 Problème résolu ajouté au journal');
    return true;
  } catch (error) {
    console.error('Erreur ajout problème résolu:', error);
    return false;
  }
}

/**
 * Ajoute un point d'attention au journal
 */
export async function addPointAttentionToJournal(
  conversationId: string,
  point: string
): Promise<boolean> {
  try {
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('journal')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    const journal: Journal = conv.journal || getDefaultJournal();
    
    // Éviter les doublons
    if (!journal.points_attention.includes(point)) {
      journal.points_attention.push(point);
      journal.derniere_mise_a_jour = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          journal,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      console.log('⚠️ Point d\'attention ajouté');
    }
    
    return true;
  } catch (error) {
    console.error('Erreur ajout point attention:', error);
    return false;
  }
}

/**
 * Met à jour les préférences du bricoleur
 */
export async function updatePreferencesBricoleur(
  conversationId: string,
  preferences: Partial<Journal['preferences_bricoleur']>
): Promise<boolean> {
  try {
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('journal')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    const journal: Journal = conv.journal || getDefaultJournal();
    
    journal.preferences_bricoleur = {
      ...journal.preferences_bricoleur,
      ...preferences
    };
    journal.derniere_mise_a_jour = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        journal,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    console.log('👤 Préférences bricoleur mises à jour');
    return true;
  } catch (error) {
    console.error('Erreur mise à jour préférences:', error);
    return false;
  }
}

/**
 * Met à jour le résumé de conversation dans le journal
 */
export async function updateConversationResume(
  conversationId: string,
  resume: string
): Promise<boolean> {
  try {
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('journal')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    const journal: Journal = conv.journal || getDefaultJournal();
    journal.resume_conversation = resume;
    journal.derniere_mise_a_jour = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        journal,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Erreur mise à jour résumé:', error);
    return false;
  }
}

/**
 * Récupère les messages avec sliding window
 */
export function getMessagesForAPI(
  allMessages: Message[],
  maxMessages: number = MAX_MESSAGES_DISPLAY
): Message[] {
  if (allMessages.length <= maxMessages) {
    return allMessages;
  }
  
  // Retourner les N derniers messages
  return allMessages.slice(-maxMessages);
}

/**
 * Vérifie si un résumé est nécessaire
 */
export function needsResume(messagesCount: number): boolean {
  return messagesCount > RESUME_THRESHOLD;
}

/**
 * Ferme une conversation
 */
export async function closeConversation(
  conversationId: string,
  satisfaction?: number,
  feedback?: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('conversations')
      .update({
        statut: 'closed',
        satisfaction_user: satisfaction || null,
        feedback_user: feedback || null,
        closed_at: now,
        updated_at: now
      })
      .eq('id', conversationId);

    if (error) throw error;

    console.log('🔒 Conversation fermée:', conversationId);
    return true;
  } catch (error) {
    console.error('Erreur fermeture conversation:', error);
    return false;
  }
}

/**
 * Démarre une nouvelle conversation (ferme l'ancienne si existe)
 */
export async function startNewConversation(params: {
  userId: string;
  type: ConversationType;
  chantierId?: string;
  travailId?: string;
}): Promise<Conversation | null> {
  try {
    // Fermer l'ancienne conversation active si elle existe
    if (params.chantierId) {
      const existing = await getConversationByChantier(params.userId, params.chantierId);
      if (existing) {
        await closeConversation(existing.id);
      }
    }

    // Créer la nouvelle
    return await createConversation({
      userId: params.userId,
      type: params.type,
      chantierId: params.chantierId,
      travailId: params.travailId,
      titre: `Nouvelle discussion - ${new Date().toLocaleDateString('fr-FR')}`
    });
  } catch (error) {
    console.error('Erreur démarrage nouvelle conversation:', error);
    return null;
  }
}

/**
 * Récupère ou crée une conversation pour le contexte actuel
 */
export async function getOrCreateConversation(params: {
  userId: string;
  type: ConversationType;
  chantierId?: string;
  travailId?: string;
}): Promise<Conversation | null> {
  // Si on a un chantier, chercher la conversation liée
  if (params.chantierId) {
    const existing = await getConversationByChantier(params.userId, params.chantierId);
    if (existing) {
      console.log('📂 Conversation existante trouvée:', existing.id);
      return existing;
    }
  } else {
    // Sinon, chercher une conversation générale active
    const existing = await getActiveConversation(params.userId, params.type);
    if (existing) {
      console.log('📂 Conversation générale trouvée:', existing.id);
      return existing;
    }
  }

  // Créer une nouvelle conversation
  console.log('🆕 Création nouvelle conversation');
  return await createConversation(params);
}
