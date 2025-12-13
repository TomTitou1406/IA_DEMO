/**
 * API Route : /api/travaux-simple/chat
 * 
 * Gère la conversation pour créer un travail simple
 * Utilise le prompt system_travaux_simple_decouverte
 * 
 * @version 1.0
 * @date 05 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 });
    }

    // Charger le prompt depuis la BDD
    const { data: promptData, error: promptError } = await supabase
      .from('prompts_library')
      .select('prompt_text, temperature, max_tokens, model')
      .eq('code', 'system_travaux_simple_decouverte')
      .eq('est_actif', true)
      .single();

    if (promptError || !promptData) {
      console.error('Prompt non trouvé:', promptError);
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    console.log('🔧 Chat travaux simples - Messages:', messages.length);

    // Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: promptData.model || 'gpt-4o',
      messages: [
        { role: 'system', content: promptData.prompt_text },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content
        }))
      ],
      temperature: parseFloat(promptData.temperature) || 0.6,
      max_tokens: promptData.max_tokens || 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ Réponse OpenAI reçue');

    // Essayer d'extraire le JSON si présent
    let travailSimple = null;
    let cleanMessage = responseText;

    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.travail_simple && parsed.ready_to_create) {
          travailSimple = parsed.travail_simple;
          // Nettoyer le message (retirer le JSON)
          cleanMessage = responseText.replace(/```json[\s\S]*?```/g, '').trim();
          // Si le message est vide après nettoyage, mettre un message par défaut
          if (!cleanMessage) {
            cleanMessage = "J'ai préparé ton travail ! Vérifie les détails ci-dessous.";
          }
        }
      }
    } catch (parseError) {
      console.log('Pas de JSON valide dans la réponse (normal si questions en cours)');
    }

    return NextResponse.json({
      success: true,
      message: cleanMessage,
      travail_simple: travailSimple
    });

  } catch (error) {
    console.error('Erreur API chat travaux-simple:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
