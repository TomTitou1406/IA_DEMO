/**
 * /api/chat/route.ts
 * 
 * Route API principale pour le chat IA Papibricole
 * Supporte les prompts génériques ET les expertises métier
 * 
 * @version 2.0
 * @date 25 novembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPrompt, type PromptContext } from '@/app/lib/services/promptService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      context,           // Contexte additionnel (texte libre) - rétrocompatibilité
      isVoiceMode, 
      pageContext,       // Contexte page (home, chantiers, travaux...)
      expertiseCode,     // ← NOUVEAU : Code de l'expertise (electricien, plaquiste...)
      promptContext      // ← NOUVEAU : Contexte structuré (chantier, travail, étape...)
    } = await request.json();

    // Construire le contexte structuré pour le prompt
    const structuredContext: PromptContext = {
      ...promptContext,
      additionalContext: context // Intégrer le contexte texte libre
    };

    // Récupérer le prompt via la fonction unifiée
    // Priorité : expertiseCode > pageContext > fallback
    const promptConfig = await getPrompt({
      expertiseCode,
      pageContext: pageContext || 'chat',
      context: structuredContext,
      additionalContext: context
    });

    let finalPrompt = promptConfig.systemPrompt;
    let maxTokens = 2000;

    // Ajustements pour le mode vocal
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
- N'utilise JAMAIS de formatage Markdown (**, __, etc.) car c'est pour l'audio`;
      maxTokens = 2000;
    }

    const systemMessage = {
      role: 'system' as const,
      content: finalPrompt
    };

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.4, // 0,2 si on veut plus déterministe pour instructions bricolage précises
      max_tokens: maxTokens
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
      // Métadonnées utiles pour le debug et l'UI
      promptUsed: promptConfig.code,
      promptSource: promptConfig.source,
      expertiseNom: promptConfig.expertiseNom || null,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    );
  }
}
