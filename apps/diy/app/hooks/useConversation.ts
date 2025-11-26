/**
 * useConversation.ts
 * 
 * Hook React pour gérer les conversations avec :
 * - Rétrocompatibilité totale avec l'ancien ChatInterface
 * - Persistance par chantier
 * - Sliding window (20 derniers messages)
 * - Journal de chantier
 * 
 * @version 3.0
 * @date 26 novembre 2025
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getUserId,
  getOrCreateConversation,
  getConversationByChantier,
  addMessage as addMessageToDB,
  updateExpertise as updateExpertiseDB,
  addDecisionToJournal,
  addProblemeResoluToJournal,
  addPointAttentionToJournal,
  updatePreferencesBricoleur,
  closeConversation,
  startNewConversation,
  getMessagesForAPI,
  type Conversation,
  type Message,
  type ConversationType,
  type Journal,
  type Decision,
  type ProblemeResolu
} from '../lib/services/conversationService';

// ==================== TYPES ====================

// Options rétrocompatibles avec l'ancien format
export interface UseConversationOptions {
  userId: string;
  type: ConversationType;
  contextId?: string;      // Ancien format (= chantierId)
  chantierId?: string;     // Nouveau format
  travailId?: string;
  etapeId?: string;
  autoCreate?: boolean;    // Ancien format (= autoLoad)
  autoSave?: boolean;      // Ancien format (ignoré, toujours true)
  autoLoad?: boolean;      // Nouveau format
}

export interface UseConversationReturn {
  // État
  conversation: Conversation | null;
  messages: Message[];
  messagesForAPI: Message[];
  journal: Journal | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Expertise (rétrocompatibilité)
  currentExpertise: { id?: string; code?: string } | null;
  
  // Actions messages
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<boolean>;
  
  // Actions expertise
  updateExpertise: (expertiseId: string | null, code: string, nom?: string, source?: 'auto' | 'manual') => Promise<boolean>;
  
  // Actions journal
  addDecision: (decision: Omit<Decision, 'id' | 'date'>) => Promise<boolean>;
  addProbleme: (probleme: Omit<ProblemeResolu, 'id' | 'date'>) => Promise<boolean>;
  addPointAttention: (point: string) => Promise<boolean>;
  updatePreferences: (prefs: Partial<Journal['preferences_bricoleur']>) => Promise<boolean>;
  
  // Actions conversation
  startNew: () => Promise<boolean>;
  close: (satisfaction?: number, feedback?: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

// ==================== HOOK ====================

export function useConversation(options: UseConversationOptions): UseConversationReturn {
  // Normaliser les options (rétrocompatibilité)
  const userId = options.userId;
  const type = options.type;
  const chantierId = options.chantierId || options.contextId; // contextId → chantierId
  const travailId = options.travailId;
  const autoLoad = options.autoLoad ?? options.autoCreate ?? true; // autoCreate → autoLoad
  
  // États
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs pour éviter les doubles appels
  const loadingRef = useRef(false);
  const userIdRef = useRef<string>(userId);

  // ==================== CHARGEMENT ====================

  const loadConversation = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setIsLoading(true);
    setError(null);

    try {
      userIdRef.current = userId;

      // Récupérer ou créer la conversation
      const conv = await getOrCreateConversation({
        userId,
        type,
        chantierId,
        travailId
      });

      if (conv) {
        setConversation(conv);
        setMessages(conv.messages || []);
        console.log('💬 Conversation chargée:', conv.id, `(${conv.messages?.length || 0} messages)`);
      } else {
        // Pas d'erreur si pas de conversation, on continue en local
        console.log('ℹ️ Pas de conversation persistée, mode local');
      }
    } catch (err) {
      console.error('Erreur chargement conversation:', err);
      // On ne bloque pas, on continue en mode local
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [userId, type, chantierId, travailId]);

  // Charger au mount si autoLoad
  useEffect(() => {
    if (autoLoad) {
      loadConversation();
    } else {
      setIsLoading(false);
    }
  }, [autoLoad, loadConversation]);

  // ==================== ACTIONS MESSAGES ====================

  const addMessage = useCallback(async (
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<boolean> => {
    const fullMessage: Message = {
      ...message,
      id: crypto.randomUUID?.() || `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Optimistic update (toujours)
    setMessages(prev => [...prev, fullMessage]);

    // Persister en BDD si on a une conversation
    if (conversation) {
      const success = await addMessageToDB(conversation.id, fullMessage);
      if (!success) {
        console.warn('⚠️ Message non persisté en BDD');
      }
      return success;
    }

    return true; // Mode local, on considère que c'est ok
  }, [conversation]);

  // ==================== ACTIONS EXPERTISE ====================

  const updateExpertise = useCallback(async (
    expertiseId: string | null,
    code: string,
    nom?: string,
    source: 'auto' | 'manual' = 'auto'
  ): Promise<boolean> => {
    if (!conversation) return false;

    const success = await updateExpertiseDB(
      conversation.id, 
      expertiseId, 
      code, 
      nom || code, 
      source
    );
    
    if (success) {
      setConversation(prev => prev ? {
        ...prev,
        expertise_actuelle_id: expertiseId || undefined,
        code_expertise_actuelle: code
      } : null);
    }

    return success;
  }, [conversation]);

  // ==================== ACTIONS JOURNAL ====================

  const addDecision = useCallback(async (
    decision: Omit<Decision, 'id' | 'date'>
  ): Promise<boolean> => {
    if (!conversation) return false;
    return await addDecisionToJournal(conversation.id, decision);
  }, [conversation]);

  const addProbleme = useCallback(async (
    probleme: Omit<ProblemeResolu, 'id' | 'date'>
  ): Promise<boolean> => {
    if (!conversation) return false;
    return await addProblemeResoluToJournal(conversation.id, probleme);
  }, [conversation]);

  const addPointAttention = useCallback(async (point: string): Promise<boolean> => {
    if (!conversation) return false;
    return await addPointAttentionToJournal(conversation.id, point);
  }, [conversation]);

  const updatePreferences = useCallback(async (
    prefs: Partial<Journal['preferences_bricoleur']>
  ): Promise<boolean> => {
    if (!conversation) return false;
    return await updatePreferencesBricoleur(conversation.id, prefs);
  }, [conversation]);

  // ==================== ACTIONS CONVERSATION ====================

  const startNew = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const newConv = await startNewConversation({
        userId: userIdRef.current,
        type,
        chantierId,
        travailId
      });

      if (newConv) {
        setConversation(newConv);
        setMessages([]);
        console.log('🆕 Nouvelle conversation démarrée:', newConv.id);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [type, chantierId, travailId]);

  const close = useCallback(async (
    satisfaction?: number,
    feedback?: string
  ): Promise<boolean> => {
    if (!conversation) return false;

    const success = await closeConversation(conversation.id, satisfaction, feedback);
    
    if (success) {
      setConversation(prev => prev ? { ...prev, statut: 'closed' } : null);
    }

    return success;
  }, [conversation]);

  const reload = useCallback(async () => {
    loadingRef.current = false;
    await loadConversation();
  }, [loadConversation]);

  // ==================== COMPUTED VALUES ====================

  // Messages pour l'API (sliding window)
  const messagesForAPI = getMessagesForAPI(messages);

  // Journal actuel
  const journal = conversation?.journal || null;

  // Expertise courante (pour rétrocompatibilité)
  const currentExpertise = conversation ? {
    id: conversation.expertise_actuelle_id,
    code: conversation.code_expertise_actuelle
  } : null;

  // ==================== RETURN ====================

  return {
    // État
    conversation,
    messages,
    messagesForAPI,
    journal,
    loading: isLoading,   // Alias rétrocompatibilité
    isLoading,
    error,
    
    // Expertise (rétrocompatibilité)
    currentExpertise,
    
    // Actions messages
    addMessage,
    
    // Actions expertise
    updateExpertise,
    
    // Actions journal
    addDecision,
    addProbleme,
    addPointAttention,
    updatePreferences,
    
    // Actions conversation
    startNew,
    close,
    reload
  };
}

export default useConversation;

// Re-export pour rétrocompatibilité
export { getUserId } from '../lib/services/conversationService';
