// app/lib/services/conversationContextService.ts

import { supabase } from "@/app/lib/supabaseClient";

/**
 * Type représentant un contexte de conversation
 */
export interface ConversationContext {
  id: string;
  context_type: string;
  context_key: string;
  title: string;
  subtitle: string | null;
  avatar_preview_image: string | null;
  avatar_name: string | null;
  knowledge_id: string;
  voice_rate: number;
  language: string;
  initial_message_new: string;
  initial_message_resume: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère un contexte de conversation par sa clé
 * 
 * @param contextKey - Clé du contexte (ex: 'entreprise.presentation')
 * @returns Le contexte ou null si non trouvé
 * 
 * @example
 * const context = await getConversationContext('entreprise.presentation');
 * if (context) {
 *   console.log(context.title); // "Présenter votre entreprise"
 * }
 */
export async function getConversationContext(
  contextKey: string
): Promise<ConversationContext | null> {
  try {
    const { data, error } = await supabase
      .from("conversation_contexts")
      .select("*")
      .eq("context_key", contextKey)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error(`❌ Erreur récupération contexte ${contextKey}:`, error);
      return null;
    }

    return data as ConversationContext;
  } catch (err) {
    console.error(`❌ Exception récupération contexte ${contextKey}:`, err);
    return null;
  }
}

/**
 * Récupère tous les contextes actifs d'un type donné
 * 
 * @param contextType - Type de contexte (ex: 'ENTREPRISE_CREATION')
 * @returns Liste des contextes
 * 
 * @example
 * const contexts = await getContextsByType('ENTREPRISE_CREATION');
 */
export async function getContextsByType(
  contextType: string
): Promise<ConversationContext[]> {
  try {
    const { data, error } = await supabase
      .from("conversation_contexts")
      .select("*")
      .eq("context_type", contextType)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`❌ Erreur récupération contextes type ${contextType}:`, error);
      return [];
    }

    return data as ConversationContext[];
  } catch (err) {
    console.error(`❌ Exception récupération contextes type ${contextType}:`, err);
    return [];
  }
}

/**
 * Récupère tous les contextes actifs
 * 
 * @returns Liste de tous les contextes actifs
 */
export async function getAllActiveContexts(): Promise<ConversationContext[]> {
  try {
    const { data, error } = await supabase
      .from("conversation_contexts")
      .select("*")
      .eq("is_active", true)
      .order("context_type", { ascending: true });

    if (error) {
      console.error("❌ Erreur récupération tous les contextes:", error);
      return [];
    }

    return data as ConversationContext[];
  } catch (err) {
    console.error("❌ Exception récupération tous les contextes:", err);
    return [];
  }
}
