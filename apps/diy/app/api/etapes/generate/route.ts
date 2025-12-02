/**
 * API Route : /api/etapes/generate
 * 
 * Génère les étapes d'un lot de travaux via IA
 * 
 * @version 1.0
 * @date 02 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================== TYPES ====================

interface EtapeGeneree {
  numero: number;
  titre: string;
  description: string;
  instructions?: string;
  duree_estimee_minutes: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  outils_necessaires?: string[];
  materiaux_necessaires?: { nom: string; quantite: string; unite: string }[];
  precautions?: string;
  conseils_pro?: string;
}

interface ResultatGeneration {
  etapes: EtapeGeneree[];
  duree_totale_estimee_minutes: number;
  conseils_generaux?: string;
}

// ==================== CHARGEMENT CONTEXTE CHANTIER ====================

async function loadChantierContext(chantierId: string): Promise<string> {
  const { data: chantier, error } = await supabase
    .from('chantiers')
    .select('id, titre, description, statut, budget_initial, duree_estimee_heures, metadata')
    .eq('id', chantierId)
    .single();

  if (error || !chantier) {
    throw new Error('Chantier non trouvé');
  }

  const meta = chantier.metadata || {};
  
  let context = `**Projet :** ${chantier.titre || 'Non défini'}\n`;
  context += `**Description :** ${chantier.description || 'Non définie'}\n`;
  
  if (meta.surface_m2 || meta.surface_sol_m2) {
    context += `**Surface :** ${meta.surface_m2 || meta.surface_sol_m2} m²\n`;
  }
  if (meta.dimensions) {
    context += `**Dimensions :** ${meta.dimensions.longueur_m}×${meta.dimensions.largeur_m}×${meta.dimensions.hauteur_m}m\n`;
  }
  
  if (meta.competences_ok && meta.competences_ok.length > 0) {
    context += `**Compétences OK :** ${meta.competences_ok.join(', ')}\n`;
  }
  if (meta.competences_faibles && meta.competences_faibles.length > 0) {
    context += `**Compétences faibles :** ${meta.competences_faibles.join(', ')}\n`;
  }

  if (meta.contraintes) {
    context += `**Contraintes :** ${meta.contraintes}\n`;
  }

  return context;
}

// ==================== CHARGEMENT CONTEXTE LOT ====================

async function loadLotContext(travailId: string): Promise<{ context: string; expertise: string; chantierId: string }> {
  const { data: travail, error } = await supabase
    .from('travaux')
    .select('*')
    .eq('id', travailId)
    .single();

  if (error || !travail) {
    throw new Error('Lot non trouvé');
  }

  let context = `**Lot :** ${travail.titre}\n`;
  context += `**Description :** ${travail.description || 'Non définie'}\n`;
  context += `**Phase :** ${travail.phase || 'Non définie'}\n`;
  context += `**Durée estimée :** ${travail.duree_estimee_heures || 0} heures\n`;
  
  if (travail.budget_estime) {
    context += `**Budget estimé :** ${travail.budget_estime}€\n`;
  }

  // Mapper le code expertise vers un nom lisible
  const expertiseMap: Record<string, string> = {
    'demolition': 'en démolition et dépose',
    'plomberie': 'plombier',
    'electricite': 'électricien',
    'plaquiste': 'plaquiste',
    'carreleur': 'carreleur',
    'peintre': 'peintre',
    'menuisier': 'menuisier',
    'maconnerie': 'maçon',
    'isolation': 'en isolation',
    'generaliste': 'du bâtiment'
  };

  const expertise = expertiseMap[travail.code_expertise] || 'du bâtiment';

  return { 
    context, 
    expertise,
    chantierId: travail.chantier_id 
  };
}

// ==================== CHARGEMENT PROMPT ====================

async function loadPromptEtapes(): Promise<string> {
  const { data, error } = await supabase
    .from('prompts_library')
    .select('prompt_text')
    .eq('code', 'system_etapes')
    .eq('est_actif', true)
    .single();

  if (error || !data) {
    throw new Error('Prompt system_etapes non trouvé');
  }

  return data.prompt_text;
}

// ==================== SAUVEGARDE ÉTAPES ====================

async function saveEtapes(travailId: string, etapes: EtapeGeneree[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Préparer les données pour insertion
    const etapesData = etapes.map((etape, index) => ({
      travail_id: travailId,
      numero: etape.numero || index + 1,
      titre: etape.titre,
      description: etape.description,
      instructions: etape.instructions || null,
      duree_estimee_minutes: etape.duree_estimee_minutes,
      difficulte: etape.difficulte,
      outils_necessaires: etape.outils_necessaires || [],
      materiaux_necessaires: etape.materiaux_necessaires || [],
      precautions: etape.precautions || null,
      conseils_pro: etape.conseils_pro || null,
      statut: 'à_venir',
      progression: 0,
      ordre: etape.numero || index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('etapes')
      .insert(etapesData);

    if (error) {
      console.error('Erreur insertion étapes:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Erreur saveEtapes:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

// ==================== ROUTE POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { travailId, action } = body;

    if (!travailId) {
      return NextResponse.json(
        { error: 'travailId requis' },
        { status: 400 }
      );
    }

    // ========== ACTION : RESET (supprimer les étapes existantes) ==========
    if (action === 'reset') {
      const { error } = await supabase
        .from('etapes')
        .delete()
        .eq('travail_id', travailId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message });
      }
      return NextResponse.json({ success: true });
    }

    // ========== ACTION PAR DÉFAUT : GÉNÉRER LES ÉTAPES ==========
    console.log('🚀 Démarrage génération étapes pour lot:', travailId);

    // 1. Charger le contexte du lot
    const { context: lotContext, expertise, chantierId } = await loadLotContext(travailId);
    console.log('📋 Contexte lot chargé, expertise:', expertise);

    // 2. Charger le contexte du chantier
    const chantierContext = await loadChantierContext(chantierId);
    console.log('📋 Contexte chantier chargé');

    // 3. Charger le prompt
    let prompt = await loadPromptEtapes();
    console.log('📝 Prompt chargé');

    // 4. Injecter les contextes
    prompt = prompt.replace('{{EXPERTISE}}', expertise);
    prompt = prompt.replace('{{CHANTIER_CONTEXT}}', chantierContext);
    prompt = prompt.replace('{{LOT_CONTEXT}}', lotContext);

    console.log('🤖 Appel OpenAI...');

    // 5. Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Génère les étapes de ce lot en JSON.' }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ Réponse OpenAI reçue');

    // 6. Parser le JSON
    let result: ResultatGeneration;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé dans la réponse');
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      console.log('Réponse brute:', responseText);
      return NextResponse.json(
        { error: 'Erreur parsing réponse IA', raw: responseText },
        { status: 500 }
      );
    }

    console.log(`🎉 Étapes générées : ${result.etapes?.length || 0} étapes`);

    // 7. Sauvegarder si demandé
    if (body.autoSave) {
      const saveResult = await saveEtapes(travailId, result.etapes);
      if (!saveResult.success) {
        return NextResponse.json(
          { error: 'Erreur sauvegarde', details: saveResult.error },
          { status: 500 }
        );
      }
      console.log('💾 Étapes sauvegardées en BDD');
    }

    return NextResponse.json({
      success: true,
      etapes: result.etapes,
      duree_totale_estimee_minutes: result.duree_totale_estimee_minutes,
      conseils_generaux: result.conseils_generaux
    });

  } catch (error) {
    console.error('Erreur API etapes/generate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
