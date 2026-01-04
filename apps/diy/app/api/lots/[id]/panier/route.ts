/**
 * API Route : /api/lots/[id]/panier
 * 
 * Génère le panier technique (matériaux + consommables) pour un lot
 * 
 * @version 1.0
 * @date 04 janvier 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================== TYPES ====================

interface Article {
  nom: string;
  categorie: 'materiau' | 'consommable';
  description?: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  prix_total: number;
  conditionnement?: string;
}

interface PanierResult {
  articles: Article[];
  total_materiaux: number;
  total_consommables: number;
  total_general: number;
  notes?: string;
  infos_manquantes?: string[];
}

interface PromptConfig {
  prompt_text: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

// ==================== CHARGEMENT CONTEXTE ====================

async function loadLotContext(lotId: string): Promise<{ lot: any; chantier: any } | null> {
  // Charger le lot
  const { data: lot, error: lotError } = await supabase
    .from('travaux')
    .select('*')
    .eq('id', lotId)
    .eq('niveau', 'lot')
    .single();

  if (lotError || !lot) {
    console.error('❌ Lot non trouvé:', lotId);
    return null;
  }

  // Charger le chantier associé
  const { data: chantier, error: chantierError } = await supabase
    .from('chantiers')
    .select('*')
    .eq('id', lot.chantier_id)
    .single();

  if (chantierError || !chantier) {
    console.error('❌ Chantier non trouvé pour lot:', lotId);
    return null;
  }

  return { lot, chantier };
}

function formatChantierContext(chantier: any): string {
  const meta = chantier.metadata || {};
  let context = '';

  context += `**Projet :** ${chantier.titre}\n`;
  context += `**Description :** ${chantier.description || 'Non définie'}\n`;
  
  if (meta.type_piece || chantier.type_chantier) {
    context += `**Type :** ${meta.type_piece || chantier.type_chantier}\n`;
  }
  if (meta.surface_m2) {
    context += `**Surface :** ${meta.surface_m2} m²\n`;
  }
  if (meta.dimensions) {
    context += `**Dimensions :** ${meta.dimensions}\n`;
  }
  if (meta.hauteur_sous_plafond) {
    context += `**Hauteur sous plafond :** ${meta.hauteur_sous_plafond}m\n`;
  }
  if (meta.etat_existant) {
    context += `**État existant :** ${meta.etat_existant}\n`;
  }
  if (meta.style_souhaite) {
    context += `**Style souhaité :** ${meta.style_souhaite}\n`;
  }

  return context;
}

function formatLotContext(lot: any): string {
  let context = '';

  context += `**Lot :** ${lot.titre}\n`;
  context += `**Description :** ${lot.description || 'Non définie'}\n`;
  context += `**Expertise :** ${lot.code_expertise || 'generaliste'}\n`;
  context += `**Durée estimée :** ${lot.duree_estimee_heures || '?'}h\n`;
  
  if (lot.points_attention) {
    context += `**Points d'attention :** ${lot.points_attention}\n`;
  }

  return context;
}

// ==================== CHARGEMENT PROMPT ====================

async function loadPromptPanier(): Promise<PromptConfig | null> {
  const { data, error } = await supabase
    .from('prompts_library')
    .select('prompt_text, model, temperature, max_tokens')
    .eq('code', 'system_generation_panier')
    .eq('est_actif', true)
    .single();

  if (error || !data) {
    console.error('❌ Prompt system_generation_panier non trouvé');
    return null;
  }

  return {
    prompt_text: data.prompt_text,
    model: data.model || 'gpt-4o',
    temperature: data.temperature ?? 0.4,
    max_tokens: data.max_tokens || 2500
  };
}

// ==================== SAUVEGARDE ARTICLES ====================

async function saveArticles(
  chantierId: string, 
  lotId: string, 
  articles: Article[],
  gammePrix: string
): Promise<{ success: boolean; error?: string }> {
  
  // 1. Supprimer les anciens articles générés par IA pour ce lot
  const { error: deleteError } = await supabase
    .from('materiaux_budget')
    .delete()
    .eq('travail_id', lotId)
    .eq('source', 'ia_genere');

  if (deleteError) {
    console.error('❌ Erreur suppression anciens articles:', deleteError);
    return { success: false, error: deleteError.message };
  }

  // 2. Préparer les nouveaux articles
  const articlesToInsert = articles.map((article, index) => ({
    chantier_id: chantierId,
    travail_id: lotId,
    nom: article.nom,
    categorie: article.categorie,
    description: article.description || null,
    quantite_prevue: article.quantite,
    unite: article.unite,
    cout_unitaire_prevu: article.prix_unitaire,
    cout_total_prevu: article.prix_total,
    notes: article.conditionnement || null,
    statut: 'a_acheter',
    source: 'ia_genere',
    gamme_prix: gammePrix
  }));

  // 3. Insérer les nouveaux articles
  const { error: insertError } = await supabase
    .from('materiaux_budget')
    .insert(articlesToInsert);

  if (insertError) {
    console.error('❌ Erreur insertion articles:', insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

// ==================== MISE À JOUR LOT ====================

async function updateLotCout(lotId: string, totalMateriel: number): Promise<void> {
  const { error } = await supabase
    .from('travaux')
    .update({ 
      cout_materiaux_estime: totalMateriel,
      updated_at: new Date().toISOString()
    })
    .eq('id', lotId);

  if (error) {
    console.error('⚠️ Erreur mise à jour coût lot:', error);
  }
}

// ==================== ROUTE POST ====================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lotId = params.id;
    const body = await request.json().catch(() => ({}));
    const gammePrix = body.gamme_prix || 'standard';

    console.log('🛒 Génération panier pour lot:', lotId);
    console.log('💰 Gamme prix:', gammePrix);

    // 1. Charger le contexte
    const context = await loadLotContext(lotId);
    if (!context) {
      return NextResponse.json(
        { error: 'Lot non trouvé' },
        { status: 404 }
      );
    }

    const { lot, chantier } = context;
    console.log('📋 Lot:', lot.titre);
    console.log('🏠 Chantier:', chantier.titre);

    // 2. Charger le prompt
    const promptConfig = await loadPromptPanier();
    if (!promptConfig) {
      return NextResponse.json(
        { error: 'Configuration prompt manquante' },
        { status: 500 }
      );
    }

    // 3. Préparer le prompt
    const chantierContext = formatChantierContext(chantier);
    const lotContext = formatLotContext(lot);

    let prompt = promptConfig.prompt_text;
    prompt = prompt.replace(/\{\{CHANTIER_CONTEXT\}\}/g, chantierContext);
    prompt = prompt.replace(/\{\{LOT_CONTEXT\}\}/g, lotContext);
    prompt = prompt.replace(/\{\{GAMME_PRIX\}\}/g, gammePrix);

    console.log('🤖 Appel OpenAI...');

    // 4. Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: promptConfig.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Génère le panier technique pour ce lot.' }
      ],
      temperature: promptConfig.temperature,
      max_tokens: promptConfig.max_tokens,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ Réponse OpenAI reçue');

    // 5. Parser le JSON
    let result: PanierResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé dans la réponse');
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      console.log('Réponse brute:', responseText);
      return NextResponse.json(
        { error: 'Erreur parsing réponse IA', raw: responseText },
        { status: 500 }
      );
    }

    console.log(`🛒 Panier généré : ${result.articles?.length || 0} articles`);
    console.log(`💰 Total : ${result.total_general}€`);

    // 6. Sauvegarder les articles
    const saveResult = await saveArticles(
      chantier.id,
      lotId,
      result.articles || [],
      gammePrix
    );

    if (!saveResult.success) {
      return NextResponse.json(
        { error: 'Erreur sauvegarde articles', details: saveResult.error },
        { status: 500 }
      );
    }

    // 7. Mettre à jour le coût du lot
    await updateLotCout(lotId, result.total_general);

    console.log('✅ Panier sauvegardé avec succès');

    // 8. Retourner le résultat
    return NextResponse.json({
      success: true,
      panier: result,
      lot_id: lotId,
      gamme_prix: gammePrix
    });

  } catch (error) {
    console.error('❌ Erreur API panier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

// ==================== ROUTE GET (consultation) ====================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lotId = params.id;

    // Récupérer les articles du lot
    const { data: articles, error } = await supabase
      .from('materiaux_budget')
      .select('*')
      .eq('travail_id', lotId)
      .order('categorie', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Erreur récupération articles' },
        { status: 500 }
      );
    }

    // Calculer les totaux
    const totalMateriaux = articles
      ?.filter(a => a.categorie === 'materiau')
      .reduce((sum, a) => sum + (a.cout_total_prevu || 0), 0) || 0;

    const totalConsommables = articles
      ?.filter(a => a.categorie === 'consommable')
      .reduce((sum, a) => sum + (a.cout_total_prevu || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      articles: articles || [],
      totaux: {
        materiaux: totalMateriaux,
        consommables: totalConsommables,
        total: totalMateriaux + totalConsommables
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET panier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
