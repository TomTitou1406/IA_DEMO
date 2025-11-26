/**
 * useConversation.ts
 * 
 * Hook React pour gérer les conversations avec :
 * - Persistance par chantier
 * - Sliding window (20 derniers messages)
 * - Journal de chantier
 * - Gestion automatique création/récupération
 * 
 * @version 2.0
 * @date 26 novembre 2025
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getUserId,
  getOrCreateConversation,
  getConversationByChantier,
  addMessage as addMessageToDB,
  updateExpertise,
  addDecisionToJournal,
  addProblemeResoluToJournal,
  addPointAttentionToJournal,
  updatePreferencesBricoleur,
  updateConversationResume,
  closeConversation,
  startNewConversation,
  getMessagesForAPI,
  needsResume,
  type Conversation,
  type Message,
  type ConversationType,
  type Journal,
  type Decision,
  type ProblemeResolu
} from '../lib/services/conversationService';

// ==================== TYPES ====================

export interface UseConversationOptions {
  type: ConversationType;
  chantierId?: string;
  travailId?: string;
  autoLoad?: boolean;
}

export interface UseConversationReturn {
  // État
  conversation: Conversation | null;
  messages: Message[];
  messagesForAPI: Message[];
  journal: Journal | null;
  isLoading: boolean;
  loading: boolean; // Alias rétrocompatibilité
  error: string | null;
  
  // Expertise (rétrocompatibilité)
  currentExpertise: { id?: string; code?: string } | null;
  
  // Actions messages
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<boolean>;
  
  // Actions expertise
  setExpertise: (expertiseId: string | null, code: string, nom: string) => Promise<boolean>;
  updateExpertise: (expertiseId: string | null, code: string, nom: string) => Promise<boolean>; // Alias
  
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
  const { type, chantierId, travailId, autoLoad = true } = options;
  
  // États
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs pour éviter les doubles appels
  const loadingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // ==================== CHARGEMENT ====================

  const loadConversation = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setIsLoading(true);
    setError(null);

    try {
      // Récupérer l'ID utilisateur
      const userId = getUserId();
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
        setError('Impossible de charger la conversation');
      }
    } catch (err) {
      console.error('Erreur chargement conversation:', err);
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [type, chantierId, travailId]);

  // Charger au mount si autoLoad
  useEffect(() => {
    if (autoLoad) {
      loadConversation();
    }
  }, [autoLoad, loadConversation]);

  // Recharger si le chantier change
  useEffect(() => {
    if (chantierId && autoLoad) {
      loadConversation();
    }
  }, [chantierId, autoLoad, loadConversation]);

  // ==================== ACTIONS MESSAGES ====================

  const addMessage = useCallback(async (
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<boolean> => {
    if (!conversation) {
      console.error('Pas de conversation active');
      return false;
    }

    const fullMessage: Message = {
      ...message,
      id: crypto.randomUUID?.() || `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Optimistic update
    setMessages(prev => [...prev, fullMessage]);

    // Persister en BDD
    const success = await addMessageToDB(conversation.id, fullMessage);
    
    if (!success) {
      // Rollback si échec
      setMessages(prev => prev.filter(m => m.id !== fullMessage.id));
    }

    return success;
  }, [conversation]);

  // ==================== ACTIONS EXPERTISE ====================

  const setExpertise = useCallback(async (
    expertiseId: string | null,
    code: string,
    nom: string
  ): Promise<boolean> => {
    if (!conversation) return false;

    const success = await updateExpertise(conversation.id, expertiseId, code, nom, 'auto');
    
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
    if (!userIdRef.current) return false;

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

  // ==================== RETURN ====================

  // Expertise courante (pour rétrocompatibilité)
  const currentExpertise = conversation ? {
    id: conversation.expertise_actuelle_id,
    code: conversation.code_expertise_actuelle
  } : null;

  return {
    // État
    conversation,
    messages,
    messagesForAPI,
    journal,
    isLoading,
    loading: isLoading, // Alias rétrocompatibilité
    error,
    
    // Expertise (rétrocompatibilité)
    currentExpertise,
    
    // Actions messages
    addMessage,
    
    // Actions expertise
    setExpertise,
    updateExpertise: setExpertise, // Alias rétrocompatibilité
    
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
