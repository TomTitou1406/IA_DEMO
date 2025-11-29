/**
 * API Route : /api/phasage
 * 
 * Génère les lots de travaux pour un chantier
 * 
 * @version 1.0
 * @date 29 novembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';
import { 
  loadReglesPhasage, 
  formatReglesForPrompt, 
  saveLots,
  deleteLots,
  type ResultatPhasage 
} from '@/app/lib/services/phasageService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  
  let context = `## INFORMATIONS DU PROJET\n\n`;
  context += `**Titre :** ${chantier.titre || 'Non défini'}\n`;
  context += `**Description :** ${chantier.description || 'Non définie'}\n\n`;
  
  // Caractéristiques
  if (meta.surface_m2) context += `**Surface :** ${meta.surface_m2} m²\n`;
  if (meta.style_souhaite) context += `**Style souhaité :** ${meta.style_souhaite}\n`;
  
  // Budget & Planning
  const budget = chantier.budget_initial || meta.budget_max;
  if (budget) {
    context += `**Budget :** ${budget}€ ${meta.budget_inclut_materiaux ? '(matériaux inclus)' : '(hors matériaux)'}\n`;
  }
  if (meta.disponibilite_heures_semaine) {
    context += `**Disponibilité :** ${meta.disponibilite_heures_semaine}h/semaine\n`;
  }
  if (meta.deadline_semaines) {
    context += `**Objectif :** ${meta.deadline_semaines} semaines\n`;
  }
  
  // État existant
  if (meta.etat_existant) {
    context += `\n**État existant :** ${meta.etat_existant}\n`;
  }
  
  // Équipements & Éléments
  if (meta.equipements_souhaites && meta.equipements_souhaites.length > 0) {
    context += `**Équipements à installer :** ${meta.equipements_souhaites.join(', ')}\n`;
  }
  if (meta.elements_a_deposer && meta.elements_a_deposer.length > 0) {
    context += `**Éléments à déposer :** ${meta.elements_a_deposer.join(', ')}\n`;
  }
  if (meta.elements_a_conserver && meta.elements_a_conserver.length > 0) {
    context += `**Éléments à conserver :** ${meta.elements_a_conserver.join(', ')}\n`;
  }
  
  // Réseaux
  if (meta.reseaux) {
    const reseauxList = [];
    if (meta.reseaux.electricite_a_refaire) reseauxList.push('Électricité à refaire');
    if (meta.reseaux.plomberie_a_refaire) reseauxList.push('Plomberie à refaire');
    if (meta.reseaux.ventilation_a_prevoir) reseauxList.push('Ventilation à prévoir');
    if (reseauxList.length > 0) {
      context += `**Réseaux :** ${reseauxList.join(', ')}\n`;
    }
  }
  
  // Compétences du bricoleur
  if (meta.competences_ok && meta.competences_ok.length > 0) {
    context += `\n**Compétences maîtrisées par le bricoleur :** ${meta.competences_ok.join(', ')}\n`;
  }
  if (meta.competences_faibles && meta.competences_faibles.length > 0) {
    context += `**Compétences faibles (attention requise) :** ${meta.competences_faibles.join(', ')}\n`;
  }
  if (meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0) {
    context += `**Travaux suggérés pour un pro :** ${meta.travaux_pro_suggeres.join(', ')}\n`;
  }
  
  // Contraintes
  if (meta.contraintes) {
    context += `\n**Contraintes particulières :** ${meta.contraintes}\n`;
  }

  return context;
}

// ==================== CHARGEMENT PROMPT ====================

async function loadPromptPhasage(): Promise<string> {
  const { data, error } = await supabase
    .from('prompts_library')
    .select('prompt_text')
    .eq('code', 'system_phasage')
    .eq('est_actif', true)
    .single();

  if (error || !data) {
    throw new Error('Prompt system_phasage non trouvé');
  }

  return data.prompt_text;
}

// ==================== ROUTE POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chantierId, action } = body;

    if (!chantierId) {
      return NextResponse.json(
        { error: 'chantierId requis' },
        { status: 400 }
      );
    }

    // Action : supprimer les lots existants (re-phasage)
    if (action === 'reset') {
      const deleted = await deleteLots(chantierId);
      return NextResponse.json({ success: deleted });
    }

    // Action : sauvegarder les lots validés
    if (action === 'save' && body.lots) {
      const saved = await saveLots(chantierId, body.lots);
      return NextResponse.json({ success: saved });
    }

    // Action par défaut : générer le phasage
    console.log('🚀 Démarrage phasage pour chantier:', chantierId);

    // 1. Charger le contexte du chantier
    const chantierContext = await loadChantierContext(chantierId);
    console.log('📋 Contexte chantier chargé');

    // 2. Charger les règles de phasage
    const regles = await loadReglesPhasage();
    const reglesFormatted = formatReglesForPrompt(regles);
    console.log(`📏 ${regles.length} règles chargées`);

    // 3. Charger le prompt
    let prompt = await loadPromptPhasage();
    console.log('📝 Prompt chargé');

    // 4. Injecter le contexte et les règles
    prompt = prompt.replace('{{CHANTIER_CONTEXT}}', chantierContext);
    prompt = prompt.replace('{{REGLES_PHASAGE}}', reglesFormatted);

    console.log('🤖 Appel OpenAI...');

    // 5. Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Génère le phasage de ce projet en JSON.' }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ Réponse OpenAI reçue');

    // 6. Parser le JSON
    let result: ResultatPhasage;
    try {
      // Extraire le JSON de la réponse (au cas où il y a du texte autour)
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

    console.log(`🎉 Phasage généré : ${result.lots?.length || 0} lots`);

    return NextResponse.json({
      success: true,
      phasage: result
    });

  } catch (error) {
    console.error('Erreur API phasage:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
