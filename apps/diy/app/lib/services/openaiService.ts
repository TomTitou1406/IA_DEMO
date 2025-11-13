interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Envoie un message à OpenAI et retourne la réponse
 * @param messages - Historique de la conversation
 * @param context - Contexte additionnel (chantier, page, etc.)
 * @param isVoiceMode - Si true, force des réponses courtes pour le vocal
 */
export async function sendChatMessage(
  messages: Message[],
  context?: string,
  isVoiceMode?: boolean,
  pageContext?: string // ← NOUVEAU paramètre
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages, 
        context,
        isVoiceMode,
        pageContext // ← Passer à l'API
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
