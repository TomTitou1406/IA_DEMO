/**
 * /api/taches/generate/route.ts
 * 
 * API de génération automatique des tâches pour une étape
 * Pattern identique à /api/etapes/generate
 * 
 * @version 1.0
 * @date 04 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ==================== TYPES ====================

interface TacheGeneree {
  numero: number;
  titre: string;
  description?: string;
  duree_estimee_minutes: number;
  est_critique: boolean;
  outils_necessaires?: string[];
  conseils_pro?: string;
}

interface EtapeInfo {
  id: string;
  numero: number;
  titre: string;
  description: string;
  duree_estimee_minutes: number;
  difficulte: string;
  outils_necessaires: string[];
  materiaux_necessaires: any[];
  conseils_pro?: string;
  precautions?: string;
}

interface TravailInfo {
  id: string;
  titre: string;
  description: string;
  code_expertise: string;
  duree_estimee_heures: number;
}

interface ChantierInfo {
  id: string;
  titre: string;
  metadata: any;
}

// ==================== PROMPT ====================

async function getPromptFromDB(): Promise<string | null> {
  const { data } = await supabase
    .from('prompts_library')
    .select('prompt_text')
    .eq('code', 'system_taches')
    .eq('est_actif', true)
    .single();
  
  return data?.prompt_text || null;
}

function getDefaultPrompt(): string {
  return `Tu es un expert en bricolage et rénovation. Tu génères des tâches détaillées pour une étape de travaux.

CONTEXTE :
{{ETAPE_CONTEXT}}

RÈGLES :
1. Décompose l'étape en tâches concrètes et actionnables
2. Chaque tâche = 1 action précise (5-15 minutes généralement)
3. Utilise des verbes d'action : "Couper", "Visser", "Appliquer", "Vérifier"
4. Marque comme "est_critique: true" les tâches de sécurité ou points de contrôle importants
5. Adapte le niveau de détail à la difficulté de l'étape
6. Inclus les outils nécessaires si différents de ceux de l'étape
7. Ajoute des conseils pro pour les tâches délicates

FORMAT DE RÉPONSE (JSON strict) :
{
  "taches": [
    {
      "numero": 1,
      "titre": "Titre court et actionnable",
      "description": "Description détaillée de la tâche",
      "duree_estimee_minutes": 10,
      "est_critique": false,
      "outils_necessaires": ["outil1", "outil2"],
      "conseils_pro": "Conseil optionnel"
    }
  ]
}

IMPORTANT :
- Réponds UNIQUEMENT avec le JSON, pas de texte avant ou après
- Génère entre 3 et 10 tâches selon la complexité de l'étape
- La somme des durées doit être cohérente avec la durée de l'étape`;
}

// ==================== HELPERS ====================

function buildEtapeContext(
  chantier: ChantierInfo,
  travail: TravailInfo,
  etape: EtapeInfo
): string {
  const meta = chantier.metadata || {};
  
  let context = `🏗️ CHANTIER : ${chantier.titre}`;
  if (meta.surface_m2) context += ` (${meta.surface_m2} m²)`;
  context += '\n';
  
  context += `\n🔧 LOT : ${travail.titre}`;
  context += `\n   ${travail.description || ''}`;
  context += `\n   Expertise : ${travail.code_expertise || 'général'}`;
  
  context += `\n\n📋 ÉTAPE À DÉCOMPOSER :`;
  context += `\n   Numéro : ${etape.numero}`;
  context += `\n   Titre : ${etape.titre}`;
  context += `\n   Description : ${etape.description || 'Non spécifiée'}`;
  context += `\n   Durée estimée : ${etape.duree_estimee_minutes} minutes`;
  context += `\n   Difficulté : ${etape.difficulte || 'moyen'}`;
  
  if (etape.outils_necessaires?.length > 0) {
    context += `\n   Outils : ${etape.outils_necessaires.join(', ')}`;
  }
  
  if (etape.materiaux_necessaires?.length > 0) {
    const mats = etape.materiaux_necessaires.map((m: any) => 
      typeof m === 'string' ? m : `${m.nom} (${m.quantite} ${m.unite || ''})`
    ).join(', ');
    context += `\n   Matériaux : ${mats}`;
  }
  
  if (etape.precautions) {
    context += `\n   ⚠️ Précautions : ${etape.precautions}`;
  }
  
  if (etape.conseils_pro) {
    context += `\n   💡 Conseils : ${etape.conseils_pro}`;
  }
  
  // Compétences du bricoleur si disponibles
  if (meta.competences_ok?.length) {
    context += `\n\n👤 BRICOLEUR :`;
    context += `\n   Compétences maîtrisées : ${meta.competences_ok.join(', ')}`;
  }
  if (meta.competences_faibles?.length) {
    context += `\n   Compétences faibles : ${meta.competences_faibles.join(', ')}`;
  }
  
  return context;
}

function parseAIResponse(content: string): TacheGeneree[] {
  try {
    // Nettoyer la réponse
    let cleaned = content.trim();
    
    // Retirer les backticks markdown si présents
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleaned);
    
    if (parsed.taches && Array.isArray(parsed.taches)) {
      return parsed.taches.map((t: any, index: number) => ({
        numero: t.numero || index + 1,
        titre: t.titre || `Tâche ${index + 1}`,
        description: t.description || null,
        duree_estimee_minutes: t.duree_estimee_minutes || 10,
        est_critique: t.est_critique === true,
        outils_necessaires: Array.isArray(t.outils_necessaires) ? t.outils_necessaires : [],
        conseils_pro: t.conseils_pro || null
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Erreur parsing réponse IA:', error);
    console.error('Contenu reçu:', content);
    return [];
  }
}

// ==================== ROUTE HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    const { etapeId } = await request.json();
    
    if (!etapeId) {
      return NextResponse.json(
        { error: 'etapeId requis' },
        { status: 400 }
      );
    }
    
    console.log('🔧 Génération tâches pour étape:', etapeId);
    
    // 1. Charger l'étape
    const { data: etape, error: etapeError } = await supabase
      .from('etapes')
      .select('*')
      .eq('id', etapeId)
      .single();
    
    if (etapeError || !etape) {
      console.error('Étape non trouvée:', etapeError);
      return NextResponse.json(
        { error: 'Étape non trouvée' },
        { status: 404 }
      );
    }
    
    // 2. Charger le travail (lot)
    const { data: travail, error: travailError } = await supabase
      .from('travaux')
      .select('*')
      .eq('id', etape.travail_id)
      .single();
    
    if (travailError || !travail) {
      console.error('Travail non trouvé:', travailError);
      return NextResponse.json(
        { error: 'Lot non trouvé' },
        { status: 404 }
      );
    }
    
    // 3. Charger le chantier
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', travail.chantier_id)
      .single();
    
    if (chantierError || !chantier) {
      console.error('Chantier non trouvé:', chantierError);
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      );
    }
    
    // 4. Construire le contexte
    const etapeContext = buildEtapeContext(chantier, travail, etape);
    
    // 5. Charger le prompt
    let promptText = await getPromptFromDB();
    if (!promptText) {
      promptText = getDefaultPrompt();
    }
    
    // Injecter le contexte
    const finalPrompt = promptText.replace('{{ETAPE_CONTEXT}}', etapeContext);
    
    console.log('📋 Contexte étape:', etapeContext.substring(0, 500));
    
    // 6. Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: finalPrompt },
        { role: 'user', content: `Génère les tâches détaillées pour cette étape : "${etape.titre}"` }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    
    const aiResponse = completion.choices[0].message.content || '';
    console.log('🤖 Réponse IA:', aiResponse.substring(0, 500));
    
    // 7. Parser la réponse
    const taches = parseAIResponse(aiResponse);
    
    if (taches.length === 0) {
      return NextResponse.json(
        { error: 'Aucune tâche générée', rawResponse: aiResponse },
        { status: 500 }
      );
    }
    
    console.log(`✅ ${taches.length} tâches générées pour l'étape "${etape.titre}"`);
    
    // 8. Retourner les tâches (sans sauvegarder - la page s'en charge)
    return NextResponse.json({
      success: true,
      etapeId,
      etapeTitre: etape.titre,
      taches,
      usage: completion.usage
    });
    
  } catch (error) {
    console.error('Erreur génération tâches:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des tâches' },
      { status: 500 }
    );
  }
}
