/**
 * generationService.ts
 * 
 * Service de génération IA pour créer des structures de chantiers
 * à partir de descriptions textuelles
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';
import {
  GenerationInput,
  GenerationResult,
  GeneratedChantier,
  GeneratedTravail,
  GeneratedEtape,
  SaveResult,
  calculateStructureStats
} from '@/app/lib/types/generation';
import { getUserId } from './conversationService';

// ==================== PROMPTS ====================

/**
 * Prompt système pour la génération de structure
 */
const GENERATION_SYSTEM_PROMPT = `Tu es un expert en planification de chantiers de bricolage et rénovation.
Tu dois analyser la description d'un projet et générer une structure complète et réaliste.

RÈGLES IMPORTANTES :
1. Génère des lots ordonnés LOGIQUEMENT (ex: démo avant placo, placo avant peinture, élec avant fermeture des murs)
2. Chaque tâche doit être ATOMIQUE (15-60 minutes max)
3. Inclus TOUJOURS les tâches de préparation et de nettoyage
4. Sois RÉALISTE sur les durées (un débutant mettra 2-3x plus de temps qu'un pro)
5. Identifie les points nécessitant un PROFESSIONNEL (électricité tableau, gaz, structure porteuse)
6. Adapte la difficulté au niveau de l'utilisateur

STRUCTURE DES DÉPENDANCES :
- Les dépendances utilisent les INDICES des lots (0 = premier lot)
- Un lot avec dependances: [0, 1] ne peut commencer qu'après les lots 0 et 1

FORMAT DE RÉPONSE :
Tu dois répondre UNIQUEMENT avec un JSON valide (sans markdown, sans backticks).`;

/**
 * Génère le prompt utilisateur pour la génération
 */
function buildGenerationPrompt(input: GenerationInput): string {
  let prompt = `PROJET À ANALYSER :
"${input.description}"

PROFIL UTILISATEUR :
- Niveau : ${input.niveau_utilisateur}`;

  if (input.budget_max) {
    prompt += `\n- Budget maximum : ${input.budget_max}€`;
  }

  if (input.delai_max_jours) {
    prompt += `\n- Délai maximum : ${input.delai_max_jours} jours`;
  }

  if (input.preferences && input.preferences.length > 0) {
    prompt += `\n- Préférences : ${input.preferences.join(', ')}`;
  }

  prompt += `

GÉNÈRE une structure JSON complète avec ce format EXACT :
{
  "titre": "Titre du chantier",
  "description": "Description générale",
  "type": "renovation|construction|amenagement|reparation|entretien",
  "zone": "Pièce ou zone concernée",
  "surface_m2": nombre ou null,
  "duree_estimee_jours": nombre,
  "budget_total_min": nombre ou null,
  "budget_total_max": nombre ou null,
  "difficulte_globale": 1-5,
  "travaux": [
    {
      "titre": "Nom du lot",
      "description": "Description du lot",
      "expertise_requise": "electricien|plaquiste|peintre|etc",
      "ordre": 1,
      "duree_estimee_heures": nombre,
      "budget_estime_min": nombre ou null,
      "budget_estime_max": nombre ou null,
      "difficulte": 1-5,
      "niveau_risque": "faible|moyen|eleve",
      "dependances": [indices des lots prérequis] ou [],
      "materiaux_principaux": ["liste", "des", "matériaux"],
      "outillage_specifique": ["liste", "des", "outils"],
      "etapes": [
        {
          "titre": "Nom de l'étape",
          "description": "Description",
          "ordre": 1,
          "duree_estimee": minutes,
          "controles_qualite": ["points à vérifier"],
          "taches": [
            {
              "titre": "Nom de la tâche",
              "description": "Description détaillée",
              "duree_estimee": minutes (15-60),
              "ordre": 1,
              "points_vigilance": ["attention à..."],
              "materiel": ["ce qu'il faut"],
              "difficulte": 1-5
            }
          ]
        }
      ]
    }
  ],
  "conseils": ["conseil 1", "conseil 2"],
  "avertissements": ["avertissement 1"],
  "points_pro_requis": ["ce qui nécessite un pro"]
}`;

  return prompt;
}

// ==================== GÉNÉRATION ====================

/**
 * Génère une structure de chantier complète via l'IA
 */
export async function generateChantierStructure(
  input: GenerationInput
): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    console.log('🚀 Démarrage génération structure chantier...');
    
    // Appel à la route API de génération
    const response = await fetch('/api/chat/generate-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: GENERATION_SYSTEM_PROMPT,
        userPrompt: buildGenerationPrompt(input),
        niveau: input.niveau_utilisateur
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data = await response.json();
    
    // Parser la réponse JSON
    let structure: GeneratedChantier;
    try {
      // Nettoyer la réponse si elle contient des backticks
      let jsonStr = data.message;
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      structure = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      console.error('Réponse brute:', data.message);
      
      return {
        success: false,
        error: 'La structure générée n\'est pas valide. Veuillez réessayer avec une description plus précise.',
        metadata: {
          generation_time_ms: Date.now() - startTime,
          model: 'gpt-4o-mini'
        }
      };
    }

    // Valider la structure
    const validation = validateStructure(structure);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        warnings: validation.warnings,
        metadata: {
          generation_time_ms: Date.now() - startTime,
          model: 'gpt-4o-mini'
        }
      };
    }

    // Calculer les stats
    const stats = calculateStructureStats(structure);
    console.log(`✅ Structure générée: ${stats.totalTravaux} lots, ${stats.totalEtapes} étapes, ${stats.totalTaches} tâches`);

    return {
      success: true,
      structure,
      warnings: validation.warnings,
      metadata: {
        generation_time_ms: Date.now() - startTime,
        model: 'gpt-4o-mini',
        tokens_used: data.usage?.total_tokens,
        confidence: calculateConfidence(structure, input)
      }
    };

  } catch (error) {
    console.error('Erreur génération structure:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la génération',
      metadata: {
        generation_time_ms: Date.now() - startTime,
        model: 'gpt-4o-mini'
      }
    };
  }
}

/**
 * Génère uniquement les étapes pour un travail existant
 */
export async function generateEtapesForTravail(
  travailDescription: string,
  expertiseCode: string,
  niveauUtilisateur: 'debutant' | 'intermediaire' | 'expert'
): Promise<GeneratedEtape[] | null> {
  try {
    const prompt = `Génère les étapes détaillées pour ce lot de travaux :
"${travailDescription}"

Expertise : ${expertiseCode}
Niveau utilisateur : ${niveauUtilisateur}

Réponds UNIQUEMENT avec un JSON valide (tableau d'étapes) :
[
  {
    "titre": "...",
    "description": "...",
    "ordre": 1,
    "duree_estimee": minutes,
    "controles_qualite": [...],
    "taches": [
      {
        "titre": "...",
        "description": "...",
        "duree_estimee": minutes (15-60),
        "ordre": 1,
        "points_vigilance": [...],
        "materiel": [...],
        "difficulte": 1-5
      }
    ]
  }
]`;

    const response = await fetch('/api/chat/generate-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: GENERATION_SYSTEM_PROMPT,
        userPrompt: prompt,
        niveau: niveauUtilisateur
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data = await response.json();
    let jsonStr = data.message.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Erreur génération étapes:', error);
    return null;
  }
}

// ==================== VALIDATION ====================

/**
 * Valide une structure générée
 */
function validateStructure(structure: GeneratedChantier): {
  valid: boolean;
  error?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Vérifications obligatoires
  if (!structure.titre) {
    return { valid: false, error: 'Titre manquant', warnings };
  }

  if (!structure.travaux || structure.travaux.length === 0) {
    return { valid: false, error: 'Aucun lot de travaux généré', warnings };
  }

  // Vérifier chaque lot
  for (let i = 0; i < structure.travaux.length; i++) {
    const travail = structure.travaux[i];
    
    if (!travail.titre) {
      return { valid: false, error: `Lot ${i + 1}: titre manquant`, warnings };
    }

    if (!travail.etapes || travail.etapes.length === 0) {
      warnings.push(`Lot "${travail.titre}": aucune étape générée`);
      continue;
    }

    // Vérifier chaque étape
    for (const etape of travail.etapes) {
      if (!etape.taches || etape.taches.length === 0) {
        warnings.push(`Étape "${etape.titre}": aucune tâche générée`);
      }
    }

    // Vérifier les dépendances
    if (travail.dependances) {
      for (const dep of travail.dependances) {
        if (dep < 0 || dep >= structure.travaux.length || dep >= i) {
          warnings.push(`Lot "${travail.titre}": dépendance invalide (${dep})`);
        }
      }
    }
  }

  // Avertissements sur les valeurs
  if (!structure.budget_total_min && !structure.budget_total_max) {
    warnings.push('Budget non estimé');
  }

  if (structure.difficulte_globale >= 4) {
    warnings.push('Projet de difficulté élevée - certaines tâches peuvent nécessiter un professionnel');
  }

  return { valid: true, warnings };
}

/**
 * Calcule un score de confiance pour la génération
 */
function calculateConfidence(structure: GeneratedChantier, input: GenerationInput): number {
  let confidence = 70; // Base

  // Plus de détails dans l'input = meilleure confiance
  if (input.description.length > 100) confidence += 5;
  if (input.description.length > 200) confidence += 5;
  if (input.budget_max) confidence += 5;
  if (input.preferences && input.preferences.length > 0) confidence += 5;

  // Structure complète = meilleure confiance
  const stats = calculateStructureStats(structure);
  if (stats.totalTaches > 10) confidence += 5;
  if (structure.conseils && structure.conseils.length > 0) confidence += 3;
  if (structure.budget_total_min) confidence += 2;

  return Math.min(100, confidence);
}

// ==================== SAUVEGARDE ====================

/**
 * Sauvegarde une structure générée en BDD
 */
export async function saveGeneratedStructure(
  structure: GeneratedChantier,
  userId?: string
): Promise<SaveResult> {
  const actualUserId = userId || getUserId();
  
  try {
    console.log('💾 Sauvegarde structure en BDD...');

    // 1. Créer le chantier
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .insert({
        user_id: actualUserId,
        titre: structure.titre,
        description: structure.description,
        type_chantier: structure.type,
        zone: structure.zone,
        surface_m2: structure.surface_m2,
        budget_estime: structure.budget_total_max || structure.budget_total_min,
        statut: 'planification',
        metadata: {
          generated: true,
          generated_at: new Date().toISOString(),
          difficulte_globale: structure.difficulte_globale,
          duree_estimee_jours: structure.duree_estimee_jours,
          conseils: structure.conseils,
          avertissements: structure.avertissements,
          points_pro_requis: structure.points_pro_requis
        }
      })
      .select()
      .single();

    if (chantierError) {
      throw new Error(`Erreur création chantier: ${chantierError.message}`);
    }

    console.log(`✅ Chantier créé: ${chantier.id}`);

    // 2. Créer les travaux
    const travauxIds: string[] = [];
    let totalEtapes = 0;
    let totalTaches = 0;

    for (const travailGen of structure.travaux) {
      const { data: travail, error: travailError } = await supabase
        .from('travaux')
        .insert({
          chantier_id: chantier.id,
          titre: travailGen.titre,
          description: travailGen.description,
          expertise_requise: travailGen.expertise_requise,
          ordre: travailGen.ordre,
          duree_estimee: travailGen.duree_estimee_heures,
          budget_estime: travailGen.budget_estime_max || travailGen.budget_estime_min,
          difficulte: travailGen.difficulte,
          niveau_risque: travailGen.niveau_risque,
          statut: 'a_faire',
          metadata: {
            generated: true,
            dependances: travailGen.dependances,
            materiaux_principaux: travailGen.materiaux_principaux,
            outillage_specifique: travailGen.outillage_specifique
          }
        })
        .select()
        .single();

      if (travailError) {
        console.error(`Erreur création travail: ${travailError.message}`);
        continue;
      }

      travauxIds.push(travail.id);

      // 3. Créer les étapes
      for (const etapeGen of travailGen.etapes) {
        const { data: etape, error: etapeError } = await supabase
          .from('etapes')
          .insert({
            travail_id: travail.id,
            titre: etapeGen.titre,
            description: etapeGen.description,
            ordre: etapeGen.ordre,
            duree_estimee: etapeGen.duree_estimee,
            statut: 'a_faire',
            metadata: {
              generated: true,
              controles_qualite: etapeGen.controles_qualite
            }
          })
          .select()
          .single();

        if (etapeError) {
          console.error(`Erreur création étape: ${etapeError.message}`);
          continue;
        }

        totalEtapes++;

        // 4. Créer les tâches
        for (const tacheGen of etapeGen.taches) {
          const { error: tacheError } = await supabase
            .from('taches')
            .insert({
              etape_id: etape.id,
              titre: tacheGen.titre,
              description: tacheGen.description,
              ordre: tacheGen.ordre,
              duree_estimee: tacheGen.duree_estimee,
              difficulte: tacheGen.difficulte,
              statut: 'a_faire',
              metadata: {
                generated: true,
                points_vigilance: tacheGen.points_vigilance,
                materiel: tacheGen.materiel
              }
            });

          if (tacheError) {
            console.error(`Erreur création tâche: ${tacheError.message}`);
            continue;
          }

          totalTaches++;
        }
      }
    }

    console.log(`✅ Sauvegarde complète: ${travauxIds.length} travaux, ${totalEtapes} étapes, ${totalTaches} tâches`);

    return {
      success: true,
      chantier_id: chantier.id,
      travaux_ids: travauxIds,
      counts: {
        travaux: travauxIds.length,
        etapes: totalEtapes,
        taches: totalTaches
      }
    };

  } catch (error) {
    console.error('Erreur sauvegarde structure:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
    };
  }
}

/**
 * Ajoute des lots générés à un chantier existant
 */
export async function addGeneratedTravauxToChantier(
  chantierId: string,
  travaux: GeneratedTravail[]
): Promise<SaveResult> {
  try {
    // Récupérer l'ordre max actuel
    const { data: existingTravaux } = await supabase
      .from('travaux')
      .select('ordre')
      .eq('chantier_id', chantierId)
      .order('ordre', { ascending: false })
      .limit(1);

    const startOrder = (existingTravaux?.[0]?.ordre || 0) + 1;

    const travauxIds: string[] = [];
    let totalEtapes = 0;
    let totalTaches = 0;

    for (let i = 0; i < travaux.length; i++) {
      const travailGen = travaux[i];
      
      const { data: travail, error: travailError } = await supabase
        .from('travaux')
        .insert({
          chantier_id: chantierId,
          titre: travailGen.titre,
          description: travailGen.description,
          expertise_requise: travailGen.expertise_requise,
          ordre: startOrder + i,
          duree_estimee: travailGen.duree_estimee_heures,
          budget_estime: travailGen.budget_estime_max || travailGen.budget_estime_min,
          difficulte: travailGen.difficulte,
          niveau_risque: travailGen.niveau_risque,
          statut: 'a_faire',
          metadata: {
            generated: true,
            generated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (travailError) continue;
      
      travauxIds.push(travail.id);

      // Créer étapes et tâches
      for (const etapeGen of travailGen.etapes) {
        const { data: etape, error: etapeError } = await supabase
          .from('etapes')
          .insert({
            travail_id: travail.id,
            titre: etapeGen.titre,
            description: etapeGen.description,
            ordre: etapeGen.ordre,
            duree_estimee: etapeGen.duree_estimee,
            statut: 'a_faire'
          })
          .select()
          .single();

        if (etapeError) continue;
        totalEtapes++;

        for (const tacheGen of etapeGen.taches) {
          const { error: tacheError } = await supabase
            .from('taches')
            .insert({
              etape_id: etape.id,
              titre: tacheGen.titre,
              description: tacheGen.description,
              ordre: tacheGen.ordre,
              duree_estimee: tacheGen.duree_estimee,
              statut: 'a_faire'
            });

          if (!tacheError) totalTaches++;
        }
      }
    }

    return {
      success: true,
      chantier_id: chantierId,
      travaux_ids: travauxIds,
      counts: {
        travaux: travauxIds.length,
        etapes: totalEtapes,
        taches: totalTaches
      }
    };

  } catch (error) {
    console.error('Erreur ajout travaux:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'ajout'
    };
  }
}

// ==================== UTILITAIRES ====================

/**
 * Estime rapidement un projet sans générer la structure complète
 */
export async function quickEstimate(description: string): Promise<{
  dureeJours: number;
  budgetMin: number;
  budgetMax: number;
  difficulte: number;
  expertises: string[];
} | null> {
  try {
    const prompt = `Analyse rapide de ce projet bricolage :
"${description}"

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "dureeJours": nombre,
  "budgetMin": nombre en euros,
  "budgetMax": nombre en euros,
  "difficulte": 1 à 5,
  "expertises": ["liste", "des", "expertises", "requises"]
}`;

    const response = await fetch('/api/chat/generate-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'Tu es un expert en estimation de projets bricolage. Réponds uniquement en JSON valide.',
        userPrompt: prompt,
        maxTokens: 200
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    let jsonStr = data.message.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Erreur estimation rapide:', error);
    return null;
  }
}
