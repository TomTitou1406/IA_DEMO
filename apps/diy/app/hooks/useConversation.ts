/**
 * useConversation.ts
 * 
 * Hook React pour gérer les conversations avec persistance automatique
 * Utilisé dans ChatInterface pour sauvegarder les échanges en BDD
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Conversation,
  Message,
  Decision,
  SuggestedAction,
  ConversationType,
  UseConversationOptions,
  UseConversationReturn,
  ConversationContext
} from '@/app/lib/types/conversation';
import {
  getUserId,
  createConversation,
  getActiveConversation,
  getConversationById,
  addMessage as addMessageToDB,
  addMessages as addMessagesToDB,
  updateActiveExpertise,
  addDecision as addDecisionToDB,
  addSuggestedAction as addSuggestedActionToDB,
  updateActionStatus as updateActionStatusInDB,
  closeConversation,
  updateContext
} from '@/app/lib/services/conversationService';

// ==================== HOOK PRINCIPAL ====================

export function useConversation(options: UseConversationOptions): UseConversationReturn {
  const {
    userId: providedUserId,
    type,
    contextId,
    autoCreate = true,
    autoSave = true
  } = options;

  // État
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs pour éviter les problèmes de closure
  const conversationRef = useRef<Conversation | null>(null);
  const pendingMessagesRef = useRef<Message[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // User ID (fourni ou généré)
  const userId = providedUserId || getUserId();

  // ==================== CHARGEMENT INITIAL ====================

  /**
   * Charge ou crée la conversation
   */
  const loadOrCreateConversation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Essayer de récupérer une conversation active existante
      let conv = await getActiveConversation(userId, type, contextId);

      // Si pas trouvée et autoCreate activé, en créer une nouvelle
      if (!conv && autoCreate) {
        console.log('📝 Création nouvelle conversation:', type, contextId || '');
        
        conv = await createConversation({
          user_id: userId,
          type,
          chantier_id: type === 'chantier' ? contextId : undefined,
          travail_id: ['travail', 'etape', 'tache'].includes(type) ? contextId : undefined,
          contexte_initial: {
            page_context: type,
            chantier_id: type === 'chantier' ? contextId : undefined,
            travail_id: ['travail', 'etape', 'tache'].includes(type) ? contextId : undefined
          }
        });
      }

      if (conv) {
        setConversation(conv);
        conversationRef.current = conv;
        setMessages(conv.messages || []);
        console.log('✅ Conversation chargée:', conv.id, `(${conv.messages?.length || 0} messages)`);
      } else {
        console.log('ℹ️ Pas de conversation active');
      }

    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Erreur lors du chargement de la conversation');
    } finally {
      setLoading(false);
    }
  }, [userId, type, contextId, autoCreate]);

  // Charger au mount et quand les dépendances changent
  useEffect(() => {
    loadOrCreateConversation();
  }, [loadOrCreateConversation]);

  // ==================== GESTION DES MESSAGES ====================

  /**
   * Sauvegarde les messages en attente (debounced)
   */
  const flushPendingMessages = useCallback(async () => {
    if (!conversationRef.current || pendingMessagesRef.current.length === 0) {
      return;
    }

    const messagesToSave = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];

    try {
      await addMessagesToDB(conversationRef.current.id, messagesToSave);
      console.log(`💾 ${messagesToSave.length} message(s) sauvegardé(s)`);
    } catch (err) {
      console.error('Error saving messages:', err);
      // Remettre les messages en queue en cas d'erreur
      pendingMessagesRef.current = [...messagesToSave, ...pendingMessagesRef.current];
    }
  }, []);

  /**
   * Ajoute un message à la conversation
   */
  const addMessage = useCallback(async (
    message: Omit<Message, 'timestamp'>
  ): Promise<void> => {
    const fullMessage: Message = {
      ...message,
      timestamp: new Date().toISOString()
    };

    // Mise à jour immédiate de l'UI
    setMessages(prev => [...prev, fullMessage]);

    // Si pas de conversation ou pas d'autoSave, arrêter là
    if (!conversationRef.current || !autoSave) {
      return;
    }

    // Ajouter aux messages en attente
    pendingMessagesRef.current.push(fullMessage);

    // Debounce la sauvegarde (500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      flushPendingMessages();
    }, 500);

  }, [autoSave, flushPendingMessages]);

  // Cleanup du timeout au unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Sauvegarder les messages en attente avant de partir
        flushPendingMessages();
      }
    };
  }, [flushPendingMessages]);

  // ==================== GESTION DE L'EXPERTISE ====================

  /**
   * Met à jour l'expertise active
   */
  const updateExpertise = useCallback(async (
    expertiseId: string,
    expertiseCode: string,
    expertiseNom: string,
    trigger: 'auto' | 'manual' = 'manual'
  ): Promise<void> => {
    if (!conversationRef.current) {
      console.warn('No active conversation to update expertise');
      return;
    }

    const success = await updateActiveExpertise(
      conversationRef.current.id,
      expertiseId,
      expertiseCode,
      expertiseNom,
      trigger
    );

    if (success) {
      // Mettre à jour l'état local
      setConversation(prev => prev ? {
        ...prev,
        expertise_actuelle_id: expertiseId,
        code_expertise_actuelle: expertiseCode
      } : null);

      conversationRef.current = {
        ...conversationRef.current,
        expertise_actuelle_id: expertiseId,
        code_expertise_actuelle: expertiseCode
      };
    }
  }, []);

  // ==================== GESTION DES DÉCISIONS ====================

  /**
   * Ajoute une décision
   */
  const addDecision = useCallback(async (
    decision: Omit<Decision, 'id' | 'created_at'>
  ): Promise<void> => {
    if (!conversationRef.current) {
      console.warn('No active conversation to add decision');
      return;
    }

    const newDecision = await addDecisionToDB(
      conversationRef.current.id,
      decision
    );

    if (newDecision) {
      setConversation(prev => prev ? {
        ...prev,
        decisions_prises: [...prev.decisions_prises, newDecision]
      } : null);
    }
  }, []);

  // ==================== GESTION DES ACTIONS SUGGÉRÉES ====================

  /**
   * Ajoute une action suggérée
   */
  const addSuggestedAction = useCallback(async (
    action: Omit<SuggestedAction, 'id' | 'suggested_at' | 'status'>
  ): Promise<void> => {
    if (!conversationRef.current) {
      console.warn('No active conversation to add action');
      return;
    }

    const newAction = await addSuggestedActionToDB(
      conversationRef.current.id,
      action
    );

    if (newAction) {
      setConversation(prev => prev ? {
        ...prev,
        actions_suggerees: [...prev.actions_suggerees, newAction]
      } : null);
    }
  }, []);

  /**
   * Met à jour le statut d'une action
   */
  const updateActionStatus = useCallback(async (
    actionId: string,
    status: SuggestedAction['status']
  ): Promise<void> => {
    if (!conversationRef.current) {
      return;
    }

    const success = await updateActionStatusInDB(
      conversationRef.current.id,
      actionId,
      status
    );

    if (success) {
      setConversation(prev => prev ? {
        ...prev,
        actions_suggerees: prev.actions_suggerees.map(a =>
          a.id === actionId ? { ...a, status } : a
        )
      } : null);
    }
  }, []);

  // ==================== CLÔTURE ====================

  /**
   * Clôture la conversation
   */
  const close = useCallback(async (
    satisfaction?: number,
    feedback?: string
  ): Promise<void> => {
    // D'abord sauvegarder les messages en attente
    await flushPendingMessages();

    if (!conversationRef.current) {
      return;
    }

    const success = await closeConversation(
      conversationRef.current.id,
      satisfaction,
      feedback
    );

    if (success) {
      setConversation(prev => prev ? {
        ...prev,
        statut: 'closed',
        satisfaction_user: satisfaction,
        feedback_user: feedback
      } : null);
    }
  }, [flushPendingMessages]);

  // ==================== UTILITAIRES ====================

  /**
   * Rafraîchit la conversation depuis la BDD
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!conversationRef.current) {
      await loadOrCreateConversation();
      return;
    }

    const refreshed = await getConversationById(conversationRef.current.id);
    if (refreshed) {
      setConversation(refreshed);
      conversationRef.current = refreshed;
      setMessages(refreshed.messages || []);
    }
  }, [loadOrCreateConversation]);

  /**
   * Efface l'erreur
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ==================== RETOUR ====================

  return {
    // État
    conversation,
    messages,
    loading,
    error,

    // Expertise courante (raccourci)
    currentExpertise: conversation ? {
      id: conversation.expertise_actuelle_id,
      code: conversation.code_expertise_actuelle,
      nom: conversation.expertise_historique?.find(
        e => e.expertise_id === conversation.expertise_actuelle_id
      )?.expertise_nom
    } : null,

    // Actions
    addMessage,
    updateExpertise,
    addDecision,
    addSuggestedAction,
    updateActionStatus,
    close,

    // Utilitaires
    refresh,
    clearError
  };
}

// ==================== HOOK SIMPLIFIÉ ====================

/**
 * Hook simplifié pour les cas où on veut juste persister sans contexte
 */
export function useSimpleConversation(type: ConversationType = 'aide_ponctuelle') {
  const userId = getUserId();
  
  return useConversation({
    userId,
    type,
    autoCreate: true,
    autoSave: true
  });
}

// ==================== HOOK POUR CONTEXTE CHANTIER ====================

/**
 * Hook spécialisé pour les conversations liées à un chantier
 */
export function useChantierConversation(chantierId: string) {
  const userId = getUserId();
  
  return useConversation({
    userId,
    type: 'chantier',
    contextId: chantierId,
    autoCreate: true,
    autoSave: true
  });
}

/**
 * Hook spécialisé pour les conversations liées à un travail/lot
 */
export function useTravailConversation(travailId: string) {
  const userId = getUserId();
  
  return useConversation({
    userId,
    type: 'travail',
    contextId: travailId,
    autoCreate: true,
    autoSave: true
  });
}

export default useConversation;
