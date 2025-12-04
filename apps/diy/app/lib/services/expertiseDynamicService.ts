/**
 * expertiseDynamicService.ts
 * 
 * Service de gestion des expertises dynamiques
 * - Détection du JSON ready_for_expert dans les réponses IA
 * - Recherche du prompt expert dans prompts_library
 * - Auto-génération du prompt si inexistant
 * 
 * @version 1.0
 * @date 04 décembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface ExpertiseIdentifiee {
  domaine: string;
  specialite: string;
  nom_affichage: string;
  contexte_resume: string;
}

export interface ExpertTransition {
  expertise_identifiee: ExpertiseIdentifiee;
  ready_for_expert: boolean;
}

export interface PromptExpert {
  code: string;
  titre: string;
  prompt_text: string;
  nom_affichage: string;
  isNew: boolean; // true si auto-généré
}

// ==================== DÉTECTION ====================

/**
 * Extrait le JSON ready_for_expert d'une réponse IA
 */
export function extractExpertTransition(content: string): ExpertTransition | null {
  try {
    // Pattern 1: ```json ... ```
    let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    
    // Pattern 2: JSON brut avec ready_for_expert
    if (!jsonMatch) {
      jsonMatch = content.match(/(\{[\s\S]*"ready_for_expert"\s*:\s*true[\s\S]*\})/);
    }
    
    if (jsonMatch && jsonMatch[1]) {
      const jsonStr = jsonMatch[1].trim();
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.ready_for_expert && parsed.expertise_identifiee) {
        console.log('🎯 Expertise identifiée:', parsed.expertise_identifiee);
        return parsed as ExpertTransition;
      }
    }
  } catch (error) {
    console.error('Erreur parsing expertise JSON:', error);
  }
  
  return null;
}

/**
 * Vérifie si l'utilisateur confirme la mise en relation
 */
export function isUserConfirmingExpert(message: string): boolean {
  const confirmPatterns = [
    /^(oui|ok|yes|yep|ouais|d'accord|dac|go|c'est parti|on y va|allons-y|parfait|super|génial|let's go|vas-y|nickel)$/i,
    /^(oui|ok|yes|yep|ouais|d'accord|dac|go|parfait|super)[!.\s]*$/i,
    /c'est parti/i,
    /on y va/i,
    /allons-y/i,
    /👍/,
    /^!$/
  ];
  
  const normalized = message.trim().toLowerCase();
  return confirmPatterns.some(pattern => pattern.test(normalized));
}

// ==================== RECHERCHE / CRÉATION PROMPT ====================

/**
 * Génère le code du prompt à partir de la spécialité
 */
function generatePromptCode(specialite: string): string {
  // Normaliser : lowercase, underscores
  const normalized = specialite
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `expert_${normalized}`;
}

/**
 * Cherche un prompt expert existant ou le crée
 */
export async function getOrCreateExpertPrompt(
  expertise: ExpertiseIdentifiee,
  contexteConversation: string
): Promise<PromptExpert> {
  const promptCode = generatePromptCode(expertise.specialite);
  
  console.log(`🔍 Recherche prompt: ${promptCode}`);
  
  // 1. Chercher si le prompt existe
  const { data: existingPrompt, error: searchError } = await supabase
    .from('prompts_library')
    .select('code, titre, prompt_text')
    .eq('code', promptCode)
    .eq('est_actif', true)
    .single();
  
  if (existingPrompt && !searchError) {
    console.log(`✅ Prompt existant trouvé: ${promptCode}`);
    return {
      code: existingPrompt.code,
      titre: existingPrompt.titre,
      prompt_text: existingPrompt.prompt_text,
      nom_affichage: expertise.nom_affichage,
      isNew: false
    };
  }
  
  // 2. Le prompt n'existe pas → Le générer
  console.log(`🆕 Prompt inexistant, génération automatique: ${promptCode}`);
  
  const generatedPrompt = await generateExpertPrompt(expertise, contexteConversation);
  
  // 3. Insérer en BDD
  const { error: insertError } = await supabase
    .from('prompts_library')
    .insert({
      code: promptCode,
      titre: `Expert - ${expertise.nom_affichage}`,
      categorie: 'expert',
      prompt_text: generatedPrompt,
      description: `Prompt auto-généré pour ${expertise.domaine} / ${expertise.specialite}`,
      tags: JSON.stringify(['expert', 'auto-generated', expertise.domaine, expertise.specialite]),
      est_actif: true,
      temperature: 0.7,
      max_tokens: 1500,
      model: 'gpt-4o-mini'
    });
  
  if (insertError) {
    console.error('Erreur insertion prompt:', insertError);
    // Continuer quand même avec le prompt généré
  } else {
    console.log(`💾 Prompt sauvegardé en BDD: ${promptCode}`);
  }
  
  return {
    code: promptCode,
    titre: `Expert - ${expertise.nom_affichage}`,
    prompt_text: generatedPrompt,
    nom_affichage: expertise.nom_affichage,
    isNew: true
  };
}

/**
 * Génère un prompt expert personnalisé
 */
async function generateExpertPrompt(
  expertise: ExpertiseIdentifiee,
  contexteConversation: string
): Promise<string> {
  // Template de prompt expert
  const prompt = `Tu es ${expertise.nom_affichage}, un expert hautement qualifié.

DOMAINE : ${expertise.domaine}
SPÉCIALITÉ : ${expertise.specialite}

CE QUE L'UTILISATEUR VEUT :
${expertise.contexte_resume}

TON RÔLE :
- Répondre avec précision et expertise aux questions dans ton domaine
- Citer les normes applicables (DTU, NFC, etc.) quand pertinent
- Donner des conseils pratiques et sécuritaires
- Alerter sur les travaux nécessitant un professionnel certifié
- Adapter ton niveau de langage (débutant = pédagogue, expert = technique)

SÉCURITÉ :
- Rappeler les EPI (équipements de protection) nécessaires
- Mentionner les risques électriques, chimiques ou physiques
- Indiquer clairement quand un travail doit être fait par un pro

STYLE OBLIGATOIRE :
- Tu tutoies l'utilisateur (jamais "le bricoleur", toujours "tu")
- PAS de markdown : pas de ** ou ## ou __ 
- Texte simple et lisible
- Emojis avec modération (⚠️ danger, ✅ ok, 🔧 outil)
- Direct et pratique, pas de blabla
- Si plusieurs étapes, utilise des tirets ou numéros simples (1. 2. 3.)
- Si tu ne sais pas, dis-le honnêtement

Tu es là pour aider à réussir ce projet en toute sécurité.`;

  return prompt;
}

// ==================== MISE À JOUR HEADER ====================

export interface ExpertHeaderInfo {
  title: string;
  breadcrumb: string;
  expertiseLine: string;
  expertiseNom: string;
  expertiseCode: string;
  contextColor: string;
}

/**
 * Génère les infos du header pour l'expert
 */
export function getExpertHeaderInfo(expertise: ExpertiseIdentifiee): ExpertHeaderInfo {
  // Couleurs par domaine
  const domainColors: Record<string, string> = {
    'électricité': 'var(--yellow)',
    'electricite': 'var(--yellow)',
    'plomberie': 'var(--blue)',
    'maçonnerie': 'var(--gray)',
    'maconnerie': 'var(--gray)',
    'menuiserie': 'var(--brown, #8B4513)',
    'carrelage': 'var(--orange)',
    'peinture': 'var(--purple)',
    'isolation': 'var(--green)',
    'juridique': 'var(--red)',
    'normes': 'var(--red)',
  };
  
  const color = domainColors[expertise.domaine.toLowerCase()] || 'var(--blue)';
  
  // Icônes par domaine
  const domainIcons: Record<string, string> = {
    'électricité': '⚡',
    'electricite': '⚡',
    'plomberie': '💧',
    'maçonnerie': '🧱',
    'maconnerie': '🧱',
    'menuiserie': '🪚',
    'carrelage': '🔲',
    'peinture': '🎨',
    'isolation': '🧤',
    'toiture': '🏠',
    'juridique': '⚖️',
    'normes': '📋',
  };
  
  const icon = domainIcons[expertise.domaine.toLowerCase()] || '🔧';
  
  return {
    title: expertise.nom_affichage,
    breadcrumb: expertise.contexte_resume.substring(0, 50) + '...',
    expertiseLine: `${icon} ${expertise.nom_affichage}`,
    expertiseNom: expertise.nom_affichage,
    expertiseCode: expertise.specialite,
    contextColor: color
  };
}
