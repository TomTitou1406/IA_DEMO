/**
 * promptService.ts
 * 
 * Service de gestion des prompts système pour Papibricole DIY
 * Supporte les prompts génériques (prompts_library) ET les expertises
 * 
 * @version 2.0
 * @date 25 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';
import { getExpertiseByCode, type Expertise } from './expertiseService';

// ==================== TYPES ====================

export type ContextType = 'home' | 'chantiers' | 'travaux' | 'chat' | 'profil' | 'aide';

export interface PromptConfig {
  code: string;
  role: string;
  systemPrompt: string;
  placeholder: string;
  source: 'prompts_library' | 'expertise' | 'fallback';
  expertiseNom?: string;  // Nom de l'expertise si source = expertise
}

export interface PromptContext {
  // Contexte de navigation
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
  tacheId?: string;
  
  // Détails du contexte (pour injection dans le prompt)
  chantierTitre?: string;
  chantierDescription?: string;
  travailTitre?: string;
  travailDescription?: string;
  etapeTitre?: string;
  tacheTitre?: string;
  
  // Niveau utilisateur
  userLevel?: 'debutant' | 'intermediaire' | 'expert';
  
  // Contexte libre (texte additionnel)
  additionalContext?: string;
}

// ==================== CACHE ====================

let systemPromptsCache: Record<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Invalide le cache des prompts
 */
export function invalidatePromptsCache(): void {
  systemPromptsCache = null;
  cacheTimestamp = 0;
}

// ==================== PROMPTS LIBRARY ====================

/**
 * Récupère tous les prompts système depuis prompts_library
 */
async function fetchSystemPrompts(): Promise<any[]> {
  const now = Date.now();
  
  // Utiliser le cache si valide
  if (systemPromptsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return Object.values(systemPromptsCache);
  }

  try {
    const { data, error } = await supabase
      .from('prompts_library')
      .select('*')
      .eq('categorie', 'system')
      .eq('est_actif', true);

    if (error) throw error;

    // Mettre en cache indexé par code
    systemPromptsCache = {};
    data?.forEach(prompt => {
      // Extraire le contexte du code (system_home → home)
      const context = prompt.code.replace('system_', '');
      systemPromptsCache![context] = prompt;
    });
    cacheTimestamp = now;

    return data || [];
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    return [];
  }
}

/**
 * Récupère le prompt système pour un contexte donné (depuis prompts_library)
 */
export async function getSystemPromptForContext(
  contextType: ContextType,
  additionalContext?: string
): Promise<PromptConfig> {
  try {
    await fetchSystemPrompts(); // Charge le cache si nécessaire
    
    const prompt = systemPromptsCache?.[contextType];

    if (prompt) {
      let finalPrompt = prompt.prompt_text;
      
      // Ajouter contexte additionnel si présent
      if (additionalContext) {
        finalPrompt += `\n\nCONTEXTE ACTUEL :\n${additionalContext}`;
      }

      // Extraire le rôle des tags si disponible
      const tags = Array.isArray(prompt.tags) ? prompt.tags : JSON.parse(prompt.tags || '[]');
      const role = tags.find((tag: string) => 
        ['guide', 'coach', 'instructeur', 'assistant', 'evaluateur'].includes(tag)
      ) || 'assistant';

      return {
        code: prompt.code,
        role: role,
        systemPrompt: finalPrompt,
        placeholder: getPlaceholderForContext(contextType),
        source: 'prompts_library'
      };
    }
  } catch (error) {
    console.error('Error getting system prompt:', error);
  }

  // FALLBACK si pas de prompt en DB
  return getFallbackPrompt(contextType, additionalContext);
}

// ==================== EXPERTISES ====================

/**
 * Récupère le prompt système pour une expertise donnée
 * C'est LA fonction clé pour le système d'expertise
 */
export async function getPromptForExpertise(
  expertiseCode: string,
  context?: PromptContext
): Promise<PromptConfig | null> {
  try {
    const expertise = await getExpertiseByCode(expertiseCode);
    
    if (!expertise) {
      console.warn(`Expertise not found: ${expertiseCode}`);
      return null;
    }

    // Construire le prompt enrichi
    let systemPrompt = expertise.prompt_system_base;

    // Injecter le contexte structuré si présent
    if (context) {
      systemPrompt = injectContext(systemPrompt, expertise, context);
    }

    return {
      code: expertise.code,
      role: getRoleFromExpertise(expertise),
      systemPrompt,
      placeholder: getPlaceholderForExpertise(expertise),
      source: 'expertise',
      expertiseNom: expertise.nom
    };

  } catch (error) {
    console.error('Error getting prompt for expertise:', error);
    return null;
  }
}

/**
 * Injecte le contexte dans le prompt d'une expertise
 */
function injectContext(
  basePrompt: string,
  expertise: Expertise,
  context: PromptContext
): string {
  let enrichedPrompt = basePrompt;

  // Section contexte chantier/travail
  const contextSections: string[] = [];

  if (context.chantierTitre) {
    contextSections.push(`🏗️ CHANTIER : ${context.chantierTitre}`);
    if (context.chantierDescription) {
      contextSections.push(`   ${context.chantierDescription}`);
    }
  }

  if (context.travailTitre) {
    contextSections.push(`📦 LOT EN COURS : ${context.travailTitre}`);
    if (context.travailDescription) {
      contextSections.push(`   ${context.travailDescription}`);
    }
  }

  if (context.etapeTitre) {
    contextSections.push(`📋 ÉTAPE : ${context.etapeTitre}`);
  }

  if (context.tacheTitre) {
    contextSections.push(`✅ TÂCHE : ${context.tacheTitre}`);
  }

  // Ajouter le contexte structuré
  if (contextSections.length > 0) {
    enrichedPrompt += `\n\n---\nCONTEXTE ACTUEL :\n${contextSections.join('\n')}`;
  }

  // Niveau utilisateur
  if (context.userLevel) {
    const levelInstructions = getUserLevelInstructions(context.userLevel);
    enrichedPrompt += `\n\n---\nNIVEAU UTILISATEUR : ${context.userLevel.toUpperCase()}\n${levelInstructions}`;
  }

  // Avertissements sécurité selon niveau de risque
  if (expertise.niveau_risque && expertise.niveau_risque !== 'faible') {
    enrichedPrompt += `\n\n---\n⚠️ SÉCURITÉ (niveau risque: ${expertise.niveau_risque}) :\n`;
    enrichedPrompt += getSecurityWarnings(expertise);
  }

  // Contexte additionnel libre
  if (context.additionalContext) {
    enrichedPrompt += `\n\n---\nINFORMATIONS COMPLÉMENTAIRES :\n${context.additionalContext}`;
  }

  return enrichedPrompt;
}

/**
 * Instructions selon le niveau utilisateur
 */
function getUserLevelInstructions(level: 'debutant' | 'intermediaire' | 'expert'): string {
  const instructions: Record<string, string> = {
    debutant: `- Explique chaque étape en détail avec des termes simples
- Propose des alternatives plus faciles si le travail est complexe
- Insiste sur les points de sécurité
- N'hésite pas à recommander de faire appel à un professionnel si nécessaire
- Donne des repères visuels et des astuces mnémotechniques`,

    intermediaire: `- Donne des explications équilibrées (ni trop basiques, ni trop techniques)
- Propose des optimisations et alternatives
- Mentionne les erreurs courantes à éviter
- Encourage l'autonomie tout en restant disponible pour les questions`,

    expert: `- Sois concis et direct, va à l'essentiel
- Utilise le vocabulaire technique approprié
- Focus sur les optimisations et bonnes pratiques avancées
- Dialogue de pair à pair, suppose une bonne connaissance de base`
  };

  return instructions[level] || instructions.intermediaire;
}

/**
 * Avertissements sécurité selon l'expertise
 */
function getSecurityWarnings(expertise: Expertise): string {
  const warnings: string[] = [];

  // Avertissements génériques selon la catégorie
  if (expertise.code === 'electricien' || expertise.categorie === 'electricite') {
    warnings.push('- TOUJOURS couper le courant au disjoncteur avant intervention');
    warnings.push('- Vérifier l\'absence de tension avec un VAT (vérificateur d\'absence de tension)');
    warnings.push('- Respecter les normes NF C 15-100');
  }

  if (expertise.niveau_risque === 'eleve' || expertise.niveau_risque === 'élevé') {
    warnings.push('- Ce type de travaux comporte des risques importants');
    warnings.push('- En cas de doute, faire appel à un professionnel qualifié');
    warnings.push('- Porter les EPI (équipements de protection individuelle) adaptés');
  }

  if (expertise.niveau_risque === 'moyen') {
    warnings.push('- Porter les protections adaptées (gants, lunettes, etc.)');
    warnings.push('- Travailler dans un espace bien ventilé si nécessaire');
  }

  // Ajouter les normes de référence si présentes
  if (expertise.normes_reference && expertise.normes_reference.length > 0) {
    warnings.push(`- Normes applicables : ${expertise.normes_reference.join(', ')}`);
  }

  return warnings.join('\n');
}

/**
 * Détermine le rôle depuis une expertise
 */
function getRoleFromExpertise(expertise: Expertise): string {
  const categoryRoles: Record<string, string> = {
    'artisan': 'instructeur',
    'coordination': 'coach',
    'economiste': 'conseiller',
    'formateur': 'formateur'
  };

  return categoryRoles[expertise.categorie] || 'assistant';
}

/**
 * Placeholder selon l'expertise
 */
function getPlaceholderForExpertise(expertise: Expertise): string {
  return `Question pour l'expert ${expertise.nom.toLowerCase()}...`;
}

// ==================== FONCTION UNIFIÉE ====================

/**
 * Récupère le prompt approprié selon le contexte
 * Priorise l'expertise si fournie, sinon utilise le contexte page
 * 
 * C'est LA fonction à utiliser dans /api/chat/route.ts
 */
export async function getPrompt(options: {
  expertiseCode?: string;
  pageContext?: ContextType;
  context?: PromptContext;
  additionalContext?: string;
}): Promise<PromptConfig> {
  const { expertiseCode, pageContext, context, additionalContext } = options;

  // Priorité 1 : Expertise spécifique
  if (expertiseCode) {
    const expertisePrompt = await getPromptForExpertise(expertiseCode, context);
    if (expertisePrompt) {
      return expertisePrompt;
    }
    console.warn(`Expertise ${expertiseCode} not found, falling back to pageContext`);
  }

  // Priorité 2 : Contexte page
  if (pageContext) {
    return getSystemPromptForContext(pageContext, additionalContext || context?.additionalContext);
  }

  // Priorité 3 : Fallback chat
  return getFallbackPrompt('chat', additionalContext || context?.additionalContext);
}

// ==================== TEMPLATES ====================

/**
 * Récupère un template conversationnel par son code
 */
export async function getConversationTemplate(
  templateCode: string,
  variables?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('prompts_library')
      .select('prompt_text')
      .eq('code', templateCode)
      .eq('est_actif', true)
      .single();

    if (error) throw error;

    if (data && variables) {
      // Remplacer les variables Handlebars simples
      let text = data.prompt_text;
      Object.entries(variables).forEach(([key, value]) => {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
      return text;
    }

    return data?.prompt_text || null;
  } catch (error) {
    console.error('Error getting conversation template:', error);
    return null;
  }
}

/**
 * Liste tous les templates disponibles
 */
export async function listAvailableTemplates(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('prompts_library')
      .select('code, titre')
      .eq('categorie', 'template')
      .eq('est_actif', true);

    if (error) throw error;

    return data?.map(t => t.code) || [];
  } catch (error) {
    console.error('Error listing templates:', error);
    return [];
  }
}

// ==================== HELPERS ====================

/**
 * Placeholders selon contexte
 */
function getPlaceholderForContext(contextType: ContextType): string {
  const placeholders: Record<ContextType, string> = {
    home: 'Comment fonctionne Papibricole ?',
    chantiers: 'Comment organiser mon chantier ?',
    travaux: 'Comment faire cette étape ?',
    chat: 'Pose ta question bricolage...',
    profil: 'Quel est ton niveau en bricolage ?',
    aide: 'Décris ton problème...'
  };
  return placeholders[contextType];
}

/**
 * Prompts de secours si DB non dispo
 */
function getFallbackPrompt(
  contextType: ContextType,
  additionalContext?: string
): PromptConfig {
  const fallbacks: Record<ContextType, PromptConfig> = {
    chat: {
      code: 'fallback_chat',
      role: 'assistant',
      systemPrompt: `Tu es un assistant bricolage expert et pédagogue.
Direct, clair, conseils pratiques.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Pose ta question...',
      source: 'fallback'
    },
    home: {
      code: 'fallback_home',
      role: 'guide',
      systemPrompt: `Tu es un guide de l'app Papibricole DIY.
Accueillant, pédagogue, encourage l'autonomie.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment fonctionne Papibricole ?',
      source: 'fallback'
    },
    chantiers: {
      code: 'fallback_chantiers',
      role: 'coach',
      systemPrompt: `Tu es un coach planification chantiers.
Structuré, pragmatique, conseils clairs.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment organiser mon chantier ?',
      source: 'fallback'
    },
    travaux: {
      code: 'fallback_travaux',
      role: 'instructeur',
      systemPrompt: `Tu es un instructeur technique bricolage.
Précis, sécurité prioritaire, pas-à-pas détaillé.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment faire cette étape ?',
      source: 'fallback'
    },
    profil: {
      code: 'fallback_profil',
      role: 'évaluateur',
      systemPrompt: `Tu es un évaluateur de compétences bricolage.
Bienveillant, objectif, encourage la progression.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Quel est ton niveau ?',
      source: 'fallback'
    },
    aide: {
      code: 'fallback_aide',
      role: 'assistant',
      systemPrompt: `Tu es un assistant bricolage polyvalent.
Écoute attentivement le problème, pose des questions pour comprendre, puis guide vers la solution.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Décris ton problème...',
      source: 'fallback'
    }
  };

  return fallbacks[contextType] || fallbacks.chat;
}
