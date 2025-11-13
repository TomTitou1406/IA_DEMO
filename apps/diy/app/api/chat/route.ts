import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();

    // Construire le system prompt avec contexte
    const systemMessage = {
      role: 'system' as const,
      content: `Tu es un assistant bricolage expert et pédagogue pour l'application Papibricole DIY.

Tu aides les bricoleurs à :
- Planifier leurs travaux
- Résoudre des problèmes techniques
- Débloquer des situations
- Comprendre les étapes d'un chantier

Ton style :
- Direct, clair, pas de blabla
- Pédagogue mais pas condescendant
- Donne des conseils pratiques et actionnables
- Utilise des émojis avec parcimonie

${context ? `CONTEXTE ACTUEL :\n${context}` : ''}`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 800
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
