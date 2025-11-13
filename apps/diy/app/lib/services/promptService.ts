import { supabase } from '@/app/lib/supabaseClient';

export type ContextType = 'home' | 'chantiers' | 'travaux' | 'chat' | 'profil';

interface PromptConfig {
  role: string;
  systemPrompt: string;
  placeholder: string;
}

// Cache en mémoire
let promptsCache: Record<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère les prompts depuis Supabase avec cache
 */
async function fetchPrompts(): Promise<any[]> {
  const now = Date.now();
  
  // Utiliser le cache si valide
  if (promptsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return Object.values(promptsCache);
  }

  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    // Mettre en cache
    promptsCache = {};
    data?.forEach(prompt => {
      promptsCache![prompt.context] = prompt;
    });
    cacheTimestamp = now;

    return data || [];
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }
}

/**
 * Récupère le prompt pour un contexte donné
 */
export async function getPromptForContext(
  contextType: ContextType,
  additionalContext?: string
): Promise<PromptConfig> {
  try {
    const prompts = await fetchPrompts();
    const prompt = prompts.find(p => p.context === contextType);

    if (prompt) {
      let finalPrompt = prompt.content;
      
      // Ajouter contexte additionnel si présent
      if (additionalContext) {
        finalPrompt += `\n\nCONTEXTE ACTUEL :\n${additionalContext}`;
      }

      return {
        role: prompt.role || 'assistant',
        systemPrompt: finalPrompt,
        placeholder: prompt.placeholder || 'Pose ta question...'
      };
    }
  } catch (error) {
    console.error('Error getting prompt:', error);
  }

  // FALLBACK si pas de prompt en DB
  return getFallbackPrompt(contextType, additionalContext);
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
      role: 'assistant',
      systemPrompt: `Tu es un assistant bricolage expert et pédagogue.
Direct, clair, conseils pratiques.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Pose ta question...'
    },
    home: {
      role: 'guide',
      systemPrompt: `Tu es un guide de l'app Papibricole DIY.
Accueillant, pédagogue, encourage l'autonomie.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment fonctionne Papibricole ?'
    },
    chantiers: {
      role: 'coach',
      systemPrompt: `Tu es un coach planification chantiers.
Structuré, pragmatique, conseils clairs.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment organiser mon chantier ?'
    },
    travaux: {
      role: 'instructeur',
      systemPrompt: `Tu es un instructeur technique bricolage.
Précis, sécurité prioritaire, pas-à-pas détaillé.${additionalContext ? `\n\nCONTEXTE:\n${additionalContext}` : ''}`,
      placeholder: 'Comment faire cette étape ?'
    },
    profil: {
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
  promptsCache = null;
  cacheTimestamp = 0;
}
