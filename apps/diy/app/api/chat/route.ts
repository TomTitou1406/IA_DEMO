import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { messages, context, isVoiceMode } = await request.json();

    // Prompt de base
    const basePrompt = `Tu es un assistant bricolage expert et pédagogue pour l'application Papibricole DIY.

Tu aides les bricoleurs à :
- Planifier leurs travaux
- Résoudre des problèmes techniques
- Débloquer des situations
- Comprendre les étapes d'un chantier

Ton style :
- Direct, clair, pas de blabla
- Pédagogue mais pas condescendant
- Donne des conseils pratiques et actionnables
- Utilise des émojis avec parcimonie`;

    // ADAPTATION SELON MODE
    let finalPrompt = basePrompt;
    let maxTokens = 800;

    if (isVoiceMode) {
      // MODE VOCAL : Réponses COURTES
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

    // Ajouter le contexte si présent
    if (context) {
      finalPrompt += `\n\nCONTEXTE ACTUEL :\n${context}`;
    }

    const systemMessage = {
      role: 'system' as const,
      content: finalPrompt
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.2, // Déterministe mais naturel possible 0,5 plus équilibré
      max_tokens: maxTokens
    });

    return NextResponse.json({
      message: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    );
  }
}
