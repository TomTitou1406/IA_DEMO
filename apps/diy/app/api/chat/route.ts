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

    if (isVoiceMode) {
      finalPrompt += `

🎤 MODE VOCAL ACTIVÉ :
RÈGLES CONVERSATIONNELLES :
- Réponds de manière CONCISE mais COMPLÈTE
- Privilégie 2-3 phrases, mais adapte selon le besoin
- Si liste nécessaire : énumère NATURELLEMENT sans numéros
  ❌ Mauvais : "1 : ceci, 2 : cela, 3 : autre"
  ✅ Bon : "Tu auras besoin de ceci, de cela et d'autre chose"
- Utilise des connecteurs naturels : "d'abord", "ensuite", "enfin", "aussi"
- Reste conversationnel, comme si tu parlais à un ami
- Le BON SENS prime : si 5 étapes nécessaires, cite les 5
- Sois clair mais agréable à écouter
- N'utilise JAMAIS de formatage Markdown (**, __, etc.) car c'est pour l'audio`;  // ← NOUVEAU
      maxTokens = 200;
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
