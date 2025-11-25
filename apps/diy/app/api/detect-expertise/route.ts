/**
 * /api/chat/detect-expertise/route.ts
 * 
 * Route API pour la détection d'expertise via GPT
 * Appelée par expertiseService.detectExpertiseWithAI()
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt requis' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant spécialisé dans la classification de problèmes de bricolage. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Déterministe pour classification
      max_tokens: 150   // Réponse courte attendue
    });

    const message = completion.choices[0].message.content || '{}';

    return NextResponse.json({
      message,
      model: 'gpt-4o-mini',
      usage: completion.usage
    });

  } catch (error) {
    console.error('Error in detect-expertise API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la détection d\'expertise' },
      { status: 500 }
    );
  }
}
