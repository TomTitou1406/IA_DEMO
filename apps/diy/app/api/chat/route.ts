/**
 * /api/chat/route.ts
 * 
 * Route API principale pour le chat IA Papibricole
 * Assemble : Prompt BDD + Contexte données (additionalContext)
 * 
 * @version 2.2
 * @date 28 novembre 2025
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
      context,           // Contexte additionnel (texte libre) - additionalContext
      isVoiceMode, 
      pageContext,       // Contexte page (home, chantiers, travaux...)
      expertiseCode,     // Code de l'expertise (electricien, plaquiste...)
      promptContext      // Contexte structuré (chantierId, travailId, etapeId...)
    } = await request.json();

    // Construire le contexte structuré pour le prompt
    const structuredContext: PromptContext = {
      ...promptContext,
      additionalContext: context
    };

    // Récupérer le prompt depuis BDD via promptService
    const promptConfig = await getPrompt({
      expertiseCode,
      pageContext: pageContext || 'chat',
      context: structuredContext,
      additionalContext: context
    });

    // Assembler : Prompt BDD + Contexte données
    let finalPrompt = promptConfig.systemPrompt;
    
    // Remplacer {{CHANTIER_CONTEXT}} par les données (additionalContext)
    if (context) {
      finalPrompt = finalPrompt.replace('{{CHANTIER_CONTEXT}}', context);
    } else {
      finalPrompt = finalPrompt.replace('{{CHANTIER_CONTEXT}}', '(Aucune donnée de chantier disponible)');
    }

    let maxTokens = 2500;

    // Ajustements pour le mode vocal
    if (isVoiceMode) {
      finalPrompt += `

🎤 MODE VOCAL ACTIVÉ :
- Réponds de manière CONCISE mais COMPLÈTE
- Privilégie 2-3 phrases, adapte selon le besoin
- Énumère naturellement sans numéros
- Utilise des connecteurs : "d'abord", "ensuite", "enfin"
- Reste conversationnel
- N'utilise JAMAIS de formatage Markdown (**, __, etc.)`;
    }
    
    console.log('📋 CONTEXTE ENVOYÉ À L\'IA:', finalPrompt.substring(0, 2000));
    const systemMessage = {
      role: 'system' as const,
      content: finalPrompt
    };

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.4,
      max_tokens: maxTokens
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
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
