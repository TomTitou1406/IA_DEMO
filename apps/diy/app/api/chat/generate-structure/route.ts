/**
 * /api/chat/generate-structure/route.ts
 * 
 * Route API pour la génération de structures de chantiers via GPT
 * Appelée par generationService
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
    const { 
      systemPrompt, 
      userPrompt, 
      niveau,
      maxTokens = 4000  // Génération = réponses longues
    } = await request.json();

    if (!userPrompt) {
      return NextResponse.json(
        { error: 'Prompt requis' },
        { status: 400 }
      );
    }

    // Ajuster les paramètres selon le niveau utilisateur
    let temperature = 0.3; // Base : déterministe
    
    if (niveau === 'debutant') {
      // Pour débutants : plus de détails, durées plus longues
      temperature = 0.2;
    } else if (niveau === 'expert') {
      // Pour experts : plus de flexibilité
      temperature = 0.4;
    }

    console.log('🚀 Génération structure - niveau:', niveau, '- tokens max:', maxTokens);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'Tu es un assistant expert en bricolage. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" } // Force JSON valide
    });

    const message = completion.choices[0].message.content || '{}';

    console.log('✅ Génération terminée - tokens utilisés:', completion.usage?.total_tokens);

    return NextResponse.json({
      message,
      model: 'gpt-4o-mini',
      usage: completion.usage
    });

  } catch (error) {
    console.error('Error in generate-structure API:', error);
    
    // Erreur spécifique OpenAI
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Trop de requêtes. Veuillez réessayer dans quelques secondes.' },
          { status: 429 }
        );
      }
      if (error.status === 400) {
        return NextResponse.json(
          { error: 'Description trop longue ou invalide.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de la génération de la structure' },
      { status: 500 }
    );
  }
}
