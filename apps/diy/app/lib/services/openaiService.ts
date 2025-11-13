interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Envoie un message à OpenAI et retourne la réponse
 */
export async function sendChatMessage(
  messages: Message[],
  context?: string
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context })
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
