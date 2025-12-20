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
import { getDefaultIASettings } from '@/app/lib/services/appSettingsService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Contextes critiques qui nécessitent GPT-4o par défaut
const CRITICAL_CONTEXTS = ['phasage', 'chantier_edit', 'creation_chantier'];

// Mapping pageContext -> code prompt dans prompts_library
const PAGE_CONTEXT_TO_PROMPT_CODE: Record<string, string> = {
  'phasage': 'phasage_assistant_actions',
  'mise_en_oeuvre': 'etapes_assistant_actions',
  'taches': 'taches_assistant',
  'chantier_edit': 'system_chantier_decouverte',
  'chantier_edit_details': 'system_chantier_edit',
  'aide_decouverte': 'system_aide_decouverte',
  'travaux_simple_decouverte': 'system_travaux_simple_decouverte',
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

    // Déterminer le bon pageContext selon la phase de création
    let effectivePageContext = pageContext || 'chat';
    let typeConfigContext = ''; // Contexte enrichi avec config type
    
    if (pageContext === 'chantier_edit') {
      if (promptContext?.creationPhase === 'details') {
        effectivePageContext = 'chantier_edit';  // Phase 2 = prompt system_chantier_edit
        console.log('📝 Phase 2 détectée: collecte détaillée');
        
        // Charger la config du type de chantier si disponible
        if (promptContext?.typeProjet) {
          const { data: typeConfig } = await supabase
            .from('chantier_types_config')
            .select('*')
            .eq('code', promptContext.typeProjet)
            .eq('est_actif', true)
            .single();
          
          if (typeConfig) {
            console.log('🏠 Config type chargée:', typeConfig.nom);
            typeConfigContext = `
    
    ## TYPE DE CHANTIER : ${typeConfig.icone} ${typeConfig.nom.toUpperCase()}
    
    ### Équipements à suggérer pour ce type :
    ${(typeConfig.equipements_suggestibles || []).join(', ')}
    
    ### Questions spécifiques à poser :
    ${(typeConfig.questions_specifiques || []).map((q: string) => `- ${q}`).join('\n')}
    
    ### Points de vigilance :
    ${(typeConfig.risques_courants || []).map((r: string) => `- ⚠️ ${r}`).join('\n')}
    
    ### Points d'attention :
    ${(typeConfig.points_attention || []).map((p: string) => `- 💡 ${p}`).join('\n')}
    `;
          }
        }
      } else {
        effectivePageContext = 'chantier_decouverte';  // Phase 1 = prompt system_chantier_decouverte
        console.log('💬 Phase 1 détectée: découverte projet');
      }
    }
    
    const promptConfig = await getPrompt({
      expertiseCode,
      pageContext: effectivePageContext,  // ← Utiliser effectivePageContext
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

    // Remplacer {{VIDEO_CONTEXT}} si présent
    if (context && context.includes('=== CONTEXTE VIDÉO ===')) {
      // Le contexte vidéo est fourni, l'injecter
      finalPrompt = finalPrompt.replace('{{VIDEO_CONTEXT}}', context);
      console.log('🎬 Contexte vidéo injecté dans le prompt');
    } else {
      // Pas de contexte vidéo, retirer le placeholder
      finalPrompt = finalPrompt.replace('{{VIDEO_CONTEXT}}', '');
    }

    // Ajouter le contexte pour les pages qui n'utilisent pas {{CHANTIER_CONTEXT}} ni {{VIDEO_CONTEXT}}
    if (context && !finalPrompt.includes(context)) {
      finalPrompt += `\n\n---\nCONTEXTE ACTUEL :\n${context}`;
    }
    
    // Ajouter la config type si disponible (Phase 2)
    if (typeConfigContext) {
      finalPrompt += typeConfigContext;
    }

    // Valeurs par défaut depuis app_settings
    const defaultSettings = await getDefaultIASettings();
    let maxTokens = defaultSettings.maxTokens;
    let temperature = defaultSettings.temperature;
    let model = defaultSettings.model;

    // Vérifier si on a un prompt spécifique dans prompts_library pour ce pageContext
    const promptCode = PAGE_CONTEXT_TO_PROMPT_CODE[effectivePageContext];
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
