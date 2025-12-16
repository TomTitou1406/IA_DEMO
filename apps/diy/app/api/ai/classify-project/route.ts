/**
 * /app/api/ai/classify-project/route.ts
 * API de classification projet bricolage (simple vs chantier)
 * 
 * @version 1.0
 * 
 * Utilise le prompt CLASSIFICATION_PROJET_BRICOLAGE pour analyser
 * un projet et recommander le mode de création approprié.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ============================================
// TYPES
// ============================================

interface ClassificationRequest {
  titre_recherche: string;
  titre_video: string;
  chapitres?: string[];
}

interface ClassificationResult {
  classification: 'simple' | 'complexe';
  confiance: number;
  raisons: string[];
  risques_sensibles: string[];
  lots_potentiels: string[];
  duree_estimee: string;
  message_utilisateur: string;
}

interface ClassificationResponse {
  success: boolean;
  result: ClassificationResult;
  mode_affichage: 'simple_only' | 'complexe_only' | 'choix';
  bouton_recommande: 'simple' | 'complexe';
}

// ============================================
// HELPERS
// ============================================

function replaceVariables(template: string, variables: Record<string, string | undefined>): string {
  let result = template;
  
  // Remplacer les variables simples {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  
  // Gérer les blocs conditionnels {{#if variable}}...{{/if}}
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  return result;
}

function determineDisplayMode(result: ClassificationResult): {
  mode_affichage: 'simple_only' | 'complexe_only' | 'choix';
  bouton_recommande: 'simple' | 'complexe';
} {
  const { classification, confiance, risques_sensibles } = result;
  
  // Bridage intelligent
  if (classification === 'complexe' && confiance >= 85 && risques_sensibles.length > 0) {
    // Chantier certain avec risques → forcer chantier
    return { mode_affichage: 'complexe_only', bouton_recommande: 'complexe' };
  }
  
  if (classification === 'simple' && confiance >= 85 && risques_sensibles.length === 0) {
    // Travaux simples certains sans risques → forcer simple
    return { mode_affichage: 'simple_only', bouton_recommande: 'simple' };
  }
  
  // Cas ambigu → laisser le choix
  return { mode_affichage: 'choix', bouton_recommande: classification };
}

// ============================================
// POST - Classifier un projet
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: ClassificationRequest = await request.json();
    const { titre_recherche, titre_video, chapitres } = body;

    // Validation
    if (!titre_recherche || !titre_video) {
      return NextResponse.json(
        { error: 'titre_recherche et titre_video sont requis' },
        { status: 400 }
      );
    }

    console.log(`🔍 Classification projet: "${titre_recherche}" / "${titre_video}"`);

    // 1. Récupérer le prompt depuis la BDD
    const { data: promptData, error: promptError } = await supabase
      .from('prompts_library')
      .select('*')
      .eq('code', 'CLASSIFICATION_PROJET_BRICOLAGE')
      .eq('est_actif', true)
      .single();

    if (promptError || !promptData) {
      console.error('Erreur récupération prompt:', promptError);
      return NextResponse.json(
        { error: 'Prompt de classification non trouvé' },
        { status: 500 }
      );
    }

    // 2. Préparer le prompt avec les variables
    const chapitresStr = chapitres && chapitres.length > 0 
      ? chapitres.join(', ') 
      : undefined;

    const promptFinal = replaceVariables(promptData.prompt_text, {
      titre_recherche,
      titre_video,
      chapitres: chapitresStr
    });

    // 3. Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: promptData.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant expert en bricolage. Réponds uniquement en JSON valide, sans markdown ni backticks.'
        },
        {
          role: 'user',
          content: promptFinal
        }
      ],
      temperature: parseFloat(promptData.temperature) || 0.3,
      max_tokens: promptData.max_tokens || 800,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    
    // 4. Parser la réponse JSON
    let result: ClassificationResult;
    try {
      // Nettoyer la réponse (enlever backticks si présents)
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      result = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', responseText);
      // Fallback si parsing échoue
      result = {
        classification: 'complexe',
        confiance: 50,
        raisons: ['Analyse non concluante'],
        risques_sensibles: [],
        lots_potentiels: [],
        duree_estimee: 'À déterminer',
        message_utilisateur: 'Je ne suis pas certain de la classification. Tu peux choisir le mode qui te convient.'
      };
    }

    // 5. Déterminer le mode d'affichage (bridage intelligent)
    const { mode_affichage, bouton_recommande } = determineDisplayMode(result);

    console.log(`✅ Classification: ${result.classification} (${result.confiance}%) → ${mode_affichage}`);

    // 6. Incrémenter le compteur d'utilisation du prompt
    await supabase
      .from('prompts_library')
      .update({ 
        nb_utilisations: (promptData.nb_utilisations || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', promptData.id);

    // 7. Retourner la réponse
    const response: ClassificationResponse = {
      success: true,
      result,
      mode_affichage,
      bouton_recommande
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erreur classification projet:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
