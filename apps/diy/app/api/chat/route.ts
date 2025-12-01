/**
 * /api/chat/route.ts
 * 
 * Route API principale pour le chat IA Papibricole
 * Assemble : Prompt BDD + Contexte données (additionalContext)
 * 
 * @version 2.3
 * @date 1 décembre 2025
 */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPrompt, type PromptContext } from '@/app/lib/services/promptService';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Contextes critiques qui nécessitent GPT-4o par défaut
const CRITICAL_CONTEXTS = ['phasage', 'chantier_edit', 'creation_chantier'];

// Mapping pageContext -> code prompt dans prompts_library
const PAGE_CONTEXT_TO_PROMPT_CODE: Record<string, string> = {
  'phasage': 'phasage_assistant_actions',
  // Ajouter d'autres mappings ici au fur et à mesure
};

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

    // Valeurs par défaut
    let maxTokens = 2500;
    let temperature = 0.4;
    let model = 'gpt-4o-mini';

    // Vérifier si on a un prompt spécifique dans prompts_library pour ce pageContext
    const promptCode = PAGE_CONTEXT_TO_PROMPT_CODE[pageContext];
    if (promptCode) {
      const { data: promptData } = await supabase
        .from('prompts_library')
        .select('temperature, max_tokens, model')
        .eq('code', promptCode)
        .eq('est_actif', true)
        .single();
      
      if (promptData) {
        if (promptData.temperature) temperature = Number(promptData.temperature);
        if (promptData.max_tokens) maxTokens = promptData.max_tokens;
        if (promptData.model) model = promptData.model;
        console.log(`📚 Paramètres chargés depuis prompts_library (${promptCode}):`, { model, temperature, maxTokens });
      }
    }
    
    // Fallback : contextes critiques = GPT-4o si pas défini en BDD
    if (!promptCode && CRITICAL_CONTEXTS.includes(pageContext)) {
      model = 'gpt-4o';
      temperature = 0.2;
      console.log(`⚡ Contexte critique détecté (${pageContext}): passage en GPT-4o`);
    }

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
    
    console.log(`🤖 Modèle: ${model} | Temp: ${temperature} | MaxTokens: ${maxTokens} (contexte: ${pageContext || 'default'})`);
    console.log('📋 CONTEXTE ENVOYÉ À L\'IA:', finalPrompt.substring(0, 2000));
    
    const systemMessage = {
      role: 'system' as const,
      content: finalPrompt
    };

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model,
      messages: [systemMessage, ...messages],
      temperature,
      max_tokens: maxTokens
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
      promptUsed: promptConfig.code,
      promptSource: promptConfig.source,
      expertiseNom: promptConfig.expertiseNom || null,
      model,
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
