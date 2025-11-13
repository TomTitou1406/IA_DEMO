import { supabase } from '@/app/lib/supabaseClient';

export type ContextType = 'home' | 'chantiers' | 'travaux' | 'chat' | 'profil';

interface PromptConfig {
  code: string;
  role: string;
  systemPrompt: string;
  placeholder: string;
}

// Cache en mémoire pour performances
let systemPromptsCache: Record<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
 * Récupère le prompt système pour un contexte donné
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
        placeholder: getPlaceholderForContext(contextType)
      };
    }
  } catch (error) {
    console.error('Error getting system prompt:', error);
  }

  // FALLBACK si pas de prompt en DB
  return getFallbackPrompt(contextType, additionalContext);
}

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
 * Placeholders selon contexte
 */
function getPlaceholderForContext(contextType: ContextType): string {
  const placeholders: Record<ContextType, string> = {
    home: 'Comment fonctionne Papibricole ?',
    chantiers: 'Comment organiser mon chantier ?',
    travaux: 'Comment faire cette étape ?',
    chat: 'Pose ta question bricolage...',
    profil: 'Quel est ton niveau en bricolage ?'
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
      placeholder: 'Pose ta question...'
    },
    home: {
      code: 'fallback_home',
      role: 'guide',
      systemPrompt: `Tu es un guide de l'app Papibricole DIY.
Accueillant, pédagogue, encourage l'autonomie.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment fonctionne Papibricole ?'
    },
    chantiers: {
      code: 'fallback_chantiers',
      role: 'coach',
      systemPrompt: `Tu es un coach planification chantiers.
Structuré, pragmatique, conseils clairs.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment organiser mon chantier ?'
    },
    travaux: {
      code: 'fallback_travaux',
      role: 'instructeur',
      systemPrompt: `Tu es un instructeur technique bricolage.
Précis, sécurité prioritaire, pas-à-pas détaillé.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment faire cette étape ?'
    },
    profil: {
      code: 'fallback_profil',
      role: 'évaluateur',
      systemPrompt: `Tu es un évaluateur de compétences bricolage.
Bienveillant, objectif, encourage la progression.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Quel est ton niveau ?'
    }
  };

  return fallbacks[contextType];
}

/**
 * Invalide le cache (utile pour les updates)
 */
export function invalidatePromptsCache(): void {
  systemPromptsCache = null;
  cacheTimestamp = 0;
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
