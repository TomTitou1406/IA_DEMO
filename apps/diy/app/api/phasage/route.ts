/**
 * API Route : /api/phasage
 * 
 * Génère et gère les lots de travaux pour un chantier
 * 
 * Actions disponibles :
 * - (défaut) : Génère le phasage via IA
 * - 'save_brouillon' : Sauvegarde les lots en brouillon
 * - 'validate' : Valide le brouillon (passe en à_venir)
 * - 'reset' : Supprime les lots existants
 * - 'load_brouillon' : Charge les lots brouillon existants
 * 
 * @version 2.1
 * @date 19 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';
import { 
  loadReglesPhasage, 
  formatReglesForPrompt, 
  saveLots,
  deleteLots,
  loadBrouillon,
  validerBrouillon,
  type ResultatPhasage 
} from '@/app/lib/services/phasageService';
import { 
  getChantierTypeConfig, 
  formatTypeConfigForAI 
} from '@/app/lib/services/chantierTypeService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================== CHARGEMENT CONTEXTE CHANTIER ====================

async function loadChantierContext(chantierId: string): Promise<{ context: string; typeCode: string | null }> {
  const { data: chantier, error } = await supabase
    .from('chantiers')
    .select('id, titre, description, statut, budget_initial, duree_estimee_heures, metadata, type_chantier')
    .eq('id', chantierId)
    .single();

  if (error || !chantier) {
    throw new Error('Chantier non trouvé');
  }

  const meta = chantier.metadata || {};
  
  // Extraire le type de projet (priorité : type_chantier > metadata.type_piece > metadata.type_projet)
  const typeCode = chantier.type_chantier || meta.type_piece || meta.type_projet || null;
  
  let context = `## INFORMATIONS DU PROJET\n\n`;
  
  // Ajouter le type explicitement si connu
  if (typeCode) {
    context += `**Type de projet :** ${typeCode}\n`;
  }
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

  // Équipements existants à déposer (info cruciale pour rénovation)
  if (meta.points_eau_existants) {
    context += `**Équipements existants à retirer :** ${meta.points_eau_existants}\n`;
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

  return { context, typeCode };
}

// ==================== CHARGEMENT PROMPT ====================

interface PromptConfig {
  prompt_text: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

async function loadPromptPhasage(): Promise<PromptConfig> {
  const { data, error } = await supabase
    .from('prompts_library')
    .select('prompt_text, model, temperature, max_tokens')
    .eq('code', 'system_phasage')
    .eq('est_actif', true)
    .single();

  if (error || !data) {
    throw new Error('Prompt system_phasage non trouvé');
  }

  return {
    prompt_text: data.prompt_text,
    model: data.model || 'gpt-4o-mini',
    temperature: data.temperature ?? 0.3,
    max_tokens: data.max_tokens || 4000
  };
}

// ==================== CHARGEMENT GRILLE COÛTS ====================

async function loadGrilleCouts(): Promise<string> {
  const { data, error } = await supabase
    .from('grille_couts_expertise')
    .select('code_expertise, libelle, unite_reference, mo_pro_min, mo_pro_max, mo_pro_moyen, description_unite')
    .order('libelle');

  if (error || !data || data.length === 0) {
    console.warn('⚠️ Grille de coûts non trouvée');
    return 'Grille de coûts non disponible - estimer au mieux.';
  }

  let grille = '| Expertise | Unité | Tarif MO Pro (min-max) | Tarif moyen |\n';
  grille += '|-----------|-------|------------------------|-------------|\n';
  
  data.forEach((row) => {
    grille += `| ${row.libelle} (${row.code_expertise}) | ${row.unite_reference} | ${row.mo_pro_min}€ - ${row.mo_pro_max}€ | ${row.mo_pro_moyen}€ |\n`;
  });

  return grille;
}

// ==================== ROUTE POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chantierId, action, lots } = body;

    if (!chantierId) {
      return NextResponse.json(
        { error: 'chantierId requis' },
        { status: 400 }
      );
    }

    // ========== ACTION : RESET (supprimer les lots) ==========
    if (action === 'reset') {
      const result = await deleteLots(chantierId);
      return NextResponse.json({ success: result.success, error: result.error });
    }

    // ========== ACTION : LOAD_BROUILLON ==========
    if (action === 'load_brouillon') {
      const brouillonLots = await loadBrouillon(chantierId);
      return NextResponse.json({ 
        success: true, 
        hasBrouillon: brouillonLots.length > 0,
        nbLots: brouillonLots.length,
        lots: brouillonLots 
      });
    }

    // ========== ACTION : SAVE_BROUILLON ==========
    if (action === 'save_brouillon' && lots) {
      // 1. Récupérer les forçages existants AVANT suppression
      const { data: existingLots } = await supabase
        .from('travaux')
        .select('titre, forcages')
        .eq('chantier_id', chantierId)
        .eq('statut', 'brouillon')
        .eq('niveau', 'lot');
      
      // Créer une map titre -> forcages pour les préserver
      const forcagesParTitre = new Map<string, any>();
      if (existingLots) {
        existingLots.forEach((lot: any) => {
          if (lot.forcages && lot.forcages.forcages && lot.forcages.forcages.length > 0) {
            forcagesParTitre.set(lot.titre, lot.forcages);
          }
        });
      }
      
      // 2. Supprimer les anciens brouillons
      await deleteLots(chantierId, 'brouillon');
      
      // 3. Ré-attacher les forçages aux lots avant sauvegarde
      let lotsAvecForcages = lots.map((lot: any) => ({
        ...lot,
        forcages: forcagesParTitre.get(lot.titre) || lot.forcages || { forcages: [] }
      }));
      
      // ========== VALIDATION POST-ACTION ==========
      // 4. Garantir que "Finitions" est TOUJOURS en dernier
      const finitionsIndex = lotsAvecForcages.findIndex(
        (l: any) => l.titre.toLowerCase().includes('finition')
      );
      
      if (finitionsIndex !== -1 && finitionsIndex !== lotsAvecForcages.length - 1) {
        // Finitions n'est pas en dernier → on le déplace
        const [finitionsLot] = lotsAvecForcages.splice(finitionsIndex, 1);
        lotsAvecForcages.push(finitionsLot);
        
        // Recalculer les ordres
        lotsAvecForcages = lotsAvecForcages.map((lot: any, idx: number) => ({
          ...lot,
          ordre: idx + 1
        }));
        
        console.log('⚠️ Finitions repositionné en dernier automatiquement');
      }
      
      // 5. Sauvegarder les nouveaux lots avec leurs forçages préservés
      const result = await saveLots(chantierId, lotsAvecForcages, 'brouillon');
      return NextResponse.json({ success: result.success, error: result.error });
    }

    // ========== ACTION : VALIDATE (brouillon → à_venir) ==========
    if (action === 'validate') {
      console.log('🎯 ACTION VALIDATE reçue pour chantier:', chantierId);
      
      // Si des lots sont fournis, on les sauvegarde directement en à_venir
      if (lots && lots.length > 0) {
        console.log('📦 Sauvegarde de', lots.length, 'lots en à_venir');
        
        // 1. Récupérer les forçages existants AVANT suppression
        const { data: existingLots } = await supabase
          .from('travaux')
          .select('titre, forcages')
          .eq('chantier_id', chantierId)
          .eq('statut', 'brouillon')
          .eq('niveau', 'lot');
        
        // Créer une map titre -> forcages pour les préserver
        const forcagesParTitre = new Map<string, any>();
        if (existingLots) {
          existingLots.forEach((lot: any) => {
            if (lot.forcages && lot.forcages.forcages && lot.forcages.forcages.length > 0) {
              forcagesParTitre.set(lot.titre, lot.forcages);
            }
          });
        }
        
        // 2. Supprimer les brouillons
        await deleteLots(chantierId, 'brouillon');
        
        // 3. Ré-attacher les forçages aux lots
        const lotsAvecForcages = lots.map((lot: any) => ({
          ...lot,
          forcages: forcagesParTitre.get(lot.titre) || lot.forcages || { forcages: [] }
        }));
        
        // 4. Sauvegarder en à_venir
        const saveResult = await saveLots(chantierId, lotsAvecForcages, 'à_venir');
        
        if (!saveResult.success) {
          console.error('❌ Erreur sauvegarde lots:', saveResult.error);
          return NextResponse.json({ success: false, error: saveResult.error });
        }
        
        // 5. Mettre à jour le statut du chantier
        await supabase
          .from('chantiers')
          .update({ statut: 'en_cours', updated_at: new Date().toISOString() })
          .eq('id', chantierId);
        
        console.log('✅ VALIDATE terminé avec succès');
        return NextResponse.json({ success: true });
      }
      
      // Sinon on valide le brouillon existant via la fonction dédiée
      console.log('🔄 Validation brouillon existant via validerBrouillon()');
      const result = await validerBrouillon(chantierId);
      return NextResponse.json({ success: result.success, error: result.error });
    }

    // ========== ACTION PAR DÉFAUT : GÉNÉRER LE PHASAGE ==========
    console.log('🚀 Démarrage phasage pour chantier:', chantierId);

    // 1. Charger le contexte du chantier
    const { context: chantierContext, typeCode } = await loadChantierContext(chantierId);
    console.log('📋 Contexte chantier chargé, type:', typeCode || 'non défini');

    // 2. Charger la configuration du type de projet
    let typeConfigFormatted = '';
    if (typeCode) {
      const typeConfig = await getChantierTypeConfig(typeCode);
      if (typeConfig) {
        typeConfigFormatted = formatTypeConfigForAI(typeConfig);
        console.log('🏷️ Config type chargée:', typeConfig.nom);
      } else {
        console.log('⚠️ Pas de config trouvée pour le type:', typeCode);
      }
    }

    // 3. Charger les règles de phasage
    const regles = await loadReglesPhasage();
    const reglesFormatted = formatReglesForPrompt(regles);
    console.log(`📝 ${regles.length} règles chargées`);

    // 4. Charger la grille de coûts
    const grilleCouts = await loadGrilleCouts();
    console.log('💰 Grille de coûts chargée');

    // 5. Charger le prompt et ses paramètres
    const promptConfig = await loadPromptPhasage();
    let prompt = promptConfig.prompt_text;
    console.log(`📄 Prompt chargé (model: ${promptConfig.model}, temp: ${promptConfig.temperature})`);

    // 6. Injecter le contexte, la config type, les règles et la grille de coûts
    prompt = prompt.replace('{{CHANTIER_CONTEXT}}', chantierContext);
    prompt = prompt.replace('{{TYPE_CONFIG}}', typeConfigFormatted || 'Aucune configuration spécifique disponible pour ce type de projet.');
    prompt = prompt.replace('{{REGLES_PHASAGE}}', reglesFormatted);
    prompt = prompt.replace('{{GRILLE_COUTS}}', grilleCouts);

    console.log('🤖 Appel OpenAI...');

    // 7. Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: promptConfig.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Génère le phasage de ce projet en JSON.' }
      ],
      temperature: promptConfig.temperature,
      max_tokens: promptConfig.max_tokens,
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ Réponse OpenAI reçue');

    // 8. Parser le JSON
    let result: ResultatPhasage;
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
