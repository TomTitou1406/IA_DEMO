import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSystemPromptForContext } from '@/app/lib/services/promptService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { messages, context, isVoiceMode, pageContext } = await request.json();

    // Déterminer le contexte (par défaut: chat)
    const contextType = pageContext || 'chat';

    // Récupérer le prompt système depuis la DB
    const promptConfig = await getSystemPromptForContext(contextType, context);

    let finalPrompt = promptConfig.systemPrompt;
    let maxTokens = 800;

    // ADAPTATION MODE VOCAL
    if (isVoiceMode) {
      finalPrompt += `

🎤 MODE VOCAL ACTIVÉ :
RÈGLES STRICTES :
- Réponds en 2-3 phrases MAXIMUM
- Sois ultra-concis et direct
- Va à l'essentiel, pas de détails
- Une seule idée principale par réponse
- Si liste nécessaire : 3 points MAX
- Ton amical mais efficace`;
      maxTokens = 150; // Forcer des réponses courtes
    }

    const systemMessage = {
      role: 'system' as const,
      content: finalPrompt
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.2, // Déterministe pour instructions bricolage précises
      max_tokens: maxTokens
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
      promptUsed: promptConfig.code // Pour debug
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    );
  }
}
