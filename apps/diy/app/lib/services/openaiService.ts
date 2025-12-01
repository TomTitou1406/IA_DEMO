/**
 * openaiService.ts
 * 
 * Service d'appel à l'API OpenAI pour Papibricole DIY
 * Proxy vers /api/chat avec support des expertises
 * 
 * @version 2.0
 * @date 25 novembre 2025
 */

// ==================== TYPES ====================

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptContext {
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
  tacheId?: string;
  chantierTitre?: string;
  travailTitre?: string;
  etapeTitre?: string;
  tacheTitre?: string;
  userLevel?: 'debutant' | 'intermediaire' | 'expert';
  additionalContext?: string;
  creationPhase?: 'discovery' | 'details' | 'done';
  typeProjet?: string;
}

export interface ChatOptions {
  messages: Message[];
  context?: string;              // Contexte texte libre (rétrocompatibilité)
  isVoiceMode?: boolean;
  pageContext?: string;          // Contexte page (home, chantiers, travaux...)
  expertiseCode?: string;        // Code expertise (electricien, plaquiste...)
  promptContext?: PromptContext; // Contexte structuré
}

export interface ChatResponse {
  message: string;
  promptUsed?: string;
  promptSource?: 'prompts_library' | 'expertise' | 'fallback';
  expertiseNom?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== FONCTION PRINCIPALE ====================

/**
 * Envoie un message à OpenAI et retourne la réponse
 * 
 * @param messages - Historique de la conversation
 * @param context - Contexte additionnel (chantier, page, etc.) - LEGACY
 * @param isVoiceMode - Si true, force des réponses courtes pour le vocal
 * @param pageContext - Contexte de la page (home, chantiers, travaux...)
 * @param expertiseCode - Code de l'expertise à utiliser (optionnel)
 * @param promptContext - Contexte structuré (chantier, travail, étape, tâche)
 */
export async function sendChatMessage(
  messages: Message[],
  context?: string,
  isVoiceMode?: boolean,
  pageContext?: string,
  expertiseCode?: string,
  promptContext?: PromptContext
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages, 
        context,
        isVoiceMode,
        pageContext,
        expertiseCode,
        promptContext
      })
    });

    if (!response.ok) {
      throw new Error('Erreur API Chat');
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
}

/**
 * Version avec objet options (plus flexible)
 * Recommandée pour les nouveaux développements
 */
export async function sendChat(options: ChatOptions): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: options.messages,
        context: options.context,
        isVoiceMode: options.isVoiceMode,
        pageContext: options.pageContext,
        expertiseCode: options.expertiseCode,
        promptContext: options.promptContext
      })
    });

    if (!response.ok) {
      throw new Error('Erreur API Chat');
    }

    const data = await response.json();
    
    return {
      message: data.message,
      promptUsed: data.promptUsed,
      promptSource: data.promptSource,
      expertiseNom: data.expertiseNom,
      usage: data.usage
    };
  } catch (error) {
    console.error('Error in sendChat:', error);
    throw error;
  }
}

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Envoie un message avec une expertise spécifique
 * Raccourci pratique pour les pages contextuelles
 */
export async function sendChatWithExpertise(
  messages: Message[],
  expertiseCode: string,
  options?: {
    isVoiceMode?: boolean;
    promptContext?: PromptContext;
  }
): Promise<ChatResponse> {
  return sendChat({
    messages,
    expertiseCode,
    isVoiceMode: options?.isVoiceMode,
    promptContext: options?.promptContext
  });
}

/**
 * Envoie un message dans un contexte chantier/travail
 * Raccourci pour les pages de détail
 */
export async function sendChatInContext(
  messages: Message[],
  promptContext: PromptContext,
  options?: {
    isVoiceMode?: boolean;
    expertiseCode?: string;
    pageContext?: string;
  }
): Promise<ChatResponse> {
  return sendChat({
    messages,
    promptContext,
    expertiseCode: options?.expertiseCode,
    pageContext: options?.pageContext,
    isVoiceMode: options?.isVoiceMode
  });
}
